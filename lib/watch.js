"use strict";

var canihaz = require('canihaz')('square')
  , path = require('path')
  , _ = require('underscore')._;

require('eventreactor');

/**
 * Watch for file changes in a given directory.
 *
 * @param {Array} dirs the dir to watch for changes
 * @param {Array} extensions extensions that can trigger a change
 * @param {Function} fn callback
 * @api private
 */

function watching (dirs, extensions, fn) {
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
    // the pre-processors are actually exported as compiler extension->compiler
    var compiler = processors[extension]
      , has = extensions.some(function (ext) {
          // each compiler has an array of extensions it can compile to, if our
          // extensions are in one of these we want to accept it
          return ~compiler.extensions.indexOf(ext);
        });

    if (has) extensions.push(extension);
  });

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

  function filter (file) {
    var vim = file.charAt(file.length - 1) === '~'
      , extension = /\.(\w{1,})$/.exec(file)
      , location;

    if (vim) file = file.substr(0, file.length - 1);

    // now that we have filtered out vim stuff.. we can generate a location
    location = path.join(this, file);

    // filter out the duplicates
    if (~changes.indexOf(location)) return;

    // there is a small issue with the watch library that we are using, it's
    // also listening to the given directory so even though might have supplied
    // the constructor with a filter function to ignore files, we need to apply
    // it again when we are triggered to truely ignore these files.
    if (extensions.length && ignore.apply(this, arguments)) return;

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
    // don't ignore directories
    if (!fstat || fstat.isDirectory()) return true;

    var extension = path.extname(file).slice(1);

    // make sure that the file has an extension and that we support it, if not
    // ignore it
    return !(extension && ~extensions.indexOf(extension));
  }


  // lazy install the watcher
  canihaz.watch(function lazyinstall (err, watch) {
    if (err) {
      console.error('[FATAL] failed to install', err);
      return process.exit(1);
    }

    watch = require('../vendor/watch');

    // loop over the directories to watch every single of them for possible file
    // changes.
    dirs.forEach(function directories(dir) {
      /**
       * Callback for the createMonitor function, we want to watch for every single
       * change we get.
       *
       * @param {EventEmitter} monitor
       * @api private
       */

      function createMonitor (monitor) {
        monitor.every('created', 'changed', 'removed', filter.bind(dir));
      }

      watch.createMonitor(dir, {
          // only filter if we have extensions
          filter: extensions.length ? ignore : false
      }, createMonitor);
    });
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
  var EventEmitter = new process.EventEmitter()
    , reload = path.join(__dirname, '..', 'static', 'reload.js')
    , network = require('os').networkInterfaces()
    , location
    , ip;

  canihaz['socket.io'](function lazyinstall (err, io) {
    if (err) return EventEmitter.emit('error', err);

    // this assumes that socket.io is able to generate it's own HTTP server
    io = io.listen(port, {
        'log level': 0                // socket.io spams like whore, silence it
      , 'browser client etag': true   // cache, but with etags for quick refresh
      , 'browser client gzip': true   // minimal overhead for requests
      , 'resource': '/live'           // fancy pancy resources
    });

    // add a file handler for automagical reloads
    io.static.add('/reload.js', {
        file: reload
    });

    // start listening for changes that are emitted by the watch function and
    // broadcast it to every connected user
    EventEmitter.on('refresh', function refersh (files) {
      io.sockets.emit('refresh', files);
    });
  });

  // find the ip of our server so we can add it to the script
  ['eth0', 'en0', 'en1'].some(function some (interfaces) {
    var addresses = network[interfaces];
    if (!addresses) return !!ip;

    addresses.some(function somemore (open) {
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

  // output installation instructions
  [
      '[square] Live reload is initializing, make sure you have the following script'
    , '[square] included in your webpage to recieve the live reloads:'
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
  ].forEach(function each (line) {
    if (!~line.indexOf('[square]')) return console.log(line);

    // the line is prefixed with [square] so it should go to our square logger
    // instead of the console directly
    this.logger.info(line.slice(9));
  }.bind(this));

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
