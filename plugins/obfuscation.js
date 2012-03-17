"use strict";

var ActiveX = require('active-x-obfuscator');

/**
 * Obfusticate JavaScript, there are firewalls that cannot handle ActiveX in the
 * script body and drop the file as a result of this. This tool fixes that
 * issue.
 *
 * @param {Object} options
 * @returns {Function} middleware
 * @api public
 */

module.exports = function setup (options) {
  return function obfuscation (content, next) {
    var obfused, err;

    process.nextTick(function tick () {
      try { return next(null, ActiveX(content)); }
      catch (e) { return next(e, content); }
    });
  };
};
