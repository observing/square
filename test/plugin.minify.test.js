/*global expect, Square, execSync, sinon */
describe('[square][plugin] Minify', function () {
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
  it('should detect the best compression algorithm');
  it('should provide metrics by default');
  it('should not provide metrics if minify.metrics is false');
  it('should send data to cluster and wait for nextTick to send response', function (done) {
    this.timeout(5000);

    var square = new Square({ 'disable log transport': true })
      , Minify = require('../plugins/minify')
      , test = require(fixtures + '/plugins/minify')
      , minify = new Minify(square, test)
      , data = sinon.spy(minify, 'emit')
      , proc = sinon.spy(process, 'nextTick')
      , cluster = sinon.stub(Minify.cluster, 'send').yields(null, { content: 'var test = "test"'});

    minify.on('data', function (collection) {
      expect(cluster).to.be.calledOnce;
      expect(proc).to.be.calledOnce;
      expect(cluster).to.be.calledBefore(data);
      expect(proc).to.be.calledBefore(data);
      expect(data).to.be.calledWith('data', 'var test = "test"');
      expect(cluster.getCall(0).args.length).to.be.equal(2);

      cluster.restore();
      proc.restore();
      data.restore();
      done();
    });

    minify.initialize();
  });
});
