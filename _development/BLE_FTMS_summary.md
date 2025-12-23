## Key Findings

### Services Used
- **FTMS Service** (`0x1826`) - Main fitness machine service
- **Device Information Service** (`0x180A`) - For peripheral mode advertising

### Characteristics

| Characteristic | UUID | Direction | Purpose |
|----------------|------|-----------|---------|
| Treadmill Data | `0x2ACD` | Treadmill → App | Real-time metrics via notifications |
| Control Point | `0x2AD9` | App → Treadmill | Send commands (speed, incline, start/stop) |
| Machine Status | `0x2ADA` | Treadmill → App | Status notifications |
| Training Status | `0x2AD3` | Treadmill → App | Training state |

### Data Parsing (Treadmill Data)
The raw notification skips 2 flag bytes, then unpacks using `struct.unpack('<HHBHHHHBBH', payload)`:
- **values[0]**: Speed in 0.01 km/h units (divide by 100 for km/h, by 360 for m/s)
- **values[3]**: Inclination in 0.1% units
- **values[9]**: Distance in meters

### Control Commands
Commands are bytearrays written to `0x2AD9`:
- `[0x00]` - Request control
- `[0x01]` - Reset
- `[0x02, lo, hi]` - Set speed (uint16 little-endian, 0.01 km/h units)
- `[0x03, lo, hi]` - Set inclination (int16 little-endian, 0.1% units)
- `[0x07]` - Start/Resume
- `[0x08, 0x02]` - Pause

### Connection Logic
1. Scan for devices advertising FTMS UUID
2. Connect and subscribe to notifications
3. Initialize with: Request Control → Reset → Request Control
4. On disconnect: remove device, power cycle adapter, rescan and reconnect

Made changes.