(function() {
window.addEventListener('load', init, false);

function addonIsInstalledScript(aAddon) {
  if (!aAddon) return false;
  if ('user-script' != aAddon.type) return false;
  if (aAddon._script.needsUninstall) return false;
  return true;
}

function init() {
  gViewController.commands.cmd_userscript_edit = {
      isEnabled: addonIsInstalledScript,
      doCommand: function(aAddon) { GM_openInEditor(aAddon._script); }
    };
  gViewController.commands.cmd_userscript_show = {
      isEnabled: addonIsInstalledScript,
      doCommand: function(aAddon) { GM_openFolder(aAddon._script.file); }
    };

  document.getElementById('addonitem-popup').addEventListener(
      'popupshowing', onContextPopupShowing, false);
}

function onContextPopupShowing(aEvent) {
  var popup = aEvent.target;
  var viewIsUserScripts = (
      'addons://list/user-script' == gViewController.currentViewId);
  for (var i = 0, menuitem = null; menuitem = popup.children[i]; i++) {
    var menuitemIsUserScript = ('user-script' == menuitem.getAttribute('type'));
    menuitem.collapsed = viewIsUserScripts != menuitemIsUserScript;
  }
}

})();
