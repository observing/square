"use strict";

var canihas = require('../lib/canihas')
  , sugar = require('sugar')
  , path = require('path');

/**
 * Stylus pre-processor.
 *
 * @param {String} content
 * @param {Object} file
 * @param {Function} next
 * @api private
 */

exports.styl = function styl (content, file, next) {
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
 * @param {Object} file
 * @param {Function} next
 * @api private
 */

exports.less = function less (output, file, next) {
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
 * @param {Object} file
 * @param {Function} next
 * @api private
 */

exports.sass = function sass (content, file, next) {
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
 * @param {Object} file
 * @param {Function} next
 * @api private
 */

exports.coffee = function coffee (content, file, next) {
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

/**
 * Jade template pre-processor. It inline's your Jade templates and makes it
 * client-side compatible.
 *
 * @param {String} content
 * @param {Object} file
 * @param {Function} next
 * @api private
 */

exports.jade = function jade (content, file, next) {
  /**
   * Setting for the Jade compiler, to ensure that it's compiled with
   * a client-side compatible coding.
   */

  var template = 'Jade.{filename} = {content}'
    , filename = file.meta.filename
    , options = {
          client: true
        , compileDebug: false
    };

  // we are only interested in the filename, not the extension so we need to
  // parse down the filename a bit more in order to make it usefull
  filename = filename.replace(path.extname(filename), '').underscore();

  canihas.jade(function jadeCoffee (err, jade) {
    if (err) return next(err);
    var compiled;

    try { compiled = jade.compile(content, options).toString(); }
    catch (e) { return next(e); }

    compiled = template
      .replace('{content}', compiled.replace('function anonymous', filename))
      .replace('{filename}', filename);
  });
};

// what extension should we have once compiled
exports.jade.extension = 'js';
