export default function ProgressDefaultBar({ allCount, onShowInput, onManage }) {
  return (
    <>
      <button className="btn-mini btn-add-progress" onClick={onShowInput}>+ 添加进度</button>
      {allCount > 0 && (
        <button className="btn-mini btn-add-progress" style={{ marginLeft: 'auto' }} onClick={onManage}>管理进度</button>
      )}
    </>
  );
}
