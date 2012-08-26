"use strict";

/**!
 * [square]
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.it>
 * MIT Licensed
 */

/**
 * Native modules
 */
var fs = require('fs')
  , path = require('path');

/**
 * Third party modules.
 */
var canihaz = require('canihaz')('square');

/**
 * Process less files.
 *
 * @param {String} content the raw file content that needs to be processed
 * @param {Object} context processing details
 * @param {Function} done
 * @api public
 */
var less = module.exports = function less(content, context, done) {
  var bundle = this
    , configuration = bundle['pre:less'] || {};

  canihaz.less(function omgktnxbai(err, less) {
    if (err) return done(err);

    var parser = new less.Parser({
        filename: configuration.filename || bundle.meta.filename
      , paths: [
            bundle.meta.path
          , path.dirname(bundle.meta.location)
        ]
      , strictImports: configuration.strictImports || false
      , optimization: configuration.optimization || 1
    });

    parser.parse(content, function parsed(err, tree) {
      if (err) return done(module.exports.format(err));

      try { return done(null, tree.toCSS({ compress: false, yuicompress: false })); }
      catch (e) {return done(module.exports.format(err)); }
    });
  });
};

/**
 * For some odd reason, the less guys find it funny to generate and throw
 * pointless custom error messages.. so we need to provide our own
 * unfuckingifyzor for these errors.
 *
 * @param {Error} err some fake fucked up error obj
 * @returns {Error}
 */
less.format = function format(err) {
  var message = [
      ' Error type: ' + err.type + ' ' + err.filename + ':' + err.line
    , err.extract[1] ? (' > ' + err.line + '| ' + err.extract[1] || '') : ''
    , ''
    , ' ' + err.message
  ];

  var better = new Error(message.join('\n'));
  better.stack = err.stack;

  return better;
};

/**
 * Parse our potential import statements from the supplied content. It should
 * also parse the import statements recursively
 *
 * @param {String} location location of the file that needs to be parsed
 * @returns {Array} absolute paths
 * @api public
 */
less.imports = function imports(location, paths) {
  paths = paths || [];
  if (!fs.existsSync(location)) return paths;

  // get the file, unparsed so we can minimize the overhead of parsing it
  var content = fs.readFileSync(location, 'utf8')
    , directory = path.dirname(location)
    , ext = path.extname(location);

  // parse out require statements for the files, supporting the following
  // formats: require 'fs', require "fs", require('fs') and require("fs")
  content.replace(/@import\s[\"\']?([^\'\"]+)[\"\']?/gm, function detect(x, match) {
    // if there is no file extension, assume .styl
    if (!path.extname(path.basename(match))) match += ext;
    match = path.join(directory, match);

    if (!~paths.indexOf(match)) paths.push(match);
  });

  // iterate over all the paths to see if required files also contains files
  // that we need to watch
  paths.forEach(function recursive(location) {
    paths = less.imports(location, paths);
  });

  return paths;
};

/**
 * What output extensions does this pre-processor generate once the code has been
 * compiled?.
 *
 * @type {Array}
 */
less.extensions = [ 'css' ];
