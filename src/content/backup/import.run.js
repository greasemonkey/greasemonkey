'use strict';
document.querySelector('input[type=file]')
    .addEventListener('change', onFileChange, true);
tinybind.bind(document.documentElement, gImportOptions);
