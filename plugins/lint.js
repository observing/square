"use strict";

var canihas = require('../lib/canihas')
  , _ = require('underscore')._;

module.exports = function setup (options) {
  var settings = {
      seperate: true
  };

  _.extend(settings, options || {});

  /**
   * The linting middleware.
   *
   * @param {Object} output
   * @param {Function} next
   * @api private
   */

  return function linting (output, next) {

  };
};

/**
 * The actual hinters, linters and other parsers.
 *
 * @api private
 */

var parsers = {
    js: function parser (content, options, fn) {
      options = options.jshint;

      canihas.jshint(function lazyload (err, jshint) {
        if (err) return fn(err);

        var validates = jshint(content, options)
          , errors;

        if (!validates) errors = formatters.js(jshint.errors);
        fn(null, errors);
      });
    }

  , css: function parser (content, options, fn) {
      // clone the object as we need to remove the un-used options
      options = _.extend({}, options.csslint);

      // the csslint options only looks for keys in the object so we need to
      // remove all the options that have the value set to `false`
      Object.keys(options).forEach(function remove (key) {
        if (!options[key]) delete options[key];
      });

      canihas.csslint(function lazyload (err, csslint) {
        if (err) return fn(err);

        var validates = csslint.verify(content, options)
          , errors;

        if (validates.messages.length) errors = formatters.css(validates.messages);
        fn(null, errors);
      });
    }
};

/**
 * Formatters for the parsers so it produces a uniform output format.
 *
 * @api private
 */

var formatters = {
    /**
     * Format the output of the jshint tool.
     *
     * @param {Array} fail
     * @returns {Array}
     * @api private
     */

    js: function formatter (fail) {
      return fail.map(function oops (err) {
        return {
            line: err.line
          , column: err.characture
          , message: err.reason
        };
      });
    }

    /**
     * Format the output of the csslint tool.
     *
     * @param {Array} fail
     * @returns {Array}
     * @api private
     */

  , css: function formatter (fail) {
      return fail.map(function oops (err) {
        return {
            line: err.line
          , column: err.col
          , message: err.message
        };
      });
    }
};
