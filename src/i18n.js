function _(str, ...subs) {
  let result = chrome.i18n.getMessage.call(null, str, subs);
  if (!result) console.warn('Missing i18n str:', str);
  return result || str;
}
