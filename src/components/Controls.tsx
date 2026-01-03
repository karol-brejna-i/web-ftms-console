import React from 'react';
import type { ConnectionStatus } from '../types';

interface ControlsProps {
  status: ConnectionStatus;
  currentSpeed: number;
  onStart: () => void;
  onStop: () => void;
  onSetSpeed: (speed: number) => void;
}

export const Controls: React.FC<ControlsProps> = ({ 
  status, 
  currentSpeed, 
  onStart, 
  onStop, 
  onSetSpeed 
}) => {
  const disabled = status !== 'connected';

  return (
    <div className="controls">
      <button 
        className="btn-start" 
        disabled={disabled} 
        onClick={onStart}
      >
        START
      </button>
      <button 
        className="btn-stop" 
        disabled={disabled} 
        onClick={onStop}
      >
        STOP
      </button>
      <button 
        className="btn-speed" 
        disabled={disabled} 
        onClick={() => onSetSpeed(currentSpeed - 0.1)}
      >
        -
      </button>
      <button 
        className="btn-speed" 
        disabled={disabled} 
        onClick={() => onSetSpeed(currentSpeed + 0.1)}
      >
        +
      </button>
    </div>
  );
};
