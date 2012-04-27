"use strict";

var canihas = require('./canihas')
  , path = require('path')
  , _ = require('underscore')._;

require('eventreactor');

/**
 * Watch for file changes in a given directory.
 *
 * @param {String} dir the dir to watch for changes
 * @param {Array} extensions extensions that can trigger a change
 * @param {Function} fn callback
 * @api private
 */

function watching (dir, extensions, fn) {
  var changes = []
    , limited;

  /**
   * Rate limit the change processor so it doesn't call the build function on
   * each tiny file change
   *
   * @api private
   */

  limited = _.debounce(function ratelimit () {
    fn.call(fn, changes);

    // clear the changes again
    changes.length = 0;
  }, 100);

  /**
   * Also add the extensions of pre-processors that compile to the array of
   * given extensions
   */

  var processors = require('./pre-process');

  Object.keys(processors).forEach(function (extension) {
    var compiler = processors[extension];

    if (~extensions.indexOf(compiler.extension)) {
      extensions.push(extension);
    }
  });

  /**
   * Filter out the bad files and try to remove some noise. For example vim
   * generates some silly swap files in directories or other silly thumb files
   *
   * @param {String} file
   * @api private
   */

  function filter (file) {
    var vim = file.charAt(file.length - 1) === '~'
      , extension = /\.(\w{1,})$/.exec(file)
      , location;

    if (vim) file = file.substr(0, file.length - 1);

    // now that we have filtered out vim stuff.. we can generate a location
    location = path.join(dir, file);

    // filter out the duplicates
    if (~changes.indexOf(location)) return;

    changes.push(location);
    process.nextTick(limited);
  }

  /**
   * Simple file filter to ensure that we only watch the files that we need.
   *
   * @param {String} file
   * @param {Object} fstat
   * @returns {Boolean}
   */

  function ignore (file, fstat) {
    var extension = path.extname(file).slice(1);

    if (!extension || extensions.indexOf(extension) === -1) return true;
    return false;
  }

  /**
   * Callback for the createMonitor function, we want to watch for every single
   * change we get.
   *
   * @param {EventEmitter} monitor
   * @api private
   */

  function createMonitor (monitor) {
    monitor.every('created', 'changed', 'removed', filter);
  }

  // lazy install the watcher
  canihas.watch(function lazyinstall (err, watch) {
    if (err) {
      console.error('[FATAL] failed to install', err);
      return process.exit(1);
    }

    watch.createMonitor(dir, { filter: ignore }, createMonitor);
  });
}

/**
 * Creates a live reload instance.
 *
 * @param {Number} port port to create a live reload instance
 * @returns {EventEmitter} promis
 * @api private
 */

watching.live = function live (port) {
  var EventEmitter = new process.EventEmitter();

  canihas['socket.io'](function lazyinstall (err, io) {
    if (err) return EventEmitter.emit('error', err);

    // this assumes that socket.io is able to generate it's own HTTP server
    io = io.listen(port);

    // start listening for changes that are emitted by the watch function and
    // broadcast it to every connected user
    EventEmitter.on('refresh', function refersh (files) {
      console.log('broadcasting', files);
      io.sockets.emit('refresh', files);
    });
  });

  // because we are lazy installing the socket.io module we want to return some
  // sort of `promise` so we can just continue with the reset of the
  // initialization and just emit changes.. Once we are fully installed and
  // running we will process those changes
  return EventEmitter;
};

/**
 * Expose the module
 */

module.exports = watching;
