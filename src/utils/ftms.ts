export function parseTreadmillData(dataView: DataView) {
  // FTMS Treadmill Data (0x2ACD)
  // Flags are usually the first 2 bytes, but our prototype assumed specific offsets.
  // Based on previous code:
  // Speed: Bytes 2-3 (uint16, 0.01 km/h)
  // Distance: Bytes 4-6 (24-bit uint)
  // Time: Last 2 bytes (uint16)

  if (dataView.byteLength < 7) {
    return null;
  }

  const speedKmh = dataView.getUint16(2, true) / 100;
  
  // 24-bit integer for distance
  const distanceMeters = dataView.getUint8(4) + 
                        (dataView.getUint8(5) << 8) + 
                        (dataView.getUint8(6) << 16);
  
  // Time is often at the end, but let's be safe with the index from the original code
  // Original: b.getUint16(b.byteLength - 2, true);
  const elapsedTimeSeconds = dataView.getUint16(dataView.byteLength - 2, true);

  return {
    speedKmh,
    distanceMeters,
    elapsedTimeSeconds
  };
}

export function parseHeartRate(dataView: DataView) {
  // HR Measurement (0x2A37)
  // Byte 0: Flags
  // Byte 1: HR Value (if UINT8 flag is set, which is bit 0 being 0)
  
  if (dataView.byteLength < 2) return null;

  const flags = dataView.getUint8(0);
  const isUint16 = (flags & 1) === 1;

  if (isUint16) {
    // If 16-bit, it takes 2 bytes (offset 1 and 2)
    if (dataView.byteLength < 3) return null;
    return dataView.getUint16(1, true);
  } else {
    // If 8-bit, it takes 1 byte (offset 1)
    return dataView.getUint8(1);
  }
}
