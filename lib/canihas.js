"use strict";

/**
 * Use npm to lazy install the modules when needed.
 */

var npm = require('npm')
  , path = require('path')
  , conf = require('npm/lib/utils/config-defs.js');

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

/**
 * Simple package lazyload installer / require thing..
 *
 * @param {String} packages
 * @param {Function} fn
 * @api private
 */

exports.canihas = function canihas (packages, fn) {
  try { return fn(null, require(packages)); }
  catch (e) {}

  npm.load(conf, function loadnpm (err) {
    if (err) return fn(err);

    // make sure the packages are installed in the square node_modules folder
    // instead of the current directory where the square command is executed
    var where = path.join(__dirname, '../');

    npm.commands.install(where, [packages], function install (err) {
      if (err) return fn(err);

      fn(null, require(packages));
    });
  });
};
