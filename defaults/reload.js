/**
 * [square] live reload bootstrap code.
 *
 * @see https://github.com/observing/square
 */

(function loader () {
  "use strict";

  // find out the path of the reload service
  var scripts = document.getElementsByTagName('script')
    , i = scripts.length
    , base;

  while (i--) {
    if (scripts[i].src && ~scripts[i].src.indexOf('/live/reload.js')) {
      base = document.createElement('a');
      base.href = scripts[i].src;

      // compile a base path from the found result
      base = [
          base.protocol + '//'
        , base.hostname
        , base.port ? ':' + base.port : ''
      ].join('');

      break;
    }
  }

  // bailout if we can't find the server
  if (!base) throw new Error('Can\'t find the [square] reload service');

  var script = document.createElement('script');
  script.async = true;

  document.body.appendChild(script);
  script.src = base + '/live/socket.io.js';

  setTimeout(function has () {
    if (!('io' in window)) return setTimeout(has, 250);

    var socket = window.io.connect(base);
    socket.on('refresh', function changes (files) {
      // @TODO smarter reloading, so we only reload the files that are updated
      // @TODO filter out files that are not on the page
      window.location.reload();
    });
  }, 250);
}());
