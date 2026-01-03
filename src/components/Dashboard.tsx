import React from 'react';
import type { FTMSData } from '../types';

interface DashboardProps {
  data: FTMSData;
}

export const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="dashboard">
      <div className="card">
        <span className="unit">Speed</span>
        <span className="val">{data.speedKmh.toFixed(1)}</span>
        <small>km/h</small>
      </div>
      <div className="card">
        <span className="unit">Heart Rate</span>
        <span className="val hr-val">{data.heartRateBpm ?? '--'}</span>
        <small>bpm</small>
      </div>
      <div className="card">
        <span className="unit">Distance</span>
        <span className="val">{data.distanceMeters}</span>
        <small>m</small>
      </div>
      <div className="card">
        <span className="unit">Time</span>
        <span className="val">{formatTime(data.elapsedTimeSeconds)}</span>
        <small>m:s</small>
      </div>
    </div>
  );
};
