"use strict";

var canihas = require('../lib/canihas');

/**
 * Stylus pre-processor.
 *
 * @param {String} content
 * @param {Number} index
 * @param {Number} total
 * @param {Function} next
 * @api private
 */

exports.styl = function styl (content, index, total, next) {
  var file = this;

  canihas.stylus(function canihasStylus (err, stylus) {
    if (err) return next(err);

    canihas.nib(function canihasNib (err, nib) {
      if (err) return next(err);

      stylus(content)
        .set('filename', file.meta.location)
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
 * @param {Number} index
 * @param {Number} total
 * @param {Function} next
 * @api private
 */

exports.less = function less (content, index, total, next) {
  canihas.less(function canihasLess (err, less) {
    if (err) return next(err);

    less.render(content, next);
  });
};

// what extension should we have once compiled
exports.less.extension = 'css';

/**
 * Sass pre-processor.
 *
 * @param {String} content
 * @param {Number} index
 * @param {Number} total
 * @param {Function} next
 * @api private
 */

exports.sass = function sass (content, index, total, next) {
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
 * @param {Number} index
 * @param {Number} total
 * @param {Function} next
 * @api private
 */

exports.coffee = function coffee (content, index, total, next) {
  canihas['coffee-script'](function canihasCoffee (err, coffeescript) {
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
 * @param {Number} index
 * @param {Number} total
 * @param {Function} next
 * @api private
 */

exports.jade = function jade (content, index, total, next) {
  /**
   * Lazy load these core modules
   */

  var path = require('path')
    , fs = require('fs');

  /**
   * Setting for the Jade compiler, to ensure that it's compiled with
   * a client-side compatible coding.
   */

  var file = this
    , template = 'jade.{filename} = {content};'
    , filename = file.meta.filename
    , options = {
          client: true
        , compileDebug: false
    };

  // we are only interested in the filename, not the extension so we need to
  // parse down the filename a bit more in order to make it useful
  filename = filename.replace(path.extname(filename), '').underscore();

  canihas.jade(function lazyload (err, jade) {
    if (err) return next(err);

    var compiled;

    try { compiled = jade.compile(content, options).toString(); }
    catch (e) { return next(e); }

    compiled = template
      .replace('{content}', compiled.replace('function anonymous', 'function ' + filename))
      .replace('{filename}', filename);

    if (index > 0) return next(null, compiled);

    // for the first file we need to include the jade runtime so the templates
    // can actually be executed client side
    var client = path.join(__dirname, '..', 'defaults', 'jade.js');
    compiled = fs.readFileSync(client, 'UTF-8') + compiled;

    next(null, compiled);
  });
};

// what extension should we have once compiled
exports.jade.extension = 'js';
