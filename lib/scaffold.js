'use strict';

/**!
 * [square]
 * @copyright (c) 2013 observe.it (observe.it) <opensource@observe.it>
 * MIT Licensed
 */

/**
 * Required modules.
 */
var path = require('path')
  , nconf = require('nconf');

/**
 * @Constructor
 * @api public
 */
function Scaffold() { };

/**
 * Proxy to use nconf#file storage.
 *
 * @param {String} location file location
 * @return {Object} self
 * @api public
 */
Scaffold.prototype.init = function init(location) {
  // Only provide file bindings for the moment.
  this.conf = new nconf.File({ file: location })

  // This will ensure a saved file always includes an configuration and bundle.
  if (!this.conf.get('configuration')) this.conf.set('configuration', {});
  if (!this.conf.get('bundle')) this.conf.set('bundle', {});

  return this;
};

/**
 * Return the actual config for quick use.
 *
 * @return {Object} configured scaffold
 * @api public
 */
Scaffold.prototype.get = function get() {
  return this.conf.store;
};

/**
 * Add the distribution path to the configuration.
 *
 * @param {String} dist path
 * @api public
 */
Scaffold.prototype.distribution = function distribution(dist) {
  this.conf.set('configuration:dist', dist);
};

/**
 * Add plugins and their configurations.
 *
 * @param {Object} middleware
 * @api public
 */
Scaffold.prototype.plugins = function distribution(middleware) {
  if (typeof middleware !== 'object') return this;

  var scaffold = this;
  Object.keys(middleware).forEach(function loopPlugins(key) {
    scaffold.conf.set('configuration:plugins:' + key, middleware[key]);
  });

  return this;
};

/**
 * Add complete configuration.
 *
 * @param {Object} conf configuration object
 * @return {Object} self
 * @api public
 */
Scaffold.prototype.configuration = function configuration(conf) {
  if (typeof conf !== 'object') return this;
  this.conf.set('configuration', conf);

  return this;
};

/**
 * Do some basic checks against the configuration.
 *
 * @TODO expand to check additional stuff.
 * @return {Boolean}
 * @api public
 */
Scaffold.prototype.verify = function verify() {
  var errors = 0;

  if (!Object.keys(nconf.get('bundle')).length) errors++; // Has bundle files
  if (!this.conf.get('configuration').dist) errors++; // Can we store output

  return !errors;
};

/**
 * Store the config to disk, verify the build file first.
 *
 * @param {Function} callback
 * @api public
 */
Scaffold.prototype.save = function save(callback) {
  var scaffold = this;
  if (!this.verify() && callback) {
    return callback.bind(new Error('Invalid or incomplete Square configuration'));
  }

  this.conf.save(function saveState() {
    if (callback) callback(
      '\nWriting Square configuration to: ' + scaffold.conf.file
    );
  });
};

/**
 * Add file to bundle, if it is not set yet.
 *
 * @param {Object} file object with keys 'source' and 'meta'
 * @api public
 */
Scaffold.prototype.add = function add(file) {
  var target = 'bundle:' + file.source;
  if (this.conf.get(target)) return false;

  return this.conf.set(target, file.meta);
};

//
// Export constructor.
//
module.exports = Scaffold;