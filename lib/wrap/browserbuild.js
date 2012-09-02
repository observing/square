"use strict";

/**!
 * [square]
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.it>
 * MIT Licensed
 */

/**
 * Third party modules.
 */
var canihaz = require('canihaz')('square');

module.exports = function browserbuilder(content, context, done) {
  canihaz.browserbuild(function omgktnxbai(err, browserbuild) {
    if (err) return done(err);

    var paths = []
      , options = {
            basepath: ''
          , main: ''
          , debug: true
          , global: ''
        };

    browserbuild(paths, options, done);
  });
};
