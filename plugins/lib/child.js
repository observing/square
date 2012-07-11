"use strict";

var spawn = require('child_process').spawn
  , path = require('path')
  , _ = require('lodash');

/**
 * Configures a new child process spawn that is used to minify files. We use
 * new child processes for this as these kind of operations are CPU heavy and
 * would block the Node.js event loop resulting in slower conversion rates. This
 * setup also allows us to parallel convert code.
 *
 * @param {String} type which command should be spawned
 * @param {Array} flags required configuration flags
 * @param {Object} configuration default configuration
 * @returns {Function} a configured spawn
 * @api public
 */

function compressor (type, flags, configuration) {
  /**
   * Delegrate all the hard core processing to the vendor file.
   *
   * @param {String} extension file extenstion
   * @param {String} content file contents
   * @param {Object} options options
   * @param {Function} fn error first callback
   * @api public
   */

  function compile (extension, content, options, fn) {
    // allow optional options argument
    if (_.isFunction(options)) {
      fn = options;
      options = {};
    }

    var config = _.clone(compile.configuration)
      , args = flags.slice(0)
      , buffer = ''
      , errors = ''
      , compressor;

    if (compile.configuration.type) {
      config.type = extension;
    }

    // generate the --key value options, both the key and the value should added
    // seperately to the `args` array or the child_process will chocke.
    Object.keys(config).filter(function filter (option) {
      return config[option];
    }).forEach(function format (option) {
      var bool = _.isBoolean(config[option]);

      if (!bool || config[option]) {
        args.push('--' + option);
        if (!bool) args.push(config[option]);
      }
    });

    // apply the configuration
    _.extend(config, options);

    // spawn the shit and set the correct encoding
    compressor = spawn(type, args);
    compressor.stdout.setEncoding('utf8');
    compressor.stderr.setEncoding('utf8');

    /**
     * Buffer up the results so we can concat them once the compression is
     * finished.
     *
     * @param {Buffer} chunk
     * @api private
     */

    compressor.stdout.on('data', function data (chunk) {
      buffer += chunk;
    });

    compressor.stderr.on('data', function data (err) {
      errors += err;
    });

    /**
     * The compressor has finished can we now process the data and see if it was
     * a success.
     *
     * @param {Number} code
     * @api private
     */

    compressor.on('exit', function exit (code) {
      // invalid states
      if (errors.length) return fn(new Error(errors));
      if (code !== 0) return fn(new Error('process exited with code ' + code));
      if (!buffer.length) return fn(new Error('no data returned ' + type + args));

      // correctly processed the data
      fn(null, buffer);
    });

    // write out the content that needs to be minified
    compressor.stdin.end(content);
  }

  /**
   * Expose the configuration as global so you can configure the process at once
   * instead of sending the same shitload of options each time.
   *
   * @type {Object}
   * @api private
   */

  compile.configuration = configuration;
  return compile;
}
/**
 * The maxium amount of charactures that we allow one single line before line
 * breaks will be injected. We have set this maxium to make it easier to debug
 * minified code so it's easier to narrow down the location of the broken code.
 *
 * @type {Number}
 * @api private
 */

compressor.maximum = 256;

/**
 * The paths of the executables and/or arguments.
 *
 * @type {Object}
 * @api private
 */

compressor.paths = {
    yui: path.join(__dirname, '../../vendor/yui.jar')
  , closure: path.join(__dirname, '../../vendor/closure.jar')
  , uglify: path.join(__dirname, '../../node_modules/.bin/uglifyjs')
};

/**
 * Spawn a new YUI compressor process, this compressor allows you to compile
 * both CSS and JavaScript.
 *
 * @api public
 */

compressor.yui = compressor('java', ['-jar', compressor.paths.yui], {
    'charset': 'ascii'
  , 'type': 'js'
  , 'line-break': compressor.maximum
  , 'verbose': false
});

/**
 * Spawn a new Google Closure compiler process, this compressor only allows you
 * to compile JavaScript, but does a much better job then the YUI compressor in
 * some cases. But this is the slowest compression you could possibly use.
 *
 * @api public
 */

var closure =
compressor.closure = compressor('java', ['-jar', compressor.paths.closure], {
    'charset': 'ascii'
  , 'compilation_level': 'SIMPLE_OPTIMIZATIONS'
  , 'language_in': 'ECMASCRIPT5'
  , 'warning_level': 'QUIET'
  , 'jscomp_off': 'uselessCode'
  , 'summary_detail_level': 0
});

/**
 * Spawn a new Uglify process, this a next generation compressor complete
 * writting in JavaScript that parses the AST from your JavaScript files.
 * Because this is a fairly new compressor there might be some edgecases that
 * could potentially break your code.
 *
 * @api public
 */

compressor.uglifyjs = compressor(compressor.paths.uglify, [], {
    'ascii': true
  , 'unsafe': true
  , 'lift-vars': true
  , 'max-line-length': compressor.maximum
});

/**
 * Expose the compressor interface.
 *
 * @api public
 */

module.exports = compressor;
