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

var Oz = module.exports = exports = function OZ () {
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

Oz.prototype.use = function use (layer) {
  if (typeof layer !== 'function') {
    this.logger.error('the supplied middleware isnt a valid function');
    return this;
  }

  this.middleware.push(layer);

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

Oz.prototype.configure = function configure (evn, fn) {
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

Oz.prototype.bundle = function bundle () {
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
 * @param {Object} package
 * @api private
 */

Oz.prototype.parse = function parse (package) {
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

    return +(weight + '.' padding);
  }

  // default
  package = package || this.package;

  var dependencies = []
    , depended = {};

  Object.keys(package.bundle).forEach(function each (file, index, files) {
    var bundle = package.bundle[file];

    // find all the dependencies
    bundle.dependencies.forEach(function each (file, index) {
      if (!depended[file]) depended[file] = weight(package.weight || 1, index);
      if (!~dependencies.indexOf(file)) dependencies.push(file);
    })
  });

  // sort the dependencies based on their assigned weight
  dependencies = dependencies.sort(function sort (a, b) {
    return depended[b] - depended[a]
  });
};
