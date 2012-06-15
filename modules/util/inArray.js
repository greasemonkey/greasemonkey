const EXPORTED_SYMBOLS = ['inArray'];

function inArray(aAry, aVal) {
  for (var i = 0, val = null; val = aAry[i]; i++) {
    if (aVal === val) return true;
  }
  return false;
}
