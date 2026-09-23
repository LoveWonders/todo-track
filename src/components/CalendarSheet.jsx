import { useMemo, useState } from 'react';
import ModalShell from './ModalShell';
import { WEEKDAY_LABELS } from '../utils/repeat';
import { pad2 } from '../utils/datePatterns';

const WEEKDAY_SHORT = WEEKDAY_LABELS.map(l => l.slice(1));

function parseValue(value) {
  if (!value || typeof value !== 'string') return { date: null, hh: '23', mi: '59' };
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!m) return { date: null, hh: '23', mi: '59' };
  return {
    date: new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])),
    hh: m[4] || '23',
    mi: m[5] || '59',
  };
}

function sameDay(a, b) {
  return a && b
    && a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function buildCells(year, month) {
  const first = new Date(year, month, 1);
  const dow = first.getDay();
  const mondayOffset = dow === 0 ? 6 : dow - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < mondayOffset; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function toDateValue(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export default function CalendarSheet({ type, value, onPick, onClose }) {
  const parsed = parseValue(value);
  const initial = parsed.date || new Date();
  const [cursor, setCursor] = useState(() => new Date(initial.getFullYear(), initial.getMonth(), 1));
  const [selected, setSelected] = useState(() => parsed.date);
  const [hh, setHh] = useState(parsed.hh);
  const [mi, setMi] = useState(parsed.mi);
  const withTime = type === 'datetime-local';
  const today = useMemo(() => new Date(), []);
  const cells = useMemo(
    () => buildCells(cursor.getFullYear(), cursor.getMonth()),
    [cursor],
  );

  const shiftMonth = (delta) => {
    setCursor(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const shiftYear = (delta) => {
    setCursor(prev => new Date(prev.getFullYear() + delta, prev.getMonth(), 1));
  };

  const pickDay = (d) => {
    setSelected(d);
    if (!withTime) onPick(toDateValue(d));
  };

  const goToday = () => {
    const now = new Date();
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
    pickDay(day);
  };

  const confirmDateTime = () => {
    if (!selected) return;
    onPick(`${toDateValue(selected)}T${pad2(Number(hh) || 0)}:${pad2(Number(mi) || 0)}`);
  };

  return (
    <ModalShell
      title="选择日期"
      onClose={onClose}
      overlayClassName="calendar-overlay"
      footerClassName="cal-footer"
      footer={(
        <>
          <button type="button" className="btn-secondary" onClick={goToday}>今天</button>
          {withTime ? (
            <span className="cal-footer-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>取消</button>
              <button type="button" className="btn-primary" onClick={confirmDateTime} disabled={!selected}>确认</button>
            </span>
          ) : <span />}
        </>
      )}
    >
      <div className="cal-nav">
        <div className="cal-nav-btns">
          <button type="button" className="cal-nav-btn" onClick={() => shiftYear(-1)} aria-label="上一年">&#x00AB;</button>
          <button type="button" className="cal-nav-btn" onClick={() => shiftMonth(-1)} aria-label="上一月">&#x2039;</button>
        </div>
        <span className="cal-nav-title">{cursor.getFullYear()}年{cursor.getMonth() + 1}月</span>
        <div className="cal-nav-btns">
          <button type="button" className="cal-nav-btn" onClick={() => shiftMonth(1)} aria-label="下一月">&#x203A;</button>
          <button type="button" className="cal-nav-btn" onClick={() => shiftYear(1)} aria-label="下一年">&#x00BB;</button>
        </div>
      </div>
      <div className="cal-grid">
        {WEEKDAY_SHORT.map(label => (
          <span key={label} className="cal-weekday">{label}</span>
        ))}
        {cells.map((d, i) => (
          d ? (
            <button
              key={d.getTime()}
              type="button"
              className={`cal-day${sameDay(d, today) ? ' today' : ''}${sameDay(d, selected) ? ' selected' : ''}`}
              onClick={() => pickDay(d)}
            >
              {d.getDate()}
            </button>
          ) : <span key={`e${i}`} className="cal-day empty" />
        ))}
      </div>
      {withTime && (
        <div className="cal-time-row">
          <span className="cal-time-label">时间</span>
          <input
            type="time"
            className="cal-time-input"
            value={`${pad2(Number(hh) || 0)}:${pad2(Number(mi) || 0)}`}
            onChange={(e) => {
              const [h, m] = (e.target.value || '23:59').split(':');
              setHh(h);
              setMi(m);
            }}
          />
        </div>
      )}
    </ModalShell>
  );
}
