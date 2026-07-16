import { useState, useRef, useEffect } from 'react';
import { getIsNative } from '../utils/storage';

export function useBackButton({ view, setView, batchMode, exitBatch }) {
  const [exitPrompt, setExitPrompt] = useState(false);
  const exitTimerRef = useRef(null);

  const viewRef = useRef(view);
  const batchModeRef = useRef(batchMode);
  const exitPromptRef = useRef(false);

  viewRef.current = view;
  batchModeRef.current = batchMode;
  exitPromptRef.current = exitPrompt;

  useEffect(() => {
    if (!getIsNative()) return;

    let listenerHandle = null;

    const setup = async () => {
      const { App } = await import('@capacitor/app');
      listenerHandle = await App.addListener('backButton', () => {
        if (batchModeRef.current) {
          exitBatch();
          return;
        }

        if (viewRef.current !== 'active') {
          setView('active');
          return;
        }

        if (exitPromptRef.current) {
          App.exitApp();
        } else {
          setExitPrompt(true);
          if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
          exitTimerRef.current = setTimeout(() => {
            setExitPrompt(false);
          }, 2000);
        }
      });
    };

    setup();

    return () => {
      listenerHandle?.remove();
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
      }
    };
  }, [exitBatch, setView]);

  return exitPrompt;
}
