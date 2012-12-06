'use strict';

/**!
 * [square]
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.it>
 * MIT Licensed
 */

/**
 * Native modules.
 */
var Stream = require('stream')
  , fs = require('fs');

/**
 * Third party modules.
 */
var canihaz = require('canihaz')('square');

/**
 * Upload the output of the file to a cloud provider.
 *
 * @param {Square} square The reference to the square instance
 * @param {Object} collection The collection and file details
 * @param {Function} fn callback
 * @api public
 */
module.exports = function write(square, collection, fn) {
  canihaz.pkgcloud(function lazyload(err, pkgcloud) {
    if (err) return fn(err);

    var storage = square.package.storage
      , client = pkgcloud.storage.createClient(storage.cloud);

    stream.pipe(client.upload({
        container: storage.container
      , remote: 'filename.stuff'
    }));
  });
};
