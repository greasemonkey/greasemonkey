'use strict';
tinybind.formatters.i18n = _;
tinybind.formatters.i18nBool = (cond, t, f) => _(cond ? t : f);
tinybind.formatters.empty = value => value.length == 0;
tinybind.formatters.not = value => !value;
tinybind.formatters.i18nUserScript = i18nUserScript;
tinybind.formatters.or = (a, b) => a || b;
tinybind.formatters.trim = value => value.trim();
