'use strict';

/**!
 * [square]
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.it>
 * MIT Licensed
 */

/**
 * Native modules.
 */
var EventEmitter = require('events').EventEmitter;

/**
 * Third party modules.
 */
var canihaz = require('canihaz')('square')
  , async = require('async')
  , _ = require('lodash');

/**
 * Plugin interface for square.
 *
 * @constructor
 * @param {Square} square
 * @param {Object} options
 * @api public
 */
function Plugin(square, options) {
  if (!(this instanceof Plugin)) return new Plugin(square, options);

  this.square = square;           // reference to the current square instance
  this.logger = square.logger;    // the logger
  this.async = async;             // handle async operation
  this._ = _;                     // utilities

  _.extend(this, options || {});
  this.configure();
}

Plugin.prototype.__proto__ = EventEmitter.prototype;

_.extend(Plugin.prototype, {
    /**
     * The name of the plugin.
     *
     * @type {String}
     * @api public
     */
    name: 'plugin'

    /**
     * A small description of the plugin
     *
     * @type {String}
     * @api public
     */
  , description: 'Base template for every plugin'

    /**
     * Array of extensions that we accept. Leave empty to accept every
     * extension.
     *
     * @type {Array}
     * @api public
     */
  , accepts: []

    /**
     * Which distributions do we parse modify.
     *
     * @type {Array}
     * @api public
     */
  , distributions: []

    /**
     * The modules that should be lazy installed using `canihaz`
     *
     * @type {Array}
     * @api public
     */
  , lazy: []

    /**
     * Configure the plugin, prepare all the things.
     *
     * @api private
     */
  , configure: function configure() {
      var pkg = this.square.package
        , configuration = pkg.configuration
        , self = this;

      // Check if there are any configuration options in the package.
      if (pkg.plugins && this.name in pkg.plugins) {
        _.extend(this, pkg.plugins[this.name] || {});
      }

      // Check if the bundle it self also had specific configurations for this
      // plugin.
      if (this.name in this) {
        _.extend(this, this[this.name] || {});
      }

      if (this.lazy && this.lazy.length) {
        canihaz.all.apply(canihaz.all, this.lazy.concat(function canihaz(err) {
          if (err) return self.emit('error', err);

          // Add all the libraries to the context, the `canihaz#all` returns an
          // error first, and then all libraries it installed or required in the
          // order as given to it, which is in our case the `this.lazy` order.
          Array.prototype.slice.call(arguments, 1).forEach(function (lib, index) {
            self[self.lazy[index]] = lib;
          });

          // We are now fully initialized
          if (self.initialize) self.initialize();
        }));
      }
    }

    /**
     * Check if this distribution is accepted.
     *
     * @returns {Boolean}
     * @api private
     */
  , distribution: function distribution() {

    }

    /**
     * Check if we accept these extensions.
     *
     * @returns {Boolean}
     * @api private
     */
  , accepted: function accepted() {

    }
});

/**
 * Make the plugin extendable so every thing inherits from this `class`.
 *
 * @type {Function}
 * @api public
 */
Plugin.extend = require('extendable');

/**
 * Expose the module.
 */
module.exports = Plugin;
