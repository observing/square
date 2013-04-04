'use strict';

/**!
 * [square]
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.it>
 * MIT Licensed
 */

/**
 * Native modules.
 */
var EventEmitter = require('events').EventEmitter
  , path = require('path')
  , fs = require('fs');

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
  this.logger = {};               // Our logging utility.
  this.collection = collection;   // Reference to the original collection.

  // Provide a default namespace to the logging method, we are going to prefix
  // it with the plugin's name which will help with the debug ability of this
  // module.
  Object.keys(square.logger.levels).forEach(function generate(level) {
    self.logger[level] = square.logger[level].bind(
        square.logger
      , '[plugin::'+ self.id +']'
    );
  });

  // Merge the given collection with the plugin, but don't override the default
  // values.
  Object.keys(collection).forEach(function each(key) {
    self[key] = collection[key];
  });

  // Force an async nature of the plugin interface, this also allows us to
  // attach or listen to methods after we have constructed the plugin.
  process.nextTick(this.configure.bind(this));
}

// The plugin is based on a EventEmitter which we will spice up using our
// EventReactor <3.
Plugin.prototype.__proto__ = EventEmitter.prototype;
Plugin.EventReactor = new EventReactor({}, Plugin.prototype);

_.extend(Plugin, {
    /**
     * The name of the plugin.
     *
     * @type {String}
     * @api public
     */
    id: 'plugin'

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
  , type: 'plugin::modifier'

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
});

_.extend(Plugin.prototype, {
    /**
     * Configure the plugin, prepare all the things.
     *
     * @api private
     */
    configure: function configure() {
      var pkg = this.square.package
        , configuration = pkg.configuration
        , type = this.type || Plugin.modifier
        , self = this
        , load = [];

      // Check for the distribution and if it should accept the given extension,
      // extend self with the context of the plugin.
      if (!~type.indexOf('once') && (!this.distributable() || !this.accepted())) {
        this.logger.debug(
            'disregarding this plugin for extension: '+ this.extension
          +', distribution: '+ this.distribution
        );
        return this.emit('disregard');
      }

      // Check if there are any configuration options in the package.
      if (_.isObject(pkg.plugins) && this.id in pkg.plugins) {
        this.merge(this, pkg.plugins[this.id]);
      }

      // Merge in the plugin configuration.
      if (
           configuration
        && _.isObject(configuration.plugins)
        && this.id in configuration.plugins
      ) {
        this.merge(this, configuration.plugins[this.id]);
      }

      // Check if the bundle it self also had specific configurations for this
      // plugin.
      if (this.id in this && _.isObject(this[this.id])) {
        this.merge(this, this[this.id]);
      }

      // Ensure that our requires is an array, before we continue
      if (!Array.isArray(this.requires)) this.requires = [this.requires];

      // Check if we need to lazy load any dependencies
      if (this.requires && this.requires.length) {
        load = this.requires.map(function (file) {
          if (typeof file !== 'object') return file;
          if (!('extension' in file)) return file.name || file;
          if (file.extension === self.extension) return file.name || file;

          return undefined;
        }).filter(Boolean); // Only get existing files

        // Only fetch shizzle when we actually have shizzle to fetch here
        if (load.length) return canihaz.apply(canihaz, load.concat(function canihaz(err) {
          if (err) return self.emit('error', err);

          // Add all the libraries to the context, the `canihaz#all` returns an
          // error first, and then all libraries it installed or required in the
          // order as given to it, which is in our case the `this.requires` order.
          Array.prototype.slice.call(arguments, 1).forEach(function (lib, index) {
            self[load[index]] = lib;
          });

          // We are now fully initialized.
          if (self.initialize) self.initialize();
        }));
      }

      // We are now fully initialized.
      if (self.initialize) self.initialize();
    }

    /**
     * A small wrapper around the `canihaz` module so we don't have to expose
     * that interface to our users. It also checks all other available paths for
     * the module if it cannot require it first.
     *
     * @param {String} name name of the module
     * @param {Function} cb callback
     * @api public
     */
  , require: function requireAllTheThings(name, cb) {
      process.nextTick(function ticktock() {
        try { return cb(undefined, require(name)); }
        catch (e) { /* ignore the error, module does not exist */ }

        // try to see if the module is in the paths array of square
        var found = this.paths.some(function some(location) {
          try {
            cb(undefined, require(path.join(location + '/' + name )));
            return true;
          } catch (e) { return false; }
        });

        if (found) return;
        if (name in canihaz) return canihaz[name](cb);

        // This module does not exist, so return an error to the callback.
        cb(new Error('This module is not defined in the dependencies'));
      }.bind(this.square));
    }

    /**
     * Check if this distribution is accepted.
     *
     * @returns {Boolean}
     * @api private
     */
  , distributable: function distributable() {
      if (!Array.isArray(this.distributions)) {
        return this.distributions === this.distribution;
      }

      if (!this.distributions.length) {
        return true;
      }

      return !!~this.distributions.indexOf(this.distribution);
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

    /**
     * Attempt to load local and project hint configurations. Where the
     * project level configuration overrules the local <hint>rc configurations.
     *
     * @param {String} name The name of the parser who's config to load
     * @api private
     */
  , readrc: function readrc(name) {
      name = '.'+ name + 'rc';

      this.each([
          path.resolve(process.env.PWD, name)
        , path.resolve(this.square.home, name)
      ], function read(dir) {
        if (fs.exists(dir)) {
          this.merge(this, this.fromJSON(dir));
          return false;
        }
      }, this);

      return this;
    }

    /**
     * Destroy any references.
     *
     * @api private
     */
  , destroy: function destroy() {
      return this.removeAllListeners();
    }

    /**
     * Merge in objects.
     *
     * @param {Object} target The object that receives the props
     * @param {Object} additional Extra object that needs to be merged in the target
     * @api public
     */
  , merge: function merge(target, additional) {
      var result = target
        , undefined;

      if (Array.isArray(target)) {
        this.forEach(additional, function arrayForEach(index) {
          if (JSON.stringify(target).indexOf(JSON.stringify(additional[index])) === -1) {
            result.push(additional[index]);
          }
        });
      } else if ('object' === typeof target) {
        this.forEach(additional, function objectForEach(key, value) {
          if (target[key] === undefined) {
            result[key] = value;
          } else {
            result[key] = merge(target[key], additional[key]);
          }
        });
      } else {
        result = additional;
      }

      return result;
    }

    /**
     * Iterate over a collection. When you return false, it will stop the iteration.
     *
     * @param {Mixed} collection Either an Array or Object.
     * @param {Function} iterator Function to be called for each item
     * @api public
     */
  , forEach: function forEach(collection, iterator, context) {
      if (arguments.length === 1) {
        iterator = collection;
        collection = this;
      }

      var isArray = Array.isArray(collection || this)
        , length = collection.length
        , i = 0
        , value;

      if (context) {
        if (isArray) {
          for (; i < length; i++) {
            value = iterator.apply(collection[ i ], context);
            if (value === false) break;
          }
        } else {
          for (i in collection) {
            value = iterator.apply(collection[ i ], context);
            if (value === false) break;
          }
        }
      } else {
        if (isArray) {
          for (; i < length; i++) {
            value = iterator.call(collection[i], i, collection[i]);
            if (value === false) break;
          }
        } else {
          for (i in collection) {
            value = iterator.call(collection[i], i, collection[i]);
            if (value === false) break;
          }
        }
      }

      return this;
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
