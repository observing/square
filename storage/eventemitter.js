'use strict';

/**!
 * [square]
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.it>
 * MIT Licensed
 */

/**
 * Emit the output instead of writing it.
 *
 * @param {Square} square The reference to the square instance
 * @param {Object} collection The collection and file details
 * @param {Function} fn callback
 * @api public
 */
module.exports = function write(square, collection, fn) {
  square.emit('write', collection);
  process.nextTick(fn);
};
