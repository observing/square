"use strict";

/**
 * Native modules.
 */

var fs = require('fs')
  , path = require('path');

/**
 * Third party modules.
 */

var Logger = require('devnull')
  , _ = require('underscore')._;

/**
 * Cached variables.
 */

var slice = Array.prototype.slice;

var Square = module.exports = function Square () {
  // utility functions
  this.logger = new Logger({ timestamp: false });
  this._ = _;

  // should not be overridden
  this.middleware = [];
  this.env = process.env.NODE_ENV || 'development';
  this.package = {};
};

/**
 * Middleware layer. Use different middleware layers for compiling your bundles.
 * The order of definition is respected.
 *
 * @param {Function} layer
 * @api public
 */

Square.prototype.use = function use (layer) {
  if (typeof layer !== 'function') {
    this.logger.error('the supplied middleware isnt a valid function');
    return this;
  }

  this.middleware.push(layer);

  return this;
};

/**
 * Load a file from our plugin directory in to our middleware.
 *
 * @param {Function} layer
 * @param {Object} options
 * @api public
 */

Square.prototype.plugin = function plugin (layer, options) {
  var middleware;

  try { middleware = require('../plugin/' + layer); }
  catch (e) { }

  if (middleware) this.use(middleware(options));

  return this;
};

/**
 * Runs the supplied configuration function only for the set env. This allows
 * you to use different middleware stacks for development and production. You
 * can specify as many environments as you wish. It only requires a callback
 * function as last argument. All other arguments are seen as environment
 * variables where it should be toggled.
 *
 * @param {String} env environment
 * @param {Function} fn callback
 * @api public
 */

Square.prototype.configure = function configure (evn, fn) {
  var envs = 'all'
    , args = slice.call(arguments);

  // setup the correct argument structure
  fn = args.pop();

  if (args.length) envs = args;
  if (envs === 'all' || ~envs.indexOf(this.env)) fn.call(this);

  return this;
};

/**
 * Bundle all the things
 *
 * @api public
 */

Square.prototype.bundle = function bundle () {
  var args = slice.call(arguments).reduce(function (memory, arg) {
    memory[typeof arg] = arg;
    return memory;
  }, {});

  // when we receive an object in the arguments we assume it's the parse package
  // details
  this.package = args.object;

  // oh, we got a string, assume filename, fetch the file and parse it
  if (args.string) this.package = JSON.parse(fs.readFileSync(args.string, 'utf8'));

  this.parse();
  return this;
};

/**
 * Parse the package.
 *
 * @param {Object} data
 * @api private
 */

Square.prototype.parse = function parse (data) {
  /**
   * Generate the weight of a single dependency.
   *
   * @param {Number} amount
   * @param {Number} padding
   * @return {Number}
   * @api private
   */

  function weight (amount, padding) {
    padding = padding < 10
      ? '0' + padding.toString(10)
      : padding.toString(10);

    return +(weight + '.' + padding);
  }

  // default
  data = data || this.package;

  var dependencies = []
    , depended = {};

  Object.keys(data.bundle).forEach(function each (file, index, files) {
    var bundle = data.bundle[file]
      , depends = bundle.dependencies;

    // if there is no dependency, we are going to add this file to the
    // dependency tree
    if (!depends) depends = [file];

    var base = bundle.base
      , location = path.join(base, file);

    if (!path.existsSync(location)) {
      return this.logger.error(location + ' does not exist, cant read file');
    }

    // parse the data, and add some meta data
    bundle.content = fs.readFileSync(location);
    bundle.meta = {
        location: location
      , base: base
      , extension: file.split('.').pop()
      , package: data
    };

    // find all the dependencies
    bundle.dependencies.forEach(function each (file, index) {
      if (!depended[file]) depended[file] = weight(data.weight || 1, index);
      if (!~dependencies.indexOf(file)) dependencies.push(file);
    });
  }.bind(this));

  // sort the dependencies based on their assigned weight
  dependencies = dependencies.sort(function sort (a, b) {
    return depended[b] - depended[a];
  });

  // ensure that all dependencies are loaded correctly, so we don't generate any
  // files bundles with missing dependencies
  dependencies.some(function (file) {
    if (!data.bundle[file]) {
      this.logger.error('missing dependency: ' + file);
      return false;
    }

    return true;
  }.bind(this));

  // the package is now updated with the parsed data so we can use and abuse it
  this.package = data;
};
