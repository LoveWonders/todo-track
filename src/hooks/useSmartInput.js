import { useState, useEffect, useCallback } from 'react';
import { parseSmartInput } from '../utils/parseSmartInput';

export function useSmartInput(initialText = '') {
  const [text, setText] = useState(initialText);
  const [parsed, setParsed] = useState({
    cleanContent: '',
    startDate: null,
    dueDate: null,
    tags: []
  });

  useEffect(() => {
    if (!text.trim()) {
      setParsed({ cleanContent: '', startDate: null, dueDate: null, tags: [] });
      return;
    }
    const timer = setTimeout(() => {
      setParsed(parseSmartInput(text));
    }, 400);
    return () => clearTimeout(timer);
  }, [text]);

  const submit = useCallback(() => {
    const result = parseSmartInput(text);
    setText('');
    return result;
  }, [text]);

  const clear = useCallback(() => {
    setText('');
    setParsed({ cleanContent: '', startDate: null, dueDate: null, tags: [] });
  }, []);

  return { text, setText, parsed, submit, clear };
}
