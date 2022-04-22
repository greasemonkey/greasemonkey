#!/usr/bin/env python3
"""Serve updatable user scripts.

This server will start at version 1, then return a higher version number each
time one of its ten scripts are downloaded.  In other words, for (auto) update
purposes, the script always has an update available.
"""

import collections
import re

from http.server import BaseHTTPRequestHandler, HTTPServer


USER_JS = """// ==UserScript==
// @name        Update Test %d
// @description A simple user script with a version, that can be (auto) updated.
// @version     %d
// @grant       none
// ==/UserScript==

// Empty!
"""
VERSIONS = collections.defaultdict(lambda: 1)


class S(BaseHTTPRequestHandler):
  def do_GET(self):
    self.send_response(200)

    if '.user.js' in self.path:
      m = re.match(r'.*-([0-9]+)\.user\.js', self.path)
      n = 0
      if m: n = int(m.group(1))

      self.send_header('Content-Type', 'text/plain')
      self.send_header('Content-Length', len(USER_JS))
      self.end_headers()
      self.wfile.write(USER_JS % (n, VERSIONS[n]))

      VERSIONS[n] += 1
    else:
      self.send_header('Content-Type', 'text/html')
      self.end_headers()
      for i in range(0, 10):
        self.wfile.write(
            "Here's <a href='updatable-%d.user.js'>user script %d</a>.<br>"
            % (i, i))


if __name__ == '__main__':
  from sys import argv

  port = 8000
  if len(argv) == 2:
    port = int(argv[1])

  print('Starting httpd at http://localhost:%d/ ...' % port)
  httpd = HTTPServer(('', port), S)
  httpd.serve_forever()
