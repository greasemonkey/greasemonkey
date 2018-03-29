rivets.formatters.i18n = _;
rivets.formatters.i18nBool = (cond, t, f) => _(cond ? t : f);
rivets.formatters.empty = value => value.length == 0;
rivets.formatters.empty2 = (w, v1, v2) => v1.length == 0 && v2.length == 0;
rivets.formatters.not = value => !value;
