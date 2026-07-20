import { useState, useEffect } from 'react';

export default function Countdown({ dueDate }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 600000);
    return () => clearInterval(timer);
  }, []);

  const now = new Date();
  const target = new Date(dueDate);
  const diff = target - now;

  if (diff < 0) {
    const abs = Math.abs(diff);
    const days = Math.floor(abs / 86400000);
    if (days > 0) return <span className="countdown overdue">已超{days}天</span>;
    const hours = Math.floor((abs % 86400000) / 3600000);
    return <span className="countdown overdue">已超{hours}小时</span>;
  }

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);

  if (days > 0) return <span className="countdown">{days}天后</span>;
  if (hours > 0) return <span className="countdown near">{hours}小时后</span>;
  return <span className="countdown urgent">{minutes}分钟后</span>;
}
