var _ = require('underscore')._;

/**
 * Removes debug block statements from the code.
 *
 * Options:
 *  - `start` start debug tag
 *  - `end` end debug tag
 *
 * @param {Object} options
 * @returns {Function} middeware
 * @api public
 */

module.exports = function setup (options) {
  var settings = {
      start: '{{'
    , end: '}}'
  };

  _.extend(settings, options || {});

  /**
   * The debug middleware.
   *
   * @param {String} content
   * @param {Function} next
   * @api private
   */

  return function debug (content, next) {
    var ignore = 0
      , code;

    // iterate over the lines
    code = content.split('\n').map(function map (line) {
      // check if there are tags in here
      var startpos = line.indexOf(settigns.start)
        , endpos = line.indexOf(settings.end)
        , start = -~startpos
        , end = -~endpos;

      // ignore the current line
      if (start) {
        ignore++;
      }

      // stop ignoring the next line
      if (end) {
        ignore--;
      }

      // oh it was an inline tag!
      if (start && end) {
        line = line.slice(0, start) + line.slice(end, line.length);
      }

      return ingore === 0 ? line : 0;
    }).filter(function filter (item) {
      return item !== 0
    }).join('\n');

    // replacement is done
    process.nextTick(function nextTick () {
      if (ignore !== 0) return next(new Error('unbalanced debug tags'), content);

      next(null, code);
    });
  };
};
