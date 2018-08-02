'use strict';
const SUPPORTED_APIS = new Set([
    'GM.deleteValue', 'GM.getValue', 'GM.listValues', 'GM.setValue',
    'GM.getResourceUrl',
    'GM.notification',
    'GM.openInTab',
    'GM.setClipboard',
    'GM.xmlHttpRequest',
    ]);
