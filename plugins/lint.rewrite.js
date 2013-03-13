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
    name: 'lint'

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
  , js: function parser(content, callback) {

    }

    /**
     * Run the CSSLint parser over the content.
     *
     * @param {String} content The content that needs to be minified.
     * @param {Function} callback
     * @api private
     */
  , css: function parser(content, callback) {

    }

    /**
     * Attempt to load local and project hint configurations. Where the
     * project level configuration overrules the local <hint>rc configurations.
     *
     * @param {String} name The name of the parser who's config to load
     * @api private
     */
  , loadrc: function loadrc(name) {
      name = '.'+ name +'rc';
    }
});

/**
 * Simple file linting.
 *
 * @param {Object} options
 * @returns {Function}
 * @api public
 */

module.exports = function setup (options) {
  return function linting (output, next) {
    // setup
    var config = this.package.configuration
      , bundles = this.package.bundle
      , files = Object.keys(bundles)
      , self = this;

    // make sure that we have a parser for this extension
    if (!(output.extension in parsers)) return next();

    if (!configuration.seperate) {
      return parsers[output.extension](output.content, config, function linted (err, failures) {
        if (err) return next(err);
        if (failures && failures.length) {
          reporters.base.call(self, output, failures, configuration);
        }

        next();
      });
    }

    async.forEachSeries(files, function iterator (key, fn) {
      var bundle = bundles[key]
        , content = bundle.content.toString('UTF-8')
        , extension = bundle.meta.extension;

      // @TODO check if we need to compile the file before we can lint it as it
      // can change extensions after that..

      if ('lint' in bundle && bundle.lint === false) fn();
      if (!(extension in parsers)) return fn();
      if (extension === output.extension) return fn();

      parsers[extension](content, config, function linted (err, failures) {
        if (err) fn(err);
        if (failures && failures.length) {
          self.logger.info();
          self.logger.info(
              '%s Failures detected in %s file, scanned with a %s parser'
            , ('' + failures.length).red
            , key.cyan
            , extension.cyan
          );
          self.logger.info();

          reporters.base.call(
              self
            , {
                  content: content
                , extension: extension
              }
            , failures
            , configuration
          );
        }

        fn();
      });
    }, next);
  };
};

/**
 * The actual hinters, linters and other parsers.
 *
 * @api private
 */

var parsers = {
    /**
     * JSHint the content
     *
     * @param {String} content
     * @param {Object} options
     * @param {Function} fn
     * @api private
     */

    js: function parser (content, options, fn) {
      var jshintrc = path.join(process.env.HOME || process.env.USERPROFILE, '.jshintrc')
        , jshintninja = configurator(jshintrc)
        , config = options.jshint;

      // extend all the things
      config = _.extend(config, jshintninja);

      canihaz.jshint(function lazyload (err, jshint) {
        if (err) return fn(err);

        var validates = jshint.JSHINT(content, config)
          , errors;

        if (!validates) errors = formatters.js(jshint.JSHINT.errors);
        fn(null, errors);
      });
    }

    /**
     * JSHint the content
     *
     * @param {String} content
     * @param {Object} options
     * @param {Function} fn
     * @api private
     */

  , css: function parser (content, options, fn) {
      // clone the object as we need to remove the un-used options
      options = _.extend({}, options.csslint);

      // the csslint options only looks for keys in the object so we need to
      // remove all the options that have the value set to `false`
      Object.keys(options).forEach(function remove (key) {
        if (!options[key]) delete options[key];
      });

      canihaz.csslint(function lazyload (err, csslint) {
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
    /**
     * Simple output of the errors in a human readable fashion.
     *
     * @param {Object} file
     * @param {Array} errors
     * @api pprivate
     */

    base: function (file, errors, options) {
      var reports = []
        , content = file.content.split('\n');

      errors.forEach(function error (err) {
        // some linters don't return the location -_-
        if (!err.line) return reports.push(err.message.grey, '');

        var start = err.line > 3 ? err.line - 3 : 0
          , stop = err.line + 2
          , range = content.slice(start, stop)
          , numbers = _.range(start + 1, stop + 1)
          , len = stop.toString().length;

        reports.push('Lint error: ' + err.line + ' col ' + err.column);
        range.map(function reformat (line) {
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

/**
 * Simple configuration parser, which is less strict then a regular JSON parser.
 *
 * @param {String} path
 * @returns {Object}
 */

function configurator (location) {
  return !(location && fs.existsSync(location))
    ? {}
    : JSON.parse(
        fs.readFileSync(location, 'UTF-8')
          .replace(/\/\*[\s\S]*(?:\*\/)/g, '') // removes /* comments */
          .replace(/\/\/[^\n\r]*/g, '') // removes // comments
      );
}
