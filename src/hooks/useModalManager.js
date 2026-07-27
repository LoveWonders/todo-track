import { useState, useCallback } from 'react';

export default function useModalManager() {
  const [showCompleteDateModal, setShowCompleteDateModal] = useState(false);

  const openCompleteDateModal = useCallback(() => setShowCompleteDateModal(true), []);
  const closeCompleteDateModal = useCallback(() => setShowCompleteDateModal(false), []);

  return { showCompleteDateModal, openCompleteDateModal, closeCompleteDateModal };
}
