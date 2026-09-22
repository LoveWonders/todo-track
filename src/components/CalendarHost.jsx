import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import CalendarSheet from './CalendarSheet';
import { bindCalendarHost } from '../utils/datePicker';

export default function CalendarHost() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    bindCalendarHost(opts => setSession(opts));
    return () => bindCalendarHost(null);
  }, []);

  if (!session) return null;

  return createPortal(
    <CalendarSheet
      type={session.type}
      value={session.value}
      onPick={(picked) => {
        const cb = session.onPick;
        setSession(null);
        if (picked && cb) cb(picked);
      }}
      onClose={() => setSession(null)}
    />,
    document.body,
  );
}
