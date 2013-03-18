/*global expect, Square, execSync */
describe('[square][plugin] Replace', function () {
  'use strict';

  /**
   * The location of our testing fixtures.
   *
   * @type {String}
   */
  var path = require('path')
    , fixtures = path.join(process.env.PWD, 'test/fixtures')
    , expected = path.join(process.env.PWD, 'test/expected');

  /**
   * Simple dummy function that is used for testing.
   *
   * @api private
   */
  function noop() { console.log(/* dummy function*/); }

  it('should have a .description');
  it('should use RegExp when provided');
  it('should replace globally');
  it('should log warning if provided replacement is not a valid RegExp');
  it('should be configurable for both development and production');
});
