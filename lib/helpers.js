"use strict";

var path = require('path');

/**
 * Small set of library helper functions for square.
 */
module.exports = {
    /**
     * Does a deep merge on an object.
     *
     * @param {Object} target
     * @param {Object} additional
     * @returns {Object} target
     * @api public
     */
    merge: function merge(target, additional, deep, lastseen) {
      var seen = lastseen || []
        , depth = typeof deep === 'undefined'
            ? 2
            : deep
        , prop;

      for (prop in additional) {
        if (additional.hasOwnProperty(prop) && seen.indexOf(prop) < 0) {
          if (typeof target[prop] !== 'object'
            || typeof additional[prop] !== 'object'
            || !depth
          ) {
            target[prop] = additional[prop];
            seen.push(additional[prop]);
          } else {
            merge(target[prop], additional[prop], depth - 1, seen);
          }
        }
      }

      return target;
    }

    /**
     * Generate the weight of a single grouped file or dependency.
     *
     * @param {Number} amount
     * @param {Number} padding
     * @return {Number}
     * @api public
     */
  , weight: function weight(amount, padding) {
      padding = padding < 10
        ? '0' + padding.toString(10)
        : padding.toString(10);

      return +(amount + '.' + padding);
    }

    /**
     * Simple helper function for working with absolute paths.
     *
     * @param {String} file
     * @param {String} root
     * @returns {String}
     * @api public
     */
  , base: function base(file, root) {
      return file.charAt(0) === '/'
        ? file
        : path.join(root, file);
    }

    /**
     * Pad a string.
     *
     * @param {String} str
     * @param {Number} len
     * @param {String} prefix
     * @returns {String}
     * @api public
     */
  , pad: function pad(str, len, prefix) {
      str = '' + str;
      prefix = prefix || '    ';
      return prefix + str + (new Array(len - str.length + 1).join(' '));
    }
};
