"use strict";

/**!
 * dev/null
 * @copyright (c) 2011 Observe.it (observe.it) <arnout@observe.com>
 * MIT Licensed
 */

var tty = require('tty')
  , colors = require('colors')
  , util = require('util')
  , EventEmitter = process.EventEmitter;

/**
 * Strict type checking.
 *
 * @param {Mixed} prop
 * @returns {String}
 * @api private
 */

function type (prop) {
  var rs = Object.prototype.toString.call(prop);
  return rs.slice(8, rs.length - 1).toLowerCase()
}

/**
 * Detect if can use colors or not.
 *
 * @type {Boolean}
 * @api private
 */

var atty = tty.isatty(process.stdout.fd);

/**
 * The different log levels, in order of importance.
 *
 * @type {Array}
 * @api private
 */

var levels = {
    'alert': 0
  , 'critical': 1
  , 'error': 2
  , 'warning': 3
  , 'metric': 4
  , 'notice': 5
  , 'info': 6
  , 'log': 7
  , 'debug': 8
};

/**
 * Different log methods and it's output format. It's divided by system env. as
 * you don't want your production log files full of color codes, but you do when
 * them during development as they helpful for spotting errors and debug output.
 *
 * @type {Object}
 * @api private
 */

var methods = {
    development: {
        alert:    'alert:   '.red
      , critical: 'critical:'.red
      , error:    'error:   '.red
      , warning:  'warning: '.yellow
      , metric:   'metric:  '.green
      , notice:   'notice:  '.cyan
      , info:     'info:    '.cyan
      , log:      'log:     '.grey
      , debug:    'debug:   '.grey
    }
  , production: {
        alert:    'alert:'
      , critical: 'critical:'
      , error:    'error:'
      , warning:  'warning:'
      , metric:   'metric:'
      , notice:   'notice:'
      , info:     'info:'
      , log:      'log:'
      , debug:    'debug:'
    }
};

/**
 * A easier to understand logger, designed for readablity during development.
 * The logs can be stamped and colored based on the evn.
 *
 * Options:
 *  - `env` either development or production, default is based on isatty.
 *  - `level` log level, defaults to 8.
 *  - `notification` when do start emitting notification errors, defaults to 1.
 *  - `timestamp` do the logs needs to stamped, defaults to true.
 *  - `pattern` pattern for the timestamp, defaults to node's util log format.
 *  - `base` do we need to provide a base transport by default?, default to true.
 *
 * @constructor
 * @param {Object} options options
 * @api public
 */

var Logger = module.exports = function (options) {
  options = options || {};

  // default options
  this.env = atty ? 'development' : 'production';
  this.levels = levels;
  this.level = options.level || Object.keys(this.levels).length;
  this.notification = this.levels.warning;

  // output related options
  this.timestamp = true;
  this.base = true;
  this.pattern = '{FullYear}-{Month:2}-{Date:2} {toLocaleTimeString}';

  // override the defaults, but not the methods and they should also be the
  // exact same type
  for (var key in options) {
    if (key in this
      && type(this[key]) !== 'function'
      && type(this[key]) === type(options[key])
    ) {
      this[key] = options[key];
    }
  }

  // set the correct prefx
  this.prefix = methods[this.env];
  this.transports = [];
  this.calls = 0;

  // do we need to supply a default logging library?
  if (this.base) {
    this.use(require('../transports/stream'))
  }
};

Logger.prototype.__proto__ = EventEmitter.prototype;

/**
 * Allow different or multiple transports per enviroument by placing it in
 * a configure function.
 *
 * @param {String} env NODE_ENV result
 * @param {Function} fn callback
 * @api public
 */

Logger.prototype.configure = function configure (env, fn) {
  var envs = 'all'
    , args = [].slice.call(arguments);

  fn = args.pop();

  if (args.length) envs = args;
  if ('all' == envs || ~envs.indexOf(this.env)) fn && fn.call(this);

  return this;
};
/**
 * Add more transport methods to the logger.
 *
 * @param {Transport} Transport Transport constructor
 * @param {Object} options configuration for the transport
 * @returns {Logger}
 * @api public
 */

Logger.prototype.use = function (Transport, options) {
  // prevent duplicates
  if (this.has(Transport)
    || type(Transport) !== 'function'
  ) return this;

  this.transports.push(new Transport(this, options || {}));
  return this;
};

/**
 * Test if a transport is available.
 *
 * @param {Transport} Transport Transport constructor
 * @return {Boolean}
 * @api private
 */

Logger.prototype.has = function (Transport) {
  var i = this.transports.length;

  while (i--) {
    if (this.transports[i] instanceof Transport
      || this.transports[i] === Transport
    ) return this.transports[i];
  }

  return false;
};

/**
 * Remove a transport method from the logger.
 *
 * @param {Transport} Transport Transport constructor
 * @returns {Logger}
 * @api public
 */

Logger.prototype.remove = function (Transport) {
  var transport = this.has(Transport)
    , i = this.transports.length;

  // cancel if we don't have a transport
  if (!transport) return this;

  // shutdown the transport
  transport.close();

  // and remove it
  while (i--) {
    if (this.transports[i] === transport) {
      this.transports.splice(i, 1);
    }
  }

  return this;
};

/**
 * The actual method that does the logging, in a fancy pancy format ofcourse.
 *
 * @param {String} type log type
 * @returns {Logger}
 * @api public
 */

Logger.prototype.write = function (type, stack) {
  var level = this.levels[type]
    , args = Array.prototype.slice.call(arguments).slice(2);

  // are we allowed to log
  if (level > this.level) return this;

  for (var i = 0, length = this.transports.length; i < length; i++) {
    this.transports[i].write(type, this.namespace(stack, args), args);
  }

  // do we need to emit a event
  if (level <= this.notification) {
    this.emit(type, args, stack);
  }

  // increase our calls
  ++this.calls;

  return this;
};

/**
 * Generates a timestamp based on the pattern. It's based on the 140bytes gist:
 * https://gist.github.com/1005948.
 *
 * @param {Date} date optional Date instance
 * @returns {String}
 * @api public
 */

Logger.prototype.stamp = function (date) {
  if (!this.timestamp) return '';

  var now = date || new Date;
  return this.pattern.replace(/{(.+?)(?::(.*?))?}/g, function (res, method, padding) {
    for (res = now[method in now ? method : 'get' + method]() // exec the getter
      + (/h/.test(method) || '') // increment month by 1
      + ''; // cast to string
      res.length < padding; // while we need padding
      res = 0 + res // padd with zeros
    );

    return res;
  });
};

/**
 * This is a direct port of Node's console.log formatter, I wanted to support
 * the exact same structure so it's easier swap from `console.log` statements to
 * `logger` statements.
 *
 * But I have optimized the code base, removed pointless javascript var
 * declarations, loop optimizations and more.
 *
 * @copyright https://github.com/joyent/node/blob/master/lib/util.js
 * @param {String} f formatting string
 * @returns {String}
 * @api private
 */

var formatRegExp = /%[sdj%]/g;
Logger.prototype.format = function (f) {
  var args = arguments
    , len = args.length
    , str = []
    , i = 0;

  if (typeof f !== 'string') {
    for (; i < len; i++) {
      str.push(util.inspect(args[i]));
    }
    return str.join(' ');
  }

  i = 1
  str = f.replace(formatRegExp, function (x) {
    if (i >= len) return x;

    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j': return JSON.stringify(args[i++]);
      case '%%': return '%';
      default:
        return x;
    }
  });

  for (var x = args[i]; i < len; x = args[++i]) {
    if (x === null || typeof x !== 'object') {
      str += ' ' + x;
    } else {
      str += ' ' + util.inspect(x);
    }
  }

  return str;
};

/**
 * Parses the stacktraces to useful data structures. Simple yet effective.
 *
 * @param {String} trace the captured stack
 * @param {Mixed} arg first "normal" argument that the logger received
 * @returns {String} namespace
 * @api private
 */

var parseRegExp = /^\s+at\s+(.*)\s\(((?:\w+:\/\/)?[^:]+)/
  , filenameRegExp = /([^/]+)\.js$/
  , methodRegExp = /([^\.]+)(?:\.(.+))?/;

Logger.prototype.namespace = function (trace, args) {
  var stack = trace.split('\n').slice(2, 4)
    , namespace = []
    , arg = args[0]
    , i = 2
    , filename
    , parts
    , internal;

  // try to detect if we received a user defined namespace argument or
  if (args.length > 1           // we should have multiple arguments
      && typeof arg == 'string' // first should be string
      && !~arg.indexOf(' ')     // but not a sentance
      && !~arg.indexOf('%')     // and not a formatting option
  ) {
    parts = stack[0].match(parseRegExp);
    internal = parts[2] === 'native)';

    if (!internal) filename = parts[2].match(filenameRegExp)[1];

    // use shift to remove the argument from the args array so we won't be
    // loggin the namespace, as it's already beein added here.
    namespace.push(args.shift());
  } else {
    while (i--) {
      parts = stack[i].match(parseRegExp);

      // some stacks are like "at /path/here" instead of "at function (/path/)"
      // they have no function information, so we should skip those
      if (!parts) continue;

      internal = parts[2] === 'native)';

      var details = parts[1].match(methodRegExp)
        , method = details[2]
        , object = details[1]
        , fn = parts[1];

      // store the filename of the first item in the stack trace as that's the
      // the file where the logging occured the rest is just a bubble down of
      // the stack. Just make sure it's a native call..
      if (!filename) {
        filename = !internal ? parts[2].match(filenameRegExp)[1] : 'native'
      }

      // ignore anonymouse functions, they are completely pointless
      if (method === '<anonymous>') continue;

      namespace.unshift(method || fn || object);
    }
  }

  // the first section of the namespace should be the filename, which makes it
  // easier to detect
  if (filename) namespace.unshift(filename);
  return namespace.join('/');
};

/**
 * Generate logging methods based on the allowed levels. This allows us to use
 * a more readable syntax like: logger.info('hello world'); We are generating
 * a new Function here so we reduce scope lookups and get a better call stack
 * report.
 *
 * @TODO we might want to check for the log level here instead of in the write
 * function to eleminate a function call and stack generation
 * @api private
 */

Object.keys(levels).forEach(function levelr (level) {
  var capture = [
    , 'return this.write.apply(this, ['
    , '    "'+ level +'"'
    , '  , new Error().stack'
    , '].concat(Array.prototype.slice.call(arguments)));'
  ];

  Logger.prototype[level] = new Function(capture.join(''));
});

/**
 * Start exporting some additional information like log levels etc. Most of the
 * details is already exposed but we might as well, expose all the things.
 */

/**
 * Versioning.
 *
 * @type {String}
 * @api public
 */

Logger.version = '0.0.4';

/**
 * Export the logging methods which are used to prefix the output.
 *
 * @type {Object}
 * @api public
 */

Logger.methods = methods;

/**
 * Log levels, type:level.
 *
 * @type {Object}
 * @api public
 */

Logger.levels = levels;
