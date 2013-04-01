/*global expect, Square, execSync, beforeEach, afterEach */
describe('[square] watch API', function () {
  'use strict';

  /**
   * The location of our testing fixtures.
   *
   * @type {String}
   */
  var path = require('path')
    , fixtures = path.join(process.env.PWD, 'test/fixtures')
    , expected = path.join(process.env.PWD, 'test/expected')
    , Watch = require('../lib/watch.js')
    , Square= require('../lib/square.js');

  /**
   * Async helpers.
   */
  var async = require('async');

  /**
   * Simple dummy function that is used for testing.
   *
   * @api private
   */
  function noop() { console.log(/* dummy function*/); }

  it('exposes constructor', function () {
    expect(Watch).to.be.a('function');
  });

  it('Watcher has watch, refresher, defer and live methods, encapsulates square', function (done) {
    var square = new Square({ 'disable log transport': true });
    square.parse(fixtures +'/read/adeptable.json');

    var watcher = new Watch(square, 8888);
    square.on('idle', function () {
      expect(watcher).to.be.a('object');
      expect(watcher).to.have.property('watch');
      expect(watcher).to.have.property('refresher');
      expect(watcher).to.have.property('live');
      expect(watcher).to.have.property('defer');
      expect(watcher).to.have.property('square');
      expect(watcher.watch).to.be.a('function');
      expect(watcher.refresher).to.be.a('function');
      expect(watcher.live).to.be.a('function');
      expect(watcher.defer).to.be.a('function');
      expect(watcher.square).to.be.a('object');
      done();
    });
  });

  describe('@construction', function () {
    it('attach Square instance as property');
    it('register event listener to trigger on build');
    it('asynchronously loads required modules for watch');
    it('initializes #watch');
  });

  describe('#watch', function () {
    it('calls square#files to get a list of files from the bundle');
    it('constructs fs.notify and supply a list of files');
    it('will emit idle to start the spinner');
    it('will register event listeners on the notifier');
    it('will remove `node_modules` from the list of files');
    it('will remove `.`directories from the list of files');
    it('will remove output files from the list of files');
    it('adds additional files as configured by extensions in package.json');
    it('calls the #refresher on detected file changes');
  });

  describe('#refresher', function () {
    it('will log an error if watching fails');
    it('will emit processing to stop the spinner');
    it('will log an empty line and notice of changed files');
    it('calls square#refresh to reinitialize a build');
  });

  describe('#live', function () {
    it('gets the static content of reload.js');
    it('lazy loads socket.IO through canihaz');
    it('will try to find the local IP of the network to connect to');
    it('log additional information on how to use browser reloading');
    it('exposes the eventemitter as promise');
  });
});


