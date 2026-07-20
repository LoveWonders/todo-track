import { useState, useEffect, useMemo } from 'react';

export default function Countdown({ dueDate }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 600000);
    return () => clearInterval(timer);
  }, []);

  const display = useMemo(() => {
    if (!dueDate) return null;

    const target = new Date(dueDate);
    if (isNaN(target.getTime())) return null;

    const diff = target - Date.now();

    if (diff < 0) {
      const abs = Math.abs(diff);
      const days = Math.floor(abs / 86400000);
      if (days > 0) return { className: 'countdown overdue', text: `已超${days}天` };
      const hours = Math.floor((abs % 86400000) / 3600000);
      return { className: 'countdown overdue', text: `已超${hours}小时` };
    }

    const days = Math.floor(diff / 86400000);
    if (days > 0) return { className: 'countdown', text: `${days}天后` };
    const hours = Math.floor((diff % 86400000) / 3600000);
    if (hours > 0) return { className: 'countdown near', text: `${hours}小时后` };
    const minutes = Math.floor((diff % 3600000) / 60000);
    return { className: 'countdown urgent', text: `${minutes}分钟后` };
  }, [dueDate]);

  if (!display) return null;

  return <span className={display.className}>{display.text}</span>;
}
