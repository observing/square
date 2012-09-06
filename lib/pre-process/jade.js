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
 * Process Jade files.
 *
 * @param {String} content the raw file content that needs to be processed
 * @param {Object} context processing details
 * @param {Function} done
 * @api public
 */
var jade = module.exports = function jade(content, context, done) {
  var bundle = this
    , configuration = bundle['pre:coffee-script'] || {}
    , template = configuration.template || 'jade.{filename} = {content};'
    , name = bundle.meta.filename
    , html = bundle.as === 'html'
    , jaded = {
          client: !html ? (configuration.client || true) : false
        , compileDebug: configuration.compileDebug || true
        , filename: name
        , pretty: true
      };

  // Make sure that the filename is a compatible JavaScript string, and we can
  // ditch the extension.
  name = name.replace(path.extname(name), '').underscore();

  canihaz.jade(function omgktnxbai(err, jade) {
    if (err) return done(err);

    var compile;

    // The compiler could throw.
    try { compile = jade.compile(content, jaded); }
    catch (e) { return done(e); }

    // If we need to output this as a HTML file, we care going to call the
    // compiler instead of a js template.
    if (html) {
      try { return done(null, compile(bundle.data)); }
      catch (e) { return done(e); }
    }

    // Transform the compiler to JavaScript compatible compiler
    compile = compile.toString().replace('function anonymous', 'function ' + name);
    compile = template.replace('{content}', compile)
                      .replace('{filename}', name);

    // If we aren't ran for the first time we can bailout here as we don't need
    // to add the client code.
    if (context.index > 0) return done(null, compile);

    // Prepend the client.
    var client = path.join(__dirname, '../../static', 'jade.js');

    try { done(null, fs.readFileSync(client, 'utf-8') + compile); }
    catch (e) { done(e); }
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
jade.imports = function imports(location, paths) {
  paths = paths || [];
  if (!fs.existsSync(location)) return paths;

  // get the file, unparsed so we can minimize the overhead of parsing it
  var content = fs.readFileSync(location, 'utf8')
    , directory = path.dirname(location)
    , ext = path.extname(location);

  // parse out require statements for the files, supporting the following
  // formats: require 'fs', require "fs", require('fs') and require("fs")
  content.replace(/include\s(.*)/gm, function detect(x, match) {
    if (!path.extname(path.basename(match))) match += ext;
    match = path.join(directory, match);

    if (!~paths.indexOf(match)) paths.push(match);
  });

  // iterate over all the paths to see if required files also contains files
  // that we need to watch
  paths.forEach(function recursive(location) {
    paths = jade.imports(location, paths);
  });

  return paths;
};

/**
 * What output extensions does this pre-processor generate once the code has been
 * compiled?.
 *
 * @type {Array}
 */
jade.extensions = [ 'js', 'html' ];
