/**
 * Removes debug block statements from the code.
 *
 * Options:
 *  - `start` start debug tag
 *  - `end` end debug tag
 *  - `inline` inline statement removal
 *
 * @param {Object} options
 * @returns {Function} middleware
 * @api public
 */

module.exports = function setup (options) {
  "use strict";

  var _ = require('lodash')
    , settings = {
        start: /\{\{/
      , end: /\}\}/
      , inline: /\{\{[^\{\{]+?\}\}\n?\r?/
    };

  _.extend(settings, options || {});

  /**
   * The debug middleware.
   *
   * @param {Object} output
   * @param {Function} next
   * @api private
   */

  return function debug (output, next) {
    // setup the configuration based on the plugin configuration
    var configuration = _.extend(
        settings
      , this.package.configuration.plugins.debug
    );

    // setup
    var ignore = 0
      , code;

    // iterate over the lines
    code = output.content.split('\n').map(function map (line) {
      // check if there are tags in here
      var start = configuration.start.test(line)
        , end = configuration.end.test(line)
        , current = ignore;

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
        line = line.replace(configuration.inline, '');
      }

      // check if we have no more ignores left, and that our prev. check also
      // returned 0 because it could be that we are hitting an end tag here that
      // just reduced ignore to 0
      return ignore === 0 && current === 0
        ? line
        : 0;
    }).filter(function filter (item) {
      return item !== 0;
    }).join('\n');

    // replacement is done
    process.nextTick(function nextTick () {
      if (ignore !== 0) return next(new Error('unbalanced debug tags'), output);

      output.content = code;
      next(null, output);
    });
  };
};

/**
 * Small description of what this plugin does.
 *
 * @type {String}
 * @api private
 */

module.exports.description = 'Removes special debug block statements from your code.';
