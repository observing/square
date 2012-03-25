"use strict";

var url = require('url')
  , fs = require('fs')
  , async = require('async')
  , jsdom = require('jsdom')
  , request = require('request')
  , github = require('github')
  , _ = require('underscore')._;

/**
 * Semver compatible regexp.
 *
 * @type {RegExp}
 * @api private
 */

var semver = [
    "\\s*[v=]*\\s*([0-9]+)"             // major
  , "\\.([0-9]+)"                       // minor
  , "\\.([0-9]+)"                       // patch
  , "(-[0-9]+-?)?"                      // build
  ,  "([a-zA-Z-][a-zA-Z0-9-\\.:]*)?"    // tag
];

semver = new RegExp(semver.join(''), 'gim');

/**
 * Because not all versions are semver compatible
 * we need a silly fallback:
 *
 * @type {RegExp}
 * @api private
 */

var sillyver = [
    "\\s*[v=]*\\s*(\\d)"                // major
  , "\\.([\\d][-\\s]?)"                 // minor
  , "(?:([a-zA-Z-][a-zA-Z0-9-.:]*)?)?"  // silly
];

sillyver = new RegExp(sillyver.join(''), 'gim');

/**
 * Regexp to test for Github hash sources
 *
 * @type {RegExp}
 * @api private
 */

var githubRE = /github.com(\/[\w\-]+){2}\/blob(\/[\w\-]+)\/(.*)/;

/**
 * Updates third party modules.
 *
 * @param {Object} options
 * @returns {Function} middeware
 * @api public
 */

module.exports = function setup (options) {
  var settings = {
      strict: semver
    , loose: sillyver
    , lines: 10
  };

  _.extend(settings, options || {});

  /**
   * The actual middleware.
   *
   * @param {String} content
   * @param {String} extension
   * @param {Function} next
   * @api private
   */

  return function update (content, extension, next) {
    var bundles = this.package.bundle
      , files = Object.keys(bundles)
      , self = this;

    // edge case, where the package file isn't loaded from a file, so nothing to
    // write to
    if (!this.package.path) return process.nextTick(next);

    async.forEach(files, function testing (key, cb) {
      var bundle = bundles[key]
        , provider;

      // not a third party files
      if (!bundle.latest) return cb();

      // find the correct update handler
      if (~bundle.latest.indexOf('#')) provider = exports.selector;
      if (githubRE.test(bundle.latest)) provider = exports.github;
      if (!provider) provider = exports.request;

      // fetch that update
      provider(bundle.latest, settings, function test (err, version, content) {
        if (err) return cb(err);
        if (!version) return cb(new Error('unable to find and parse the version'));
        if (version === bundle.version) return cb();

        /**
         * Handle file upgrades.
         *
         * @param {Mixed} err
         * @param {String} content
         * @api private
         */

        function done (err, content) {
          if (err) return cb(err);

          var code = JSON.parse(self.package.source)
            , source;

          code.bundle[key].version = version;
          bundle.version = version;
          bundle.content = content;

          // now that we have updated the shizzle, we can write a new file
          // also update the old source with the new version
          source = JSON.stringify(code, null, 2);
          self.package.source = source;

          try {
            fs.writeFileSync(self.package.location, source);
            fs.writeFileSync(bundle.meta.location, content);
          } catch (e) { err = e; }

          cb(err);
        }

        if (content) return done(null, content);

        // find the correct location where we can download the actual source
        // code for this bundle
        var data = bundle.download || provider === exports.github
          ? exports.raw(bundle.latest)
          : bundle.latest;

        exports.download(data, done);
      });
    }, next);
  };
};

/**
 * Transforms a regular git url, to a raw file location.
 *
 * @param {String} uri
 * @returns {String}
 * @api private
 */

exports.raw = function (uri) {
  var user, repo, branch, file
    , chunks = githubRE.exec(uri);

  user = chunks[1];
  repo = chunks[2];
  branch = chunks[3];
  file = chunks[4];

  return 'https://raw.github.com/' + user + '/' + repo + '/' + branch + '/'+ file;
};

/**
 * Find the version number on a page based on a CSS3 selector
 *
 * @param {Object} uri
 * @param {Object} options
 * @param {Function} fn
 * @api private
 */

exports.selector = function fetch (uri, options, fn) {
  var parts = uri.split('#')
    , url = parts.shift()
    , css = parts.join('#'); // restore '##id' selectors

  /**
   * Simple callback handler
   *
   * @param {Mixed} err
   * @param {Window} window
   * @api private
   */

  function done (err, window) {
    if (err) return fn(err);

    var content = window.$(css).text();
    return fn(null, exports.version(content, options));
  }

  jsdom.env({
      html: uri
    , scripts: 'http://code.jquery.com/jquery-1.7.min.js'
    , done: done
  });
};

/**
 * See if the string matches a version number.
 *
 * @param {String} content
 * @param {Object} options
 * @returns {Mixed}
 * @api private
 */

exports.version = function search (content, options) {
  var version;

  return [options.strict, options.loose].some(function some (regexp) {
    var match = regexp.exec(content);

    if (match && match.length) {
      version = [
          match[1] ? match[1].trim() : 0
        , match[2] ? match[2].trim() : 0
        , match[3] ? match[3].trim() : 0
      ].join('.');
    }

    return !!version;
  }) ? version : null;
};

/**
 * Find the version number based on a SHA1 commit
 *
 * @param {Object} uri
 * @param {Object} options
 * @param {Function} fn
 * @api private
 */

exports.github = function commits (uri, options, fn) {
  var user, repo, branch, file
    , chunks = githubRE.exec(uri);

  user = chunks[1];
  repo = chunks[2];
  branch = chunks[3];
  file = chunks[4];

  var api = new github.GitHubApi(false);
  api.getCommitApi().getFileCommits(user, repo, branch, file, function (err, list) {
    if (err) return fn(err);
    if (!list.length) return fn(new Error('No commits in this repo: ' + uri));

    var commit = list.shift();
    fn(null, commit.id);
  });
};

/**
 * Find the version number somewhere in the first x lines
 *
 * @param {Object} uri
 * @param {Object} options
 * @param {Function} fn
 * @api private
 */

exports.request = function req (uri, options, fn) {
  exports.download(uri, function downloading (err, content) {
    var lines = content.split(/(\r\n)|\r|\n/).splice(0, options.lines)
      , version;

    lines.some(function someline (line) {
      version = exports.version(line, options);

      return !!version;
    });

    fn(null, version, content);
  });
};

/**
 * Download the data.
 *
 * @param {String} uri
 * @param {Function} fn
 * @api private
 */

exports.download = function (uri, fn) {
  request({ uri: uri }, function requested (err, res, body) {
    if (err) return fn(err);
    if (res.statusCode !== 200) return fn(new Error('Invalid status code'));

    fn(null, body.toString('utf8'));
  });
};
