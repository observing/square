/*global expect, Square, execSync */
describe('[square] API', function () {
  "use strict";

  /**
   * Simple dummy function that is used for testing.
   *
   * @api private
   */

  function noop() { console.log(/* dummy function*/); }

  it('exposes the current version number', function () {
    expect(Square.version).to.match(/^\d+\.\d+\.\d+$/);
    expect(Square.version).to.eql(require('../package.json').version);
  });

  describe('.extend', function () {
    it('should extend the Square.prototype', function () {
      expect(Square.prototype.cowsack).to.be.an('undefined');

      Square.extend({
          cowsack: function () {}
      });

      expect(Square.prototype.cowsack).to.be.an('function');
      delete Square.prototype.cowsack;
    });

    it('should override existing prototypes', function () {
      var backup = Square.prototype.configure;
      expect(Square.prototype.configure).to.be.an('function');

      Square.extend({
          configure: noop
      });

      expect(Square.prototype.configure).to.equal(noop);
      Square.prototype.configure = backup;
    });
  });

  describe('@construction', function () {
    it('should construct without any errors', function () {
      var square = new Square();
    });

    it('should be configured using the options parameter', function () {
      var square = new Square();
      expect(square.env).to.not.equal('whoopwhoop');

      var square2 = new Square({ env: 'whoopwhoop' });
      expect(square2.env).to.equal('whoopwhoop');
    });

    it('should not override private properties', function () {
      var privates = {
              middleware: 'pewpew'
            , config: 'pewpew'
            , package: 'pewpew'
          }
        , square = new Square(privates);

      Object.keys(privates).forEach(function (key) {
        expect(square[key]).to.not.equal(privates[key]);
      });
    });

    it('should silence the logger when stdout option is changed', function () {
      var square = new Square({ stdout: true });
      expect(square.logger.level).to.equal(-1);

      square.stdout = false;
      expect(square.logger.level).to.be.above(-1);
    });

    it('should set the correct env based on NODE_ENV', function () {
      var square = new Square();
      expect(square.env).to.equal('testing');
    });

    it('should find the correct $HOME directory', function () {
      // @TODO make this test pass on non unix platforms, as pwd and cd ~/ will
      // probably output something else on windows ;)
      var home = execSync('cd ~/ && pwd', { silent: true }).output.replace('\n', '');

      var square = new Square();
      expect(square.home).to.equal(home);
    });

    it('should be able to configure the logger', function () {
      var square = new Square({
          'log notification level': 1337
        , 'log level': 7331
        , 'disable log transport': true
      });

      expect(square.logger.level).to.equal(7331);
      expect(square.logger.notification).to.equal(1337);
      expect(square.logger.transports).to.have.length(0);
    });
  });

  describe('#has', function () {
    it('should find duplicate plugins', function () {
      var square = new Square();

      square.middleware.push(noop);
      expect(square.has(noop)).to.equal(true);
    });

    it('shouldnt find non-existing plugins', function () {
      var square = new Square();
      expect(square.has(noop)).to.equal(false);
    });
  });

  describe('#use', function () {
    it('should only accept functions', function (done) {
      var square = new Square({ 'disable log transport': true });

      // assure that there is a small possibility that an event emitter can
      // execute async.. if this is not the case, we wrapped it in a tick
      square.logger.on('error', function (args, stack) {
        expect(args[0]).to.have.string('function');

        process.nextTick(done);
      });

      expect(square.use('string')).to.equal(false);
      expect(square.middleware).to.have.length(0);
    });

    it('should not add duplicate plugins', function () {
      var square = new Square();
      expect(square.middleware).to.have.length(0);

      expect(square.use(noop)).to.equal(true);
      expect(square.middleware).to.have.length(1);

      // silent failure
      expect(square.use(noop)).to.equal(false);
      expect(square.middleware).to.have.length(1);
    });
  });

  describe('#plugin', function () {
    it('should require the given plugin by name', function () {
      var square = new Square();

      expect(square.plugin('lint')).to.equal(true);
      expect(square.middleware).to.have.length(1);
    });

    it('should for the plugin in multiple locations', function () {
      var square = new Square({ 'disable log transport': true });
      square.on('error', noop); // throws an error other wise

      expect(square.plugin('plugin.fixture')).to.equal(false);

      // add the fixtures directory as possible option to search for plugins
      var square2 = new Square({ 'disable log transport': true });
      square2.paths.push(require('path').join(process.env.PWD, 'test/fixtures'));

      expect(square2.plugin('plugin.fixture')).to.equal(true);
      expect(square2.middleware).to.have.length(1);
    });

    it('should do the first initialization step of the plugin', function (done) {
      var square = new Square({ 'disable log transport': true });
      square.paths.push(require('path').join(process.env.PWD, 'test/fixtures'));

      square.on('plugin.fixture:init', function () {
        done();
      });

      square.plugin('plugin.fixture');
    });

    it('should proxy the configuration to the plugin', function (done) {
      var square = new Square({ 'disable log transport': true });
      square.paths.push(require('path').join(process.env.PWD, 'test/fixtures'));

      square.on('plugin.fixture:init', function (pluginoptions) {
        expect(pluginoptions).to.equal(options);
        done();
      });

      var options = { foo: 'bar' };
      square.plugin('plugin.fixture', options);
    });

    it('should merge the configuration with the supplied options', function (done) {
      var square = new Square();
      square.paths.push(require('path').join(process.env.PWD, 'test/fixtures'));
      square.package = {
          configuration: {
              plugins: {
                  'plugin.fixture': {
                      foo: 'bar'
                    , bar: 'foo'
                    , baz: 'afdasfas'
                  }
              }
          }
      };

      square.on('plugin.fixture:init', function (pluginoptions) {
        expect(pluginoptions).to.have.property('foo', 'choochoo');
        expect(pluginoptions).to.have.property('bar', 'foo');
        expect(pluginoptions).to.have.property('baz', 'afdasfas');

        done();
      });

      var options = { foo: 'choochoo' };
      square.plugin('plugin.fixture', options);
    });

    it('should log an critical error when it fails', function (done) {
      var square = new Square({ 'disable log transport': true });
      square.on('error', noop); // throws an error other wise

      square.logger.on('critical', function (args) {
        expect(args[0]).to.have.string('plugin');
        done();
      });

      expect(square.plugin('plugin.fixture' + Math.random())).to.equal(false);
    });
  });

  describe('#configure', function () {
    it('should call the function if no evn variable is given', function (done) {
      var square = new Square();

      square.configure(done);
    });

    it('should not execute the function if the env doesnt match', function () {
      var square = new Square()
        , execution = 0;

      square.configure('trololol', function () {
        execution++;
      });

      expect(execution).to.equal(0);
    });

    it('should execute the function on evn match', function (done) {
      var square = new Square();

      square.configure('testing', done);
    });

    it('should execute with the correct function context', function () {
      var square = new Square();

      square.on('configure', function () {
        expect(this).to.equal(square);
      });
    });
  });

  describe('#forEach', function () {
    it('should iterate over all plugins');

    it('should catch errors generated by the plugins');

    it('should handle plugins that doesnst return content');

    it('should callback with one error when things breaks');

    it('should callback the newly generated collection');
  });

  describe('#preprocess', function () {
    it('should add debugging comments for each included file');

    it('should add the bundles dependencies');

    it('should process the [square] comment directives');

    it('should process the content with an compiler');

    it('should process the content without any compiler');
  });

  describe('#parse', function () {
    it('should parse .json strings');

    it('should parse .js strings');

    it('should parse objects');

    it('should return true when it parses correctly');

    it('should return false when it fails to parse');
  });

  describe('#read', function () {
    it('should read .json files');

    it('should require .js files');

    it('should also read objects');

    it('should generate inclusion details');

    it('should parse boolean values using eson');

    it('should parse include statements using eson');

    it('should glob directories using eson');

    it('should return false when it fails to read the file');

    it('should return true when it sucessfully read the file');
  });

  describe('#fromJSON', function () {
    it('should validate the location');

    it('should remove // comments from the JSON');

    it('should remove /**/ comments from the JSON');

    it('should not give a fuck about the extension');

    it('should return an Error when it fails to parse');
  });

  describe('#critical', function () {
    it('should emit an error when its not running in cli mode');

    it('should exit the process with 1 when running in cli');
  });

  describe('#refresh', function () {
    it('should refresh the contents of the changed files');

    it('should ignore files that are not specified in a bundle');

    it('should emit `changed` when there are files updated');
  });

  describe('#directive', function () {
    it('should ignore regular comments');

    it('should ignore invalid comments');

    it('should include the linked file');

    it('should work with import, require, include');

    it('should process the files recusively');

    it('should giving meaning full errors for recursion');

    it('should add debug comments for each include');
  });

  describe('#build', function () {});

  describe('#outofdate', function () {
    it('should check the upstream repo for its version number');

    it('should check different branches of the upstream');

    it('should randomly check for an upstream');

    it('should not check upstream if forbidden by configuration');
  });

  describe('#tag', function () {
    it('should return the branch name, as this is a git repository');

    it('should return the last SHA, as this is a git repository');

    it('should contain the default tags');

    it('should override the tags with our configured tags');
  });

  describe('#template', function () {
    it('should replace the {} tags in a string');

    it('should find keys using dot notations for deeper object nesting');

    it('should use #tag if no data is provided');
  });

  describe('#write', function () {
    it('should process the tags inside the configuration file name');

    it('should transform ~ to the $HOME path in file names');

    it('should emit a write with metrics');

    it('should prefix the file content with a license header');
  });

  describe('#license', function () {
    it('should prefix the content with a license');

    it('shouldnt prrefix if theres no license');

    it('should correclty comment the license header');
  });

  describe('#commentWrap', function () {
    it('should not place the comment if we dont have a comment style');

    it('should wrap multi-line comments');

    it('should wrap single-line comments');

    it('should wrap the comment is the correct comment style based on type');
  });
});
