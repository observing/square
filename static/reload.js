/**
 * [square] live reload bootstrap code.
 *
 * @see https://github.com/observing/square
 */

(function loader () {
  "use strict";

  /**
   * Generate a cache buster querystring for the given url, if it already has
   * a generated cache buster url we are going to replace it with a new one.
   *
   * @param {String} url
   * @returns {String}
   * @api public
   */

  loader.bust = function buster (url) {
    var now = + new Date()
      , prefix = '__square__'
      , token = prefix + now + '=' + now;

    // remove the old token from the url if it exists
    url = url.replace(/[&|?]__square__\d+=\d+/g, '');

    // add it to the url
    return ~url.indexOf('&')
      ? url + '&' + token
      : url + '?' + token;
  };

  /**
   * Array#indexOf polyfill.
   *
   * @see bit.ly/a5Dxa2
   * @param {Array} arr array to search in
   * @param {Mixed} o item to search
   * @param {Number} i optional start index
   * @api public
   */

  loader.indexOf = function indexOf (arr, o, i) {
    var j = arr.length;
    i = i < 0 ? i + j < 0 ? 0 : i + j : i || 0;

    // iterate all the things
    for (; i < j && arr[i] !== o; i++) {}

    return j <= i
      ? -1
      : i;
  };

  /**
   * Generate a array of allowed images for hot reloading.
   *
   * @type {Array}
   * @api private
   */

  loader.extension = (function images () {
    var defaults = ['gif', 'jpg', 'jpeg', 'png', 'webp']
      , navigator = window.navigator;

    if (!('mimeTypes' in navigator)) return defaults;

    // generate a list of accepted extensions based on the mimeTypes that are
    // stored in the browser.
    var mimeTypes = Array.prototype.slice.call(navigator.mimeTypes, 0)
      , i = mimeTypes.length;

    while (i--) {
      var type = mimeTypes[i]
        , extensions
        , j;

      // we only want image types
      if (type.type && type.type.indexOf('image/') === -1 || !type.suffixes) continue;

      extensions = type.suffixes.split(',');
      j = extensions.length;

      // add the extensions to the defaults array if they don't exit there
      // already
      while (j--) {
        if (loader.indexOf(defaults, extensions[j]) === -1) {
          defaults.push(extensions[j]);
        }
      }
    }

    return defaults;
  }());

  /**
   * Reload the data without refreshing the page if we can.
   *
   * @param {String} type extension
   * @api public
   */

  loader.reload = function reload (type) {
    switch (type) {
      case 'js':
        // make sure we reload the page with a `true` to load it again from the
        // server.
        window.location.reload(true);
        break;

      case 'css':
        loader.reload.styles();
        break;

      default:
        loader.reload.images();
    }
  };

  loader.reload.styles = function styles () {};

  /**
   * A image related change occured so we need to refresh every image on the
   * page. This includes images that are embeded in to stylesheets.
   *
   * @api public
   */

  loader.reload.images = function images () {
    var set = document.images
      , i = set.length
      , image;

    // update all the images on the page
    while (i--) {
      image = set[i];

      if (!image.src) continue;
      image.src = loader.bust(image.src);
    }
  };

  loader.reload.cssImage = function cssImage () {};

  // Now for the big tricky part, we are going to load in all the dependencies
  // of our livereload plugin so we can establish a real time connection with
  // the started [square] service.
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

  // a poorman's script onready checker
  setTimeout(function has () {
    if (!('io' in window)) return setTimeout(has, 250);

    var socket = window.io.connect(base, {
        'resource': 'live'
    });

    socket.on('refresh', function changes (files) {
      // @TODO smarter reloading, so we only reload the files that are updated
      // @TODO filter out files that are not on the page
      window.location.reload();
    });
  }, 250);
}());
