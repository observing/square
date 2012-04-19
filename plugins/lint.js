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
    var config = this.package.configuration
      , self = this;

    // make sure that we have a parser for this extension
    if (!(output.extension in parsers)) return next();

    parsers[output.extension](output.content, config, function linted (err, failures) {
      if (err) return next(err);
      if (failures && failures.length) reporters.base.call(self, output, failures);

      next();
    });
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

        var validates = jshint.JSHINT(content, options)
          , errors;

        if (!validates) errors = formatters.js(jshint.JSHINT.errors);
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

        var validates = csslint.CSSLint.verify(content, options)
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
          , column: err.character
          , message: err.reason
          , ref: err
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
          , ref: err
        };
      });
    }
};

/**
 * Output reports.
 *
 * @api private
 */

var reporters = {
    base: function (file, errors, options) {
      var reports = []
        , content = file.content.split('\n');

      errors.forEach(function error (err) {
        // some linters don't return the location -_-
        if (!err.line) return reports.push(err.message.grey, '');

        var start = err.line > 2 ? err.line - 2 : 0
          , stop = err.line + 2
          , range = content.slice(start, stop)
          , numbers = _.range(start + 1, stop + 1)
          , len = stop.toString().length;

        reports.push('Lint error: ' + err.line + ' col ' + err.column);
        range.map(function (line) {
          var lineno = numbers.shift()
            , offender = lineno === err.line
            , inline = /\'[^\']+?\'/
            , slice;

          // this is the actual line with the error, so we should start finding
          // what the error is and how we could highlight it in the output
          if (offender) {
            if (line.length < err.column) {
              // we are missing something at the end of the line.. so add a red
              // square
              line += ' '.inverse.red;
            } else {
              // we have a direct match on a statement
              if (inline.test(err.message)) {
                slice = err.message.match(inline)[0].replace(/\'/g, '');
              } else {
                // it's happening in the center of things, so we can start
                // coloring inside the shizzle
                slice = line.slice(err.column - 1);
              }

              line = line.replace(slice, slice.inverse.red);
            }
          }

          reports.push('  ' + pad(lineno, len) + ' | ' + line);
        });

        reports.push('');
        reports.push(err.message.grey);
        reports.push('');

      });

      // output the shizzle
      reports.forEach(function output (line) {
        this.logger.error(line);
      }.bind(this));
    }
};

/**
 * Pad a string
 *
 * @param {String} str
 * @param {Number} len
 * @returns {String}
 * @api private
 */

function pad (str, len) {
  str = '' + str;
  return new Array(len - str.length + 1).join(' ') + str;
}
