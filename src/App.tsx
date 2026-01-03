import { useBluetoothFTMS } from './hooks/useBluetoothFTMS';
import { Dashboard } from './components/Dashboard';
import { Controls } from './components/Controls';
import { ConsoleLog } from './components/ConsoleLog';
import './App.css';

function App() {
  const { 
    status, 
    data, 
    logs, 
    connect, 
    disconnect, 
    startMachine, 
    stopMachine, 
    setSpeed 
  } = useBluetoothFTMS();

  return (
    <div className="app-container">
      <h3>FS-BT-D2 Console v8 (React)</h3>
      
      <div id="connectionGroup">
        {status === 'disconnected' ? (
          <button className="btn-connect" onClick={connect}>
            CONNECT
          </button>
        ) : (
          <button className="btn-disconnect" onClick={disconnect}>
            DISCONNECT
          </button>
        )}
      </div>

      <Dashboard data={data} />

      <Controls 
        status={status}
        currentSpeed={data.speedKmh}
        onStart={startMachine}
        onStop={stopMachine}
        onSetSpeed={setSpeed}
      />

      <ConsoleLog logs={logs} />
    </div>
  );
}

export default App;
