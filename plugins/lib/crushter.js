'use strict';

/**!
 * [square]
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.it>
 * MIT Licensed
 */

/**
 * Native modules.
 */
var child = require('child_process')
  , cluster = require('cluster')
  , path = require('path')
  , os = require('os');

/**
 * Third party modules.
 */
var canihaz = require('canihaz')('square')
  , request = require('request')
  , async = require('async');

/**
 * A fork received a new task to process.
 *
 * Task:
 *
 * task.engines: Comma seperated list of compressors that need to be used
 * task.content: The actual content that needs to be processed
 * task.analyze: Analyze which compression pattern would be optimal for the content
 *
 * @param {Object} task
 */
process.on('message', function message(task) {
  async.reduce(
      task.engines.split(/\,\s+?/)
    , task.content
    , function reduce(memo, engine, done) {

      }
    , function done(err, result) {
        process.send();
      }
  );
});

/**
 * Send a message to the workers that they need to start processing something.
 *
 * @param {String}
 * @api public
 */
exports.send = function send() {
  if (!exports.initialized) exports.initialize();

  var worker = exports.workers.pop();
  worker.send.apply(worker.send, arguments);

  // Add it back at the end of the array, so we implement a round robin load
  // balancing technique for our workers.
  exports.workers.push(worker);
};

/**
 * Is our cluster already initialized
 *
 * @type {Boolean}
 * @api private
 */
exports.initialized = false;

/**
 * Detect if the `java` binary is installed on this system. Supporing java
 * allows us to spawn a new childprocess for the closure compiler instead of
 * having to do HTTP requests to the closure api service.
 *
 * @type {String|Boolean}
 * @api private
 */
exports.java = false;
require('which')('java', function which(err, path) {
  if (err) return; // java is not supported on this system

  // we have found the path to the java executable, set it's path for the child
  // process
  exports.java = path;
});

/**
 * Maintain a list of our workers. They should be ordered on usage, so we can
 * implement a round robin system by poping and pushing workers after usage.
 *
 * @type {Array}
 * @api private
 */
exports.workers = [];

/**
 * Initialize our cluster.
 *
 * @param {Number} workers
 * @api private
 */
exports.initialize = function initialize(workers) {
  var i = workers || os.cpus().length;

  while (i--) exports.workers.push(cluster.fork());
  exports.initialized = true;
};

/**
 * The actual crushers that do the hard work inside this cluster. There are
 * couple of different crushers supported in this cluster:
 *
 * - closure: An interface to the Google Closure Compiler library, it requires
 *   the `java` binary to be installed in system, but gracefully degrades to
 *   their closure service when this is not available.
 * - jsmin: This is one of the earliest minifiers known, it's build by douglas
 *   crockford and does save transformations of the source code.
 * - uglify2: An rewrite of uglify 1, a powerful compiler for JavaScript it's
 *   almost as good as the Google Closure Compiler and in some cases even
 *   better.
 * - yuglyif: An Yahoo fork of uglify it adds some addition features and fixes
 *   on top of the original uglify compiler.
 * - sqwish: A node.js based CSS compressor, it has the ability to combine
 *   duplicate CSS selectors as well as all the regular compilations.
 *
 * The API for each crusher is the same:
 *
 * @param {String} type the file extension they need to crush
 * @param {Object} collection the details and the data
 * @param {Function} cb error first styled callback
 * @api private
 */
exports.crushers = {
    /**
     * @see https://github.com/mishoo/UglifyJS2
     */
    uglify2: function uglify2(type, collection, cb) {
      if (type !== 'js') return cb(new Error('Type is not supported'));
    }

    /**
     * @see https://developers.google.com/closure/compiler
     */
  , closure: function closure(type, collection, cb) {
      if (type !== 'js') return cb(new Error('Type is not supported'));

      // Check if java is supported on this system, if not we have to use the
      // external closure compiler service to handle all the compilation tasks
      // for us.
      if (!exports.java) return request.post({
          url: 'https://closure-compiler.appspot.com/compile'
        , body: {
              output_format: 'text'                     // we only want the compiled shizzle
            , js_code: collection.content               // the code that needs to be crushed
            , compilation_level: 'SIMPLE_OPTIMIZATIONS' // compression level
            , charset: 'ascii'                          // correct the charset
            , language_in: 'ECMASCRIPT5'                // language
            , warning_level: 'QUIET'                    // stfu warnings
          }
      }, function servicecall(err, req, body) {
        if (err) return cb(err);

        // @TODO check the returned body and / or response code for possible
        // service code failures
        cb(undefined, body);
      });

      // @TODO add the child process magic
    }

    /**
     * @see https://github.com/yui/yuglify
     */
  , yuglyif: function yuglyif(type, collection, cb) {
      canihaz.yuglify(function fetch(err, yuglify) {
        if (err) return cb(err);

        yuglify[type === 'js' ? 'jsmin' : 'cssmin'](collection.content, cb);
      });
    }

    /**
     * @see https://github.com/twolfson/node-jsmin-sourcemap
     */
  , jsmin: function jsmin(type, collection, cb) {
      if (type !== 'js') return cb(new Error('Type is not supported'));
    }

    /**
     * @see https://github.com/ded/sqwish
     */
  , sqwish: function sqwish(type, collection, cb) {
      if (type !== 'css') return cb(new Error('Type is not supported'));

      canihaz.sqwish(function fetch(err, sqwish) {
        if (err) return cb(err);

        try { cb(undefined, sqwish(collection.content, true)); }
        catch (fail) { cb(fail); }
      });
    }
};

/**
 * The compressors that are able to compile JavaScript.
 *
 * @type {Object}
 * @api private
 */
exports.js = {
    uglify2: exports.crushers.uglify2.bind(exports.crushers, 'js')
  , closure: exports.crushers.closure.bind(exports.crushers, 'js')
  , yuglyif: exports.crushers.yuglyif.bind(exports.crushers, 'js')
  , jsmin: exports.crushers.jsmin.bind(exports.crushers, 'js')
};

/**
 * The compressors that are able to compile JavaScript.
 *
 * @type {Object}
 * @api private
 */
exports.css = {
    yuglyif: exports.crushers.yuglyif.bind(exports.crushers, 'css')
  , sqwish: exports.crushers.sqwish.bind(exports.crushers, 'css')
};
