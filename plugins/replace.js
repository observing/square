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
    name: 'replace'

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
     * The module is initialized
     */
  , initialize: function initialize() {
      var self = this;
    }
});
