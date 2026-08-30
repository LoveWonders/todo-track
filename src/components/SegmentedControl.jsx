export default function SegmentedControl({ value, options, onChange }) {
  return (
    <div className="settings-segmented">
      {options.map(opt => (
        <button
          key={opt.value}
          className={`settings-seg-item ${value === opt.value ? 'active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
