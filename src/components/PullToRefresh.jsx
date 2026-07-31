import { useState, useRef, useCallback } from 'react';

export default function PullToRefresh({ onRefresh, children }) {
  const [dragY, setDragY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const touchStarted = useRef(false);

  const handleTouchStart = useCallback((e) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      touchStarted.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!touchStarted.current) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    if (diff > 0) {
      e.preventDefault();
      setDragY(diff * 0.4);
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!touchStarted.current) return;
    touchStarted.current = false;

    if (dragY > 80) {
      setRefreshing(true);
      setDragY(100);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setDragY(0);
      }
    } else {
      setDragY(0);
    }
  }, [dragY, onRefresh]);

  return (
    <div
      className="pull-to-refresh-container"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="refresh-indicator"
        style={{
          height: dragY > 0 ? dragY : 0,
          opacity: dragY > 0 ? Math.min(dragY / 80, 1) : 0,
        }}
      >
        {refreshing ? (
          <div className="refresh-spinner" />
        ) : (
          <div className="refresh-icon">↓</div>
        )}
      </div>
      {children}
    </div>
  );
}
