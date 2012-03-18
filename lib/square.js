"use strict";

/**
 * Native modules.
 */

var fs = require('fs')
  , path = require('path')
  , EventEmitter = require('events').EventEmitter;

/**
 * Super charge the EventEmitters
 */

require('eventreactor');

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
  this.middleware = [];
  this.env = process.env.NODE_ENV || 'development';

  // utility functions
  this.logger = new Logger({ timestamp: false });

  // should not be overridden
  this.package = {};
};

Square.prototype.__proto__ = EventEmitter.prototype;

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

  // check if we this middleware is already configured
  if (!this.has(layer)) this.middleware.push(layer);
  return this;
};

/**
 * Checks if the middleware layer already exists based on the function name.
 *
 * @param {Function} layer
 * @return {Boolean}
 * @api private
 */

Square.prototype.has = function has (layer) {
  /**
   * Small some function that checks if the supplied middleware is the same as
   * the given middleware layer. This check is done on the contents of the
   * function body and the names of the function.
   *
   * @param {Function} middleware
   * @returns {Boolean}
   * @api private
   */

  function some (middleware) {
    return middleware.toString() === layer.toString()
      && middleware.name === layer.name;
  }

  return this.middleware.some(some);
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

  try { middleware = require('../plugins/' + layer); }
  catch (e) {
    this.logger.error('Failed to plugin', layer);
  }

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
  if (args.string) {
    this.package = JSON.parse(fs.readFileSync(args.string, 'utf8'));
    this.package.path = path.dirname(args.string);
  }

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

    return +(amount + '.' + padding);
  }

  // default
  data = data || this.package;

  var dependencies = []
    , depended = {};

  Object.keys(data.bundle).forEach(function each (file, index, files) {
    var bundle = data.bundle[file]
      , base = data.path
      , location = path.join(base, file)
      , total;

    // add the current file to the dependency tree, as the last file so all
    // other dependencies are loaded before this file
    if (!Array.isArray(bundle.dependencies)) bundle.dependencies = [];
    if (!~bundle.dependencies.indexOf(file)) bundle.dependencies.push(file);

    // make sure it exists
    if (!path.existsSync(location)) {
      return this.logger.error(location + ' does not exist, cant read file');
    }

    // parse the data, and add some meta data
    bundle.content = fs.readFileSync(location);
    bundle.meta = {
        location: location
      , path: base
      , extension: file.split('.').pop()
      , package: data
    };

    // find all the dependencies
    total = bundle.dependencies.length;
    bundle.dependencies.forEach(function each (file, index) {
      var amount = weight(bundle.weight || 1, total--);

      // the dependency always uses the highest weight it gets assigned
      if (!depended[file] || depended[file] < amount) depended[file] = amount;
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
  this.package.dependencies = dependencies;

  this.emit('parse', this.package);
  return this;
};

/**
 * Build the stuff.
 *
 * @api private
 */

Square.prototype.build = function build () {
  var layers = this.middleware.slice(0)
    , errors = []
    , self = this;

  /**
   * Simple iteration helper function to process the middleware.
   *
   * @param {Mixed} err error or undef/null
   * @param {String} content
   * @api private
   */

  function iterate (err, content) {
    var layer = layers.shift();

    if (err) errors.push(err);
    if (!layer) {
      if (errors.length) return self.logger.error('Failed to process content', errors);
      return self.write(content);
    }

    // capture errors that might be caused the middleware layers
    try { layer.call(self, content, iterate); }
    catch (e) { iterate.call(iterate, e, content); }
  }

  this.once('merge', iterate.bind(iterate, null));
  this.merge();

  return this;
};

Square.prototype.write = function write (content) {
 // console.log(content, content.length);
};

/**
 * Merge all the dependencies in to one single file.
 *
 * @api private
 */

Square.prototype.merge = function merge () {
  var bundle = this.package.bundle
    , concat = [];

  if (!bundle || !this.package.dependencies) return this;

  this.package.dependencies.forEach(function each (file) {
    concat.push(bundle[file].content.toString('UTF8'));
  }.bind(this));

  // emit a merge event
  this.emit('merge', concat.join('\n'));
  return this;
};
