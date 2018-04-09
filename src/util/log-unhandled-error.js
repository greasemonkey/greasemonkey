function logUnhandledError() {
  if (chrome.runtime.lastError) {
    console.error('GM unhandled error:', chrome.runtime.lastError.message);
  }
}
