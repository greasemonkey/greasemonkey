function logUnhandledError() {
  if (chrome.runtime.lastError) {
    console.error('GM Unhandled:', chrome.runtime.lastError);
  }
}
