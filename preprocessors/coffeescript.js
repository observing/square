'use strict';

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
 * Process CoffeeScript files.
 *
 * @param {String} content the raw file content that needs to be processed
 * @param {Object} context processing details
 * @param {Function} done
 * @api public
 */
var coffee = module.exports = function coffeescript(content, context, done) {
  var bundle = this
    , configuration = bundle['pre:coffee-script'] || {};

  canihaz['coffee-script'](function drinking(err, coffeescript) {
    if (err) return done(err);

    try { return done(null, coffeescript.compile(content)); }
    catch (e) { done(e); }
  });
};

/**
 * Parse our potential import statements from the supplied content. It should
 * also parse the import statements recursively.
 *
 * @param {String} location location of the file that needs to be parsed
 * @returns {Array} absolute paths
 * @api public
 */
coffee.imports = function imports(location, paths) {
  paths = paths || [];
  if (!fs.existsSync(location)) return paths;

  // Get the file, unparsed so we can minimize the overhead of parsing it.
  var content = fs.readFileSync(location, 'utf8')
    , directory = path.dirname(location);

  // Parse out require statements for the files, supporting the following
  // formats: require 'fs', require "fs", require('fs') and require("fs")
  content.replace(/require.[\'\"]\.([^\'\"]+)[\'\"]/gm, function detect(x, match) {
    match = path.join(directory, match);

    if (!~paths.indexOf(match)) paths.push(match);
  });

  // Iterate over all the paths to see if required files also contains files
  // that we need to watch.
  paths.forEach(function recursive(location) {
    paths = coffee.imports(location, paths);
  });

  return paths;
};

/**
 * What output extensions does this pre-processor generate once the code has been
 * compiled?.
 *
 * @type {Array}
 */
coffee.extensions = [ 'js' ];
