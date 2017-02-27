const scripts = [
  {
    'id': '0e9aded7-3ded-4690-92b6-3672b83eb242',
    'code': `
      console.log("A script ran at start!", location.search);
      if (document.body) document.body.className='start-script';
      console.log(document.documentElement.outerHTML.substring(0, 125));
      var then = new Date().valueOf() + 1000; while (new Date().valueOf() < then) ;;
      var p = document.createElement('p');
      p.innerText = "Paragraph from start script.";
      document.body.appendChild(p);
      void(0);
    `,
    'runAt': 'start'
  },
  {
    'id': '0e9aded7-3ded-4690-92b6-3672b83eb242',
    'code': `
      console.log("A script ran at end!", location.search);
      var p = document.createElement('p');
      p.innerText = "Paragraph from end script.";
      document.body.appendChild(p);
      void(0);
    `,
    'runAt': 'end'
  },
  {
    'id': '0e9aded7-3ded-4690-92b6-3672b83eb242',
    'code': `
      console.log("A script ran at idle!", location.search);
      var p = document.createElement('p');
      p.innerText = "Paragraph from idle script.";
      document.body.appendChild(p);
      void(0);
    `,
    'runAt': 'idle'
  }
];

// onBeforeNavigate is too soon, operates on the current document, before
//   navigation to the new one
// onCommitted is too late for document_start, inline scripts already ran
browser.webNavigation.onCommitted.addListener(detail => {
  for (var script of scripts) {
    try {
      var options = {
        'code': script.code,
        'matchAboutBlank': true,
        'runAt': 'document_' + script.runAt
      };
      if (detail.frameId) options.frameId = detail.frameId;
      var r = browser.tabs.executeScript(detail.tabId, options);
      r.then(v => console.log('execute result?', r, v));
    } catch (e) {
      console.error(e);
    }
  }
});
