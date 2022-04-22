#!/usr/bin/env python3
"""Serve a user script, slowly.

Serve a `.user.js` over HTTP, but very slowly.  The script will stream out
over the course of several seconds.  It will take roughly two seconds before
the `==UserScript==` header finishes, and several more before the rest of
the script finishes.
"""

import time

from http.server import BaseHTTPRequestHandler, HTTPServer


USER_JS = """// ==UserScript==
// @name        Red Border
// @description A super simple user script with an unobtrusive way of being clear that it's running.
// @namespace   test
// @include     http*
// @version     1
// @grant       none
// ==/UserScript==

document.body.style.border = '3px dashed red';

"""
for i in range(50):
  USER_JS += '// %d ...\n' % i


class S(BaseHTTPRequestHandler):
  def do_GET(self):
    self.send_response(200)

    if '.user.js' in self.path:
      self.send_header('Content-Type', 'text/plain')
      self.send_header('Content-Length', len(USER_JS))
      self.end_headers()
      for line in USER_JS.splitlines():
        self.wfile.write(line + '\n')
        time.sleep(0.25)
    else:
      self.send_header('Content-Type', 'text/html')
      self.end_headers()
      self.wfile.write(
          'I can serve <a href="anything.user.js">a user script</a>, slowly.')


if __name__ == '__main__':
  from sys import argv

  port = 8000
  if len(argv) == 2:
    port = int(argv[1])

  print('Starting httpd at http://localhost:%d/ ...' % port)
  httpd = HTTPServer(('', port), S)
  httpd.serve_forever()
