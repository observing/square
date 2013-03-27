"use strict";

/**!
 * [square]
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.it>
 * MIT Licensed
 */

/**
 * Native modules.
 */
var fs = require('fs')
  , path = require('path');

/**
 * Third party modules.
 */
var canihaz = require('canihaz')('square');

/**
 * Process Stylus files.
 *
 * @param {String} content the raw file content that needs to be processed
 * @param {Object} context processing details
 * @param {Function} done
 * @api public
 */
var styl = module.exports = function stylus(content, context, done) {
  var bundle = this
    , configuration = bundle['pre:stylus'] || {};

  canihaz.stylus(function omgktnxbai(err, stylus) {
    if (err) return done(err);

    // You can't have stylus without some nibbles.
    canihaz.nib(function omgktnxbai(err, nib) {
      if (err) return done(err);

      var compiler = stylus(content)
        .set('filename', bundle.meta.location)
        .use(nib())
        .import('nib');

      // Process the options.
      if (configuration.compress) compiler.define('compress', true);
      if (configuration.datauri) compiler.define('url', stylus.url());
      if (configuration.evil) compiler.define('eval', function evil(str) {
        return new stylus.nodes.String(eval(str.val));
      });

      // @TODO process the platform list by exposing them as modules.
      if (configuration.define) {
        Object.keys(configuration.define).forEach(function each(def) {
          compiler.define(
              def
            , configuration.define[def]
              ? stylus.nodes.true
              : stylus.nodes.false
          );
        });
      }

      // Everything is configured, compile.
      compiler.render(done);
    });
  });
};

/**
 * Parse our potential import statements from the supplied content. It should
 * also parse the import statements recursively
 *
 * @param {String} location location of the file that needs to be parsed
 * @returns {Array} absolute paths
 * @api public
 */
styl.imports = function imports(location, paths) {
  paths = paths || [];
  if (!fs.existsSync(location)) return paths;

  // Get the file, unparsed so we can minimize the overhead of parsing it
  var content = fs.readFileSync(location, 'utf8')
    , directory = path.dirname(location)
    , ext = path.extname(location);

  // Parse out require statements for the files, supporting the following
  // formats: require 'fs', require "fs", require('fs') and require("fs")
  content.replace(/@import\s[\"\']?([^\'\"]+)[\"\']?/gm, function detect(x, match) {
    // if there is no file extension, assume .styl
    if (!path.extname(path.basename(match))) match += ext;
    match = path.join(directory, match);

    if (!~paths.indexOf(match)) paths.push(match);
  });

  // Iterate over all the paths to see if required files also contains files
  // that we need to watch.
  paths.forEach(function recursive(location) {
    paths = styl.imports(location, paths);
  });

  return paths;
};

/**
 * What output extensions does this pre-processor generate once the code has been
 * compiled?.
 *
 * @type {Array}
 */
styl.extensions = [ 'css' ];
