# FTMS Console Features

Based on the analysis of `html-experiments/test.8.html`, the following features are currently implemented in the prototype:

## 1. Device Connectivity
- **Bluetooth Pairing**: Scans for and connects to Fitness Machine Service (FTMS) devices.
- **Heart Rate Monitor**: Automatically attempts to discover and pair with a Heart Rate service upon connection.
- **Connection Management**: Provides a "Disconnect" button to safely close the Bluetooth connection.

## 2. Real-time Dashboard
- **Speed**: Displays current treadmill speed in km/h.
- **Heart Rate**: Shows real-time heart rate in BPM.
- **Distance**: Tracks accumulated distance in meters.
- **Time**: Displays elapsed workout time in `mm:ss` format.

## 3. Machine Control
- **Start/Stop**: Sends specific command codes to start or stop the treadmill.
- **Speed Adjustment**: 
    - Increase/Decrease speed by **0.1 km/h**.
    - Speed is clamped between **0.8 km/h** and **16.0 km/h**.

## 4. System Logging
- **Event Log**: A scrollable console view.
- **Content**: Displays connection status updates, raw hex commands sent to the device, and error messages.
