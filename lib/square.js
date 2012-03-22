"use strict";

/**
 * Native modules.
 */

var fs = require('fs')
  , os = require('os')
  , path = require('path')
  , createHash = require('crypto').createHash
  , EventEmitter = require('events').EventEmitter;

/**
 * Super charge the EventEmitters
 */

require('eventreactor');

/**
 * Third party modules.
 */

var Logger = require('devnull')
  , _ = require('underscore')._
  , exec = require('shelljs').exec;

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
 * Square
 *
 * @constructor
 * @param {Object} options
 * @api public
 */

var Square = module.exports = function Square (options) {
  this.env = process.env.NODE_ENV || 'development';
  this.logger = new Logger({ timestamp: false });
  this.reqparse = reqparse;

  _.extend(this, options || {});

  // should not be overridden
  this.config = require('../defaults');
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
 * @api private
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

  function some (middleware) {
    return middleware.toString() === layer.toString()
      && middleware.name === layer.name;
  }

  return this.middleware.some(some);
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
    : this.package.configuration.plugin[layer];

  try { middleware = require('../plugins/' + layer); }
  catch (e) {
    this.logger.error('Failed to plugin', layer, e);
  }

  if (middleware) this.use(middleware(options));

  return this;
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
 * Bundle all the things
 *
 * @api public
 */

Square.prototype.bundle = function bundle () {
  var args = slice.call(arguments).reduce(function (memory, arg) {
    memory[typeof arg] = arg;
    return memory;
  }, {});

  // when we receive an object in the arguments we assume it's the parse package
  // details
  this.package = args.object;

  // oh, we got a string, assume filename, fetch the file and parse it
  if (args.string) {
    args.package = fs.readFileSync(args.string, 'utf8');
    this.package = JSON.parse(args.package);        // the parsed file
    this.package.path = path.dirname(args.string);  // folder of the bundle
    this.package.source = args.package;             // stringified content
    this.package.location = args.string;            // location of the bundle
  }

  return this.parse();
};

/**
 * Parse the package.
 *
 * @param {Object} data
 * @api private
 */

Square.prototype.parse = function parse (data) {
  /**
   * Generate the weight of a single dependency.
   *
   * @param {Number} amount
   * @param {Number} padding
   * @return {Number}
   * @api private
   */

  function weight (amount, padding) {
    padding = padding < 10
      ? '0' + padding.toString(10)
      : padding.toString(10);

    return +(amount + '.' + padding);
  }

 /**
  * Does a deep merge on an object.
  *
  * @param {Object} target
  * @param {Object} additional
  * @api private
  */

  function merge (target, additional, deep, lastseen) {
    var seen = lastseen || []
      , depth = typeof deep === 'undefined' ? 2 : deep
      , prop;

    for (prop in additional) {
      if (additional.hasOwnProperty(prop) && seen.indexOf(prop) < 0) {
        if (typeof target[prop] !== 'object' || !depth) {
          target[prop] = additional[prop];
          seen.push(additional[prop]);
        } else {
          merge(target[prop], additional[prop], depth - 1, seen);
        }
      }
    }

    return target;
  }

  // default
  data = data || this.package;

  var dependencies = []
    , depended = {};

  Object.keys(data.bundle).forEach(function each (file, index, files) {
    var bundle = data.bundle[file]
      , base = data.path
      , location = path.join(base, file)
      , total;

    // add the current file to the dependency tree, as the last file so all
    // other dependencies are loaded before this file
    if (!Array.isArray(bundle.dependencies)) bundle.dependencies = [];
    if (!~bundle.dependencies.indexOf(file)) bundle.dependencies.push(file);

    // make sure it exists
    if (!path.existsSync(location)) {
      return this.logger.error(location + ' does not exist, cant read file');
    }

    // parse the data, and add some meta data
    bundle.content = fs.readFileSync(location, 'utf8');
    bundle.meta = {
        location: location
      , path: base
      , extension: file.split('.').pop()
      , package: data
    };

    // find all the dependencies
    total = bundle.dependencies.length;
    bundle.dependencies.forEach(function each (file, index) {
      var amount = weight(bundle.weight || 1, total--);

      // the dependency always uses the highest weight it gets assigned
      if (!depended[file] || depended[file] < amount) depended[file] = amount;
      if (!~dependencies.indexOf(file)) dependencies.push(file);
    });
  }.bind(this));

  // sort the dependencies based on their assigned weight
  dependencies = dependencies.sort(function sort (a, b) {
    return depended[b] - depended[a];
  });

  // ensure that all dependencies are loaded correctly, so we don't generate any
  // files bundles with missing dependencies
  dependencies.some(function (file) {
    if (!data.bundle[file]) {
      this.logger.error('missing dependency: ' + file);
      return false;
    }

    return true;
  }.bind(this));

  // the package is now updated with the parsed data so we can use and abuse it
  this.package = data;

  // attach the dependencies for easy lookups
  this.package.dependencies = dependencies;

  // make sure there is a configuration, and if it's there merge it with our
  // default config so we are sure that every option is specified
  this.package.configuration = merge(this.config, this.package.configuration || {});

  return this.emit('parse', this.package);
};

/**
 * Build the stuff.
 *
 * @api private
 */

Square.prototype.build = function build () {
  var layers = this.middleware.slice(0)
    , errors = []
    , self = this
    , backup;

  /**
   * Simple iteration helper function to process the middleware.
   *
   * @param {Mixed} err error or undef/null
   * @param {String} content
   * @api private
   */

  function iterate (err, content) {
    var layer = layers.shift();

    if (err) errors.push(err);
    if (content) backup = content;
    else content = backup;

    if (!layer) {
      if (errors.length) return self.logger.error('Failed to process content', errors);
      return self.write(content, 'min');
    }

    // capture errors that might be caused the middleware layers
    try { layer.call(self, content, iterate); }
    catch (e) { iterate.call(iterate, e, content); }
  }

  this.once('merge', function merged (content) {
    iterate(null, content);
    self.write(content, 'dev');
  });

  return this.merge();
};

/**
 * Process the template string.
 *
 * @param {String} str
 * @param {Object} data
 * @returns {String} result
 * @api private
 */

Square.prototype.template = function template (str, data) {
  data = data || this.package;

  for (var prop in data) {
    str = str.replace(new RegExp('{' + prop + '}', 'g'), data[prop]);
  }

  return str;
};

/**
 * Creates a tag / profile from the content so it can be used for processing.
 *
 * @param {String} content
 * @param {String} type
 * @param {String} extension
 * @returns {Object}
 * @api public
 */

Square.prototype.tag = function tag (content, type, extension) {
  var branch = exec('git branch', { silent:true }).output
    , sha = exec('git show -s', { silent:true }).output
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
    , md5: createHash('md5').update(content).digest('hex')
    , branch: branch
    , sha: sha
    , ext: extension || 'js'
    , date: date.toLocaleDateString()
    , year: date.getFullYear()
    , user: process.env.USER || 'anonymous'
    , host: os.hostname()
  }, this.package.configuration.vars || {});
};

/**
 * Write the output of the file to a directory.
 *
 * @param {String} content
 * @param {String} type
 * @param {String} extension
 * @api private
 */

Square.prototype.write = function write (content, type, extension) {
  var configuration = this.package.configuration
    , output = configuration.dist[type].replace(/^~/g, process.env.HOME)
    , file = this.template(output, this.tag.apply(this, arguments));

  file = path.resolve(file);

  this.logger.info('writing', file);

  fs.writeFile(file, content, function written (err) {
    if (err) this.logger.error(err);
  }.bind(this));
};

/**
 * Merge all the dependencies in to one single file.
 *
 * @api private
 */

Square.prototype.merge = function merge () {
  var bundle = this.package.bundle
    , concat = []
    , self = this;

  if (!bundle || !this.package.dependencies) return this;

  /**
   * Search the code for require statements, parse it out and inline the
   * content's of the required file.
   *
   * @returns {String}
   * @api private
   */
  function insert (match, $1, $2) {
    var location = path.join(self.package.base, $2);

    return fs.readFileSync(location, 'UTF8');
  }

  this.package.dependencies.forEach(function each (file) {
    var content = bundle[file].content.toString('UTF8');

    content = content.split('\n')
      .map(function inspect (line) { return line.replace(self.reqparse, insert); })
      .join('\n');

    concat.push(content);
  });


  // emit a merge event
  this.emit('merge', concat.join('\n'));
  return this;
};
