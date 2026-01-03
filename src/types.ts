export interface FTMSData {
  speedKmh: number;
  distanceMeters: number;
  elapsedTimeSeconds: number;
  heartRateBpm: number | null;
}

export interface LogEntry {
  id: number;
  timestamp: string;
  message: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';
