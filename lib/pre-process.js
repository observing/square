"use strict";

var canihas = require('../lib/canihas');

/**
 * Stylus pre-processor.
 *
 * @param {String} content
 * @param {Function} next
 * @api private
 */

exports.styl = function styl (content, next) {
  canihas.stylus(function canihasStylus (err, stylus) {
    if (err) return next(err);

    canihas.nib(function canihasNib (err, nib) {
      if (err) return next(err);

      stylus(content)
        .set('filename', 'square.css')
        .use(nib())
        .import('nib')
        .render(next);
    });
  });
};

// what extension should we have once compiled
exports.styl.extension = 'css';

/**
 * Less pre-processor.
 *
 * @param {String} content
 * @param {Function} next
 * @api private
 */

exports.less = function less (output, next) {
  canihas.less(function canihasLess (err, less) {
    if (err) return next(err);

    less.render(output.content, next);
  });
};

// what extension should we have once compiled
exports.less.extension = 'css';

/**
 * Sass pre-processor.
 *
 * @param {String} content
 * @param {Function} next
 * @api private
 */

exports.sass = function sass (content, next) {
  canihas.sass(function canihasSass (err, sass) {
    if (err) return next(err);

    try {
      return next(null, sass.render(content));
    } catch (e) {
      next(e);
    }
  });
};

// what extension should we have once compiled
exports.sass.extension = 'css';

/**
 * Coffeescript pre-processor.
 *
 * @param {String} content
 * @param {Function} next
 * @api private
 */

exports.coffee = function coffee (content, next) {
  canihas.coffeescript(function canihasCoffee (err, coffeescript) {
    if (err) return next(err);

    try {
      return next(null, coffeescript.compile(content));
    } catch (e) {
      next(e);
    }
  });
};

// what extension should we have once compiled
exports.coffee.extension = 'js';
