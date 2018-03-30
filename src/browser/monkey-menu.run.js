window.addEventListener('DOMContentLoaded', onLoad, false);
window.addEventListener('contextmenu', onContextMenu, false);
window.addEventListener('click', onClick, false);
window.addEventListener('mouseover', onMouseOver, false);
window.addEventListener('mouseout', onMouseOut, false);
window.addEventListener('keydown', onKeyDown, false);
window.addEventListener('transitionend', onTransitionEnd, false);

// When closing, navigate to main including its 'trigger pending uninstall'.
window.addEventListener('unload', navigateToMainMenu, false);
