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
var EventReactor = require('eventreactor')
  , canihaz = require('canihaz')('square')
  , async = require('async')
  , _ = require('lodash');

/**
 * Plugin interface for square.
 *
 * @constructor
 * @param {Square} square
 * @param {Object} collection
 * @api public
 */
function Plugin(square, collection) {
  if (!(this instanceof Plugin)) return new Plugin(square, collection);
  if (!square) throw new Error('Missing square instance');
  if (!collection) throw new Error('Missing collection');

  var self = this;

  this.square = square;           // Reference to the current square instance.
  this.async = async;             // Handle async operation.
  this._ = _;                     // Utilities.
  this.logger = {};               // Our logging utility

  // Provide a default namespace to the logging method, we are going to prefix
  // it with the plugin's name which will help with the debug ability of this
  // module.
  Object.keys(square.logger.levels).forEach(function generate(level) {
    self.logger[level] = square[level].bind(square, self.name);
  });

  // Merge the given collection with the plugin, but don't override the default
  // values.
  Object.keys(collection).forEach(function each(key) {
    if (key in self) {
      return self.logger.warning(
          'The '
        + self.name
        + ' plugin uses a property that would be overriden by the collection.'
      );
    }

    // Add the property
    self[key] = collection[key];
  });

  this.configure();
}

// The plugin is based on a EventEmitter which we will spice up using our
// EventReactor <3.
Plugin.prototype.__proto__ = EventEmitter.prototype;
Plugin.EventReactor = new EventReactor({}, Plugin.prototype);

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
     * What type of transformations does this plugin do?
     *
     * @type {String}
     * @api public
     */
  , type: Plugin.modifier

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
  , requires: []

    /**
     * Configure the plugin, prepare all the things.
     *
     * @api private
     */
  , configure: function configure() {
      var pkg = this.square.package
        , configuration = pkg.configuration
        , self = this;

      // Should we allow this plugin to run? It should accept the correct
      // distribution and it should accept the given extension.
      if (!this.distribution() || !this.accepted()) {
        return this.emit('disregard');
      }

      // Check if there are any configuration options in the package.
      if (pkg.plugins && this.name in pkg.plugins) {
        _.extend(this, pkg.plugins[this.name] || {});
      }

      // Check if the bundle it self also had specific configurations for this
      // plugin.
      if (this.name in this) {
        _.extend(this, this[this.name] || {});
      }

      // Ensure that our requires is an array, before we continue
      if (!Array.isArray(this.requires)) this.requires = [this.requires];

      if (this.requires && this.requires.length) {
        canihaz.all.apply(canihaz.all, this.requires.concat(function canihaz(err) {
          if (err) return self.emit('error', err);

          // Add all the libraries to the context, the `canihaz#all` returns an
          // error first, and then all libraries it installed or required in the
          // order as given to it, which is in our case the `this.requires` order.
          Array.prototype.slice.call(arguments, 1).forEach(function (lib, index) {
            self[self.requires[index]] = lib;
          });

          // We are now fully initialized.
          if (self.initialize) process.nextTick(self.initialize.bind(self));
        }));
      } else {
        process.nextTick(self.initialize.bind(self));
      }
    }

    /**
     * Check if this distribution is accepted.
     *
     * @returns {Boolean}
     * @api private
     */
  , distribution: function distribution() {
      if (!Array.isArray(this.distributions)) return this.distributions === this.dist;
      if (!this.distributions.length) return true;

      return !!~this.distributions.indexOf(this.dist);
    }

    /**
     * Check if we accept these extensions.
     *
     * @returns {Boolean}
     * @api private
     */
  , accepted: function accepted() {
      if (!Array.isArray(this.accepts)) return this.accepts === this.extension;
      if (!this.accepts.length) return true;

      return !!~this.accepts.indexOf(this.extension);
    }
});

/**
 * Differentiate between the different types of plugins. The `update` plugin
 * only needs to run once for the whole lifetime of the script. While the minify
 * script should run against each file and a test plugin should only run after
 * everything is compiled.
 *
 * To accommodate all these different states when the plugin should run we have
 * to use plugin types.
 *
 * - Plugin.modifier: This modifies the content, and should run every single time.
 * - Plugin.after: This plugin is ran after is compiled correctly.
 * - Plugin.once: This plugin should only run once.
 *
 * @type {String} in plugin::{type} format
 * @api public
 */
Plugin.modifier = 'plugin::modifier';
Plugin.after    = 'plugin::after';
Plugin.once     = 'plugin::once';

/**
 * Make the plugin extendible so every thing inherits from this `class`.
 *
 * @type {Function}
 * @api public
 */
Plugin.extend = require('extendable');

/**
 * Expose the module.
 */
module.exports = Plugin;
