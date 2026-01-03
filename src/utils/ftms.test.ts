import { describe, it, expect } from 'vitest';
import { parseTreadmillData, parseHeartRate } from './ftms';

describe('FTMS Parsing', () => {
  it('parses treadmill data correctly', () => {
    // Mock buffer: Flags(2) + Speed(2) + Dist(3) + ... + Time(2)
    // Let's construct a buffer that matches the expected layout.
    // Speed: 10.5 km/h -> 1050 -> 0x041A
    // Distance: 1000m -> 0x0003E8
    // Time: 60s -> 0x003C
    
    const buffer = new ArrayBuffer(15); // Arbitrary length matching original check
    const view = new DataView(buffer);
    
    // Speed at offset 2
    view.setUint16(2, 1050, true);
    
    // Distance at offset 4 (24-bit)
    view.setUint8(4, 0xE8);
    view.setUint8(5, 0x03);
    view.setUint8(6, 0x00);
    
    // Time at end (length - 2)
    view.setUint16(13, 60, true);

    const result = parseTreadmillData(view);
    
    expect(result).toEqual({
      speedKmh: 10.5,
      distanceMeters: 1000,
      elapsedTimeSeconds: 60
    });
  });

  it('parses 8-bit heart rate', () => {
    const buffer = new ArrayBuffer(2);
    const view = new DataView(buffer);
    view.setUint8(0, 0b00000000); // Flag: 8-bit
    view.setUint8(1, 75);         // 75 BPM
    
    expect(parseHeartRate(view)).toBe(75);
  });

  it('parses 16-bit heart rate', () => {
    const buffer = new ArrayBuffer(3);
    const view = new DataView(buffer);
    view.setUint8(0, 0b00000001); // Flag: 16-bit
    view.setUint16(1, 300, true); // 300 BPM (unrealistic but tests parsing)
    
    expect(parseHeartRate(view)).toBe(300);
  });
});
