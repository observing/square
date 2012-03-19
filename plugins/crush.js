"use strict";

var uglify = require('uglify-js')
  , child = require('./lib/child')
  , _ = require('underscore')._;

/**
 * Compression levels, the lower the faster, the higher the better.
 *
 * @type {Array}
 * @api private
 */

var level = [
    ['yui']
  , ['uglify']
  , ['closure']
  , ['yui', 'uglify']
  , ['yui', 'closure']
  , ['yui', 'closure', 'uglify']
];

/**
 * Compiles the code as small as possible.
 *
 * Options:
 *
 * - `aggressive` use the most aggressive crushing, boolean.
 * - `level` crush level, number.
 * - `disable` disable a crushing mode, string.
 *
 * @param {Object} options
 * @returns {Function} middlware
 * @api public
 */

module.exports = function setup (options) {
  var settings = {
      aggressive: true
    , level: 5
    , disable: ''
  };

  _.extend(settings, options);

  /**
   * The build middleware.
   *
   * @param {String} content
   * @param {Function} next
   * @api private
   */

  return function crush (content, next) {
    var logger = this.logger
      , steps = level[settings.level]
      , errs = []
      , compiled = content;

    /**
     * Simple async helper function, no need to ship a 100kb aysnc library for
     * this.
     *
     * @api private
     */

    function walk () {
      if (!steps.length || errs.lenght) {
        if (errs.length) return next(new Error(errs.toString()), content);
        return next(null, compiled);
      }

      // process the data
      exports[steps.shift()](content, settings.aggressive, function min (err, code) {
        if (err) {
          errs.push(err.message);
        } else {
          compiled = code;
        }

        // we need to go deeper
        walk();
      });
    }

    // start processing content
    walk();
  };
};

/**
 * Closure compile all the code.
 *
 * @param {String} content
 * @param {Boolean} aggressive
 * @param {Function} fn
 * @api private
 */

exports.closure = function googleclosure (content, aggressive, fn) {
  child.closure('js', content, {}, fn);
};

/**
 * YUI minify all the code.
 *
 * @param {String} content
 * @param {Boolean} aggressive
 * @param {Function} fn
 * @api private
 */

exports.yui = function yui (content, aggressive, fn) {
  child.yui('js', content, {}, fn);
};

/**
 * Uglify the code.
 *
 * @param {String} content
 * @param {Function} fn
 * @api private
 */

exports.uglify = function ugly (content, aggressive, fn) {
  var err, ast, code;

  try {
    ast = uglify.parser.parse(content);
    ast = uglify.uglify.ast_mangle(ast);
    ast = uglify.uglify.ast_squeeze(ast);

    // do even more agressive optimizing
    if (aggressive) {
      ast = uglify.uglify.ast_lift_variables(ast);
      ast = uglify.uglify.ast_squeeze_more(ast);
    }

    // the ascii makes sure we don't fuck up Socket.IO's utf8 message
    // seperators.
    code = uglify.uglify.gen_code(ast, {
        ascii_only: true
    });
  } catch (e) {
    err = e;
  }

  process.nextTick(function nextTick () {
    fn(err, code || content);
  });
};
