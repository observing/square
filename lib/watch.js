"use strict";

var watch = require('watch')
  , path = require('path')
  , _ = require('underscore')._;

require('eventreactor');

/**
 * Watch for file changes in a given directory.
 *
 * @param {String} dir the dir to watch for changes
 * @param {Array} extensions extensions that can trigger a change
 * @param {Function} fn callback
 * @api private
 */

module.exports = function watching (dir, extensions, fn) {
  var changes = []
    , limited;

  /**
   * Rate limit the change processor so it doesn't call the build function on
   * each tiny file change
   *
   * @api private
   */

  limited = _.debounce(function ratelimit () {
    fn.apply(fn, changes);

    // clear the changes again
    changes.length = 0;
  }, 100);

  /**
   * Also add the extensions of pre-processors that compile to the array of
   * given extensions
   */

  var processors = require('./pre-process');

  Object.keys(processors).forEach(function (extension) {
    var compiler = processors[extension];

    if (~extensions.indexOf(compiler.extension)) {
      extensions.push(extension);
    }
  });

  /**
   * Filter out the bad files and try to remove some noise. For example vim
   * generates some silly swap files in directories or other silly thumb files
   *
   * @param {String} file
   * @api private
   */

  function filter (file) {
    var vim = file.charAt(file.length - 1) === '~'
      , extension = /\.(\w{1,})$/.exec(file)
      , location;

    if (vim) file = file.substr(0, file.length - 1);

    // now that we have filtered out vim stuff.. we can generate a location
    location = path.join(dir, file);

    // filter out some pointless things
    if (!extension || extensions.indexOf(extension[1]) === -1) return;
    if (~changes.indexOf(location)) return;

    changes.push(location);
    process.nextTick(limited);
  }

  /**
   * @TODO we should really supply a filter method here for the watcher so it
   * doesn't watch files we don't really need. And then we can remove this
   * backup check from the filter method...
   */

  watch.createMonitor(dir, function createMonitor (monitor) {
    monitor.every('created', 'changed', 'removed', filter);
  });
};
