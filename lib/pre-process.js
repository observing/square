"use strict";

var canihaz = require('canihaz')('square');

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
  var file = this
    , options = file['pre:stylus'] || {};

  canihaz.stylus(function canihazStylus (err, stylus) {
    if (err) return next(err);

    canihaz.nib(function canihazNib (err, nib) {
      if (err) return next(err);

      var stylulz = stylus(content)
        .set('filename', file.meta.location)
        .use(nib())
        .import('nib');

      // process the options
      if (options.compress) stylulz.define('compress', true);
      if (options.datauri) stylulz.define('url', stylus.url());

      stylulz.render(next);
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
  var path = require('path')
    , file = this
    , options = file['pre:less'] || {};

  /**
   * For some odd reason, the less guys find it funny to generate and throw
   * pointless custom error messages.. so we need to provide our own
   * unfuckingifyzor for these errors.
   */

  function format (err, less) {
    var message = [
        ' Error type: ' + err.type + ' ' + err.filename + ':' + err.line
      , err.extract[1] ? (' > ' + err.line + '| ' + err.extract[1] || '') : ''
      , ''
      , ' ' + err.message
    ];

    var better = new Error(message.join('\n'));
    better.stack = err.stack;

    return better;
  }

  canihaz.less(function canihazLess (err, less) {
    if (err) return next(err);

    var meta = file.meta
      , parser;

    new less.Parser({
        filename: options.filename || meta.filename
      , paths: [meta.path, path.dirname(meta.location)]
      , strictImports: options.strictImports || false
      , optimization: options.optimization || 1
    }).parse(content, function parsing (err, tree) {
      if (err) {
        return next(format(err, less));
      }

      var css;

      try { css = tree.toCSS({ compress: false, yuicompress: false }); }
      catch (e) {
        return next(format(e, less));
      }

      next(null, css);
    });
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
  var file = this
    , options = file['pre:sass'] || {};

  canihaz.sass(function canihazSass (err, sass) {
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
  var file = this
    , options = file['pre:coffee-script'] || {};

  canihaz['coffee-script'](function canihazCoffee (err, coffeescript) {
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
    , options = file['pre:jade'] || {}
    , jadeoptions = {
          client: options.client || true
        , compileDebug: options.compileDebug || false
    };

  // we are only interested in the filename, not the extension so we need to
  // parse down the filename a bit more in order to make it useful
  filename = filename.replace(path.extname(filename), '').underscore();

  canihaz.jade(function lazyload (err, jade) {
    if (err) return next(err);

    var compiled;

    try { compiled = jade.compile(content, jadeoptions).toString(); }
    catch (e) { return next(e); }

    compiled = template
      .replace('{content}', compiled.replace('function anonymous', 'function ' + filename))
      .replace('{filename}', filename);

    if (index > 0) return next(null, compiled);

    // for the first file we need to include the jade runtime so the templates
    // can actually be executed client side
    var client = path.join(__dirname, '..', 'static', 'jade.js');
    compiled = fs.readFileSync(client, 'UTF-8') + compiled;

    next(null, compiled);
  });
};

// what extension should we have once compiled
exports.jade.extension = 'js';
