export default function ToggleSwitch({ checked, onChange, label, hint }) {
  return (
    <span className="toggle-wrap">
      <span
        className={`detail-toggle ${checked ? 'on' : ''}`}
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={!!checked}
      >
        <span className="detail-toggle-knob" />
      </span>
      {(label || hint) && (
        <span className="detail-toggle-hint">{checked && label ? label : (label || hint)}</span>
      )}
    </span>
  );
}
