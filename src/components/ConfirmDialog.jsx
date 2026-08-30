import ModalShell from './ModalShell';

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  danger = false,
  onConfirm,
  onCancel,
  children,
}) {
  if (!open) return null;
  return (
    <ModalShell
      title={title}
      onClose={onCancel}
      footer={
        <>
          {cancelText && (
            <button className="btn-secondary" onClick={onCancel}>{cancelText}</button>
          )}
          <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>
            {confirmText}
          </button>
        </>
      }
    >
      {description && <p className="modal-desc">{description}</p>}
      {children}
    </ModalShell>
  );
}
