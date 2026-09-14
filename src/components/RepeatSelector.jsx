import { CYCLE_LABELS, WEEKDAY_LABELS, anchorLabel } from '../utils/repeat';

export default function RepeatSelector({ rule, anchor, onChange, showMonthlyHint = false }) {
  const setRule = (next) => {
    if (rule === next) onChange(null, null);
    else onChange(next, null);
  };

  return (
    <>
      <div className="add-row">
        <span className="add-row-label">设为重复</span>
        <span className="add-row-value">
          <div className="repeat-selector">
            {['daily', 'weekly', 'monthly'].map(r => (
              <button
                key={r}
                className={`repeat-opt ${rule === r ? 'active' : ''}`}
                onClick={() => setRule(r)}
              >
                {CYCLE_LABELS[r]}
              </button>
            ))}
          </div>
          <span className="repeat-state-hint">{rule ? anchorLabel(rule, anchor) : '不重复'}</span>
        </span>
      </div>
      {rule === 'weekly' && (
        <div className="repeat-anchor-row" style={{ marginLeft: 70 }}>
          {WEEKDAY_LABELS.map((label, i) => (
            <button
              key={i}
              className={`repeat-anchor-opt ${anchor === i + 1 ? 'active' : ''}`}
              onClick={() => onChange('weekly', anchor === i + 1 ? null : i + 1)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {rule === 'monthly' && (
        <div className="repeat-anchor-row" style={{ marginLeft: 70 }}>
          <input
            type="number"
            min="1"
            max="31"
            className="repeat-anchor-input"
            value={Number.isInteger(anchor) ? anchor : ''}
            placeholder="号数"
            onChange={e => {
              const raw = e.target.value;
              if (raw === '') {
                onChange('monthly', null);
                return;
              }
              const v = Math.min(31, Math.max(1, Number(raw)));
              onChange('monthly', Number.isNaN(v) ? null : v);
            }}
          />
          <button
            className={`repeat-anchor-opt ${anchor === 'last' ? 'active' : ''}`}
            onClick={() => onChange('monthly', anchor === 'last' ? null : 'last')}
          >
            月末
          </button>
          {showMonthlyHint && <span className="detail-toggle-hint">不选则每月最后一天到期</span>}
        </div>
      )}
    </>
  );
}
