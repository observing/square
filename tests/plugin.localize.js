var localize = require('../plugins/localize')
  , Oz = require('../lib/oz');

module.exports = {
    'missing var statement': function (next) {
      var oz = new Oz
        , src = 'hello = "world";';

      oz.use(localize());
      oz.middleware[0].call(oz, src, function done (err, compiled, leaks) {
        should.not.exist(err);

        compiled.should.not.equal(src);
        leaks.length.should.equal(0);
        next();
      });
    }

  , 'window.var statement': function (next) {
      var oz = new Oz
        , src = 'window.hello = "world";';

      oz.use(localize());
      oz.middleware[0].call(oz, src, function done (err, compiled, leaks) {
        should.not.exist(err);

        compiled.should.not.equal(src);
        leaks.length.should.equal(0);
        next();
      });
    }

  , 'this + anonymous function': function (next) {
      var oz = new Oz
        , src = '(function (global) { global.hello = "world"; }(this));';

      oz.use(localize());
      oz.middleware[0].call(oz, src, function done (err, compiled, leaks) {
        should.not.exist(err);

        compiled.should.not.equal(src);
        leaks.length.should.equal(0);
        next();
      });
    }

  , 'missing var + anonymous function': function (next) {
      var oz = new Oz
        , src = '(function (global) { hello = "world"; }(this));';

      oz.use(localize());
      oz.middleware[0].call(oz, src, function done (err, compiled, leaks) {
        should.not.exist(err);

        compiled.should.not.equal(src);
        leaks.length.should.equal(0);
        next();
      });
    }

  , 'window.var + anonymous function': function (next) {
      var oz = new Oz
        , src = '(function (global) { window.hello = "world"; }(this));';

      oz.use(localize());
      oz.middleware[0].call(oz, src, function done (err, compiled, leaks) {
        should.not.exist(err);

        compiled.should.not.equal(src);
        leaks.length.should.equal(0);
        next();
      });
    }
}
