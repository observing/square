"use strict";

/**!
 * [square]
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.it>
 * MIT Licensed
 */

var wrapper = {
    browserbuild: 'browserbuild'
  , browserify: 'browserify'
  , plain: 'plain'
  , amd: 'amd'
};

// Generate lazy requiring statements so we won't be loading to much code bloat
// in to our memory.
Object.keys(wrapper).forEach(function lazyrequire(wrap) {
  var cache;

  Object.defineProperty(exports, wrap, {
      get: function getter() {
        return cache || (cache = require('./' + wrapper[wrap]));
      }
  });
});
