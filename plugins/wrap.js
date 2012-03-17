"use strict";

var context = require('contextify')
  , _ = require('underscore')._;

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
   * @param {String} content
   * @param {Function} next
   * @api private
   */

  return function leak (content, next) {
    var logger = this.logger
      , timeout = settings.timeout;

    // search for leaks
    exports.sandboxleak(content, timeout, function found (err, leaks) {
      if (err) {
        logger.error('Sandboxing produced an error, canceling operation', err);
        logger.warning('The supplied code might leak globals');

        return next(null, content, leaks);
      }

      if (!leaks) return next(null, content, leaks);

      logger.debug('Global leaks detected:', leaks, 'patching the hole');

      // copy
      var body = JSON.parse(JSON.stringify(settings.body))
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

      body.push(content);

      // silly variable upgrading
      _.each(leaks, function (global) {
        body.push(global + ' = ' + global + ' || this.' + global + ';');
      });

      // compile the new content
      compiled = settings.header + body.join('\n') + settings.footer;

      // try if we fixed all leaks
      exports.sandboxleak(compiled, timeout, function final (err, newleaks) {
        if (err) {
          logger.error('Failed to compile the sandboxed script', err);
          logger.warn('The supplied code might leak globals');

          return next(null, content);
        }

        // output some compile information
        if (!newleaks.lenght) logger.info('Successfully patched all leaks');
        else if (newleaks.length < leaks.length) logger.info('Patched some leaks, but not all', newleaks);
        else logger.info('Patching the code did not help, it avoided the sandbox');

        next(null, compiled, newleaks);
      });
    });
  };
};

/**
 * Detect leaking code.
 *
 * @param {String} content
 * @param {Number} timeout
 * @param {Function} fn
 * @api private
 */

exports.sandboxleak = function sandboxleak (content, timeout, fn) {
  var sandbox = exports.env()
    , regular = Object.keys(sandbox);

  // setup the context
  context(sandbox);

  // make sure it doesn't thow directly
  try { sandbox.run(content); }
  catch (e) {
    sandbox.dispose();

    process.nextTick(function nextTick () {
      fn(e, []);
    });

    return;
  }

  // because we could be working against potential async code that leaks
  // a global we should wait a while for all code to fully initialized.
  setTimeout(function timeout () {
    var nocontext = _.without(Object.keys(sandbox), 'run', 'getGlobal', 'dispose')
      , globals = _.difference(nocontext, regular);

    // clean up the sandbox
    sandbox.dispose();

    fn(null, globals);
  }, timeout);
};

/**
 * Generates a new dummy env for the context. This allows us to load in scripts
 * and see which globals are exposed, and how we could resolve it.
 *
 * @returns {Object} env
 * @api private
 */

exports.env = function evn () {
  var details = {
      location: {
          port: 8080
        , host: 'www.example.org'
        , hostname: 'www.example.org'
        , href: 'http://www.example.org/example/'
        , pathname: '/example/'
        , protocol: 'http:'
        , search: ''
        , hash: ''
      }
    , console: {
          log:   function () {}
        , info:  function () {}
        , warn:  function () {}
        , error: function () {}
      }
    , navigator: {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_7) AppleWebKit'
           + '/534.27 (KHTML, like Gecko) Chrome/12.0.716.0 Safari/534.27'
        , appName: 'ion'
        , platform: process.platform
        , appVersion: process.version
    , }
    , name: ''
    , innerWidth: 1024
    , innerHeight: 768
    , length: 1
    , outerWidth: 1024
    , outerHeight: 768
    , pageXOffset: 0
    , pageYOffset: 0
    , screenX: 0
    , screenY: 0
    , screenLeft: 0
    , screenTop: 0
    , scrollX: 0
    , scrollY: 0
    , scrollTop: 0
    , scrollLeft: 0
    , screen: {
          width: 0
        , height: 0
      }
  };

  // circular references
  details.window = details.self = details.contentWindow = details;

  // callable methods
  details.Image = details.scrollTo = details.scrollBy = details.scroll =
  details.resizeTo = details.resizeBy = details.prompt = details.print =
  details.open = details.moveTo = details.moveBy = details.focus =
  details.createPopup = details.confirm = details.close = details.blur =
  details.alert = details.clearTimeout = details.clearInterval =
  details.setInterval = details.setTimeout = details.XMLHttpRequest =
  details.getComputedStyle = details.trigger = details.dispatchEvent =
  details.removeEventListener = details.addEventListener = function(){};

  // frames
  details.frames = [details];

  // document
  details.document = details;
  details.document.domain = details.location.href;

  return details;
};
