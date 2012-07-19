/**
 * Simple helper fixture that helps us with testing the plugin system.
 *
 * @type {Function}
 * @api public
 */

module.exports = function fixture(options) {
  "use strict";

  var square = this;
  square.emit('plugin.fixture:init', options, this);

  return function middleware(output, next) {
    square.emit('plugin.fixture:call', output, this);

    next();
  };
};
