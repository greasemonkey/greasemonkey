const EXPORTED_SYMBOLS = ['emptyEl'];

function emptyEl(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}
