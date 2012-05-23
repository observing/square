"use strict";

/**
 * Native modules.
 */

var fs = require('fs')
  , os = require('os')
  , zlib = require('zlib')
  , path = require('path')
  , createHash = require('crypto').createHash
  , EventEmitter = require('events').EventEmitter;

/**
 * Super charge the EventEmitters, and sprinkle everything with sugar.
 */

require('eventreactor');
require('sugar');

/**
 * Third party modules.
 */

var Logger = require('devnull')
  , _ = require('underscore')._
  , async = require('async')
  , exec = require('shelljs').exec
  , Codesurgeon = require('codesurgeon').Codesurgeon;

/**
 * Pre-process filters.
 */

var preprocess = require('./pre-process')
  , ϟ = require('./helpers');

/**
 * Cached variables.
 */

var slice = Array.prototype.slice;

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
 * - env: Environment variables, defaults to 'development'
 * - reqparse: Regular expression for parsing directives
 * - logger: A logger instance
 * - commentStyles: Object with a extension=>comment styles
 *
 * @constructor
 * @param {Object} options
 * @api public
 */

var Square = module.exports = function Square (options) {
  var self = this
    , stdout = false;

  this.env = process.env.NODE_ENV || 'development';
  this.reqparse = reqparse;
  this.cli = false;
  this.logger = new Logger({
      timestamp: false
    , namespacing: 0
    , notification: 0
  });
  this.commentStyles = {
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

  // When the stdout properly is set we need to see if we should enable logging
  // or not.
  Object.defineProperty(this, 'stdout', {
      get: function get () {
        return stdout;
      }
    , set: function set (bool) {
        // check if we need to silence the logger
        self.logger.set('level', bool ? 0 : 8);
        stdout = !!bool;
      }
  });

  _.extend(this, options || {});

  // should not be overridden
  this.config = require('../static');
  this.middleware = [];
  this.package = {};
};

Square.prototype.__proto__ = EventEmitter.prototype;

/**
 * Middleware layer. Use different middleware layers for compiling your bundles.
 * The order of definition is respected.
 *
 * @param {Function} layer
 * @api public
 */

Square.prototype.use = function use (layer) {
  if (typeof layer !== 'function') {
    this.logger.error('the supplied middleware isnt a valid function');
    return this;
  }

  // check if we this middleware is already configured
  if (!this.has(layer)) this.middleware.push(layer);
  return this;
};

/**
 * Checks if the middleware layer already exists based on the function name.
 *
 * @param {Function} layer
 * @return {Boolean}
 * @api public
 */

Square.prototype.has = function has (layer) {
  /**
   * Small some function that checks if the supplied middleware is the same as
   * the given middleware layer. This check is done on the contents of the
   * function body and the names of the function.
   *
   * @param {Function} middleware
   * @returns {Boolean}
   * @api private
   */

  return this.middleware.some(function some (middleware) {
    return middleware.toString() === layer.toString()
      && middleware.name === layer.name;
  });
};

/**
 * Load a file from our plugin directory in to our middleware.
 *
 * @param {Function} layer
 * @param {Object} options
 * @api public
 */

Square.prototype.plugin = function plugin (layer, options) {
  var middleware;

  options = options || !this.package.configuration
    ? options
    : this.package.configuration.plugins[layer];

  try { middleware = require('../plugins/' + layer); }
  catch (e) {
    this.logger.error('Failed to plugin', layer, e);
  }

  if (middleware) this.use(middleware(options));

  return this;
};

/**
 * Loop over the plugins/middleware.
 *
 * @param {Object} collection
 * @param {Function} cb
 * @api public
 */

Square.prototype.forEach = function forEach (collection, cb) {
  var self = this
    , backup;

  async.forEachSeries(
      this.middleware

      /**
       * Process the middleware.
       *
       * @param {Function} layer middleware
       * @param {Function} done callback
       * @api private
       */

    , function iterate (layer, done) {
        function yep (err, result) {
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
        cb(err, collection);
      }
  );
};

/**
 * Process a bundle.
 *
 * @param {Object} bundle
 * @param {Function} cb
 * @api public
 */

Square.prototype.process = function process (bundle, fn) {
  var bundles = this.package.bundle
    , meta = bundle.meta
    , content = ''
    , self = this;

  // prevent any dependencies to the content so everything can be processed at
  // once by the pre-processor/compiler
  if (bundle.dependencies && bundle.dependencies.length) {
    content += bundle.dependencies.map(function (key) {
      var prefix = self.commentWrap('[square] dependency: ' + key, meta.extension);

      return prefix + bundles[key].content;
    }).join('\n');
  }

  // add the content
  content += this.commentWrap('[square] bundle: ' + bundle.path, meta.extension);
  content += bundle.content;

  // do some directive processing
  content = this.directive(content, meta.extension);
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

Square.prototype.configure = function configure (evn, fn) {
  var envs = 'all'
    , args = slice.call(arguments);

  // setup the correct argument structure
  fn = args.pop();

  if (args.length) envs = args;
  if (envs === 'all' || ~envs.indexOf(this.env)) fn.call(this);

  return this;
};

/**
 * Bundle all the things.
 *
 * @api public
 */

Square.prototype.bundle = function bundle () {
  var args = slice.call(arguments).reduce(function reduce (memory, arg) {
    memory[typeof arg] = arg;
    return memory;
  }, {});

  // a new bundle is loaded so kill the current package if it exists
  this.package = {};

  if (args.string) {
    // oh, we got a string, assume filename, fetch the file and parse it
    try {
      args.package = fs.readFileSync(args.string, 'utf8');
      this.package = this.fromJSON(args.string);          // the parsed file
      this.package.path = path.dirname(args.string);      // folder of the bundle
      this.package.source = args.package;                 // stringified content
      this.package.location = args.string;                // location of the bundle
    } catch (e) {
      return this.critical('Failed to parse the bundle', e.stack);
    }
  } else if (args.object) {
    // when we receive an object in the arguments we assume it's the parse package
    // details
    try {
      this.package = args.object;                         // the package
      this.package.path = path.dirname(process.env.PWD);  // folder of the bundle
      this.package.source = JSON.stringify(args.object);  // stringified content
      this.package.location = process.env.PWD;            // location of the bundle
    } catch (e) {
      return this.critical('Failed to parse the bundle', e.stack);
    }
  } else {
    return this.critical('Unsupported bundled');
  }

  return this.parse();
};

/**
 * Parse commented JSON. The following comment formats are supported:
 *
 * - `// comment` single line comments
 * - `/* comment` multi line comments
 *
 * @param {String} location
 * @returns {Object}
 * @api public
 */

Square.prototype.fromJSON = function fromJSON (location) {
  if (!location || !path.existsSync(location)) return {};

  return JSON.parse(
    fs.readFileSync(location, 'UTF8')
      .replace(/\/\*[\s\S]*(?:\*\/)/g, '')  // removes /* comments */
      .replace(/\/\/[^\n\r]*/g, '')         // removes // comments
  );
};

/**
 * Output a critical error shutdown the process.
 *
 * @param {String}
 * @api public
 */

Square.prototype.critical = function critical (message) {
  this.logger.critical.apply(this.logger, arguments);

  if (this.cli) return process.exit(1);
  return this.emit('error', new Error(message));
};

/**
 * Parse the package.
 *
 * @param {Object} data
 * @api public
 */

Square.prototype.parse = function parse (data) {
  // ensure that we have data
  data = data || this.package;
  this.emit('pre-parse', data);

  // preform some basic validation on the data structures
  if (!data.bundle) return this.critical('Missing `bundle.bundle` object');

  return this.emit('parse', this.package);
};

/**
 * Refresh the contents of a file.
 *
 * @param {Array} files
 * @api public
 */

Square.prototype.refresh = function refresh (files) {
  var bundle = this.package.bundle
    , extensions = {}
    , changes = [];

  Object.keys(bundle).forEach(function find (file) {
    var meta = bundle[file].meta
      , match = files.some(function some (file) {
          return ~file.indexOf(meta.location);
        });

    if (!match) return;

    // there can be some sort of edge case where the file that we want to have
    // is actually removed & added again from the disk by certain IDE's. So to
    // get around this limitation we need to check if it's there, or just while
    // loop until it's found again :D
    if (!path.existsSync(meta.location)) {
      while (!path.existsSync(meta.location)) {
        // freeze the event loop, lol ;$
      }
    }

    this.package.bundle[file].content = fs.readFileSync(meta.location, 'UTF8');

    // add the file extension to the extensions list so we can create
    // a dedicated rebuild
    extensions[meta.extension] = true;
    changes.push(file);
  }.bind(this));

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

Square.prototype.directive = function directive (data, extension, seen) {
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

  function insert (match, commenttype, statement, file) {
    var location = ϟ.base(file, self.package.path)
      , data = '';

    if (!path.existsSync(location)) {
      return self.critical('[square] @%s statement %s does not exit', statement, file);
    }

    if (~seen.indexOf(location)) {
      return self.critical('recursive [square] import statement detected %s', match);
    }

    // we processed the file, mark it as seen to protect us against recursive
    // includes.
    seen.push(location);

    data += self.commentWrap('[square] directive: ' + file);
    data += fs.readFileSync(location, 'UTF8');

    // pass the contents back in to the directive again so we can also process
    // the directives inside the directive.
    return self.directive(data, extension, seen);
  }

  // start scanning each line of the file to possible directive's
  return data.split(/\n|\r/g).map(function scan (line) {
    return line.replace(this.reqparse, insert);
  }).join('\n');
};

/**
 * Build the stuff.
 *
 * @param {String} extension
 * @param {Array} groupsout
 * @param {Function} fn
 * @api public
 */

Square.prototype.build = function build (extension, groupsout, fn) {
  var self = this
    , files = [];

  // default arguments
  extension = extension || 'js';

  /**
   * Simple callback helper
   *
   * @param {Error} err
   * @param {String} file
   * @api private
   */

  // process all the changes once everything is sucessfully merged
  this.on('merge', function merged (collection) {
    var layers = self.middleware.slice(0)
      , errors = []
      , groupCount = collection.groupCount || 1
      , backup;

    /**
     * Simple iteration helper function to process the middleware.
     *
     * @param {Mixed} err error or undef/null
     * @param {Object} output
     * @api private
     */

    function iterate (err, output) {
      var layer = layers.shift();

      if (err) errors.push(err);
      if (output) backup = output;
      else output = backup;

      if (!layer) {
        if (errors.length) return self.logger.error('Failed to process content', errors);
        return self.write(output, 'min', doneGroup);
      }

      // capture errors that might be caused the middleware layers
      try { layer.call(self, output, iterate); }
      catch (e) { iterate.call(iterate, e, output); }
    }

    /**
     * Simple callback helper
     *
     * @param {Error} err
     * @param {String} file
     * @api private
     */

    function doneGroup (err, file) {
      files.push(file);

      // remove the merge listener otherwise the wrapping closure merged
      // will be called squared (no pun intended)
      self.removeAllListeners('merge');

      // expect more
      if (files.length !== 2 * groupCount) return;
      if (!fn) return;

      // remove all the undefineds, we added those so the files array could also
      // be used as callback counter
      fn(files.filter(function clean (file) {
        return !!file;
      }));
    }

    // decide how we want to process this, if we are outputting data to std-out
    // you don't really want to write both the minified version and a regular
    // version as you output 2 versions of your data, dev and minified
    collection.extension = extension;
    iterate(null, collection);

    // stdout shouldn't receive dev shizzle
    if (!this.stdout) this.write(collection, 'dev', doneGroup);
  });

  this.emit('build');
  return this.merge(extension, groupsout);
};

/**
 * Process the template string.
 *
 * @param {String} str
 * @param {Object} data
 * @returns {String} result
 * @api public
 */

Square.prototype.template = function template (str, data) {
  data = data || this.tag();

  for (var prop in data) {
    str = str.replace(new RegExp('{' + prop + '}', 'g'), data[prop]);
  }

  return str;
};

/**
 * Creates a tag / profile from the content so it can be used for processing.
 *
 * @param {Object} collection
 * @param {String} type
 * @returns {Object}
 * @api public
 */

Square.prototype.tag = function tag (collection, type) {
  var branch = exec('git branch', { silent: true }).output
    , sha = exec('git show -s', { silent: true }).output
    , vars = _.extend(collection, this.package.configuration.vars || {})
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
    , group: collection.group
    , branch: branch
    , sha: sha
    , ext: collection.extension || 'js'
    , date: date.toLocaleDateString()
    , year: date.getFullYear()
    , user: process.env.USER || 'anonymous'
    , host: os.hostname()
    , env: this.env
  }, vars);
};

/**
 * Write the output of the file to a directory. Collection contains the
 * following keys:
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

Square.prototype.write = function write (collection, type, fn) {
  // do not write empty files
  if (!collection.content) return;

  collection.content = this.license.apply(this, arguments);

  // how do we need to output the content to stdout or to a file...
  if (this.stdout) return console.log(collection.content);

  // process the file based output
  var configuration = this.package.configuration
    , output = configuration.dist[type].replace(/^~/g, process.env.HOME)
    , file = this.template(output, this.tag.apply(this, arguments))
    , base = path.basename(file);

  file = path.resolve(file);
  this.logger.info('writing', file);

  // write the actual change to disk
  fs.writeFile(file, collection.content, function written (err) {
    if (err) return this.critical('failed to write ' + base + ' to disk', err);
    if (fn) fn(err, base);
  }.bind(this));

  // run the shizzle through zlib so we can show some compression stats
  zlib.gzip(collection.content, function compressed (err, data) {
    if (err) return;

    var factor = Buffer.byteLength(collection.content) / data.length;
    this.logger.metric(
        base + ': %s normal, %s compressed with a gzip factor of %s'
      , Buffer.byteLength(collection.content).bytes(1).green
      , data.length.bytes(1).green
      , factor.toFixed(1).toString().green
    );
  }.bind(this));
};

/**
 * Check if we need to prepend a license file.
 *
 * @param {Object} collection
 * @param {String} type
 * @returns {String}
 * @api public
 */

Square.prototype.license = function copyright (collection, type) {
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

Square.prototype.commentWrap = function commentWrap (data, extension) {
  var style = this.commentStyles[extension];

  return data.split(/[\n|\r]/g).map(function mapping (line, index, lines) {
    var header = index === 0
      , footer = (index + 1) === lines.length;

    if (header) return style.header + line;
    if (footer) return style.footer + line;

    return style.body + line;
  }.bind(this)).join('\n') + '\n';
};
