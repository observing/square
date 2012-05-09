"use strict";

var _ = require('underscore')._
  , exec = require('shelljs').exec;

/**
 * Run unit tests against a headless WebKit instance (phantomjs).
 *
 * Options:
 *
 * - `framework` which unit test framework should we run
 * - `phantomjs` the location of the phantomjs binary if it's not installed
 *   normally
 *
 * @param {Object} options
 * @returns {Function} middleware
 * @api public
 */

module.exports = function setup (options) {
  var settings = {
      'phantomjs': ''
    , 'framework': 'qunit'
  };

  _.extend(settings, options || {});

  /**
   * The unit testing middleware.
   *
   * @param {Object} output
   * @param {Function} next
   * @api private
   */

  return function unit (output, next) {
    // setup the configuration based on the plugin configuration
    var configuration = _.extend(
        settings
      , this.package.configuration.plugins.unit
    );

    var which = exec('which phantomjs', { silent: true }).output
      , available = /(phantomjs)/.test(which) || !!configuration.phantomjs;

    if (!available) {
      this.logger.error('phantom.js in not correctly installed, or cannot be found');
      this.logger.error('unit tests will not be executed untill this is resolved');
      return next();
    }

    next();
  };
};

/**
 * Different unit test frameworks.
 *
 * @api private
 */

var frameworks = {
    qunit: function qunit () {}
  , mocha: function mocha () {}
  , jasmine: function jasmine () {}
};

/**
 * Small description of what this plugin does.
 *
 * @type {String}
 * @api private
 */

module.exports.description = 'Run unit tests against the given bundle';
