"use strict";

var canihaz = require('canihaz')('square');

/**
 * Obfuscate JavaScript, there are firewalls that cannot handle ActiveX in the
 * script body and drop the file as a result of this. This tool fixes that
 * issue.
 *
 * @param {Object} options
 * @returns {Function} middleware
 * @api public
 */

module.exports = function setup (options) {
  /**
   * The obfuscate all the things
   *
   * @param {Object} output
   * @param {Function} next
   * @api private
   */

  return function obfuscation (output, next) {
    if (output.extension !== 'js') return process.nextTick(next);

    canihaz['active-x-obfuscator'](function canihazObfuscator (err, activex) {
      if (err) return next(err);

      try {
        output.content = activex(output.content);
        return next(null, output);
      } catch (e) { return next(e, output); }
    });
  };
};

/**
 * Small description of what this plugin does.
 *
 * @type {String}
 * @api private
 */

module.exports.description = 'Obfuscates code that contains Active-X statements so its not blocked by firewalls.';
