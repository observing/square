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

var preprocess = require('./pre-process');

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
 * Simple helper function for working with absolute paths.
 *
 * @param {String} file
 * @param {String} root
 * @api private
 */

function basepath (file, root) {
  return file.charAt(0) === '/'
    ? file
    : path.join(root, file);
}

/**
 * Square
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
  this.logger = new Logger({
      timestamp: false
    , namespacing: 0
    , notification: 0
  });

  /**
   * When the stdout properly is set we need to see if we should enable logging
   * or not.
   */

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
  var args = slice.call(arguments).reduce(function reduce (memory, arg) {
    memory[typeof arg] = arg;
    return memory;
  }, {});

  // when we receive an object in the arguments we assume it's the parse package
  // details
  this.package = args.object;

  // oh, we got a string, assume filename, fetch the file and parse it
  if (args.string) {
    try {
      args.package = fs.readFileSync(args.string, 'utf8');
      this.package = JSON.parse(args.package);        // the parsed file
      this.package.path = path.dirname(args.string);  // folder of the bundle
      this.package.source = args.package;             // stringified content
      this.package.location = args.string;            // location of the bundle
    } catch (e) {
      this.logger.critical('Failed to parse the bundle', e.stack);
      process.exit(1); // if we can't parse it, we shouldn't continue at all
    }
  }

  // make sure that the package is in the correct format so we need to do some
  // extra validation
  if (!this.package.bundle) {
    this.logger.critical('Missing `bundle.bundle` object');
    process.exit(1);
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
  this.emit('pre-parse', data);

  /**
   * Generate the weight of a single grouped file or dependency.
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
        if (typeof target[prop] !== 'object'
          || !depth
          || typeof additional[prop] !== 'object'
        ) {
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

  var depended = {}
    , orderedGroup = {}
    , groups = {
          squared: []
      };

  Object.keys(data.bundle).forEach(function each (file, index, files) {
    var bundle = data.bundle[file]
      , base = data.path
      , location = basepath(file, base)
      , extension
      , total;

    // add current file to the group it belongs to
    if (bundle.group && bundle.group.length) {
      bundle.group.forEach(function eachGroup (id) {
        if (!Array.isArray(groups[id])) groups[id] = [];
        groups[id].push(file);
      });
    } else {
      groups.squared.push(file);
    }

    // Check if the file has dependencies, if none provide empty array
    if (!Array.isArray(bundle.dependencies)) bundle.dependencies = [];

    // make sure it exists
    if (!path.existsSync(location)) {
      this.logger.critical(location + ' doesn\'t exist, can\'t read file');
      process.exit(1);
    }

    extension = file.split('.').pop();
    bundle.content = fs.readFileSync(location, 'UTF8');

    // add some additional information to the bundle
    bundle.meta = {
        location: location
      , path: base
      , filename: path.basename(bundle.filename || file)
      , extension: extension
      , compile: preprocess[extension]
      , package: data
    };

    // find all the dependencies
    total = bundle.dependencies.length;
    bundle.dependencies.forEach(function each (file, index) {
      var amount = weight(bundle.weight || 1, total--);

      // make sure that the dependencies list only contains files that are in
      // the bundle
      if (!data.bundle[file]) {
        return this.logger.critical('dependency %s is not specified in the bundle', file);
      }

      // the dependency always uses the highest weight it gets assigned
      if (!depended[file] || depended[file] < amount) depended[file] = amount;
    }.bind(this));
  }.bind(this));

  // Loop all the groups and order the files on weight
  Object.keys(groups).forEach(function eachGroupOrder (name, index) {
    var total = groups[name].length;

    groups[name].forEach(function each (file) {
      var amount = weight(data.bundle[file].weight || 1, total--);

      // the group file always uses the highest weight it gets assigned
      if (!orderedGroup[file] || orderedGroup[file] < amount) {
        orderedGroup[file] = amount;
      }
    });

    // sort each group based on their assigned weight
    groups[name] = groups[name].sort(function sortGroup (a, b) {
      return orderedGroup[b] - orderedGroup[a];
    });
  });

  // Loop the files again now that we know relative weights and sort the dependencies
  Object.keys(data.bundle).forEach(function each (file, index, files) {
    var bundle = data.bundle[file]
      , dependencies = [];

    // sort the dependencies based on their assigned weight
    if (bundle.dependencies.length) {
      dependencies = bundle.dependencies.sort(function sort (a, b) {
        return depended[b] - depended[a];
      });
    }

    // ensure that all dependencies are loaded correctly, so we don't generate any
    // files bundles with missing dependencies
    dependencies = dependencies.filter(function remove (file) {
      if (!data.bundle[file]) {
        this.logger.critical('missing dependency: ' + file);
        return false;
      }

      return true;
    }.bind(this));

    // set the sorted dependencies
    this.package.bundle[file].dependencies = dependencies;
  }.bind(this));

  // the package is now updated with the parsed data so we can use and abuse it
  this.package = data;

  // attach the groups for easy lookups
  this.package.groups = groups;

  // make sure there is a configuration, and if it's there merge it with our
  // default configuration so we are sure that every option is specified
  this.package.configuration = merge(this.config, this.package.configuration || {});

  // if there is a license file in the configuration we are going to parse it
  // out so we can use it
  var configuration = this.package.configuration
    , location;

  if (configuration.license) {
    location = basepath(configuration.license, this.package.path);

    if (!path.existsSync(location)) {
      this.logger.error(location + ' does not exit, cant read license file');
      delete this.package.configuration.license;
    } else {
      this.package.configuration.license = fs.readFileSync(location, 'UTF8');
    }
  }

  // allow strings to be used as distribution configuration, this is useful if
  // your min and dev output are in the same location
  if (typeof configuration.dist === 'string') {
    location = configuration.dist;
    configuration.dist = {
        min: location
      , dev: location
    };
  }

  return this.emit('parse', this.package);
};

/**
 * Refresh the contents of a file.
 *
 * @param {Array} files
 * @api public
 */

Square.prototype.refresh = function refresh (files) {
  var bundle = this.package.bundle;

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
  }.bind(this));
};

/**
 * Build the stuff.
 *
 * @param {String} extension
 * @param {Array} groupsout
 * @param {Function} fn
 * @api private
 */

Square.prototype.build = function build (extension, groupsout, fn) {
  var self = this;

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
      , files = []
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
 * @api private
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
    , md5: createHash('md5').update(collection.content).digest('hex')
    , group: collection.group
    , branch: branch
    , sha: sha
    , ext: collection.extension || 'js'
    , date: date.toLocaleDateString()
    , year: date.getFullYear()
    , user: process.env.USER || 'anonymous'
    , host: os.hostname()
  }, this.package.configuration.vars || {});
};

/**
 * Write the output of the file to a directory. Collection contains the following keys:
 *  content: processed file contents
 *  extension: file extension
 *  group: group name of current file
 *
 * @param {Object} collection
 * @param {String} type
 * @param {String} extension
 * @param {Function} fn
 * @api private
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
    if (err) this.logger.critical('failed to write ' + base + ' to disk', err);
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
 * Merge all the dependencies in to one single file.
 *
 * @param {String} extension the file extension that needs to be build
 * @param {Array} groupsout the groups that should be build
 * @api private
 */

Square.prototype.merge = function merge (extension, groupsout) {
  var bundle = this.package.bundle
    , groups = {}
    , self = this
    , count = {}
    , files = [];

  // which extension should we build
  extension = extension || 'js';
  if (!bundle || !this.package.groups) return this;

  /**
   * Search the code for require statements, parse it out and inline the
   * content's of the required file.
   *
   * @param {String} match complete matched result
   * @param {String} commenttype type of comment
   * @param {String} statement import statement name
   * @param {String} file the file that needs to be inlined
   * @returns {String}
   * @api private
   */

  function insert (match, commenttype, statement, file) {
    var location = basepath(file, self.package.path);

    if (path.existsSync(location)) return fs.readFileSync(location, 'UTF8');

    self.logger.error('ignoring [square] @%s statement %s does not exit', statement, file);
    return '';
  }

  Object.keys(this.package.groups).forEach(function eachGroup(group) {
    // only merge groups that the user specified, otherwise do all
    if (groupsout.length && !~groupsout.indexOf(group)) return;

    count[group] = {};
    groups[group] = self.package.groups[group].filter(function filter (file) {
      var meta = bundle[file].meta
        , ext = meta.extension;

      // maintain a counter of the files that needs pre-processing, this counter
      // is later feed in to the pre-process compiler so it knows how many files
      // it is going to process and can inject special code for the first or
      // last file that it's processing.
      if (meta.compile) {
        count[group][ext] = ext in count[group]
          ? ++count[group][ext]
          : 0;
      }

      return ext === extension || (
        meta.compile && meta.compile.extension === extension
      );
    });
  });

  Object.keys(groups).forEach(function eachFilteredGroup (name) {
    var concat = []
      , deptree = [];

    /**
     * Build a dependency tree within a group per file and remove duplicates
     *
     * @param {String} pointer file name in the bundle
     */

    function iterateDependencies (pointer) {
      bundle[pointer].dependencies.forEach(function each (current) {
        // mirrored or recursive dependencies lead to infinite dependencies
        if (deptree.length && !!~deptree.indexOf(current)) {
          return self.logger.critical(
              'Duplicate dependency detected on file %s skipping %s'
            , pointer
            , current
          );
        } else {
          deptree.push(current);
        }

        // recursive call
        if (bundle[current].dependencies.length) {
          bundle[current].dependencies.forEach(iterateDependencies);
        }
      });
    }

    // Check if the file has dependencies and do a recursive merge
    groups[name].forEach(function eachDependency (file, next) {
      if (bundle[file].dependencies.length) iterateDependencies(file);
    });

    // remove the file from the group to prevent duplicate insertion
    groups[name] = groups[name].filter(function remove (name) {
      return !!deptree.indexOf(name);
    });

    async.forEachSeries(groups[name], function each (file, next) {
      var spec = bundle[file]
        , data = spec.content.toString('UTF8')
        , ext = spec.meta.extension
        , surgeon;

      /**
       * Simple async callback because pre-compiling is usually done in a async
       * manner.
       *
       * @param {Error} err
       * @param {String} content
       * @api private
       */

      function done (err, content) {
        if (err) return next(err);

        // check if we need preform codesurgeon on the content
        if (spec.extract && spec.extract.length) {
          var surgeon = new Codesurgeon();

          surgeon.configure({ quiet: true });

          // we want to bypass the .read method of the surgeon so we have to
          // inject this inputs object in to surgeon, it's not using the key so we
          // can just put random shit in there
          surgeon.inputs = { foo: content };
          surgeon.extract.apply(surgeon, spec.extract);

          // all magic has been done by le surgeon, grab the transformed output
          content = surgeon.output;
        }

        if (content) concat.push(content);

        next();
      }

      if (spec.dependencies.length) {

        /**
         * Prepend dependencies to the current file content so everything
         * gets processed at once
         *
         * @param {String} file name of file
         */

        deptree.forEach(function prependDependencies (file) {
          data = bundle[file].content.toString('UTF8') + data;
        });
      }

      data = data.split(/\n|\r/g).map(function inspect (line) {
        return line.replace(self.reqparse, insert);
      }).join('\n');

      if (!spec.meta.compile) return done(null, data);

      // this file needs pre-processing, so we need to compile the contents
      // before we can continue, add to make it aware of the current state of
      // the processing
      count[name][ext + 'seen'] = ext + 'seen' in count[name]
        ? ++count[name][ext + 'seen']
        : 0;

      spec.meta.compile.call(
          spec
        , data
        , count[name][ext + 'seen']
        , count[name][ext]
        , done
      );
    }, function done (err) {
      if (err) return this.logger.critical(
          'Failed to concat all dependencies %s'
        , err.stack || err.message
      );

      if (!concat.length) return;

      self.emit('merge', {
          group: name
        , content: concat.join('\n')
        , groupCount: Object.keys(groups).length
      });
    }.bind(this));
  }.bind(this));

  return this;
};

/**
 * Check if we need to prepend a license file.
 *
 * @param {Object} collection
 * @param {String} type
 * @param {String} extension
 * @returns {String}
 * @api private
 */

Square.prototype.license = function copyright (collection, type) {
  var configuration = this.package.configuration
    , license = configuration.license;

  if (!license) return collection.content;

  // process the template with some variables
  license = this.template(license, this.tag.apply(this, arguments));
  return license + collection.content;
};
