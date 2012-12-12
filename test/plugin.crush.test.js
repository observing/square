/*global expect, Square, execSync */
describe('[square][plugin] Crush', function () {
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
  it('should not transform escaped unicode to unicode chars');
  it('should not mess up unicode chars');
  it('should result in a smaller file');
  it('should remove comments');
  it('should process the content multiple times');
  it('should detect JAVA and enable compilers based on that');
  it('should minify CSS and JavaScript');

  describe('.uglify', function () {
    it('should add a closing semi-colon to the end of the file');
  });
});
