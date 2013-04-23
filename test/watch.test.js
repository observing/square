/*global expect, Square, execSync, sinon, beforeEach, afterEach */
describe('[square] watch API', function () {
  'use strict';

  /**
   * The location of our testing fixtures.
   *
   * @type {String}
   */
  var path = require('path')
    , fs = require('fs')
    , fixtures = path.join(process.env.PWD, 'test/fixtures')
    , expected = path.join(process.env.PWD, 'test/expected')
    , EventEmitter = process.EventEmitter
    , network = require('os')
    , Watch = require('../lib/watch.js')
    , Square= require('../lib/square.js')
    , canihaz = require('canihaz')();

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

  it('Watcher has watch, refresher, defer and live methods, encapsulates square', function () {
    var square = new Square({ 'disable log transport': true });
    square.parse(fixtures +'/read/adeptable.json');

    var watcher = new Watch(square, 8888, true);
    expect(watcher).to.be.a('object');
    expect(watcher).to.have.property('watch');
    expect(watcher).to.have.property('refresher');
    expect(watcher).to.have.property('live');
    expect(watcher).to.have.property('defer');
    expect(watcher).to.have.property('init');
    expect(watcher).to.have.property('socket');
    expect(watcher).to.have.property('silent');
    expect(watcher.watch).to.be.a('function');
    expect(watcher.refresher).to.be.a('function');
    expect(watcher.live).to.be.a('function');
    expect(watcher.defer).to.be.a('function');
    expect(watcher.init).to.be.a('function');
    expect(watcher.socket).to.be.a('object');
    expect(watcher.silent).to.be.a('boolean');
  });

  describe('@construction', function () {
    var square, watcher;

    beforeEach(function () {
      square = new Square({ 'disable log transport': true });
      square.parse(fixtures +'/read/adeptable.json');
    });

    it('attach Square instance as property', function () {
      watcher = new Watch(square, 8888, true);
      expect(watcher).to.have.property('square');
      expect(watcher.square).to.be.a('object');
      expect(watcher.square).to.be.instanceof(Square);
    });

    it('register event listener to trigger on build', function () {
      var build = sinon.spy(square, 'on');
      watcher = new Watch(square, 8888, true);
      expect(build).to.be.calledOnce;
      expect(build).to.be.calledWith('build');
      build.restore();
    });

    it('asynchronously loads required modules for watch', function () {
      var parallel = sinon.spy(async, 'parallel');
      watcher = new Watch(square, 8888, true);
      expect(parallel).to.be.calledOnce;
      parallel.restore();
    });

    it('logging to console can be switched on/off', function () {
      var quiet = new Watch(square, 8888, true)
        , loud = new Watch(square, 8888);

      expect(quiet.silent).to.be.true;
      expect(loud.silent).to.be.false;
    });
  });

  describe('#watch', function () {
    var Notify, findit, square, watcher;

    beforeEach(function (done) {
      this.timeout(20000);

      square = new Square({ 'disable log transport': true });
      square.parse(fixtures +'/read/adeptable.json');
      watcher = new Watch(square, 8888, true);

      canihaz(
          { name: 'fs.notify', version: '*' }
        , { name: 'findit', version: '*' }
        , function lazyloading() {
          Notify = arguments[1];
          findit = arguments[2];
          done();
          }
      );
    });

    it('calls square#files to get a list of files from the bundle', function () {
      var files = sinon.spy(square, 'files');
      watcher.watch(Notify, findit);
      expect(files).to.be.calledOnce;
      files.restore();
    });

    it('constructs fs.notify and supply a list of files');

    it('will emit idle to start the spinner', function (done) {
      var defer = sinon.spy(watcher, 'defer');

      square.once('idle', function () {
        // Only check for calls after the next loop.
        process.nextTick(function () {
          expect(defer).to.be.calledOnce;
          done();
        });
      });

      watcher.watch(Notify, findit);
      defer.restore();
    });

    it('will register event listeners on the notifier');
    it('will remove `node_modules` from the list of files');
    it('will remove `.`directories from the list of files');
    it('will remove output files from the list of files');
    it('adds additional files as configured by extensions in package.json');
    it('calls the #refresher on detected file changes');
  });

  describe('#refresher', function () {
    var square, watcher;

    beforeEach(function () {
      square = new Square({ 'disable log transport': true });
      square.parse(fixtures +'/read/adeptable.json');

      watcher = new Watch(square, 8888, true);
    });

    it('will log an error if watching fails', function () {
      var log = sinon.spy(square.logger, 'error')
        , err = new Error('My fault');

      watcher.refresher(err, []);
      expect(log).to.be.calledOnce;
      expect(log).to.be.calledWith('Watcher error %s, canceling watch operations on %s', err.message, []);

      log.restore();
    });

    it('will emit processing to stop the spinner', function () {
      var process = sinon.spy(square, 'emit');
      watcher.refresher(undefined, ['files']);

      expect(process).to.be.called;
      expect(process).to.be.calledWith('processing');

      process.restore();
    });

    it('will notify changed files if not silenced', function () {
      var log = sinon.spy(square.logger, 'notice')
        , files = ['files.js', 'moar.js'];

      watcher = new Watch(square, 8888);
      watcher.refresher(undefined, files);

      expect(log).to.be.calledOnce;
      expect(log).to.be.calledWith('changes detected, refreshing %s', files.join(', '));

      log.restore();
    });

    it('calls square#refresh to reinitialize a build', function () {
      var refresh = sinon.spy(square, 'refresh')
        , files = ['files.js', 'moar.js'];

      watcher.refresher(undefined, files);

      expect(refresh).to.be.calledOnce;
      expect(refresh).to.be.calledWith(files);

      refresh.restore();
    });
  });

  describe('#live', function () {
    var square, watcher;

    beforeEach(function () {
      square = new Square({ 'disable log transport': true });
      square.parse(fixtures +'/read/adeptable.json');

      watcher = new Watch(square, 8888, true);
    });

    it('gets the static content of reload.js', function () {
      var args = path.join(__dirname, '..', 'static', 'reload.js')
        , file = sinon.spy(fs, 'readFileSync');

      watcher.live(8888);

      expect(file).to.be.called;
      expect(file).to.be.calledWith(args);

      file.restore();
    });

    it('will try to find the local IP of the network to connect to', function () {
      var interf = sinon.spy(network, 'networkInterfaces');

      watcher.live(8888);

      expect(interf).to.be.calledOnce;
      interf.restore();
    });

    it('logs information on how to use browser reloading if not silenced', function () {
      var log = sinon.spy(square.logger, 'info')
        , normal = sinon.spy(console, 'log');

      watcher = new Watch(square, 8888);

      expect(log).to.be.calledThrice;
      expect(log).to.be.calledWith('Live reload is initializing, make sure you have the following script');
      expect(log).to.be.calledWith('included in your webpage to receive the live reloads:');
      expect(log).to.be.calledWith('paste it right above your closing </body> tag.');

      expect(normal).to.be.called;
      expect(normal).to.be.calledWith('  !function(l,i,v,e){');
      expect(normal).to.be.calledWith('    e=l.createElement(i);v=l.getElementsByTagName(i)[0];e.async=true;');
      expect(normal).to.be.calledWith('    v.parentNode.insertBefore(e,v);');
      expect(normal).to.be.calledWith('  }(document,"script");');

      log.restore();
      normal.restore();
    });

    it('exposes the eventemitter as promise', function () {
      var promise = watcher.live(8888);
      expect(promise).to.be.an('object');
      expect(promise).to.be.instanceof(EventEmitter);
    });
  });
});
