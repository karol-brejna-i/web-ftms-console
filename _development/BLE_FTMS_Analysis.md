# BLE FTMS (Fitness Machine Service) Analysis

This document describes the Bluetooth Low Energy (BLE) implementation for communicating with a FTMS-compatible treadmill in the `blebridge` project (https://github.com/roethigj/blebridge).

## Overview

The project implements a BLE bridge that:
1. **BLE Central Role** (`ble_central.py`): Connects to a physical treadmill (FTMS device), reads data via notifications, and sends control commands.
2. **BLE Peripheral Role** (`ble_peripheral.py`): Advertises as a virtual treadmill to other devices (e.g., fitness apps on mobile phones).

---

## Services and Characteristics

### FTMS Service (Fitness Machine Service)

| UUID | Name | Role | Operations | Description |
|------|------|------|------------|-------------|
| `0x1826` / `00001826-0000-1000-8000-00805f9b34fb` | Fitness Machine Service | Primary Service | - | Main service for fitness equipment |

### FTMS Characteristics

| UUID | Name | Operations | Data Direction | Description |
|------|------|------------|----------------|-------------|
| `0x2ACC` | Fitness Machine Feature | Read | Treadmill → App | Describes supported features of the fitness machine |
| `0x2ACD` | Treadmill Data | Notify | Treadmill → App | Real-time treadmill metrics (speed, distance, etc.) |
| `0x2AD3` | Training Status | Read, Notify | Treadmill → App | Current training state |
| `0x2AD4` | Supported Speed Range | Read | Treadmill → App | Min/max speed values |
| `0x2AD5` | Supported Inclination Range | Read | Treadmill → App | Min/max inclination values |
| `0x2AD9` | Fitness Machine Control Point | Write | App → Treadmill | Control commands (start, stop, set speed, etc.) |
| `0x2ADA` | Fitness Machine Status | Notify | Treadmill → App | Status changes and events |

### Device Information Service (used in Peripheral mode)

| UUID | Name | Operations | Description |
|------|------|------------|-------------|
| `0x180A` | Device Information Service | - | Standard device info service |
| `0x2A29` | Manufacturer Name | Read | Returns "BLE_Bridge" |
| `0x2A24` | Model Number | Read | Returns "1" |
| `0x2A25` | Serial Number | Read | Returns "1234" |
| `0x2A26` | Firmware Revision | Read | Returns "1.0" |
| `0x2A27` | Hardware Revision | Read | Returns "1.0" |
| `0x2A28` | Software Revision | Read | Returns "1.0" |

---

## Data Structures and Parsing

### Treadmill Data Characteristic (0x2ACD) - Incoming Notifications

#### Raw Data Format

The treadmill sends a packed binary structure. The first 2 bytes are flags, followed by the payload.

```python
# Full received value structure (from ble_central.py)
self.value = test_value  # Complete notification data

# Payload extraction (skip first 2 bytes - flags)
payload = self.value[2:]

# Unpacking format: Little-endian
fmt = '<HHBHHHHBBH'
values = list(struct.unpack(fmt, bytes(payload[0:struct.calcsize(fmt)])))
```

#### Parsed Fields

| Index | Format | Size | Field | Unit | Conversion |
|-------|--------|------|-------|------|------------|
| 0 | H (uint16) | 2 bytes | Instantaneous Speed | 0.01 km/h | `speed_kmh = values[0] / 100` |
| 1 | H (uint16) | 2 bytes | Average Speed | 0.01 km/h | `avg_speed_kmh = values[1] / 100` |
| 2 | B (uint8) | 1 byte | Unknown/Reserved | - | - |
| 3 | H (uint16) | 2 bytes | Inclination | 0.1% | `incline_percent = values[3] / 10` |
| 4 | H (uint16) | 2 bytes | Unknown/Reserved | - | - |
| 5 | H (uint16) | 2 bytes | Unknown/Reserved | - | - |
| 6 | H (uint16) | 2 bytes | Unknown/Reserved | - | - |
| 7 | B (uint8) | 1 byte | Unknown/Reserved | - | - |
| 8 | B (uint8) | 1 byte | Unknown/Reserved | - | - |
| 9 | H (uint16) | 2 bytes | Total Distance | meters | Direct value |

**Note**: The flags in the first 2 bytes (`0x8C 0x05` = `140, 5` in the default value) indicate which optional fields are present. The actual fields depend on the FTMS specification and the treadmill's implementation.

#### Usage Example (from code)

```python
# Speed conversion for ANT+ (m/s)
speed_ms = values[0] / 360  # Converts from 0.01 km/h to m/s (100 * 3.6 = 360)

# Distance
distance_m = values[9]

# Inclination (for control)
current_incline = values[3]  # In units of 0.1%
```

---

### Fitness Machine Control Point (0x2AD9) - Outgoing Commands

Commands are written to this characteristic to control the treadmill.

#### Command Format

| OpCode | Name | Parameters | Total Bytes | Description |
|--------|------|------------|-------------|-------------|
| `0x00` | Request Control | None | 1 | Request control of the fitness machine |
| `0x01` | Reset | None | 1 | Reset the fitness machine |
| `0x02` | Set Target Speed | `uint16` (LE) | 3 | Set target speed in 0.01 km/h units |
| `0x03` | Set Target Inclination | `int16` (LE) | 3 | Set target inclination in 0.1% units |
| `0x07` | Start/Resume | None | 1 | Start or resume workout |
| `0x08` | Stop/Pause | `uint8` | 2 | Stop (0x01) or Pause (0x02) workout |

#### Command Examples

```python
# Request Control
control_point_char.write_value(bytearray([0x00]), flags={})

# Reset
control_point_char.write_value(bytearray([0x01]), flags={})

# Set Speed to 5.0 km/h (500 in 0.01 km/h units)
speed = 5.0  # km/h
speed_bytes = bytearray([0x02]) + int(speed * 100).to_bytes(2, byteorder='little')
# Result: [0x02, 0xF4, 0x01] = [0x02, 500 as little-endian uint16]

# Set Inclination to 2.5% (25 in 0.1% units)
incline = 2.5  # percent
incline_bytes = bytearray([0x03]) + int(incline * 10).to_bytes(2, byteorder='little')
# Result: [0x03, 0x19, 0x00] = [0x03, 25 as little-endian int16]

# Start/Resume
control_point_char.write_value(bytearray([0x07]), flags={})

# Pause (0x02 = pause)
control_point_char.write_value(bytearray([0x08, 0x02]), flags={})

# Stop (0x01 = stop)
control_point_char.write_value(bytearray([0x08, 0x01]), flags={})
```

#### Initialization Sequence

```python
# Typical initialization sequence when connecting
control_point_char.write_value(bytearray([0x00]), flags={})  # Request Control
time.sleep(0.25)
control_point_char.write_value(bytearray([0x01]), flags={})  # Reset
time.sleep(0.25)
control_point_char.write_value(bytearray([0x00]), flags={})  # Request Control again
```

---

### Fitness Machine Feature (0x2ACC) - Read

Describes the capabilities of the fitness machine.

```python
# 8-byte feature flags
fmf = [0x0D, 0x16, 0x00, 0x00,  # Fitness Machine Features (4 bytes)
       0x03, 0x00, 0x00, 0x00]  # Target Setting Features (4 bytes)
```

### Supported Speed Range (0x2AD4) - Read

```python
speed_range = [
    0x64, 0x00,  # Minimum speed: 0x0064 = 100 = 1.00 km/h
    0x40, 0x06,  # Maximum speed: 0x0640 = 1600 = 16.00 km/h
    0x0A, 0x00   # Minimum increment: 0x000A = 10 = 0.10 km/h
]
```

### Supported Inclination Range (0x2AD5) - Read

```python
inclination_range = [
    0x00, 0x00,  # Minimum inclination: 0 = 0.0%
    0x64, 0x00,  # Maximum inclination: 100 = 10.0%
    0x05, 0x00   # Minimum increment: 5 = 0.5%
]
```

---

## Connection/Disconnection Logic

### Connection Flow (Central Role)

```
1. Power on BLE adapter
2. Scan for devices advertising FTMS Service UUID (0x1826)
3. Filter out blacklisted addresses (e.g., own peripheral adapter)
4. Connect to first discovered FTMS device
5. Add characteristics to monitor
6. Wait for connection confirmation
7. Start notifications on:
   - Treadmill Data (0x2ACD)
   - Fitness Machine Status (0x2ADA)
   - Training Status (0x2AD3)
8. Initialize treadmill (Request Control → Reset → Request Control)
9. Enter main loop:
   - Process incoming notifications
   - Send control commands when requested
   - Monitor connection status
```

### Disconnection Handling

```python
# When disconnection is detected:
if not monitor.connected:
    # 1. Remove device from bluetoothctl
    subprocess.run(['bluetoothctl', 'remove', dev.address])
    
    # 2. Power cycle the adapter
    dongle.powered = False
    time.sleep(0.5)
    dongle.powered = True
    time.sleep(1)
    
    # 3. Rescan and reconnect
    devices = scan_for_ftms()
    for ftms in devices:
        connect_and_run(ftms)
        break
```

### Scanning Logic

```python
def scan_for_ftms():
    # 1. Get available adapters
    for dongle in adapter.Adapter.available():
        # 2. Filter by adapter address if specified
        if adapter_address != dongle.address:
            continue
        
        # 3. Perform discovery (5 second timeout)
        dongle.nearby_discovery(timeout=5.0)
        
        # 4. Check discovered devices for FTMS service
        for dev in central.Central.available(dongle.address):
            if ftms_srv.lower() in dev.uuids:
                # 5. Filter out blacklisted addresses
                if blacklist_address != dev.address:
                    yield dev
```

---

## Data Flow Summary

### Reading from Treadmill (Central)

```
Treadmill Device
      │
      ▼ (BLE Notifications)
┌─────────────────────────────────────┐
│  Treadmill Data (0x2ACD)            │
│  Raw: bytes (14+ bytes)             │
│  Flags[0:2] + Payload[2:]           │
└─────────────────────────────────────┘
      │
      ▼ (struct.unpack)
┌─────────────────────────────────────┐
│  Parsed Values List [0..9]          │
│  [0] Speed (0.01 km/h)              │
│  [1] Avg Speed (0.01 km/h)          │
│  [3] Inclination (0.1%)             │
│  [9] Distance (m)                   │
└─────────────────────────────────────┘
      │
      ▼ (Conversion)
┌─────────────────────────────────────┐
│  Final Values                       │
│  Speed: values[0] / 100 (km/h)      │
│  Speed: values[0] / 360 (m/s)       │
│  Incline: values[3] / 10 (%)        │
│  Distance: values[9] (m)            │
└─────────────────────────────────────┘
```

### Writing to Treadmill (Central)

```
Application Command
      │
      ▼ (Build command)
┌─────────────────────────────────────┐
│  Command Construction               │
│  OpCode + Parameters (little-endian)│
│  e.g., [0x02, speed_lo, speed_hi]   │
└─────────────────────────────────────┘
      │
      ▼ (BLE Write)
┌─────────────────────────────────────┐
│  Control Point (0x2AD9)             │
│  write_value(bytearray, flags={})   │
└─────────────────────────────────────┘
      │
      ▼
Treadmill Device
```

---

## Key Code References

| Component | File | Key Functions/Methods |
|-----------|------|----------------------|
| Central Connection | [ble_central.py](ble_central.py) | `ble_central_start()`, `connect_and_run()` |
| Device Scanning | [ble_central.py](ble_central.py) | `scan_for_ftms()` |
| Data Parsing | [ble_central.py](ble_central.py) | `on_new_ftms_measurement()` |
| Control Commands | [qt_brigde.py](qt_brigde.py) | `set_speed()`, `set_incline()`, `start_pause()` |
| Peripheral Setup | [ble_peripheral.py](ble_peripheral.py) | `ftms_peripheral_start()` |
| Service Definitions | [ftms.py](ftms.py) | `services` dictionary |

---

## Dependencies

- **bluezero**: Python library for BlueZ D-Bus interface
  - `bluezero.adapter`: BLE adapter management
  - `bluezero.central`: Central role (GATT client)
  - `bluezero.peripheral`: Peripheral role (GATT server)
- **dbus**: D-Bus bindings for BLE communication
- **struct**: Binary data packing/unpacking

---

## Notes for Porting

1. **UUID Format**: The code uses both short (16-bit) and full (128-bit) UUID formats. When porting, ensure your BLE stack supports the format you use.

2. **Byte Order**: All multi-byte values use **little-endian** byte order, as specified by the FTMS standard.

3. **Notification Handling**: The central subscribes to three characteristics for notifications. Your platform needs to support characteristic notifications/indications.

4. **Control Point Response**: The FTMS specification includes responses from the Control Point characteristic (via indications), but this code doesn't explicitly handle them.

5. **Reconnection**: The reconnection logic is platform-specific (uses `bluetoothctl`). You'll need to implement equivalent logic for your target platform.

6. **Thread Safety**: The code uses threading for BLE event loops. Consider your platform's concurrency model.
