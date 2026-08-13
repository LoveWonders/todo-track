export function showNativeDatePicker({ type = 'date', value = '', onPick }) {
  const input = document.createElement('input');
  input.type = type;
  if (value) input.value = value;
  input.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0';
  document.body.appendChild(input);

  const cleanup = () => {
    if (document.body.contains(input)) document.body.removeChild(input);
  };

  input.addEventListener('change', (e) => {
    const picked = e.target.value;
    cleanup();
    if (picked && onPick) onPick(picked);
  }, { once: true });

  input.addEventListener('blur', () => { setTimeout(cleanup, 200); }, { once: true });

  requestAnimationFrame(() => {
    if (typeof input.showPicker === 'function') {
      input.showPicker();
    } else {
      input.focus();
    }
  });

  return input;
}
