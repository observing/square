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
  canihas.stylus(function (err, stylus) {
    if (err) return next(err);

    canihas.nib(function (err, nib) {
      if (err) return next(err);

      stylus(content)
        .set('filename', 'square.css')
        .use(nib())
        .import('nib')
        .render(next);
    });
  });
};

exports.styl.extension = 'css';

/**
 * Less pre-processor.
 *
 * @param {String} content
 * @param {Function} next
 * @api private
 */

exports.less = function less (output, next) {
  canihas.less(function (err, less) {
    if (err) return next(err);

    less.render(output.content, next);
  });
};

exports.less.extension = 'css';

/**
 * Sass pre-processor.
 *
 * @param {String} content
 * @param {Function} next
 * @api private
 */

exports.sass = function sass (content, next) {
  canihas.sass(function (err, sass) {
    if (err) return next(err);

    try {
      return next(null, sass.render(content));
    } catch (e) {
      next(e);
    }
  });
};

exports.sass.extension = 'css';

/**
 * Coffeescript pre-processor.
 *
 * @param {String} content
 * @param {Function} next
 * @api private
 */

exports.coffee = function coffee (content, next) {
  canihas.coffeescript(function (err, coffeescript) {
    if (err) return next(err);

    try {
      return next(null, coffeescript.compile(content));
    } catch (e) {
      next(e);
    }
  });
};

exports.coffee.extension = 'js';
