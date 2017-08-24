rivets.formatters.empty = value => value.length == 0;
rivets.formatters.active = value => value ? 'active' : 'disabled';
rivets.formatters.enabled = value => value ? 'Enabled' : 'Disabled';
rivets.formatters.not = value => !value;
