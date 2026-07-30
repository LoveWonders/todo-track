export default function FloatingActionButton({ onClick }) {
  return (
    <button className="fab" onClick={onClick} title="新建任务">
      <span>+</span>
    </button>
  );
}
