"use strict";

/**
 * Use npm to lazy install the modules when needed.
 */

var npm = require('npm')
  , path = require('path')
  , fs = require('fs')
  , conf = require('npm/lib/utils/config-defs.js');

/**
 * Modules that are lazy installed and used by the pre-processing step.
 */

// lazy install stylus
Object.defineProperty(exports, 'stylus', {
  get: function getStylus () {
    return exports.canihas.bind(exports, 'stylus');
  }
});

// lazy install nib
Object.defineProperty(exports, 'nib', {
  get: function getNib () {
    return exports.canihas.bind(exports, 'nib');
  }
});

// lazy install less
Object.defineProperty(exports, 'less', {
  get: function getLess () {
    return exports.canihas.bind(exports, 'less');
  }
});

// lazy install sass
Object.defineProperty(exports, 'sass', {
  get: function getSass() {
    return exports.canihas.bind(exports, 'sass');
  }
});

// lazy install coffeescript
Object.defineProperty(exports, 'coffeescript', {
  get: function getCoffee () {
    return exports.canihas.bind(exports, 'coffee-script');
  }
});

// lazy install jade
Object.defineProperty(exports, 'jade', {
  get: function getJade () {
    return exports.canihas.bind(exports, 'jade');
  }
});

/**
 * Modules that are lazy installed and used by the plugins.
 */

// lazy install active-x-obfuscator
Object.defineProperty(exports, 'obfuscator', {
  get: function getObfuscator () {
    return exports.canihas.bind(exports, 'active-x-obfuscator');
  }
});

// lazy install jsdom
Object.defineProperty(exports, 'jsdom', {
  get: function jsdom () {
    return exports.canihas.bind(exports, 'jsdom');
  }
});

/**
 * Simple package lazyload installer / require thing..
 *
 * @param {String} packages
 * @param {Function} fn
 * @api private
 */

exports.canihas = function canihas (packages, fn) {
  var directory = exports.dot('square')
    , location = path.join(directory, 'node_modules', packages);

  // make sure that we have a installation directory
  if (!directory) return fn(new Error(directory + ' is not a valid directory'));

  try { return fn(null, require(location)); }
  catch (e) {}

  // npm needs to have a configuration loaded or it will not work, so we are
  // using the default configuration that ships in NPM
  npm.load(conf, function loadnpm (err) {
    if (err) return fn(err);

    // make sure the packages are installed in the square node_modules folder
    // instead of the current directory where the square command is executed
    npm.commands.install(directory, [packages], function install (err) {
      if (err) return fn(err);

      fn(null, require(location));
    });
  });
};

/**
 * Generate a dot directory in the home folder of the user. This directory is
 * used to install extra plugins and modules so we don't require root rights for
 * installation when users installed the module using -g flag.
 *
 * @param {String} name
 * @return {Boolean}
 * @api private
 */

exports.dot = function dot (name) {
  var location = path.join(process.env.HOME, '.' + name)
    , stat;

  // the location already exists, lets make sure that it's what we are looking
  // for...
  if (path.existsSync(location)) {
    stat = fs.statSync(location);

    return stat.isDirectory()
      ? location
      : false;
  }

  // try to make the directory
  try {
    fs.mkdirSync(location);
    return location;
  } catch (e) {}

  return false;
};
