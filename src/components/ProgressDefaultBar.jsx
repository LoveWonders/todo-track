export default function ProgressDefaultBar({ showInput, progressText, allCount, onShowInput, onTextChange, onKeyDown, onSubmit, onCancelInput, onManage }) {
  if (showInput) {
    return (
      <>
        <input type="text" placeholder="输入工作进度..." value={progressText}
          onChange={e => onTextChange(e.target.value)} onKeyDown={onKeyDown} autoFocus />
        <button className="btn-mini btn-mini-save" onClick={onSubmit}>保存</button>
        <button className="btn-mini btn-mini-cancel" onClick={onCancelInput}>&times;</button>
      </>
    );
  }

  return (
    <>
      <button className="btn-mini btn-add-progress" onClick={onShowInput}>+ 添加进度</button>
      {allCount > 0 && (
        <button className="btn-mini btn-add-progress" style={{ marginLeft: 'auto' }} onClick={onManage}>管理进度</button>
      )}
    </>
  );
}
