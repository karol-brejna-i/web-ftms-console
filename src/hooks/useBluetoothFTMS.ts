import { useState, useRef, useCallback } from 'react';
import type { ConnectionStatus, FTMSData, LogEntry } from '../types';
import { parseTreadmillData, parseHeartRate } from '../utils/ftms';

export const useBluetoothFTMS = () => {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [data, setData] = useState<FTMSData>({
    speedKmh: 0.0,
    distanceMeters: 0,
    elapsedTimeSeconds: 0,
    heartRateBpm: null,
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  const deviceRef = useRef<BluetoothDevice | null>(null);
  const serverRef = useRef<BluetoothRemoteGATTServer | null>(null);
  const ctrlCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev, {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      message: msg
    }]);
  }, []);

  const connect = useCallback(async () => {
    try {
      setStatus('connecting');
      addLog("Scanning...");
      
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [0x1826] }],
        optionalServices: [0x180D]
      });

      deviceRef.current = device;
      addLog("Connecting to " + (device.name || "Unknown Device"));
      
      if (!device.gatt) {
        throw new Error("Device has no GATT server");
      }

      const server = await device.gatt.connect();
      serverRef.current = server;

      const ftms = await server.getPrimaryService(0x1826);
      const ctrlChar = await ftms.getCharacteristic(0x2AD9);
      ctrlCharRef.current = ctrlChar;
      
      const dataChar = await ftms.getCharacteristic(0x2ACD);

      // Authorization - REQUIRED
      addLog("Sending: Request Control (0x00)...");
      await ctrlChar.writeValue(new Uint8Array([0x00]));

      // Treadmill Data
      await dataChar.startNotifications();
      dataChar.addEventListener('characteristicvaluechanged', (e: Event) => {
        const target = e.target as BluetoothRemoteGATTCharacteristic;
        const b = target.value;
        if (!b) return;

        const parsed = parseTreadmillData(b);
        if (parsed) {
          setData(prev => ({
            ...prev,
            ...parsed
          }));
        }
      });

      // Heart Rate Service
      try {
        const hrService = await server.getPrimaryService(0x180D);
        const hrChar = await hrService.getCharacteristic(0x2A37);
        await hrChar.startNotifications();
        hrChar.addEventListener('characteristicvaluechanged', (e: Event) => {
          const target = e.target as BluetoothRemoteGATTCharacteristic;
          const val = target.value;
          if (!val) return;
          
          const hr = parseHeartRate(val);
          if (hr !== null) {
            setData(prev => ({ ...prev, heartRateBpm: hr }));
          }
        });
        addLog("Heart Rate: Active.");
      } catch (e) {
        addLog("Heart Rate: Service not found.");
      }

      setStatus('connected');
      addLog("CONNECTED AND SYNCHRONIZED.");

      // Handle disconnection
      device.addEventListener('gattserverdisconnected', () => {
        setStatus('disconnected');
        addLog("Device disconnected.");
        deviceRef.current = null;
        serverRef.current = null;
        ctrlCharRef.current = null;
      });

    } catch (e: any) {
      setStatus('disconnected');
      addLog("ERROR: " + e.message);
      console.error(e);
    }
  }, [addLog]);

  const disconnect = useCallback(() => {
    if (deviceRef.current && deviceRef.current.gatt?.connected) {
      deviceRef.current.gatt.disconnect();
      // The event listener will handle the state update
    }
  }, []);

  const sendCmd = useCallback(async (bytes: number[], name: string) => {
    if (!ctrlCharRef.current) return;
    try {
      const hex = bytes.map(x => x.toString(16).padStart(2, '0')).join(' ');
      addLog(`CMD: ${name} [${hex}]`);
      await ctrlCharRef.current.writeValue(new Uint8Array(bytes));
    } catch (e: any) {
      addLog(`ERROR CMD ${name}: ${e.message}`);
    }
  }, [addLog]);

  const startMachine = useCallback(() => sendCmd([0x07], "START"), [sendCmd]);
  const stopMachine = useCallback(() => sendCmd([0x08, 0x01], "STOP"), [sendCmd]);
  
  const setSpeed = useCallback((targetKmh: number) => {
    const clamped = Math.max(0.8, Math.min(targetKmh, 16.0));
    const rawV = Math.round(clamped * 100);
    // 0x02 is Set Target Speed
    const payload = [0x02, rawV & 0xFF, (rawV >> 8) & 0xFF];
    sendCmd(payload, `SET_SPEED ${clamped.toFixed(1)}`);
  }, [sendCmd]);

  return {
    status,
    data,
    logs,
    connect,
    disconnect,
    startMachine,
    stopMachine,
    setSpeed
  };
};
