"use strict";

var canihas = require('../lib/canihas');

/**
 * Pre-process the files with dedicated compilers. This allows you to work in
 * any meta language and still use the square build system.
 *
 * @param {Object} options
 * @returns {Function} middleware
 * @api public
 */

module.exports = function setup (options) {
  /**
   * The pre-process middleware
   *
   * @param {Object} output
   * @param {Function} next
   * @api private
   */

  return function preprocess (output, next) {
    var process = exports[output.extension];
    if (!process) return process.nextTick(next);

    process(output, next);
  };
};

/**
 * Stylus pre-processor.
 *
 * @param {Object} output
 * @param {Function} next
 * @api private
 */

exports.styl = function styl (output, next) {
  canihas.stylus(function (err, stylus) {
    if (err) return next(err);

    canihas.nib(function (err, nib) {
      if (err) return next(err);

      stylus(output.content)
        .set('filename', 'square.css')
        .use(nib())
        .import('nib')
        .render(function render (err, content) {
          if (err) return next(err, output);

          output.content = content;
          next(null, output);
        });
    });
  });
};

/**
 * Less pre-processor.
 *
 * @param {Object} output
 * @param {Function} next
 * @api private
 */

exports.less = function less (output, next) {
  canihas.less(function (err, less) {
    if (err) return next(err);

    less.render(output.content, function render (err, content) {
      if (err) return next(err, output);

      output.content = content;
      output.extension = 'css';

      return next(null, output);
    });
  });
};

/**
 * Sass pre-processor.
 *
 * @param {Object} output
 * @param {Function} next
 * @api private
 */

exports.sass = function sass (output, next) {
  process.nextTick(function render () {
    try {
      output.content = require('sass').render(output.content);
      output.extension = 'css';

      return next(null, output);
    } catch (e) {
      next(e, output);
    }
  });
};

/**
 * Coffeescript pre-processor.
 *
 * @param {Object} output
 * @param {Function} next
 * @api private
 */

exports.coffee = function coffee (output, next) {
  process.nextTick(function render () {
    try {
      output.content = require('coffee-script').compile(output.content);
      output.extension = 'js';

      return next(null, output);
    } catch (e) {
      next(e, output);
    }
  });
};
