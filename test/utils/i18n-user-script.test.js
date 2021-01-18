'use strict';

window.browser = { i18n: {} };

describe('i18n-user-script', () => {
  describe('i18nUserScript()', () => {
    it('If the localized text exists in only one of the @name or @descriptions', () => {
      let script = new RunnableUserScript({
        name: 'name',
        locales: {
          de: {
            name: 'de name',
          },
          fr: {
            description: 'fr description',
          },
        },
      });

      browser.i18n.getUILanguage = () => 'de';
      assert.equal(i18nUserScript('name', script), 'de name');
      assert.isNull(i18nUserScript('description', script));

      browser.i18n.getUILanguage = () => 'fr';
      assert.equal(i18nUserScript('name', script), 'name');
      assert.equal(i18nUserScript('description', script), 'fr description');
    });
  });
});
