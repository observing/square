'use strict';

/**!
 * [square]
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.it>
 * MIT Licensed
 */
var Plugin = require('../../plugin');

/**
 * Simple helper fixture that helps us with testing the plugin system.
 *
 * @type {Function}
 * @api public
 */
module.exports = Plugin.extend({
    /**
     * Name of the module.
     *
     * @type {String}
     */
    name: 'Fixture'

    /**
     * Small description about the module.
     *
     * @type {String}
     */
  , description: [
        'Simple fixture for testing the plugins integration'
    ].join(' ')

    /**
     * For which distributions should this run.
     *
     * @type {Array}
     */
  , distributions: []

    /**
     * Which file extension are accepted.
     *
     * @type {Array}
     */
  , accepts: []

    /**
     * Should we throw an Error, just for fun and giggles
     *
     * @type {Boolean}
     */
  , 'throw': false

    /**
     * Should we return nothing as content?
     *
     * @type {Boolean}
     */
  , 'no-content': false

    /**
     * Should we change the content?
     *
     * @type {Boolean}
     */
  , 'change-content': false

    /**
     * Should we use an error argument.
     *
     * @type {Boolean}
     */
  , 'error-argument': false

    /**
     * An unique id.
     *
     * @type {Number}
     */
  , 'unique-id': 0

    /**
     * Initialize all the things.
     */
  , initialize: function initialize() {
      this.square.emit('plugin.fixture:call', this);

      // we need to emit an id, so we can see if the plugins are processed in the
      // correct order
      if (+this['unique-id'] > 0) {
        this.square.emit('plugin.fixture:id', this['unique-id']);
      }

      // throwing does not trigger the next function, which is awesome as we can
      // see if we can change the content
      if (this['throw'] === true) throw new Error('throwing an error');

      // call the callback function without any content, it should just fallback
      // to the old "backup" version of the content
      if (this['no-content'] === true) return this.emit('data');

      // change the content to something
      if (this['change-content'] === true) {
        return this.emit('data', 'changed the content');
      }

      // call the function's with an error argument instead of throwing it
      if (this['error-argument'] === true) {
        return this.emit('error', new Error('error argument'));
      }

      // always emit something
      this.emit('data', this.content);
    }
});
