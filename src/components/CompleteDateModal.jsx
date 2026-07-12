import { useState, useCallback } from 'react';

function todayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function CompleteDateModal({ count, onConfirm, onCancel }) {
  const [dateVal, setDateVal] = useState(todayStr());

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onCancel();
  };

  const openCalendar = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'date';
    input.value = /^\d{4}-\d{2}-\d{2}$/.test(dateVal) ? dateVal : todayStr();
    input.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0';
    document.body.appendChild(input);

    const cleanup = () => {
      if (document.body.contains(input)) document.body.removeChild(input);
    };

    input.addEventListener('change', (e) => {
      const picked = e.target.value;
      if (picked) setDateVal(picked);
      cleanup();
    });

    input.addEventListener('blur', () => {
      setTimeout(cleanup, 200);
    });

    requestAnimationFrame(() => {
      if (typeof input.showPicker === 'function') {
        input.showPicker();
      } else {
        input.focus();
      }
    });
  }, [dateVal]);

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-card">
        <div className="modal-header">
          <span className="modal-title">批量修改完成时间</span>
        </div>
        <div className="modal-body">
          <p className="modal-desc">为选中的 {count} 个待办设置完成时间</p>
          <div className="modal-date-row">
            <input
              type="text"
              className="modal-date-input"
              value={dateVal}
              onChange={e => setDateVal(e.target.value)}
              placeholder="YYYY-MM-DD"
            />
            <button type="button" className="calendar-btn" onClick={openCalendar} title="选择日期">&#x1F4C5;</button>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-mini btn-mini-cancel" onClick={onCancel}>取消</button>
          <button className="btn-mini btn-mini-save" onClick={() => onConfirm(dateVal)}>确认</button>
        </div>
      </div>
    </div>
  );
}
