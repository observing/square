var watch = require('watch')
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
  "use strict";

  var changes = []
    , limited = _.debounce(function ratelimit () {
        fn.apply(fn, changes);
        changes.length = 0;
      }, 100);

  /**
   * Filter out the bad files and try to remove some noise. For example vim
   * generates some silly swap files in directories or other silly thumb files
   *
   * @param {String} file
   * @api private
   */

  function filter (file) {
    var vim = file.charAt(file.length - 1) === '~'
      , extension = /\.(\w{1,})$/.exec(file);

    if (vim) file = file.substr(0, file.length - 1);
    if (!extension || extensions.indexOf(extension[1]) === -1) return;
  }

  watch.createMonitor(dir, function createMonitor (monitor) {
    monitor.every('created', 'changed', 'removed', filter);
  });
};
