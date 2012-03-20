"use strict";

var url = require('url')
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
  ,  "([a-zA-Z-][a-zA-Z0-9-\\.:]*)?"     // tag
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
   * The actual middleware
   *
   * @param {String} content
   * @param {Function} next
   * @api private
   */

  return function update (content, next) {
    var bundles = this.package.bundles
      , files = Object.keys(bundles)
      , self = this;

    files.forEach(function (key) {
      var bundle = bundle[key]
        , provider;

      // not a third party files
      if (!bundle.latest) return;

      if (bundle.latest.indexOf('#')) provider = exports.selector;
      if (/github\.com/.test(bundle.latest)) provider = exports.github;
      if (!provider) provider = exports.request;

      provider(bundle.latest, settings, function (err, version) {
        if (err) self.logger.error('failed to find updates for ' + key, err);

        var changed = version !== bundle.version;
      });
    });
  };
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
  var parts = uri.split(/#{1}/)
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
    , chunks = /github.com\/([\w\-]+)\/([\w\-]+)\/blob\/([\w\-]+)\/(.*)/g.exec(uri);

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
  request({ uri: uri }, function requested (err, res, body) {
    if (err) return fn(err);
    if (res.statusCode !== 200) return fn(new Error('Invalid status code'));

    var version
      , content = body.toString('utf8')
      , lines = content.split(/(\r\n)|\r|\n/).splice(0, options.lines);

    lines.some(function someline (line) {
      version = exports.version(line, options);

      return !!version;
    });

    fn(null, version);
  });
};
