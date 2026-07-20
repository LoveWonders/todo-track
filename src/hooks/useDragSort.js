import { useState, useRef, useCallback } from 'react';

export default function useDragSort(filteredTodos, moveTodoTo) {
  const [dragId, setDragId] = useState(null);
  const [dragY, setDragY] = useState(0);
  const [dropIdx, setDropIdx] = useState(-1);
  const [dragFromIdx, setDragFromIdx] = useState(-1);
  const lastTargetRef = useRef(-1);
  const itemElsRef = useRef({});
  const throttleTimerRef = useRef(null);
  const dropIdxRef = useRef(-1);

  const setItemRef = useCallback((id, el) => {
    if (el) {
      itemElsRef.current[id] = el;
    } else {
      delete itemElsRef.current[id];
    }
  }, []);

  const handleDragStart = useCallback((id, coords) => {
    const idx = filteredTodos.findIndex(t => t.id === id);
    if (idx === -1) return;
    setDragFromIdx(idx);
    lastTargetRef.current = idx;
    setDragId(id);
    setDropIdx(idx);
    setDragY(coords.y);
  }, [filteredTodos]);

  const handleDragMove = useCallback((e) => {
    if (!dragId) return;
    e.preventDefault();
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    setDragY(y);

    let closest = lastTargetRef.current;
    let minDist = Infinity;
    for (const [id, el] of Object.entries(itemElsRef.current)) {
      if (Number(id) === dragId) continue;
      const rect = el.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      const dist = Math.abs(y - mid);
      if (dist < minDist) {
        minDist = dist;
        closest = filteredTodos.findIndex(t => t.id === Number(id));
      }
    }
    lastTargetRef.current = closest;

    if (throttleTimerRef.current) return;
    throttleTimerRef.current = setTimeout(() => {
      throttleTimerRef.current = null;
    }, 50);

    if (closest !== dropIdxRef.current) {
      dropIdxRef.current = closest;
      setDropIdx(closest);
    }
  }, [dragId, filteredTodos]);

  const handleDragEnd = useCallback(() => {
    if (!dragId) return;
    const toIdx = lastTargetRef.current;
    if (toIdx !== dragFromIdx && dragFromIdx >= 0 && toIdx < filteredTodos.length) {
      moveTodoTo(dragId, toIdx);
    }
    setDragId(null);
    setDragFromIdx(-1);
    setDropIdx(-1);
    lastTargetRef.current = -1;
    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current);
      throttleTimerRef.current = null;
    }
  }, [dragId, dragFromIdx, filteredTodos.length, moveTodoTo]);

  return {
    dragId,
    dragY,
    dropIdx,
    dragFromIdx,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    setItemRef,
  };
}
