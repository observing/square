'use strict';

/**!
 * [square]
 * @copyright (c) 2013 observe.it (observe.it) <opensource@observe.it>
 * MIT Licensed
 */

/**
 * Native modules.
 */
var path = require('path');

/**
 * Required modules.
 */
var nconf = require('nconf')
  , scaffold = module.exports;

/**
 * Proxy to use nconf#file storage.
 *
 * @param {String} loc file location
 * @return {Object} self
 * @api public
 */
scaffold.init = function init(loc) {
  // Only provide file bindings for the moment.
  nconf.file({ file: loc });

  // This will ensure a saved file always includes an configuration and bundle.
  if (!nconf.get('configuration')) nconf.set('configuration', {});
  if (!nconf.get('bundle')) nconf.set('bundle', {});

  return scaffold;
};

/**
 * Return the actual config for quick use.
 *
 * @return {Object} configured scaffold
 * @api public
 */
scaffold.get = function get() {
  return nconf.stores.file.store;
};

/**
 * Add the distribution path to the configuration.
 *
 * @param {String} dist path
 * @api public
 */
scaffold.distribution = function distribution(dist) {
  nconf.set('configuration:dist', dist);
};

/**
 * Add plugins and their configurations.
 *
 * @param {Object} middleware
 * @api public
 */
scaffold.plugins = function distribution(middleware) {
  if (typeof middleware !== 'object') return scaffold;

  Object.keys(middleware).forEach(function loopPlugins(key) {
    nconf.set('configuration:plugins:' + key, middleware[key]);
  });

  return scaffold;
};

/**
 * Add complete configuration.
 *
 * @param {Object} conf configuration object
 * @return {Object} self
 * @api public
 */
scaffold.configuration = function configuration(conf) {
  if (typeof conf !== 'object') return scaffold;
  nconf.set('configuration', conf);

  return scaffold;
};

/**
 * Do some basic checks against the configuration.
 *
 * @TODO expand to check additional stuff.
 * @return {Boolean}
 * @api public
 */
scaffold.verify = function verify() {
  var errors = 0;

  if (!Object.keys(nconf.get('bundle')).length) errors++; // Has bundle files
  if (!nconf.get('configuration').dist) errors++; // Can we store output

  return !errors;
};

/**
 * Store the config to disk, verify the build file first.
 *
 * @param {Function} callback
 * @api public
 */
scaffold.save = function save(callback) {
  if (!scaffold.verify() && callback) {
    return process.nextTick(callback.bind('Invalid or incomplete Square configuration'));
  }

  nconf.save(function saveState() {
    if (callback) callback('\nWriting Square configuration to: ' + nconf.stores.file.file);
  });
};

/**
 * Add file to bundle, if it is not set yet.
 *
 * @param {Object} file object with keys 'source' and 'meta'
 * @api public
 */
scaffold.add = function add(file) {
  var target = 'bundle:' + file.source;
  if (nconf.get(target)) return false;

  return nconf.set(target, file.meta);
};
