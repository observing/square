"use strict";

var activex = require('active-x-obfuscator');

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
  /**
   * The obfuse all the things
   *
   * @param {String} content
   * @param {String} extension
   * @param {Function} next
   * @api private
   */
  return function obfuscation (content, extension, next) {
    if (extension !== 'js') return process.nextTick(next);

    var obfused, err;

    process.nextTick(function tick () {
      try { return next(null, activex(content)); }
      catch (e) { return next(e, content); }
    });
  };
};
