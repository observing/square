'use strict';

/**!
 * [square]
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.it>
 * MIT Licensed
 */

/**
 * Write the output of the files to STDOUT so we can debug it's contents
 *
 * @param {Square} square The reference to the square instance
 * @param {Object} collection The collection and file details
 * @param {Function} fn callback
 * @api public
 */
module.exports = function write(square, collection, fn) {
  square.debug('writing '+ collection.file);
  square.debug('');
  console.log(collection.content);
  square.debug('');

  process.nextTick(fn);
};
