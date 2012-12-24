'use strict';

/**!
 * [square]
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.it>
 * MIT Licensed
 */
var Plugin = require('../plugin');

/**
 * Removes special crafted debug block statements from the code. There debug
 * blocks are wrapped in double curly braces.
 *
 * Options:
 *  - `start` start debug tag
 *  - `end` end debug tag
 *  - `inline` inline statement removal
 *
 * @api public
 */
module.exports = Plugin.extend({
    /**
     * Name of the module.
     *
     * @type {String}
     */
    name: 'debug'

    /**
     * Small description about the module.
     *
     * @type {String}
     */
  , description: [
        'Removes debug statements from the source code.'
    ].join(' ')

    /**
     * For which distributions should this run.
     *
     * @type {String}
     */
  , distributions: 'min'

    /**
     * Which file extension are accepted.
     *
     * @type {String}
     */
  , accepts: 'js'

    /**
     * Matches the start of the debug statement.
     *
     * @type {RegExp}
     */
  , start: /\{\{/

    /**
     * Matches the end of the debug statement.
     *
     * @type {RegExp}
     */
  , end: /\}\}/

    /**
     * Remove everything that matches this RegExp as it targets an single line
     * debug statement.
     *
     * @type {RegExp}
     */
  , inline: /\{\{[^\{\{]+?\}\}\n?\r?/

    /**
     * The module has been initialized.
     */
  , initialize: function initialize() {
      var ignore = 0
        , self = this
        , code;

      code = this.content.split('\n').map(function map(line) {
        // Check if there are tags in here.
        var start = self.start.test(line)
          , end = self.end.test(line)
          , current = ignore;

        // Ignore the current line.
        if (start) ignore++;

        // Stop ignoring the next line.
        if (end) ignore--;

        // Oh it was an inline tag!
        if (start && end) line = line.replace(self.inline, '');

        // Check if we have no more ignores left, and that our prev. check also
        // returned 0 because it could be that we are hitting an end tag here that
        // just reduced ignore to 0.
        return ignore === 0 && current === 0
          ? line
          : 0;
      }).filter(function filter(item) {
        return item !== 0;
      }).join('\n');

      if (ignore !== 0) {
        this.emit('error', new Error('Unbalanced debug tags'));
      } else {
        this.emit('data', code);
      }
    }
});
