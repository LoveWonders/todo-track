export default function ModalShell({
  title,
  onClose,
  footer,
  children,
  className = '',
  bodyClassName = '',
  bodyStyle,
  footerClassName = '',
  maxWidth,
  overlayClassName = '',
  closeOnOverlay = true,
  showClose = true,
}) {
  const handleOverlay = (e) => {
    if (closeOnOverlay && e.target === e.currentTarget) onClose();
  };

  return (
    <div className={`modal-full-overlay ${overlayClassName}`} onClick={handleOverlay}>
      <div
        className={`modal-full-sheet ${className}`}
        onClick={(e) => e.stopPropagation()}
        style={maxWidth ? { maxWidth } : undefined}
      >
        <div className="modal-full-header">
          <span className="modal-full-title">{title}</span>
          {showClose && (
            <button className="modal-full-close" onClick={onClose}>&times;</button>
          )}
        </div>
        <div className={`modal-full-body ${bodyClassName}`} style={bodyStyle}>
          {children}
        </div>
        {footer && (
          <div className={`modal-full-footer ${footerClassName}`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
