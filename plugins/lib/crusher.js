'use strict';

/**!
 * [square]
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.it>
 * MIT Licensed
 */

/**
 * Native modules.
 */
var spawn = require('child_process').spawn
  , cluster = require('cluster')
  , zlib = require('zlib')
  , path = require('path')
  , os = require('os');

/**
 * Third party modules.
 */
var canihaz = require('canihaz')('square')
  , request = require('request')
  , async = require('async')
  , _ = require('lodash');

/**
 * A fork received a new task to process.
 *
 * Task:
 *
 * task.engines: Comma separated list of compressors that need to be used
 * task.extension: The file extension of content
 * task.content: The actual content that needs to be processed
 * task.gzip: Calculate the size of content after gzipping it
 * task.id: The id of this task (private)
 *
 * @param {Object} task
 */
if (!cluster.isMaster) process.on('message', function message(task) {
  var engines = exports[task.extension]
    , started = Date.now()
    , durations = {};

  async.reduce(
      task.engines.split(/\s?\,\s?/).filter(Boolean)
    , task
    , function reduce(memo, engine, done) {
        var backup = memo.content;

        // Compile the shizzle.
        if (engine in engines) {
          durations[engine] = Date.now();

          return engines[engine](memo, function crush(err, content) {
            durations[engine] = Date.now() - durations[engine];

            if (err) {
              memo.content = backup;
              return done(err, memo);
            }

            // Update the content and process all the things again, and again and
            // again.
            memo.content = content;
            done(err, memo);
          });
        }

        // The engine does not exist, send an error response
        process.nextTick(function nexTick() {
          done(new Error('The engine '+ engine +' does not exist'), memo);
        });
      }
    , function done(err, result) {
        result = result || task || {};

        // Add some metrics about this task like:
        // - The total time it took to process this task
        // - The time each individual compiler took to compress the content
        result.duration = Date.now() - started;
        result.individual = durations;

        // Transform the Error to something that can be serialized
        if (err) result.err = { message: err.message, stack: err.stack };
        if (!result.gzip || err) return process.send(result);

        // We want to calculate the size of the generated code once it has been
        // gzipped as that might be more important to users than the actual file
        // size after minification.
        result.gzip = 0;
        zlib.gzip(result.content, function gzip(err, buff) {
          if (err) result.err = { message: err.message, stack: err.stack };

          result.gzip = buff.length;
          process.send(result);
        });
      }
  );
});

/**
 * Send a message to the workers that they need to start processing something.
 *
 *
 * @param {Object} task work for the workers
 * @param {Function} cb callback
 * @api public
 */
exports.id = 0; // Date.now() is not unique enough
exports.send = function send(task, cb) {
  if (!exports.initialized) exports.initialize();

  var worker = exports.workers.shift();

  task.id = task.id || ++exports.id;
  worker.queue[task.id] = cb || function noop(){};
  worker.send(task);

  // Add it back at the end of the array, so we implement a round robin load
  // balancing technique for our workers.
  exports.workers.push(worker);
};

/**
 * Kill all the workers, as we are closing down.
 *
 * @api public
 */
exports.kill = function kill(workers) {
  if (!workers) workers = exports.workers;
  if (!Array.isArray(workers)) workers = [workers];

  workers.forEach(function shutdown(worker) {
    // Remove the worker from the array, so it will not be used again in the
    // `exports#send` method
    var index = exports.workers.indexOf(worker);
    if (~index) exports.workers.splice(index, 0);

    // @TODO Do we need to trigger any queued callbacks? If so with an error?
    worker.queue = {};
    worker.destroy();
  });

  exports.initialized = false;
};

/**
 * Is our cluster already initialized
 *
 * @type {Boolean}
 * @api private
 */
exports.initialized = false;

/**
 * Detect if the `java` binary is installed on this system. Supporting java
 * allows us to spawn a new childprocess for the closure compiler instead of
 * having to do HTTP requests to the closure api service.
 *
 * @type {String|Boolean}
 * @api private
 */
exports.java = false;

try { exports.java = require('which').sync('java'); }
catch (e) {}

/**
 * Configures a new child process spawn that is used to minify files. We use
 * new child processes for this as these kind of operations are CPU heavy and
 * would block the Node.js event loop resulting in slower conversion rates. This
 * setup also allows us to parallel convert code.
 *
 * @param {Array} args required configuration flags
 * @param {Object} config default configuration
 * @param {String} content content
 * @param {Function} fn callback
 * @api public
 */
exports.jar = function jar(args, config, content, fn) {
  var buffer = ''
    , errors = ''
    , compressor;

  // Generate the --key value options, both the key and the value should added
  // separately to the `args` array or the child_process will choke.
  Object.keys(config).filter(function filter(option) {
    return config[option];
  }).forEach(function format(option) {
    var bool = _.isBoolean(config[option]);

    if (!bool || config[option]) {
      args.push('--' + option);
      if (!bool) args.push(config[option]);
    }
  });

  // Spawn the shit and set the correct encoding.
  compressor = spawn(exports.java, args);
  compressor.stdout.setEncoding('utf8');
  compressor.stderr.setEncoding('utf8');

  /**
   * Buffer up the results so we can concat them once the compression is
   * finished.
   *
   * @param {Buffer} chunk
   * @api private
   */
  compressor.stdout.on('data', function data(chunk) {
    buffer += chunk;
  });

  compressor.stderr.on('data', function data(err) {
    errors += err;
  });

  /**
   * The compressor has finished can we now process the data and see if it was
   * a success.
   *
   * @param {Number} code
   * @api private
   */
  compressor.on('close', function close(code) {
    if (errors.length) return fn(new Error(errors));
    if (code !== 0) return fn(new Error('Process exited with code ' + code));
    if (!buffer.length) return fn(new Error('No data returned ' + exports.java + args));

    fn(undefined, buffer);
  });

  // Write out the content that needs to be minified
  compressor.stdin.end(content);
};

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
  var i = workers || os.cpus().length
    , fork;

  /**
   * Message handler for the workers.
   *
   * @param {Worker} worker
   * @param {Error} err
   * @param {Object} task the updated task
   * @api private
   */
  function message(worker, task) {
    var callback = worker.queue[task.id]
      , err;

    // Rebuild the Error object so we can pass it to our callbacks
    if (task.err) {
      err = new Error(task.err.message);
      err.stack = task.err.stack;
    }

    // Kill the whole fucking system, we are in a fucked up state and should die
    // badly, so just throw something and have the process.uncaughtException
    // handle it.
    if (!callback) {
      if (err) console.error(err);
      console.error(task);
      throw new Error('Unable to process message from worker, can\'t locate the callback!');
    }

    callback(err, task);
    delete worker.queue[task.id];
  }

  cluster.setupMaster({
      silent: false       // do we want to write stuff to the parent's stdout
    , exec: __filename    // which script should we fork, only this file plx
  });

  while (i--) {
    // Configure the forked things
    fork = cluster.fork();
    fork.queue = [];
    fork.on('message', message.bind(message, fork));

    exports.workers.push(fork);
  }

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
 * - yui: The interface to the YUI compressor that was build upon Java. It
 *   requires Java to be installed on the users system or it will savely exit
 *   without compressing the content.
 * - yuglify: An Yahoo fork of uglify it adds some addition features and fixes
 *   on top of the original uglify compiler.
 * - sqwish: A node.js based CSS compressor, it has the ability to combine
 *   duplicate CSS selectors as well as all the regular compilations.
 * - csso: Another really agressive CSS compiler written on node.
 * - clean-css: Works the same as the YUI compiler but much faster.
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

      canihaz['uglify-js'](function fetch(err, uglify) {
        if (err) return cb(err);

        try { cb(undefined, uglify.minify(collection.content, { fromString: true }).code); }
        catch (fail) { cb(fail); }
      });
    }

    /**
     * @see http://www.iteral.com/jscrush
     */
  , jscrush: function jscrush(type, collection, cb) {
      if (type !== 'js') return cb(new Error('Type is not supported'));
      var compiler = jscrush.crush || (jscrush.crush = require('./jscrush'));

      try { cb(undefined, compiler(collection.content)); }
      catch (e) { cb(e); }
    }

    /**
     * @see https://github.com/yui/yuicompressor
     */
  , yui: function yui(type, collection, cb) {
      if (!exports.java) return cb(undefined, collection.content);

      // Don't set the 'charset': 'ascii' option for the YUI compressor, it will
      // break utf-8 chars. Other compilers do require this flag, or they will
      // transform escaped utf-8 chars to real utf-8 chars.
      exports.jar(['-jar', path.join(__dirname, '../../vendor/yui.jar')], {
          'type': type
        , 'line-break': 256
        , 'verbose': false
      }, collection.content, cb);
    }

    /**
     * @see https://developers.google.com/closure/compiler
     */
  , closure: function closure(type, collection, cb) {
      if (type !== 'js') return cb(new Error('Type is not supported'));

      // Check if java is supported on this system, if not we have to use the
      // external closure compiler service to handle all the compilation tasks
      // for us.
      if (!exports.java) {
        var status, content, retries = 0;

        // Keep request the Google Closure compiler until it returns an actual
        // proper 200 response, 500 repsonses are common. Limit the amount of tries.
        return async.until(
            function checkStatusCode() {
              if (++retries === 5) {
                console.error([
                  '5 consequtive calls to the closure compiler failed,',
                  'as a result javascript content is not be minified.',
                  'install Java locally or check back later!'
                ].join(' '));
              }

              return status === 200 || retries === 5;
            }
          , function requestClosure(callback) {
              request.post({
                  url: 'https://closure-compiler.appspot.com/compile'
                , form: {
                      output_format: 'text'                     // we only want the compiled shizzle
                    , js_code: collection.content               // the code that needs to be crushed
                    , compilation_level: 'SIMPLE_OPTIMIZATIONS' // compression level
                    , charset: 'ascii'                          // correct the charset
                    , warning_level: 'QUIET'                    // stfu warnings
                    , output_info: 'compiled_code'              // only get compiled codes
                  }
              }, function response(err, resp, body) {
                if (err) return cb(err);

                // Remove pesky new lines, they could be returned in error respones
                if (body) content = body.trim();
                status = resp.statusCode;

                callback();
              });
            }
          , function servicecall() {
              // Check for errors, this is a bit flakey as we only want ascii returned
              // from the server.
              if (content.slice(0, 5) === 'Error') return cb(new Error(content));

              // All is okay
              cb(null, content);
            }
        );
      }

      // Java is supported on this system, use that instead as it will be
      // cheaper and faster then calling the service.
      exports.jar(['-jar', path.join(__dirname, '../../vendor/closure.jar')], {
          'charset': 'ascii'
        , 'compilation_level': 'SIMPLE_OPTIMIZATIONS'
        , 'language_in': 'ECMASCRIPT5'
        , 'warning_level': 'QUIET'
        , 'jscomp_off': 'uselessCode'
        , 'summary_detail_level': 0
      }, collection.content, cb);
    }

    /**
     * @see https://github.com/yui/yuglify
     */
  , yuglify: function yuglify(type, collection, cb) {
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

      canihaz['jsmin-sourcemap'](function fetch(err, jsmin) {
        if (err) return cb(err);

        // @TODO replace src and dest with actual meaningful file names.
        try {
          cb(undefined, jsmin({
              code: collection.content
            , src: 'temp.js'
            , dest: 'temp.js'
          }).code);
        } catch (e) { return cb(e); }
      });
    }

    /**
     * @see https://github.com/Constellation/esmangle
     */
  , esmangle: function esmangle(type, collection, cb) {
      if (type !== 'js') return cb(new Error('Type is not supported'));

      canihaz('esprima', 'escodegen', 'esmangle', function all(err, esprima, escodegen, esmangle) {
        if (err) return cb(err);

        var tree;
        try {
          tree = esprima.parse(collection.content, { loc: true });
          tree = esmangle.optimize(tree, null, {
              destructive: true
            , directive: true
          });
          tree = esmangle.mangle(tree, {
              destructive: true
          });

          cb(undefined, escodegen.generate(tree, {
              format: {
                  renumber: true
                , hexadecimal: true
                , escapeless: true
                , compact: true
                , semicolons: false
                , parentheses: false
              }
            , directive: true
          }));
        } catch(fail) {
          cb(fail);
        }
      });
    }

    /**
     * @see https://github.com/ded/sqwish
     */
  , sqwish: function sqwish(type, collection, cb) {
      if (type !== 'css') return cb(new Error('Type is not supported'));

      canihaz.sqwish(function fetch(err, sqwish) {
        if (err) return cb(err);

        try { cb(undefined, sqwish.minify(collection.content, true)); }
        catch (fail) { cb(fail); }
      });
    }

    /**
     * @see https://github.com/css/csso
     */
  , csso: function csso(type, collection, cb) {
      if (type !== 'css') return cb(new Error('Type is not supported'));

      canihaz.csso(function fetch(err, csso) {
        if (err) return cb(err);

        try { cb(undefined, csso.justDoIt(collection.content, false, true)); }
        catch (fail) { cb(fail); }
      });
    },

  /**
   * @see https://github.com/GoalSmashers/clean-css
   */
  cleancss: function cleancss(type, collection, cb) {
    if (type !== 'css') return cb(new Error('Type is not supported'));

    canihaz['clean-css'](function fetch(err, clean) {
      if (err) return cb(err);

      try { cb(undefined, clean(collection.content, { processImport: false })); }
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
  , yuglify: exports.crushers.yuglify.bind(exports.crushers, 'js')
  , jsmin: exports.crushers.jsmin.bind(exports.crushers, 'js')
  , esmangle: exports.crushers.esmangle.bind(exports.crushers, 'js')
  , yui: exports.crushers.yui.bind(exports.crushers, 'js')
};

/**
 * The compressors that are able to compile Cascading Style Sheets.
 *
 * @type {Object}
 * @api private
 */
exports.css = {
    cleancss: exports.crushers.cleancss.bind(exports.crushers, 'css')
  , csso: exports.crushers.csso.bind(exports.crushers, 'css')
  , sqwish: exports.crushers.sqwish.bind(exports.crushers, 'css')
  , yui: exports.crushers.yui.bind(exports.crushers, 'css')
};
