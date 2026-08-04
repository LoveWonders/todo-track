import { useState, useEffect } from 'react';

export default function Countdown({ dueDate }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  let display = null;
  if (dueDate) {
    const target = new Date(dueDate);
    if (!isNaN(target.getTime())) {
      const diff = target - Date.now();

      if (diff < 0) {
        const abs = Math.abs(diff);
        const days = Math.floor(abs / 86400000);
        if (days > 0) {
          display = { className: 'countdown overdue', text: `已超${days}天` };
        } else {
          const hours = Math.floor((abs % 86400000) / 3600000);
          display = { className: 'countdown overdue', text: `已超${hours}小时` };
        }
      } else {
        const days = Math.floor(diff / 86400000);
        if (days > 0) {
          display = { className: 'countdown', text: `${days}天后` };
        } else {
          const hours = Math.floor((diff % 86400000) / 3600000);
          if (hours > 0) {
            display = { className: 'countdown near', text: `${hours}小时后` };
          } else {
            const minutes = Math.floor((diff % 3600000) / 60000);
            display = { className: 'countdown urgent', text: `${minutes}分钟后` };
          }
        }
      }
    }
  }

  if (!display) return null;

  return <span className={display.className}>{display.text}</span>;
}
