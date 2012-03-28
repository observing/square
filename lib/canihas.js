"use strict";

/**
 * Use npm to lazy install the modules when needed.
 */

var npm = require('npm');


Object.defineProperty(exports, 'stylus', {
  get: function () {
    return exports.canihas.bind(exports, 'stylus');
  }
});

Object.defineProperty(exports, 'less', {
  get: function () {
    return exports.canihas.bind(exports, 'less');
  }
});

Object.defineProperty(exports, 'sass', {
  get: function () {
    return exports.canihas.bind(exports, 'sass');
  }
});

Object.defineProperty(exports, 'coffescript', {
  get: function () {
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

  npm.commands.install([], [packages], function (err) {
    if (err) return fn(err);

    fn(null, require(packages));
  });
};
