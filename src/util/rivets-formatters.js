'use strict';
tinybind.formatters.i18n = _;
tinybind.formatters.i18nBool = (cond, t, f) => _(cond ? t : f);
tinybind.formatters.empty = value => value.length == 0;
tinybind.formatters.not = value => !value;
