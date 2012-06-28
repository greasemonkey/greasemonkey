const EXPORTED_SYMBOLS = ['anonWrap'];

function anonWrap(aSource) {
  return ['(function(){\n', aSource, '\n})()'].join('');
}
