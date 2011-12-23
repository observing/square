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

var Oz = module.exports = exports = function OZ () {
  // utility functions
  this.logger = new Logger({ timestamp: false });
  this._ = _;

  // should not be overridden
  this.middleware = [];
  this.env = process.env.NODE_ENV || 'development';
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
    , args = Array.prototype.slice.call(arguments);

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
  return this;
};
