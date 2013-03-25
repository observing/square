'use strict';

/**!
 * [square]
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.it>
 * MIT Licensed
 */
var Plugin = require('../plugin')
  , async = require('async');

/**
 * Replace content enclosed in braces, e.g. {key}. Each provided key will be
 * replaced with its value. Replaces are done with global regular expressions
 * and can be differentiated between distributions.
 *
 */
module.exports = Plugin.extend({
    /**
     * Name of the module.
     *
     * @type {String}
     */
    id: 'replace'

    /**
     * Small description about the module.
     *
     * @type {String}
     */
  , description: [
        'Replace content enclosed in braces, e.g. {key}.'
      , 'Each provided key will be replaced with its value'
    ].join(' ')

    /**
     * For which distributions should this run.
     *
     * @type {Array}
     */
  , distributions: ['min', 'dev']

    /**
     * Which file extension are accepted.
     *
     * @type {Array}
     */
  , accepts: ['js', 'css']

    /**
     * The module is initialized and checks if we need to replace anything.
     */
  , initialize: function initialize() {
      var self = this
        , replacements = this.square.config.plugins.replace
        , code = this.content
        , literals
        , replacer;

      // If we got nothing to replace, just return.
      if (!replacements || !replacements[this.distribution]) {
        return this.emit('data', code);
      }

      // Loop each key replacement combination, wrap in brackets.
      literals = replacements[this.distribution];
      async.forEach(Object.keys(literals), function loopReplacements (original, done) {
        var regex = typeof literals[original] === 'object';

        // Check for requirements.
        if (regex && (!literals[original].regex || !literals[original].value)) {
          return done(
            'Provide a proper regex and value if your using replace with ' +
            'regular expressions. Value for key `' + original + '` is not replaced.'
          );
        }

        // Use key or the Regular Expression and remove added slashes.
        replacer = self.wrap(
          regex ? literals[original].regex.replace(/^\/|\/$/g, '') : original
        );

        // Check if the Regular Expression is any good.
        if (regex) {
          try {
            new RegExp(replacer);
          } catch (e) {
            return done('Invalid regular expression: '+ e);
          }
        }

        // Regular expression is required to do global replace.
        code = code.replace(
            new RegExp(replacer, 'g')
          , regex ? literals[original].value : literals[original]
        );

        // Results are ready to be returned.
        done(null);
      }, function done(err) {
        if (err) self.emit('error', new Error(err));

        self.emit('data', code);
      });
    }

    /**
     * Wrap the search literal in double braces.
     *
     * @param {String} literal to be wrapped
     * @return {String} wrapped literal
     * @api private
     */
  , wrap: function wrap(literal) {
      return '{{' + literal + '}}';
    }
});
