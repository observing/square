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
      , 'change-content': false
      , 'error-argument': false
      , 'unique-id': 0
    };

  square.emit('plugin.fixture:init', options, this);
  _.extend(settings, options || {});

  return function middleware(output, next) {
    square.emit('plugin.fixture:call', output, this);

    // we need to emit an id, so we can see if the plugins are processed in the
    // correct order
    if (settings['unique-id'] > 0) {
      square.emit('plugin.fixture:id', settings['unique-id']);
    }

    // throwing does not trigger the next function, which is awesome as we can
    // see if we can change the content
    if (settings['throw'] === true) throw new Error('throwing an error');

    // call the callback function without any content, it should just fallback
    // to the old "backup" version of the content
    if (settings['no-content'] === true) return next();

    // change the content to something
    if (settings['change-content'] === true) {
      output.content = 'changed the content';
      return next(null, output);
    }

    // call the function's with an error argument instead of throwing it
    if (settings['error-argument'] === true) {
      return next(new Error('error argument'));
    }

    // fallback if none of the fixtures above are tested
    next(null, output);
  };
};
