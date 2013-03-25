'use strict';

/**!
 * [square]
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.it>
 * MIT Licensed
 */
var Plugin = require('../plugin');

module.exports = Plugin.extend({
    /**
     * Name of the module.
     *
     * @type {String}
     */
    id: 'lint'

    /**
     * Small description about the module.
     *
     * @type {String}
     */
  , description: [
        'Detect error and potential problem in your code'
    ].join(' ')

    /**
     * For which distributions should this run.
     *
     * @type {String}
     */
  , distributions: []

    /**
     * Which file extension are accepted.
     *
     * @type {String}
     */
  , accepts: ['js', 'css']

    /**
     * Process all the files separately
     *
     * @type {Boolean}
     */
  , separate: true

    /**
     * Output a summary of the findings.
     *
     * @type {Boolean}
     */
  , summary: true

    /**
     * Required linters
     *
     * @type {Array}
     */
  , requires: [
        { name: 'jshint', extension: 'js' }
      , { name: 'csslint', extension: 'css' }
    ]

    /**
     * Extension to parser mapping.
     *
     * @type {Object}
     */
  , parsers: {
        'js': 'js'
      , 'css': 'css'
    }

    /**
     * The module has been initialized.
     */
  , initialize: function initialize() {
      this[this.parsers[this.extension]]();
    }

    /**
     * Run the JSHINT parser over the content.
     *
     * @param {String} content The content that needs to be minified.
     * @param {Function} callback
     * @api private
     */
  , jshint: function parser(content, callback) {
      this.readrc('jshint');

      // Check if the content passes the JSHINT restrictions. If it does we
      // don't have to parse it any further.
      if (this.jshint.JSHINT(content, this)) return process.nextTick(callback);

      process.nextTick(function process() {
        var errors = this.jshint.JSHINT.errors.map(function format(error) {
          return {
              line:     error.line
            , column:   error.character
            , message:  error.reason
            , ref:      error
          };
        });

        callback(errors);
      });

      return this;
    }

    /**
     * Run the CSSLint parser over the content.
     *
     * @param {String} content The content that needs to be minified.
     * @param {Function} callback
     * @api private
     */
  , css: function parser(content, callback) {
      this.readrc('csslint');

      var passes = this.csslint.CSSLint.verify(content, this);
      if (!passes.messages.length) return process.nextTick(callback);

      process.nextTick(function process() {
        var errors = passes.messages.map(function format(error) {
          return {
              line:     error.line
            , column:   error.col
            , message:  error.message
            , ref:      error
          };
        });

        callback(errors);
      });

      return this;
    }

    /**
     * Create a human readable output of the errors.
     *
     * @param {String} content The content that had issues
     * @param {Array} errors The errors
     * @returns {Array}
     */
  , report: function report(content, errors) {
      var lines = content.split('\n')
        , issues = [];

      errors.forEach(function select(error) {
        // Some issues don't return a line number but are just general comments
        // about your code.
        if (!error.line) return issues.push(error.message.grey, '');

        // Try to generate some context for the returned errors as it's not
        // directly obvious where in the code it is or why this affects your
        // code.
        var start = error.line > 3
              ? error.line - 3
              : 0
          , stop = error.line + 2
          , context = lines.slice(start, stop)
          , numbers = this._.range(start + 1, stop + 1)
          , len = stop.toString().length;

        // Output some inital details about the context that we are going to
        // provide and where the issues are happening.
        issues.push('Lint error on line: '+ error.line + ', column: '+ error.column);

        // Generate the context
        context.forEach(function reformat(line) {
          var lineNumber = numbers.shift()          // The current line number
            , offender = lineNumber === error.line  // Is this the offending line
            , inline = /\'[^\']+?\'/                // Direct match
            , slice;

          // This is the actual line that received the error. All other lines
          // are just context. We want to highlight this for the users
          if (offender) {
            if (line.length < error.column) {
              // We are missing something at the end of the line.. so add a red
              // square.
              line += ' '.inverse.red;
            } else {
              // We have a direct match on a statement
              if (inline.test(error.message)) {
                slice = error.message.match(inline)[0].replace(/\'/g, '');
              } else {
                // It's happening in the center of things, so we can start
                // coloring inside the shizzle.
                slice = line.slice(error.column - 1);
              }

              line = line.replace(slice, slice.inverse.red);
            }
          }

          // Add the line.
          issues.push('  '+ pad(lineNumber, len) +' | '+ line);
        }, this);

        // Add the actual error
        issues.push('', error.message.grey, '');
      }, this);

      return issues;
    }
});

/**
 * Pad a string.
 *
 * @param {String} str The string that needs padding
 * @param {Number} len The amount of padding the string should receive
 * @returns {String}
 * @api private
 */
function pad(str, len) {
  str = ''+ str;

  return new Array(len - str.length + 1).join(' ') + str;
}
