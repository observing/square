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

module.exports = function browserify(content, context, done) {
  canihaz.browserify(function omgktnxbai(err, browserify) {
    if (err) return done(err);

    // We can send browserify content instead of a file name by sending it using
    // a `body` param.
    var bundle = browserify({ entry: {
        body: content
    }});

    try { done(null, bundle.bundle()); }
    catch (e) { done(e); }
  });
};
