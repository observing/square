/*global expect, Square, execSync, beforeEach, afterEach */
describe('[square][plugin] Replace', function () {
  'use strict';

  /**
   * The location of our testing fixtures.
   *
   * @type {String}
   */
  var path = require('path')
    , fixtures = path.join(process.env.PWD, 'test/fixtures')
    , expected = path.join(process.env.PWD, 'test/expected')
    , test = require(fixtures + '/plugins/replace')
    , results = require(expected + '/plugins/replace')
    , Replace = require('../plugins/replace')
    , square, replace;

  /**
   * Simple dummy function that is used for testing.
   *
   * @api private
   */
  function noop() { console.log(/* dummy function*/); }

  beforeEach(function () {
    square = new Square({ 'disable log transport': true });
  });

  afterEach(function () {
    test.globals.content = "var test = '{{replace-me}}'";
  });

  it('should have a .id', function () {
    expect(Replace.prototype).to.have.property('id', 'replace');
  });

  it('should have a .description', function () {
    expect(Replace.prototype).to.have.property('description', 'Replace content enclosed in braces, e.g. {key}. Each provided key will be replaced with its value');
  });

  it('should return early if there is nothing to replace at all', function (done) {
    replace = new Replace(square, test.globals);

    replace.once('data', function (data) {
      expect(data).to.be.a('string');
      expect(data).to.be.equal(test.globals.content);
      done();
    });

    replace.initialize();
  });

  it('should return early on misconfiguration', function (done) {
    square.config.plugins = test.error;
    replace = new Replace(square, test.globals);

    replace.once('data', function (data) {
      expect(data).to.be.a('string');
      expect(data).to.be.equal(test.globals.content);
      done();
    });

    replace.initialize();
  });

  it('should not replace content if distribution is not part of replace', function (done) {
    square.config.plugins = test.partial; // Only has dev replacement
    replace = new Replace(square, test.globals); // Only has min distribution

    replace.once('data', function (data) {
      expect(data).to.be.a('string');
      expect(data).to.equal(test.globals.content);
      done();
    });

    replace.initialize();
  });

  it('should replace content for distribution', function (done) {
    square.config.plugins = test.full; // Has min replacement
    replace = new Replace(square, test.globals); // Only has min distribution

    replace.once('data', function (data) {
      expect(data).to.be.a('string');
      expect(data).to.equal(results.full);
      done();
    });

    replace.initialize();
  });


  it('should use RegExp when provided', function (done) {
    square.config.plugins = test.regex; // Has min replacement by RegExp
    replace = new Replace(square, test.globals); // Only has min distribution

    replace.once('data', function (data) {
      expect(data).to.be.a('string');
      expect(data).to.equal(results.regexp);
      done();
    });

    replace.initialize();
  });

  it('should replace globally', function (done) {
    square.config.plugins = test.full;
    test.globals.content += '\n' + test.globals.content;
    replace = new Replace(square, test.globals);

    replace.once('data', function (data) {
      expect(data).to.be.a('string');
      expect(data).to.equal(results.double);
      done();
    });

    replace.initialize();
  });

  it('should log error if provided replacement is not a valid RegExp', function (done) {
    square.config.plugins = test.regexfail;
    replace = new Replace(square, test.globals);

    replace.once('error', function (error) {
      expect(error).to.be.an('object');
      expect(error.toString()).to.equal(results.regexfail);
      done();
    });

    replace.initialize();
  });

  it('should log error if there is no replacement value', function (done) {
    square.config.plugins = test.missing;
    replace = new Replace(square, test.globals);

    replace.once('error', function (error) {
      expect(error).to.be.an('object');
      expect(error.toString()).to.equal(results.missing);
      done();
    });

    replace.initialize();
  });
});
