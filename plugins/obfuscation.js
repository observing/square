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
   * @param {Object} output
   * @param {Function} next
   * @api private
   */

  return function obfuscation (output, next) {
    if (output.extension !== 'js') return process.nextTick(next);

    process.nextTick(function tick () {
      try {
        output.content = activex(output.content);
        return next(null, output);
      } catch (e) { return next(e, output); }
    });
  };
};
