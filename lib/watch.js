"use strict";

/**!
 * [square]
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.it>
 * MIT Licensed
 */

var canihaz = require('canihaz')('square')
  , path = require('path')
  , _ = require('lodash')
  , async = require('async')
  , fs = require('fs');

/**
 * Constructor for a watcher.
 *
 * @constructor
 * @param {object} square instance
 * @param {Number} port socket.io reload port
 * @param {Boolean} silent no logging at all
 * @api public
 */
function Watcher(square, port, silent) {
  var self = this;

  this.square = square;
  this.silent = silent || false;
  this.socket = this.live.call(this, port);
  this.config = path.resolve(process.env.PWD, this.square.package.location);

  // Notify external listeners that we are idly watching.
  this.defer = function defer() {
    square.emit('idle', self.silent);
  };

  // Initialize the live reload, also trigger watching and process the file list.
  this.init = function init() {
    self.watch.apply(self, arguments[1]);
  };

  // If a build finished, emit a refresh and start the spinner.
  this.square.on('build', function notifyBrowser(files, extensions) {
    self.socket.emit('refresh', files, extensions);
    self.defer();
  });

  // Require fs.notify and findit, trigger the watch.
  async.parallel([canihaz['fs.notify'], canihaz.findit], this.init);
}

/**
 * Helper for finder to also handle symlinks.
 *
 * @param {String} path
 * @param {Function} callback
 * @api private
 */
function getPath(path, callback) {
  fs.lstat(path, function(err, stats) {
    if(err) return callback(err);

    // Check if it's a link
    if(stats.isSymbolicLink()) fs.readlink(path, callback);

    callback(err, path);
  });
}

/**
 * Force a rebuild of the active square configuration if the user
 * changed any files within the bundle.
 *
 * @param {Object} live square configuration in memory
 * @api public
 */
Watcher.prototype.rebuild = function rebuild(live) {
  var self = this
    , process = live || this.config
    , previous = this.square.package
    , current = Object.keys(previous.bundle)
    , diff, fresh;

  // Hold the watch spinner and start fresh parse and pass file difference to
  // refresher, although the user can change anything in the config new files
  // will have the most profound effect and are most common.
  this.square.emit('processing');
  this.square.once('parsed', function parsed(struct) {
    fresh = Object.keys(struct.bundle);
    diff = _.difference(fresh, current);
    if (!diff.length) diff = _.difference(current, fresh);

    // If stuff was removed, just add all files for refreshing
    self.refresher.call(self, null, diff, previous);
  });

  // Temporary block the event loop and parse the new changed JSON configuration.
  if (!live) this.square.hold(this.config);
  this.square.parse(process);
};

/**
 * Call to action after file changes have been detected.
 *
 * @param {Object} err
 * @param {Array} changes collection of files.
 * @api public
 */
Watcher.prototype.refresher = function refresher(err, changes, previous) {
  if (err) {
    return this.square.logger.error(
        'Watcher error %s, canceling watch operations on %s'
      , err.message, changes
    );
  }

  // Start processing, stop the spinner momentarily.
  this.square.emit('processing');
  this.square.refresh(changes, previous);

  // Empty line and notification
  if (!this.silent) {
    console.log('');
    this.square.logger.notice('changes detected in %s, refreshing...', changes.join(', '));
  }
};

/**
 * Process the bundle, create a file list and start watching the list.
 *
 * @param {Object} Notify constructor of fs.notify
 * @param {Object} findit module
 * @api public
 */
Watcher.prototype.watch = function watch(Notify, findit) {
  var self = this
    , changes = []
    , extras = []
    , distributions = []
    , base = this.square.package.path
    , extensions = this.square.package.configuration.watch
    , notifier, finder, limited, adeptable;

  // prepare distribution possibilities.
  ['css', 'js'].forEach(function forEach(ext) {
    var dist = self.square.package.configuration.dist;

    Object.keys(dist).forEach(function constructDistro(type) {
      distributions.push(
        path.resolve(
            base
          , self.square.template(dist[type], self.square.tag({ extension: ext, type: type }))
        )
      );
    });
  });

  // Listen to changes in the Square configuration.
  adeptable = new Notify(this.config);
  adeptable.on('change', _.debounce(this.rebuild.bind(this)), 100);
  adeptable.on('error', this.refresher.bind(this));

  /**
   * Rate limit the change processor so it doesn't call the build function on
   * each tiny file change
   *
   * @api private
   */

  limited = _.debounce(function ratelimit() {
    self.refresher.call(self, undefined, changes);

    // clear the changes again
    changes.length = 0;
  }, 100);

  /**
   * Filter out the bad files and try to remove some noise. For example vim
   * generates some silly swap files in directories or other silly thumb files
   *
   * The this context of this file will be set the current directory that we are
   * watching.
   *
   * @param {String} file
   * @api private
   */

  function filter(location) {
    var file = path.basename(location)
      , vim = file.charAt(file.length - 1) === '~'
      , extension = path.extname(location).slice(1);

    // filter out the duplicates
    if (~changes.indexOf(location) || vim) return;

    changes.push(location);
    process.nextTick(limited);
  }

  // Build a list of files to watch.
  this.square.files(function getFileList(err, list) {
    // Watch the initial set of files, make sure the list only has uniques.
    notifier = new Notify(list);
    notifier.on('change', filter);
    notifier.on('error', self.refresher.bind(self));

    // Find all additional files from working directory, filtered by extensions,
    // but only do this if the user actually added a configuration.watch directive.
    if (extensions && extensions.length) {
      // Take symlinks into account.
      getPath(process.env.PWD, function startFind(err, location) {
        finder = findit.find(location);

        /**
         * We have found a new file in the directory that matches our extension, watch
         * it for changes.
         *
         * @param {String} file
         * @api private
         */
        finder.on('file', function found(file) {
          // make sure we are not watching file already
          if (~list.indexOf(file)) return;

          // Skip the Square configuration file, we listen to that independantly.
          if (file === self.config) return;

          // don't watch node_module folders.. ever.. we might want to look at the
          // possible gitignore or .npmignore files to see what other files need to be
          // black listen, but that is more a @TODO item
          if (~file.indexOf('node_modules/')) return;

          // Check if we want to watch certain extensions.
          if (extensions && !~extensions.indexOf(path.extname(file).slice(1))) return;

          // make sure the file isn't in a dot directory as well..
          if (file.split('/').some(function some(path) { return path[0] === '.'; })) return;

          // Prevent looping any of our output files
          if (~distributions.indexOf(file)) return;

          // All good!
          extras.push(file);
        });

        /**
         * We are done scanning the directory, see if we need to push out more files.
         *
         * @api private
         */

        finder.on('end', function end() {
          if (!extras.length) return;

          notifier.add(extras);
        });
      });
    }
  });

  process.nextTick(this.defer);
};

/**
 * Creates a live reload instance.
 *
 * @param {Number} port port to create a live reload instance
 * @returns {EventEmitter} promise
 * @api private
 */
Watcher.prototype.live = function live(port) {
  var EventEmitter = new process.EventEmitter()
    , reload = fs.readFileSync(path.join(__dirname, '..', 'static', 'reload.js'))
    , network = require('os').networkInterfaces()
    , logger = this.square.logger
    , location
    , ip;

  // lazy install socket.io
  canihaz['socket.io'](function lazyinstall(err, io) {
    if (err) return EventEmitter.emit('error', err);

    // this assumes that socket.io is able to generate it's own HTTP server
    io = io.listen(port, {
        'log level': 0                // socket.io spams like whore, silence it
      , 'browser client etag': true   // cache, but with etags for quick refresh
      , 'browser client gzip': false  // minimal overhead for requests
      , 'resource': '/live'           // fancy pancy resources
    });

    // add a file handler for automagical reloads
    io.static.add('/reload.js', function build(path, fn) {
      // we want to automatically bundle the socket.io library inside our reload.js
      // so we are going to call the default /socket.io.js path so it returns the
      // buffer with the correct generated socket.io code
      io.static.has('/socket.io.js').callback.call(
          io.static
        , '/socket.io.js'
        , function client(err, buffer) {
            if (err) return fn(err);

            // concat the buffers
            fn(undefined, Buffer.concat([buffer, reload]));
          }
      );
    });

    // start listening for changes that are emitted by the watch function and
    // broadcast it to every connected user
    EventEmitter.on('refresh', function refresh(files, extensions) {
      io.sockets.emit('refresh', files, extensions);
    });
  });

  // find the ip of our server so we can add it to the script
  ['eth0', 'en0', 'en1'].some(function someInterfaces(interfaces) {
    var addresses = network[interfaces];
    if (!addresses) return !!ip;

    addresses.some(function someIPV4(open) {
      if (!open.internal && open.family === 'IPv4') {
        ip = open.address;
      }

      return !!ip;
    });

    return !!ip;
  });

  // compile the location of the script
  if (ip) location = 'http://' + ip + ':' + port;
  if (!location) location = 'http://"+ window.location.hostname +":' + port;

  // output installation instructions if not silenced
  if (!this.silent) {
    [
        ''
      , '[square] Live reload is initializing, make sure you have the following script'
      , '[square] included in your webpage to receive the live reloads:'
      , ''
      , '<script>'
      , '  !function(l,i,v,e){'
      , '    e=l.createElement(i);v=l.getElementsByTagName(i)[0];e.async=true;'
      , '    v.parentNode.insertBefore(e,v);'
      , '    e.src="'+ location +'/live/reload.js";'
      , '  }(document,"script");'
      , '</script>'
      , ''
      , '[square] paste it right above your closing </body> tag.'
    ].forEach(function forEach(line) {
      if (!~line.indexOf('[square]')) return console.log(line);

      // the line is prefixed with [square] so it is logged to debug instead of info.
      logger.info(line.slice(9));
    });
  }

  // because we are lazy installing the socket.io module we want to return some
  // sort of `promise` so we can just continue with the reset of the
  // initialization and just emit changes.. Once we are fully installed and
  // running we will process those changes
  return EventEmitter;
};

/**
 * Expose the module
 */
module.exports = Watcher;
