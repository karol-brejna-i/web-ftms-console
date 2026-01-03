import React, { useEffect, useRef } from 'react';
import type { LogEntry } from '../types';

interface ConsoleLogProps {
  logs: LogEntry[];
}

export const ConsoleLog: React.FC<ConsoleLogProps> = ({ logs }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="console">
      {logs.length === 0 && <div>System ready. Waiting for connection...</div>}
      {logs.map((log) => (
        <div key={log.id} className="log-entry">
          [{log.timestamp}] {log.message}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
};
