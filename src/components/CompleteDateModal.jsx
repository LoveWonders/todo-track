import { useState, useCallback } from 'react';
import ModalShell from './ModalShell';
import { showNativeDatePicker } from '../utils/datePicker';
import { todayDateString } from '../utils/dateParser';

export default function CompleteDateModal({ count, onConfirm, onCancel }) {
  const [dateVal, setDateVal] = useState(todayDateString());
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
      setError('日期格式应为 YYYY-MM-DD');
      return;
    }
    setError('');
    onConfirm(dateVal);
  };

  const openCalendar = useCallback(() => {
    showNativeDatePicker({
      type: 'date',
      value: /^\d{4}-\d{2}-\d{2}$/.test(dateVal) ? dateVal : todayDateString(),
      onPick: (picked) => setDateVal(picked),
    });
  }, [dateVal]);

  return (
    <ModalShell
      title="批量修改完成时间"
      onClose={onCancel}
      footer={
        <>
          <button className="btn-secondary" onClick={onCancel}>取消</button>
          <button className="btn-primary" onClick={handleConfirm}>确认</button>
        </>
      }
    >
      <p className="modal-desc">为选中的 {count} 个待办设置完成时间</p>
      <div className="modal-date-row">
        <input
          type="text"
          className="modal-date-input"
          value={dateVal}
          onChange={e => { setDateVal(e.target.value); setError(''); }}
          placeholder="YYYY-MM-DD"
        />
        <button type="button" className="calendar-btn" onClick={openCalendar} title="选择日期">&#x1F4C5;</button>
      </div>
      {error && <p className="modal-date-error">{error}</p>}
    </ModalShell>
  );
}
