'use strict';

/**!
 * [square]
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.it>
 * MIT Licensed
 */
var Plugin = require('../plugin');

/**
 * Obfuscate JavaScript, there are firewalls that cannot handle ActiveX in the
 * script body and drop the file as a result of this. This tool fixes that
 * issue.
 *
 * @api public
 */
module.exports = Plugin.extend({
    /**
     * Name of the module.
     *
     * @type {String}
     */
    name: 'obfuscation'

    /**
     * Small description about the module.
     *
     * @type {String}
     */
  , description: [
        'Obfuscates code that contains Active-X statements as these are blocked'
      , 'by agressive firewalls suck as Bluecoat.'
    ].join(' ')

    /**
     * For which distributions should this run.
     *
     * @type {Array}
     */
  , distributions: ['dev', 'min']

    /**
     * Which file extension are accepted.
     *
     * @type {String}
     */
  , accepts: 'js'

    /**
     * Which modules need to be lazy loaded and installed in order to make this
     * module work.
     *
     * @type {String}
     */
  , requires: 'active-x-obfuscator'

    /**
     * The module has been initialized.
     */
  , initialize: function initialize() {
      var activex = this['active-x-obfuscator'];

      try { this.emit('data', activex(this.content)); }
      catch (e) { this.emit('error', e); }
    }
});
