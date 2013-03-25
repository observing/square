'use strict';

/**!
 * [square]
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.it>
 * MIT Licensed
 */
var Plugin = require('../plugin');

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
        , replacements = this.square.package.configuration.replacements
        , code = this.content
        , literals;

      // If we got nothing to replace, just return.
      if (!replacements) return this.emit('data', code);
      literals = replacements[this.distribution];

      // Loop each key replacement combination, wrap in brackets.
      // DO ASYNC LOOP
      Object.keys(literals).forEach(function loopReplacements (original) {
        var regex = typeof literals[original] === 'object';

        // Check for requirements.
        if (regex && (!literals[original].regex || !literals[original].value)) {
          this.emit('error', new Error(
            'Provide a proper regex and value if your using replace with ' +
            'regular expressions. Value for key `' + original + '` is not replaced.'
          ));
        }

        // Regular expression is required to do global replace.
        code = code.replace(
            new RegExp(regex ? literals[original].regex : original, 'g')
          , regex ? literals[original].value : literals[original]
        );
      });

      this.emit('data', code);
    }
});
