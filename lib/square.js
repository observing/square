"use strict";

/**
 * Native modules.
 */
var EventEmitter = require('events').EventEmitter
  , createHash = require('crypto').createHash
  , zlib = require('zlib')
  , path = require('path')
  , fs = require('fs')
  , os = require('os');

/**
 * Third party modules.
 */
var canihaz = require('canihaz')('square')
  , exec = require('shelljs').exec
  , Logger = require('devnull')
  , async = require('async')
  , eson = require('eson')
  , _ = require('lodash');

/**
 * Super charge the EventEmitters, and sprinkle everything with sugar.
 */
require('eventreactor');
require('sugar');

/**
 * Pre-process filters.
 */
var preprocess = require('./pre-process')
  , helper = require('./helpers');

/**
 * Cached variables to speed up common lookups.
 */
var slice = Array.prototype.slice
  , toString = Object.prototype.toString;

/**
 * Require statement parser for inline includes.
 *
 * @type {RegExp}
 * @api private
 */
var reqparse = /(\/\*|\/\/)\s*\[square\]\s*\@(require|import|include)\s*\"([^"]+)?\"(.*)/i;

/**
 * Square, build system.
 *
 * Options:
 *
 * - env: Environment variables, defaults to 'development'.
 * - reqparse: Regular expression for parsing directives.
 * - logger: A logger instance.
 * - commentStyles: Object with a extension=>comment styles.
 *
 * @constructor
 * @param {Object} options
 * @api public
 */
var Square = module.exports = function Square(options) {
  // argument defaults
  options = options || {};

  // create a new dev/null logger instance
  this.logger = new Logger({
      // turn off timestamps
      timestamp: false

      // don't namespace log messages
    , namespacing: -1

      // emit notifications starting at debug
    , notification: 'log notification level' in options
        ? options['log notification level']
        : Logger.levels.debug

      // only logs with level <= log
    , level: 'log level' in options
        ? options['log level']
        : Logger.levels.log

      // do we want to disable the logging base
    , base: 'disable log transport' in options
        ? !options['disable log transport']
        : true
  });

  // setup our eson parser, which will pre-parse our configuration files
  this.eson = eson()
    .use(require('./eson/template').bind(this))
    .use(eson.include)
    .use(eson.bools)
    .use(eson.glob);

  // When the stdout properly is set we need to see if we should enable logging
  // or not.
  Object.defineProperty(this, 'stdout', {
      get: this.getSTDOUT
    , set: this.setSTDOUT
  });

  // the extend should happen after we have set all the Object.define's so they
  // can get triggered once our options are updated.
  if (Object.keys(options).length) _.extend(this, options);

  // these values should never be overriden by the _.extend
  this.config = require('../static');
  this.middleware = [];
  this.package = {};
};

Square.prototype.__proto__ = EventEmitter.prototype;

/**
 * The current process env.
 *
 * @type {String}
 */
Square.prototype.env = (process.env.NODE_ENV || 'development').toLowerCase();

/**
 * Path to the $HOME directory of the user, so we replace ./~ paths with this
 * value.
 *
 * @type {String}
 */
Square.prototype.home = process.env.HOME || process.env.USERPROFILE;

/**
 * The paths that the .plugin method needs to scan in order to find the correct
 * plugin.
 *
 * @type {Array}
 */
Square.prototype.paths = [
    // search in our own plugin directory
    '../plugins'

    // search in the users current directory's .square folder
  , path.join(process.env.PWD, '.square')

    // search in the users current directory
  , process.env.PWD

    // current node_modules folder
  , path.join(process.env.PWD, 'node_modules')
];

/**
 * The list of distribution's that we support.
 *
 * @type {Array}
 */
Square.prototype.distributions = [
    // minified, no comments & crushed
    'min'

    // development, fully commented
  , 'dev'
];

/**
 * Regular Expression for parsing [square] import/require direcives.
 *
 * @type {RegExp}
 */
Square.prototype.reqparse = reqparse;

/**
 * Boolean flag so we know if we run as an API or as a CLI application.
 *
 * @type {Boolean}
 */
Square.prototype.cli = false;

/**
 * Boolean flag that indicates if we need output data to stdout.
 *
 * @type {Boolean}
 * @api private
 */
Square.prototype.standardOutput = false;

/**
 * Small helper object that allows us to wrap files in the correct comment
 * syntax based on the file extension. The key is the file extension and the
 * value is an Object that shows everything should be wrapped.
 *
 * @type {Object}
 */
Square.prototype.commentStyles = {
    js: {
        header: '/*!'
      , body:   ' *'
      , footer: ' */'
    }
  , css: {
        header: '/*!'
      , body:   ' *'
      , footer: ' */'
    }
};

/**
 * Setup our STDOUT get handler.
 *
 * @returns {Boolean}
 * @api private
 */
Square.prototype.getSTDOUT = function getSTDOUT() {
  return this.standardOutput;
};

/**
 * When STDOUT is to true we need to silence our logger, so it doesn't output
 * any information as we will be writing our own data to stdout.
 *
 * @param {Boolean} bool
 * @returns {Boolean}
 * @api private
 */
Square.prototype.setSTDOUT = function setSTDOUT(bool) {
  this.logger.set('level', bool ? -1 : Logger.levels.log);

  return this.standardOutput = !!bool;
};

/**
 * Middleware layer. Use different middleware layers for compiling your bundles.
 * The order of definition is respected.
 *
 * @param {Function} layer
 * @returns {Boolean} success
 * @api public
 */
Square.prototype.use = function use(layer) {
  if (typeof layer !== 'function') {
    this.logger.error('the supplied middleware isnt a valid function');
    return false;
  }

  // check if we this middleware is already configured
  if (this.has(layer)) return false;

  this.middleware.push(layer);
  return true;
};

/**
 * Checks if the middleware layer already exists based on the function name.
 *
 * @param {Function} layer
 * @return {Boolean}
 * @api public
 */
Square.prototype.has = function has(layer) {
  /**
   * Small some function that checks if the supplied middleware is the same as
   * the given middleware layer. This check is done on the contents of the
   * function body and the names of the function.
   *
   * @param {Function} middleware
   * @returns {Boolean}
   * @api private
   */

  return this.middleware.some(function some(middleware) {
    return middleware.toString() === layer.toString()
      && middleware.name === layer.name;
  });
};

/**
 * Load a file from our plugin directory in to our middleware.
 *
 * @param {String} layer name of the plugin
 * @param {Object} options configuration for the plugin
 * @returns {Boolean} success
 * @api public
 */
Square.prototype.plugin = function plugin(layer, options) {
  // argument defaults
  options = options || {};

  var configuration = this.package.configuration
    , length = this.paths.length
    , i = 0
    , middleware
    , location;

  if (configuration && configuration.plugins) {
    options = _.extend(configuration.plugins[layer] || {}, options);
  }

  for (; i < length; i++) {
    location = path.join(this.paths[i], '/' + layer);

    try { middleware = require(location); break; }
    catch (e) {
      this.logger.debug('Failed to load plugin %s', location);
    }
  }

  // we didn't find anything, fail, hard, as the user probably really needed
  // this plugin, or he or she wouldn't require it
  if (!middleware) {
    return this.critical(
        'Unable to load the plugin '
      + layer
      + ', it doesnt exist in any of our paths: '
      + this.paths.join(', ')
    );
  }

  this.use(middleware.call(this, options));
  return true;
};

/**
 * Loop over the plugins/middleware. The collection object should consist of the
 * following key/value pairs:
 *
 * - {String} content, The content that needs to be processed by the middleware.
 * - {String} extension, The extension / filetype of the content.
 *
 * @param {Object} collection
 * @param {Function} cb
 * @api public
 */
Square.prototype.forEach = function forEach(collection, cb) {
  var self = this
    , backup = collection;

  async.forEachSeries(
      this.middleware

      /**
       * Process the middleware.
       *
       * @param {Function} layer middleware
       * @param {Function} done callback
       * @api private
       */
    , function iterate(layer, done) {
        function yep(err, result) {
          if (result) backup = collection = result;
          else collection = backup;

          done(err);
        }

        // capture errors that are thrown in the middleware layers during
        // processing, it won't capture everything for example async errors but
        // that should really be handled by the middleware it self
        try { layer.call(self, collection, yep); }
        catch (e) { yep(e); }
      }

      /**
       * All the middleware processing has been done.
       *
       * @param {Error} err
       * @api private
       */
    , function finished (err) {
        cb(err || undefined, collection);
      }
  );
};

/**
 * Runs the supplied configuration function only for the set env. This allows
 * you to use different middleware stacks for development and production. You
 * can specify as many environments as you wish. It only requires a callback
 * function as last argument. All other arguments are seen as environment
 * variables where it should be toggled.
 *
 * @param {String} env environment
 * @param {Function} fn callback
 * @api public
 */
Square.prototype.configure = function configure(evn, fn) {
  var envs = 'all'
    , args = slice.call(arguments);

  // setup the correct argument structure
  fn = args.pop();

  if (args.length) envs = args;
  if (envs === 'all' || ~envs.indexOf(this.env)) fn.call(this);

  return this;
};

/**
 * Pre-process a single bundle.
 *
 * details.index = index of the file with this extensions
 * details.total = total count of files with this extension
 * details.distribution = distribution type
 *
 * @param {Object} bundle that needs to be processed
 * @param {Object} details
 * @param {Function} cb
 * @api private
 */
Square.prototype.preprocess = function preprocess(bundle, details, fn) {
  var bundles = this.package.bundle
    , meta = bundle.meta
    , content = ''
    , self = this;

  // We need to some processing steps in order to get the correct content for
  // this bundle:
  //
  //   I: We need to fetch the dependencies of the file, it could be that this
  //      file needs to have a variable file loaded in advance before it can be
  //      pre-processed.
  //
  //  II: When the dependencies are combined we need to pre-process the file
  //      with the square directives to include alternate files.
  //
  // III: Check if this file needs to be pre-processed with a compiler such as
  //      Sytlus or CoffeeScript.

  // prevent any dependencies to the content so everything can be processed at
  // once by the pre-processor/compiler
  if (bundle.dependencies && bundle.dependencies.length) {
    content += bundle.dependencies.map(function mapping(key) {
      var prefix = self.commentWrap('[square] dependency: ' + key, meta.extension);

      return prefix + bundles[key].content;
    }).join('\n');
  }

  // add the content of the bundle it self
  content += this.commentWrap('[square] bundle: ' + bundle.path, meta.extension);
  content += bundle.content;

  // do some directive processing on the complete variable
  content = this.directive(content, meta.extension);

  // check for compilers
  if (!('compile' in meta)) return fn(null, content);
  meta.compile.call(bundle, content, details.index, details.count);
};

/**
 * Parse the given bundle, this function accepts multiple argument formats.
 *
 * - String, the location of a bundle file.
 * - Object, a pre-json parseed version of the bundle.
 *
 * @param {Mixed} data the stuff that needs to be parse
 * @param {Boolean} parseOnly only parse the data, don't set it
 * @returns {Mixed} boolean if not parseOnly
 * @api public
 */
Square.prototype.parse = function parse(data, parseOnly) {
  if (!this.read(data)) return false;

  // Now that we have read the data, we need to process it so it gets the
  // desired format that we could actually process. We should take the following
  // steps in consideration:
  //
  // - The bundles is an Object and there for we cannot assume it stays in order
  //   in different engines, if a bundle supplied a "weight" key, we should sort
  //   on that. If this key does not exist we will generate one based on the
  //   current index of the bundle.
  //
  // - We should detect if the supplied bundle needs to be pre-processed based
  //   on the current file extension.
  //
  // - A bundle can have "dependencies" that need to be loaded in advanced
  //   before the bundle can be compiled or pre-processed. Once the bundle is
  //   generated it should remove those "dependencies" from the file¬
  //
  // - If the bundles is an array, we should generate bundle objects from them.
  //
  // - The configuration object should be parsed, to ensure that the "dist" key
  //   is actually an object with paths to the correct release types. In
  //   addition to this, we also need to parse the license header.

  var struct = parseOnly ? data : this.package
    , self = this
    , config;

  if (!('configuration' in struct)) struct.configuration = {};
  if (!('bundle' in struct)) struct.bundle = {};

  // Start assembling the square.json from top to bottom, starting at the
  // configution.
  //
  // Merge the configuration with our defaults so we are sure that all required
  // keys are in place.
  struct.configuration = config = _.extend(
      _.clone(this.config)
    , struct.configuration
  );

  // it's possible that user specified an import section, these should be
  // imported and parsed so we can merge them with the "bundle" key later on.
  if (Array.isArray(config.import)) {
    struct.configuration.import = config.import.map(function importer(path) {
      // we need to call parse recursively as imported files `
      var structure = self.parse(path, true);

      // if we failed to parse it, return an empty object
      if (!structure || !('bundle' in structure)) return {};
      return structure.bundle;
    });
  }

  // parse a potential license header that was specified in the configuration
  // section.
  if ('license' in config) {
    config.license = helper.basepath(config.license, struct.path);

    // do we actually have a config file that we could add here?
    if (!fs.existsSync(config.license)) {
      this.logger.error(
          'Hmz, you added a license to your configuration but % doesnt exist'
        , config.license
      );

      // remove that shizzle
      delete struct.configuration.license;
    } else {
      struct.configuration.license = fs.readFileSync(config.license, 'utf8');
    }
  }

  // check if we need to unfold the "dist" key to a regular object with all
  // supported distribution types.
  if (typeof config.dist === 'string') {
    struct.configuration.dist = this.distributions.reduce(function build(memo, dist) {
      memo[dist] = config.dist;

      return memo;
    }, {});
  }

  // now that all possible configuration options have been parsed we are going
  // to process the heart of the square.json files, the bundles. first we need
  // to check if it's not an array as it could been called using an glob.
  if (Array.isArray(struct.bundle)) {
    struct.bundle = struct.bundle.reduce(function bundle(memo, file, index) {
      memo[file] = self.createBundle(file, index);
    }, {});
  }

  // we are sure that we have a bundle as an object we can merge in any
  // potential configuration.import bundles and merge it with our current bundle
  // structure
  if ('import' in struct.configuration) {
    _.extend(struct.bundle, struct.configuration.import);
  }

  // every possible way of adding bundles to the structure has been handled,
  // time to process the bundle
  _.forEach(struct.bundle, function forEach(bundle, location) {
    // make sure that everything is correct and that all files have been
    // specified correctly
    if (!fs.existsSync(location)) {
      return self.critical(
          'O dear, you specified bundle %s, but that file doesnt exist'
        , location
      );
    }
  });

  return true;
};

/**
 * Refresh the contents and the details of a bundle as it has been changed.
 *
 * @param {Object} bundle
 * @returns {Object} bundle
 * @api public
 */
Square.prototype.refreshBundle = function refreshBundle(bundle) {
};

/**
 * Creates a new bundle compatible object from a file.
 *
 * @param {String} location the path to the file that needs to be converted
 * @param {Number} index file so we can generate an weight
 * @returns {Object} bundle
 * @api public
 */
Square.prototype.createBundle = function createBundle(path, index) {
  var file = fs.readFileSync(path, 'utf8');

  return {
      description: 'This file description has been generated by [square] cli'
    , weight: +index || (
        // if there is no weight established then try to generate a weight based
        // on the items in the Object. Assuming every file in there is added in
        // order, this should generate the correct weight.
        this.package.bundle && !Array.isArray(this.package.bundle)
          ? Object.key(this.package.bundle).length
          : 1
      )
  };
};

/**
 * Read in the possible square.json file and parse it to a JavaScript object.
 *
 * Args:
 * - string, path to a square.json configuration file
 * - object, square.json configuration object
 *
 * @param {Mixed} args
 * @returns {Boolean} successfull reading
 * @api private
 */
Square.prototype.read = function read(args, readOnly) {
  args = [args].reduce(function reduce(memory, arg) {
    var type = /\[object (\w+)\]/.exec(toString.call(arg).toLowerCase())[1];

    memory[type] = arg;
    return memory;
  }, {});

  var structure = {}
    , extension
    , exists;

  // check to see if we actualy need to override the current structure
  if (!readOnly) this.package = structure;

  try {
    // assume that we where called with a string, which is a path to a file that
    // follows our square.json specification.
    if (args.string) {
      // get the extension, so we know what type of file we are dealing with
      // here..
      extension = path.extname(args.string);
      exists = fs.existsSync(args.string);

      // if the file doesn't exist, it could be that they forgot to append .json
      // to the file name, so do a check for that..
      if (!exists && fs.existsSync(args.string + '.json')) {
        args.string = args.string + '.json';
        extension = '.json';
        exists = true;
      }

      // it doesn't exist, bail out
      if (!exists) {
        return this.critical('Failed to parse bundle, %s does not exist ', args.string);
      }

      // handle node.js styled requires
      if (extension === '.js') {
        structure = require(args.string);
        args.package = JSON.stringify(structure);
      } else {
        structure = this.fromJSON(args.string);
        args.package = fs.readFileSync(args.string, 'utf8');
      }

      // apply extra JSON transformation that are done by eson, such as file
      // glob's, JSON includes etc, we need to se the eson.path correctly each
      // time we use it as it's used by the include plugin
      this.eson.path = args.string;
      structure = this.eson.parse(structure);

      structure.path = path.dirname(args.string);      // folder of the bundle
      structure.source = args.package;                 // stringified content
      structure.location = args.string;                // location of the bundle
    } else if (args.object) {
      structure = args.object;
      args.package = JSON.stringify(structure);

      // apply extra JSON transformation that are done by eson, such as file
      // glob's, JSON includes etc
      this.eson.path = process.env.PWD;
      structure = this.eson.parse(args.package);

      structure.path = path.dirname(process.env.PWD);  // folder of the bundl
      structure.source = args.package;                 // stringified content
      structure.location = process.env.PWD;            // location of the bundle
    } else {
      return this.critical('Unsupported bundled');
    }
  } catch (e) {
    return this.critical('Failed to parse the bundle', e.stack);
  }

  if (readOnly) return structure;
  this.package = structure;

  return true;
};

/**
 * Parse commented JSON. The following comment formats are supported:
 *
 * - `// comment` single line comments
 * - `/ * comment` multi line comments
 *
 * @param {String} location
 * @returns {Mixed} Error if it fails to parse the JSON
 * @api public
 */
Square.prototype.fromJSON = function fromJSON(location) {
  if (!location || !fs.existsSync(location)) return {};

  var cleaned = fs.readFileSync(location, 'utf8')
    // removes /* comments */
    .replace(/\*([^*]|[\r\n]|(\*+([^*\/]|[\r\n])))*\*+/g, '')
    // removes // comments
    .replace(/\/\/[^\n\r]*/g, '');

  // return the parsed instance
  try { return JSON.parse(cleaned); }
  catch (e) { return new Error('Failed to parse JSON: ' + cleaned); }
};

/**
 * Output a critical error shutdown the process.
 *
 * @param {String}
 * @returns {Boolean}
 * @api public
 */
Square.prototype.critical = function critical(message) {
  this.logger.critical.apply(this.logger, arguments);

  if (this.cli) return process.exit(1);
  this.emit('error', new Error(message));

  return false;
};

/**
 * Parse the package.
 *
 * @param {Object} data
 * @api public
 */
Square.prototype.process = function process(data) {
  // ensure that we have data
  data = data || this.package;
  this.emit('pre-parse', data);

  // preform some basic validation on the data structures
  if (!data.bundle) return this.critical('Missing `bundle.bundle` object');

  var collections = {}
    , self = this;

  // we want to pre-parse the bundles as the user might have specified the
  // directory and *.ext (glob) syntax so we want to filter those out and add
  // them to the bundle before we process the data even further
  _.each(data.bundle, function parsing(specification, path) {
    var location = helper.base(path, self.package.path);

    // @TODO glob.Sync
  });

  // now that all files are added to the bundle we are going to check if they
  // exist.
  _.each(data.bundle, function parsing(specification, path) {
    var location = helper.base(path, self.package.path);
  });

  return this.emit('parse', this.package);
};

/**
 * Refresh the contents of a file.
 *
 * @param {Array} files
 * @api public
 */
Square.prototype.refresh = function refresh(files) {
  var bundle = this.package.bundle
    , extensions = {}
    , changes = []
    , self = this;

  Object.keys(bundle).forEach(function find(file) {
    var meta = bundle[file].meta
      , match = files.some(function some (file) {
          return file === meta.location || ~meta.location.indexOf(file);
        });

    if (!match) return;

    // there can be some sort of edge case where the file that we want to have
    // is actually removed & added again from the disk by certain IDE's. So to
    // get around this limitation we need to check if it's there, or just while
    // loop until it's found again :D
    if (!fs.existsSync(meta.location)) {
      while (!fs.existsSync(meta.location)) {
        // freeze the event loop, lol ;$
      }
    }

    self.package.bundle[file].content = fs.readFileSync(meta.location, 'utf8');

    // add the file extension to the extensions list so we can create
    // a dedicated rebuild
    extensions[meta.extension] = true;
    changes.push(file);
  });

  if (!changes.length) return;

  // trigger a new build from the given extensions
  this.emit('changed', _.unique(changes));
  this.build(_.unique(extensions));
};

/**
 * Processes the [square] directive comments that might be found inside the
 * files.
 *
 * @param {String} data content that needs to be scanned
 * @param {String} extension file extension
 * @param {Array|Undefined} seen array of files that the directive has seen
 * @returns {String}
 * @api public
 */
Square.prototype.directive = function directive(data, extension, seen) {
  seen = seen || [];
  var self = this;

  /**
   * Process the directive.
   *
   * @param {String} match complete matched result
   * @param {String} commenttype type of comment
   * @param {String} statement import statement name
   * @param {String} file the file that needs to be inlined
   * @returns {String}
   * @api private
   */
  function insert(match, commenttype, statement, file) {
    var location = helper.base(file, self.package.location)
      , data = '';

    if (!fs.existsSync(location)) {
      return self.critical('[square] @%s statement %s does not exit', statement, file);
    }

    if (~seen.indexOf(location)) {
      return self.critical('recursive [square] import statement detected %s', match);
    }

    // we processed the file, mark it as seen to protect us against recursive
    // includes.
    seen.push(location);

    data += self.commentWrap('[square] directive: ' + file);
    data += fs.readFileSync(location, 'utf8');

    // pass the contents back in to the directive again so we can also process
    // the directives inside the directive.
    return self.directive(data, extension, seen);
  }

  // start scanning each line of the file to possible directive's
  return data.split(/\n|\r/g).map(function scan(line) {
    return line.replace(this.reqparse, insert);
  }).join('\n');
};

/**
 * Build the stuff.
 *
 * @param {String} extension
 * @param {Function} fn
 * @api public
 */
Square.prototype.build = function build(extension, fn) {

};

/**
 * Check if we are running an out of date build of square. Because users are not
 * actively checking if their binary is up to date and will be missing out on
 * critical bug fixes and feature releases.
 *
 * @param {Boolean} random should we do a random check
 * @param {String} branch optional branch
 * @returns {Boolean} allowed to check
 * @api public
 */
Square.prototype.outofdate = function outofdate(random, branch) {
  // allow users to cancel our update check
  if (this.package.configuration && this.package.configuration.noupdate) return false;

  var luckynumber = Math.floor(Math.random() * 11)
    , url = 'https://raw.github.com/observing/square/'
      + (branch || 'master')
      + '/package.json'
    , self = this;

  // rate limit the amount of checks that we are allowed to do, we don't want to
  // check github for every invocation of square
  if (random && luckynumber !== 7) return false;

  canihaz.request(function lazyload(err, request) {
    if (err) return;

    request({ uri: url }, function done(err, res, body) {
      var latest;

      // no need to do error handling here.. if there was an error, we can't
      // probably parse JSON anyways and it will just die inside the JSON.parse
      try { latest = JSON.parse(body.toString('utf8')).version; }
      catch (e) { return; }

      if (latest && latest !== self.version) {
        self.emit('outofdate', latest, self.version);
      }
    });
  });

  return;
};

/**
 * Process the template string.
 *
 * @param {String} str
 * @param {Object} data
 * @returns {String} result
 * @api public
 */
Square.prototype.template = function template(str, data) {
  data = data || this.tag();

  /**
   * Small helper function that allows you get a key from an object by
   * specifing it's depth using dot notations.
   *
   * Example:
   *
   * - path.to.0.keys
   * - key.depth
   *
   * @param {Ojbect|Array} data
   * @param {String} prop
   * @returns {Mixed}
   * @api private
   */
  function getObjectByKey(data, prop) {
    if (!prop || !~prop.indexOf('.')) return data[prop];

    var result = prop
      , structure = data;

    for (var paths = prop.split('.'), i = 0, length = paths.length; i < length; i++) {
      result = structure[+paths[i] || paths[i]];
      structure = result;
    }

    return result || data[prop];
  }

  return str.replace(/\{([^\{]+?)\}/g, function replace(tag, prop) {
    return getObjectByKey(data, prop) || '';
  });
};

/**
 * Creates a tag / profile from the content so it can be used for processing.
 *
 * @param {Object} collection
 * @param {String} type
 * @returns {Object}
 * @api public
 */
Square.prototype.tag = function tag(collection, type) {
  collection = collection || {};

  var configuration = this.package.configuration || {}
    , tags = _.extend(collection, configuration.tags || {})
    , branch = exec('git branch', { silent: true }).output
    , sha = exec('git show -s', { silent: true }).output
    , date = new Date();

  if (branch) {
    branch = /\*\s([\w\.]+)/g.exec(branch) || '';
    branch = branch.length ? branch[1] : branch;
  }

  if (sha) {
    sha = /commit\s(\w+)/g.exec(sha) || '';
    sha = sha.length ? sha[1] : sha;
  }

  return _.extend({
      type: type || 'min'
    , md5: createHash('md5').update(collection.content || '').digest('hex')
    , branch: branch
    , sha: sha
    , ext: collection.extension || 'js'
    , date: date.toLocaleDateString()
    , year: date.getFullYear()
    , user: process.env.USER || 'anonymous'
    , host: os.hostname()
    , env: this.env
  }, tags);
};

/**
 * Write the output of the file to a directory. Collection contains the
 * following keys:
 *
 *  content: processed file contents
 *  extension: file extension
 *  group: group name of current file
 *
 * @param {Object} collection
 * @param {String} type
 * @param {String} extension
 * @param {Function} fn
 * @api public
 */
Square.prototype.write = function write(collection, type, fn) {
  // do not write empty files
  if (!collection.content) return false;

  collection.content = this.license.apply(this, arguments);

  // how do we need to output the content to stdout or to a file...
  if (this.stdout) return console.log(collection.content);

  // process the file based output
  var configuration = this.package.configuration
    , output = configuration.dist[type].replace(/^~/g, this.home)
    , file = this.template(output, this.tag.apply(this, arguments))
    , base = path.basename(file)
    , self = this;

  // make sure that the file is saved relative to the location of the
  // square.json file instead of the current directory of where the command is
  // executed
  file = helper.base(file, this.package.path);
  this.logger.info('writing', file);

  // write the actual change to disk
  if (this.env !== 'testing') {
    fs.writeFile(file, collection.content, function written(err) {
      if (err) return self.critical('failed to write ' + base + ' to disk', err);
      if (fn) fn(err, base);
    });
  } else {
    this.logger.info('Not actually writing %s, we are running in test env', file);
  }

  // run the shizzle through zlib so we can show some compression stats
  zlib.gzip(collection.content, function compressed(err, data) {
    // generate some metrics about the whole compilation
    var size = data ? data.length : 0
      , metrics = {
          factor: '' + (Buffer.byteLength(collection.content) / size).toFixed(1)
        , normal: Buffer.byteLength(collection.content).bytes(1)
        , gzip: data ? data.length.bytes(1) : size.toString()
        , type: type
        , file: file
      };

    self.logger.metric(
        base + ': %s normal, %s compressed with a gzip factor of %s'
      , metrics.normal.green
      , metrics.gzip.green
      , metrics.factor.green
    );

    // emit a write
    self.emit('write', collection.content, metrics);
  });
};

/**
 * Check if we need to prepend a license file.
 *
 * @param {Object} collection
 * @param {String} type
 * @returns {String}
 * @api public
 */
Square.prototype.license = function copyright(collection, type) {
  var configuration = this.package.configuration
    , license = configuration.license;

  if (!license) return collection.content;

  // process the template with some variables
  license = this.template(license, this.tag.apply(this, arguments));

  return this.commentWrap(license, collection.extension) + collection.content;
};

/**
 * Wraps a line/lines in the correct comment format and returns the updated
 * string.
 *
 * @param {String} data
 * @param {String} extension
 * @returns {String}
 * @api public
 */
Square.prototype.commentWrap = function commentWrap(data, extension) {
  var style = this.commentStyles[extension];

  // disgard the comment if we don't have a suitable type
  if (!style) return '';

  return data.split(/[\n|\r]/g).map(function mapping(line, index, lines) {
    var header = index === 0
      , footer = (index + 1) === lines.length;

    // single line comment
    if (header && footer) {
      return '\n' + style.header + ' ' + line + ' ' + style.footer + '\n';
    }

    // multi line comments
    if (header) return '\n' + style.header + '\n' + style.body + ' ' + line;
    if (footer) return style.body + ' ' + line + '\n' + style.footer + '\n';

    return style.body + ' ' + line;
  }).join('\n');
};

/**
 * Expose the current version.
 *
 * @type {String}
 */
Square.prototype.version = Square.version = require('../package.json').version;

/**
 * Small helper function extending Square's prototypes.
 *
 * @param {Object} proto with new prototypes
 * @api public
 */
Square.extend = function extend(proto) {
  _.extend(Square.prototype, proto);
};

/**
 * Extend square with some modules that don't really belong in the "core" of
 * square or that are to bloated that it needs to be loaded from a seperated
 * file.
 */
// add live loading capabilities
// Square.extend(require('./live'));
//
// add file watching capabilities
// Square.extend(require('./watch'));
