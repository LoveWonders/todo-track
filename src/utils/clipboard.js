export async function copyToClipboard(text) {
  try {
    const { Clipboard } = await import('@capacitor/clipboard');
    await Clipboard.write({ string: text });
    return true;
  } catch {
    // not native, fall through
  }

  try {
    await navigator.permissions.query({ name: 'clipboard-write' });
  } catch {
    // permissions API not available, continue
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // clipboard API failed, try fallback
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '-9999px';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    const ok = document.execCommand('copy');
    if (!ok) throw new Error('execCommand returned false');
    return true;
  } finally {
    document.body.removeChild(textarea);
  }
}
