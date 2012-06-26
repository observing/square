"use strict";

/**
 * Use npm to lazy install the modules when needed.
 */

var npm = require('npm')
  , path = require('path')
  , fs = require('fs')
  , conf = require('npm/lib/utils/config-defs.js')
  , has = require('../package.json').canihaz;

/**
 * Attach the list of packages to the exports based on the `canihaz` field in
 * the package.json of square. This allows us to keep all the dependencies in
 * one single file
 */

Object.keys(has).forEach(function (name) {
  Object.defineProperty(exports, name, {
    get: function findPackage () {
      return exports.canihaz.bind(exports, name, has[name]);
    }
  });
});

/**
 * Simple package lazyload installer / require thing..
 *
 * @param {String} packages
 * @param {String} version
 * @param {Function} fn
 * @api private
 */

exports.canihaz = function canihaz(packages, version, fn) {
  var directory = exports.dot('square')
    , location = path.join(directory, 'node_modules', packages)
    , currentversion;

  // make sure that we have a installation directory
  if (!directory) return fn(new Error(directory + ' is not a valid directory'));

  // now that we have gotten this far we need to check if the package is
  // actually up to date, we can do this by parsing it's package.json and
  // finding the correct version number, but before we do that we need to make
  // sure it actually exists
  if (fs.existsSync(location)) {
    try { currentversion = require(path.join(location, 'package.json')).version; }
    catch (e) {}

    // now that we have the current version we can test if they are the same, we
    // don't really care if they are greater or not..
    if (currentversion === version) {
      try { return fn(null, require(location)); }
      catch (e) {}
    }
  }

  // npm needs to have a configuration loaded or it will not work, so we are
  // using the default configuration that ships in NPM
  npm.load(conf, function loadnpm(err) {
    if (err) return fn(err);

    // make sure the packages are installed in the square node_modules folder
    // instead of the current directory where the square command is executed
    npm.commands.install(directory, [packages + '@' + version], function install(err) {
      if (err) return fn(err);

      fn(null, require(location));
    });
  });
};

/**
 * Generate a dot directory in the home folder of the user. This directory is
 * used to install extra plugins and modules so we don't require root rights for
 * installation when users installed the module using -g flag.
 *
 * @param {String} name
 * @return {Boolean}
 * @api private
 */

exports.dot = function dot(name) {
  var location = path.join(process.env.HOME, '.' + name)
    , stat;

  // the location already exists, lets make sure that it's what we are looking
  // for...
  if (fs.existsSync(location)) {
    stat = fs.statSync(location);

    return stat.isDirectory()
      ? location
      : false;
  }

  // try to make the directory
  try {
    fs.mkdirSync(location);
    return location;
  } catch (e) {}

  return false;
};
