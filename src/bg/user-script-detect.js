/* Add listeners to detect user scripts and open the installation dialog. */

(function() {

const userScriptTypes = [
   'text/plain',
   'application/ecmascript',
   'application/javascript',
   'application/x-javascript',
   'text/ecmascript',
   'text/javascript',
];
const contentTypeRe = new RegExp(`(${userScriptTypes.join('|')})(;.*)?`);

function catchParseUserScript(userScriptContent, url) {
  try {
    return parseUserScript(userScriptContent, url, true);
  } catch (err) {
    // It's not important why the parse failed or threw. Just treat it as the
    // parsing was unsuccessful and fetch more data.
    // Log the error so it isn't silently dismissed.
    // TODO: This may flood the console
    console.info('Detect script parse error', err);
    return false;
  }
}


// Examine headers before determining if script checking is needed
function checkHeaders(responseHeaders) {
  let typeValue = collectHeader(responseHeaders, 'Content-Type');
  if (typeValue && contentTypeRe.test(typeValue)) {
    return  true;
  } else {
    return false;
  }
}


// Check if enough content is available to open an install message
function checkScript(userScriptContent, details, contentPromise) {
  let scriptDetails = catchParseUserScript(userScriptContent, details.url);
  if (scriptDetails) {
    ScriptInstall.downloadForRequest(details, scriptDetails, contentPromise);
    return true;
  } else {
    return false;
  }
}


function collectHeader(responseHeaders, name) {
  name = name.toLowerCase();
  for (header of responseHeaders) {
    let headerName = header.name.toLowerCase();
    if (name == headerName) {
      return header.value;
    }
  }
  return null;
}


function detectUserScriptOnHeadersReceived(details) {
  if (!getGlobalEnabled() || !checkHeaders(details.responseHeaders)) {
    return {};
  }

  let decoder = new TextDecoder("utf-8");
  let filter = chrome.webRequest.filterResponseData(details.requestId);

  let userScriptContent = '';
  let filterSize = 0;
  let contentSize =
      Number(collectHeader(details.responseHeaders, 'Content-Length'));
  let contentResolve;
  let contentReject;
  let contentPromise = new Promise((resolve, reject) => {
    contentResolve = resolve; contentReject = reject;
  });

  // If the script is valid then don't keep checking as new data comes in
  let skipCheck = false;

  filter.ondata = event => {
    userScriptContent = userScriptContent
        + decoder.decode(event.data, {'stream': true});
    filterSize += event.data.byteLength;
    filter.write(event.data);

    if (!skipCheck && checkScript(userScriptContent, details, contentPromise)) {
      // Stop checking if the script is valid.
      skipCheck = true;
    } else if (skipCheck && contentSize) {
      // A dialog has been opened and progress should be tracked.
      let progress = filterSize / contentSize;
      ScriptInstall.reportRequestProgress(details.requestId, progress);
    }
  };
  filter.onstop = event => {
    // One last progress report
    if (skipCheck) {
      ScriptInstall.reportRequestProgress(details.requestId, 1);
    }
    contentResolve(userScriptContent);
    filter.close();
  };

  return {};
}
window.detectUserScriptOnHeadersReceived = detectUserScriptOnHeadersReceived;

})();
