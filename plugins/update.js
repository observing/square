'use strict';

/**!
 * [square]
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.it>
 * MIT Licensed
 */
var Plugin = require('../plugin')
  , canihaz = require('canihaz')('square')
  , async = require('async')
  , _ = require('lodash')
  , url = require('url')
  , request = require('request')
  , fs = require('fs');

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
 * we need a silly fall back:
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
var githubRE = /github.com\/([\w\.\-]+)\/([\w\.\-]+)\/blob(\/[\w\.\-]+)\/(.*)/;

/**
 * Updates third party modules.
 *
 * Options:
 * - strict: regexp, regexp for search for semver based version numbers
 * - loose: regexp, fall back for strict regexp, for oddly versioned code
 * - lines: number, amount of LOC to scan for version numbers
 *
 * @constructor
 * @api public
 */
module.exports = Plugin.extend({
    /**
     * Name of the module.
     *
     * @type {String}
     */
    id: 'update'

    /**
     * Small description about the module.
     *
     * @type {String}
     */
  , description: [
        'Check the version of your third-party library'
      , 'if its out of it it will be updated automatically.'
    ].join(' ')

    /**
     * For which distributions should this run.
     *
     * @type {Array}
     */
  , distributions: ['dev']

    /**
     * Which file extension are accepted.
     *
     * @type {Array}
     */
  , accepts: ['js', 'css']

    /**
     * The module is initialized and checks if we need to replace anything.
     */
  , initialize: function initialize() {
      this.strict = semver;
      this.loose = sillyver;
      this.lines = 10;

      // setup the configuration based on the plugin configuration
      /*var configuration = _.extend(
          settings
        , this.package.configuration.plugins.update || {}
      );*/
     this.update();
    }

  , disregard: function () {
      this.emit('disregard');
    }

    /**
     * The actual middleware.
     *
     * @api public
     */
  , update: function update(fn) {
      var bundles = this.square.package.bundle
        , files = Object.keys(bundles)
        , self = this;

      // edge case: if package isn't loaded from file, there is nothing to write.
      if (!this.square.package.path) return process.nextTick(this.disregard.bind(this));

      async.forEach(files, function testing (key, cb) {
        var bundle = bundles[key]
          , provider;

        // not a third party files
        if (!bundle.latest) return cb();

        // find the correct update handler
        if (~bundle.latest.indexOf('#')) provider = self.selector.bind(self);
        //if (githubRE.test(bundle.latest)) provider = self.github.bind(self);
        if (!provider) provider = self.req.bind(self);

        provider(bundle.latest, function test (err, version, content) {
          if (err) return cb(err);
          if (!version) return cb(new Error('unable to find and parse the version for ' + key));
          if (version === bundle.version) return cb();

          self.logger.notice(
              '%s is out of date, latest version is %s'
            , key
            , version.green
          );

          /**
           * Handle file upgrades.
           *
           * @param {Mixed} err
           * @param {String} content
           * @api private
           */

          function done (err, content) {
            if (err) return cb(err);

            var code = JSON.parse(self.square.package.source)
              , current = bundle.version
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

            self.logger.notice(
                'sucessfully updated %s from version %s to %s'
              , key
              , current.grey
              , version.green
            );

            cb(undefined);
          }

          if (content) return done(undefined, content);

          // find the correct location where we can download the actual source
          // code for this bundle
          var data = bundle.download || provider === exports.github
            ? self.raw(bundle.latest)
            : bundle.latest;

          self.download(data, done);
        });
      }, function finished (err, data) {
          if (err && err.forEach) {
            err.forEach(function failed (err) {
              self.logger.error(err);
            });
          }

          self.emit('data');
      });
    }

    /**
     * Transforms a regular git url, to a raw file location.
     *
     * @param {String} uri
     * @returns {String}
     * @api private
     */
  , raw: function raw(uri) {
      var user, repo, branch, file
        , chunks = githubRE.exec(uri);

      user = chunks[1];
      repo = chunks[2];
      branch = chunks[3].substr(1); // remove the first /
      file = chunks[4];

      return 'https://raw.github.com/' + user + '/' + repo + '/' + branch + '/'+ file;
    }

    /**
     * Download the data.
     *
     * @param {String} uri
     * @param {Function} fn
     * @api private
     */
  , download: function download(uri, fn) {
      request({ uri: uri }, function requested(err, res, body) {
        if (err) return fn(err);
        if (res.statusCode !== 200) return fn(new Error('Invalid status code'));

        fn(null, body.toString('utf8'));
      });
    }

    /**
     * Find the version number on a page based on a CSS3 selector
     *
     * @param {Object} uri
     * @param {Function} fn
     * @api private
     */
  , selector: function selector(uri, fn) {
      var parts = uri.split('#')
        , url = parts.shift()
        , css = parts.join('#'); // restore '##id' selectors

      canihaz.cheerio(function (err, cheerio) {
        if (err) return fn(err);

        console.log(cheerio.load(uri)(css).text());
        // call fn
      });
    }

    /**
     * See if the string matches a version number.
     *
     * @param {String} content
     * @returns {Mixed}
     * @api private
     */
  , version: function version(content) {
      var result;

      // a "feature" of calling exec on a regexp with a global flag is that it
      // renders it useless for new calls as it will do checks based on the new
      // matches. We can bypass this behavior by recompiling regexps
      [
          new RegExp(this.strict.source)
        , new RegExp(this.loose.source)
      ].some(function some (regexp) {
        var match = regexp.exec(content);

        if (match && match.length) {
          result = [
              match[1] ? match[1].trim() : 0
            , match[2] ? match[2].trim() : 0
            , match[3] ? match[3].trim() : 0
          ].join('.');
        }

        return !!result;
      });

      return result;
    }

    /**
     * Find the version number based on a SHA1 commit
     *
     * @param {Object} uri
     * @param {Function} fn
     * @api private
     */
  , github: function github(uri, fn) {
      var user, repo, branch, file
        , chunks = githubRE.exec(uri);

      user = chunks[1];
      repo = chunks[2];
      branch = chunks[3].substr(1); // remove the first /
      file = chunks[4];

      canihaz.github(function lazyload (err, Github) {
        if (err) return fn(err);

        var api = new Github({ version: "3.0.0" })
          , request = { user: user, repo: repo, path: file, sha: branch };

        api.repos.getCommits(request, function getcommit (err, list) {
          if (err) return fn(err);
          if (!list.length) return fn(new Error('No commits in this repo: ' + uri));

          var commit = list.shift();
          fn(null, commit.sha);
        });
      });
    }

    /**
     * Find the version number somewhere in the first x lines
     *
     * @param {Object} uri
     * @param {Function} fn
     * @api private
     */

  , req: function req(uri, fn) {
      var self = this;

      this.download(uri, function downloading(err, content) {
        if (err) return fn(err);
        if (!content) return fn(new Error('No content received from ' + uri));

        var lines = content.split(/(\r\n)|\r|\n/).splice(0, self.lines)
          , version;

        lines.some(function someline (line) {
          version = self.version(line);

          return !!version;
        });

        fn(null, version, content);
      });
    }
});
