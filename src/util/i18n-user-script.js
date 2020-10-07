'use strict';
function i18nUserScript(keyword, userScript) {
  let localeValuePairs = {};
  for (let locale in userScript.locales) {
    let value = userScript.locales[locale][keyword];
    if (value) {
      localeValuePairs[locale] = value;
    }
  }

  let locale = getBestLocaleMatch(browser.i18n.getUILanguage(), Object.keys(localeValuePairs));
  return locale ? localeValuePairs[locale] : userScript[keyword];
}
