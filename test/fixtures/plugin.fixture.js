var _ = require('lodash');

/**
 * Simple helper fixture that helps us with testing the plugin system.
 *
 * @type {Function}
 * @api public
 */

module.exports = function fixture(options) {
  "use strict";

  var square = this
    , settings = {
        'throw': false
      , 'no-content': false
    };

  square.emit('plugin.fixture:init', options, this);
  _.extend(settings, options || {});

  return function middleware(output, next) {
    square.emit('plugin.fixture:call', output, this);

    if (settings['throw'] === true) throw new Error('throwing an error');
    next();
  };
};
