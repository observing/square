'use strict';

/**!
 * [square]
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.it>
 * MIT Licensed
 */

var processors = {
    // CSS pre-processors
    styl: 'stylus'
  , less: 'less'
  , sass: 'sass'

    // JavaScript pre-processors
  , coffee: 'coffeescript'

    // Template-engine pre-processors
  , jade: 'jade'
};

// Generate lazy requiring statements so we won't be loading to much code bloat
// in to our memory.
Object.keys(processors).forEach(function lazyrequire(extension) {
  var cache;

  Object.defineProperty(exports, extension, {
      get: function getter() {
        return cache || (cache = require('./' + processors[extension]));
      }
  });
});
