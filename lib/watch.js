"use strict";

var canihaz = require('canihaz')('square')
  , path = require('path')
  , _ = require('underscore')._
  , Notify = require('fs.notify');

/**
 * Watch for file changes in a given directory.
 *
 * @param {Array} dirs the dir to watch for changes
 * @param {Array} extensions extensions that can trigger a change
 * @param {Function} fn callback
 * @api private
 */

function watching(files, extensions, fn) {
  var processors = require('./pre-process')
    , changes = []
    , limited;

  /**
   * Rate limit the change processor so it doesn't call the build function on
   * each tiny file change
   *
   * @api private
   */

  limited = _.debounce(function ratelimit() {
    fn.call(fn, undefined, changes);

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

  // also add the extensions of pre-processors that compile to the array of
  // given extensions
  Object.keys(processors).forEach(function foreach(extension) {
    // the pre-processors are actually exported as compiler extension->compiler
    var compiler = processors[extension]
      , has = extensions.some(function some(ext) {
          // each compiler has an array of extensions it can compile to, if our
          // extensions are in one of these we want to accept it
          return ~compiler.extensions.indexOf(ext);
        });

    if (has) extensions.push(extension);
  });

  // make sure that we only files that satishfies our extensions array
  files = files.filter(function filter(item) {
    return extensions.length
      ? ~extensions.indexOf(path.extname(item).slice(1))
      : true;
  });

  var notifier = new Notify(files);

  notifier.on('change', filter);
  notifier.on('error', fn);
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
    , reload = fs.readFileSync(path.join(__dirname, '..', 'static', 'reload.js'))
    , network = require('os').networkInterfaces()
    , location
    , ip;

  // lazy install socket.io
  canihaz['socket.io'](function lazyinstall(err, io) {
    if (err) return EventEmitter.emit('error', err);

    // this assumes that socket.io is able to generate it's own HTTP server
    io = io.listen(port, {
        'log level': 0                // socket.io spams like whore, silence it
      , 'browser client etag': true   // cache, but with etags for quick refresh
      , 'browser client gzip': true   // minimal overhead for requests
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
    EventEmitter.on('refresh', function refresh(files) {
      io.sockets.emit('refresh', files);
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
  ].forEach(function forEach(line) {
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
