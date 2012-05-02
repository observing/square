"use strict";

var _ = require('underscore')._
  , canihas = require('../lib/canihas');

/**
 * Attempts to detect leaking globals and provides a wrapper for it.
 *
 * Options:
 *
 * - `timeout` time to wait for the script to be initialized, number in ms.
 * - `header` first section of the leak prevention, string.
 * - `body` content for the leak prevention function body, array.
 * - `footer` closing section of th leak prevention, string.
 *
 * @param {Object} options
 * @returns {Function} middleware
 * @api public
 */

module.exports = function setup (options) {
  var settings = {
      timeout: 1000
    , header: '(function (expose) {'
    , body: [
          'this.contentWindow = this.self = this.window = this;'
        , 'var window = this'
        ,   ', document = expose.document'
        ,   ', self = this'
        ,   ', top = this'
        ,   ', location = expose.location'
        // note we shouldn't close the var statement with a ; because this is
        // done in the wrapping function
      ]
    , footer: '}).call({}, this);'
  };

  _.extend(settings, options || {});

  /**
   * The build middleware.
   *
   * @param {Object} output
   * @param {Function} next
   * @api private
   */

  return function leak (output, next) {
    if (output.extension !== 'js') return process.nextTick(next);

    // setup the configuration based on the plugin configuration
    var configuration = _.extend(
        settings
      , this.package.configuration.plugins.wrap || {}
    );

    // setup
    var logger = this.logger
      , timeout = configuration.timeout;

    // search for leaks
    exports.sandboxleak(output.content, timeout, function found (err, leaks) {
      if (err) {
        logger.error('Sandboxing produced an error, canceling operation', err);
        logger.warning('The supplied code might leak globals');

        return next(null, output);
      }

      if (!leaks) return next(null, output);

      logger.debug('Global leaks detected:', leaks, 'patching the hole');

      // copy
      var body = JSON.parse(JSON.stringify(configuration.body))
        , compiled;

      // add more potential leaked variables
      _.each(leaks, function (global) {
        body.push(', ' + global + ' = this');
      });

      // close it
      body.push(';');

      _.each(leaks, function (global) {
        body.push('this.' + global + ' = this;');
      });

      body.push(output.content);

      // silly variable upgrading
      _.each(leaks, function (global) {
        body.push(global + ' = ' + global + ' || this.' + global + ';');
      });

      // compile the new content
      compiled = configuration.header + body.join('\n') + configuration.footer;

      // try if we fixed all leaks
      exports.sandboxleak(compiled, timeout, function final (err, newleaks) {
        if (err) {
          logger.error('Failed to compile the sandboxed script', err);
          logger.warn('The supplied code might leak globals');

          return next(null, output);
        }

        // output some compile information
        if (!newleaks.lenght) logger.info('Successfully patched all leaks');
        else if (newleaks.length < leaks.length) logger.info('Patched some leaks, but not all', newleaks);
        else logger.info('Patching the code did not help, it avoided the sandbox');

        output.content = compiled;
        next(null, output);
      });
    });
  };
};

/**
 * Small description of what this plugin does.
 *
 * @type {String}
 * @api private
 */

module.exports.description = 'Tries to detect global leaks in your code and attempts to patch it.';

/**
 * Detect leaking code.
 *
 * @param {String} content
 * @param {Number} timeout
 * @param {Function} fn
 * @api private
 */

exports.sandboxleak = function sandboxleak (content, timeout, fn) {
  canihas.jsdom(function canihasJSDOM (err, jsdom) {
    var html = '<html><body></body></html>'
      , DOM = jsdom.jsdom;

    var doc = DOM(html)
      , sandbox = doc.createWindow()
      , regular = Object.keys(sandbox);

    // release memory
    sandbox.close();

    jsdom.env({
      html: html
    , src: [ content ]
    , done: function done (err, window) {
        if (err) return fn(err);

        var infected = Object.keys(window)
          , globals = _.difference(infected, regular);

        window.close();

        fn(null, globals);
      }
    });
  });
};
