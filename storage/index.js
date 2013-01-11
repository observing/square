'use strict';

/**!
 * [square]
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.it>
 * MIT Licensed
 */

// Generate a lazy require interface so not all storage systems loaded in to
// memory.
[
    'disk'    // store all compiled assets directly on the system disk
  , 'cloud'   // upload all compiled assets to a cloud provider
  , 'debug'   // outputs all compiled assets to STDOUT for debugging purposes
].forEach(function expose(storage) {
  var cached;

  Object.defineProperty(exports, storage, {
    get: function get() {
      return cached || (cached = require('./'+ storage));
    }
  });
});
