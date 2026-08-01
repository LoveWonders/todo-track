export default function FloatingActionButton({ onClick, hidden }) {
  return (
    <button
      className={`fab ${hidden ? 'fab-hidden' : ''}`}
      onClick={onClick}
      title="新建任务"
      tabIndex={hidden ? -1 : 0}
    >
      <span>+</span>
    </button>
  );
}
