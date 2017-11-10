window.addEventListener('click', onClick, true);
window.addEventListener('DOMContentLoaded', onLoad, true);
setInterval(pendingUninstallTicker, 1000);
window.addEventListener('unload', checkPendingUninstall, false);
