import { useRef, useCallback } from 'react';

export default function useLongPress(onLongPress, onTap, { threshold = 500, moveThreshold = 10 } = {}) {
  const pressTimerRef = useRef(null);
  const pressMovedRef = useRef(false);
  const pressCoordsRef = useRef({ x: 0, y: 0 });
  const clickHandledRef = useRef(false);

  const clear = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    clickHandledRef.current = false;
  }, []);

  const onTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    pressCoordsRef.current = { x: touch.clientX, y: touch.clientY };
    pressMovedRef.current = false;
    pressTimerRef.current = setTimeout(() => {
      pressTimerRef.current = null;
      if (!pressMovedRef.current) {
        clickHandledRef.current = true;
        onLongPress(pressCoordsRef.current);
      }
    }, threshold);
  }, [onLongPress, threshold]);

  const onTouchMove = useCallback((e) => {
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - pressCoordsRef.current.x);
    const dy = Math.abs(touch.clientY - pressCoordsRef.current.y);
    if (dx > moveThreshold || dy > moveThreshold) {
      pressMovedRef.current = true;
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
        pressTimerRef.current = null;
      }
    }
  }, [moveThreshold]);

  const onTouchEnd = useCallback((e) => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
      if (!pressMovedRef.current) {
        clickHandledRef.current = true;
        onTap(e);
      }
    }
  }, [onTap]);

  const onMouseDown = useCallback((e) => {
    pressCoordsRef.current = { x: e.clientX, y: e.clientY };
    pressMovedRef.current = false;
    pressTimerRef.current = setTimeout(() => {
      pressTimerRef.current = null;
      if (!pressMovedRef.current) {
        clickHandledRef.current = true;
        onLongPress(pressCoordsRef.current);
      }
    }, threshold);
  }, [onLongPress, threshold]);

  const onMouseMove = useCallback((e) => {
    if (!pressTimerRef.current) return;
    const dx = Math.abs(e.clientX - pressCoordsRef.current.x);
    const dy = Math.abs(e.clientY - pressCoordsRef.current.y);
    if (dx > moveThreshold || dy > moveThreshold) {
      pressMovedRef.current = true;
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, [moveThreshold]);

  const onMouseUp = useCallback((e) => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
      if (!pressMovedRef.current) {
        clickHandledRef.current = true;
        onTap(e);
      }
    }
  }, [onTap]);

  const onMouseLeave = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  return {
    clickHandledRef,
    clear,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
  };
}
