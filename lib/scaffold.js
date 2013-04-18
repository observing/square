'use strict';

/**!
 * [square]
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.it>
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
 * @api public
 */
scaffold.init = function init(loc) {
  // Only provide file bindings for the moment.
  nconf.file({ file: loc });

  // This will ensure a saved file always includes an configuration and bundle.
  if (!nconf.get('configuration')) nconf.set('configuration', {});
  if (!nconf.get('bundle')) nconf.set('bundle', {});
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
 * Add complete configuration.
 *
 * @param {Object} conf configuration object
 * @api public
 */
scaffold.configuration = function configuration(conf) {
  if (typeof conf !== 'object') return;
  nconf.set('configuration', conf);
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
  if (!Object.keys(nconf.get('bundle:dist'))) errors++; // Can we store output

  return !errors;
};

/**
 * Store the config to disk, verify the build file first.
 *
 * @param {Function} callback
 * @api public
 */
scaffold.save = function save(callback) {
  if (!scaffold.verify) {
    return process.nextTick(
      callback.bind(new Error('Invalid or incomplete Square configuration'))
    );
  }

  nconf.save(function saveState(err, result) {
    if (err) throw err;

    callback(null, '\nWriting Square configuration to:' + nconf.stores.file.file);
  });
};

/**
 * Add file to bundle.
 *
 * @param {Object} file object with keys 'source' and 'meta'
 * @api public
 */
scaffold.add = function add(file) {
  nconf.set('bundle:' + file.source, file.meta);
};
