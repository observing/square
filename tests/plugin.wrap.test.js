"use strict";

var wrap = require('../plugins/wrap')
  , Square = require('../lib/square')
  , should = require('should');

module.exports = {
    'missing var statement': function (next) {
      var square = new Square()
        , src = 'hello = "world";';

      square.use(wrap());
      square.middleware[0].call(square, src, function done (err, compiled, leaks) {
        should.not.exist(err);

        compiled.should.not.equal(src);
        leaks.length.should.equal(0);
        next();
      });
    }

  , 'window.var statement': function (next) {
      var square = new Square()
        , src = 'window.hello = "world";';

      square.use(wrap());
      square.middleware[0].call(square, src, function done (err, compiled, leaks) {
        should.not.exist(err);

        compiled.should.not.equal(src);
        leaks.length.should.equal(0);
        next();
      });
    }

  , 'this + anonymous function': function (next) {
      var square = new Square()
        , src = '(function (global) { global.hello = "world"; }(this));';

      square.use(wrap());
      square.middleware[0].call(square, src, function done (err, compiled, leaks) {
        should.not.exist(err);

        compiled.should.not.equal(src);
        leaks.length.should.equal(0);
        next();
      });
    }

  , 'missing var + anonymous function': function (next) {
      var square = new Square()
        , src = '(function (global) { hello = "world"; }(this));';

      square.use(wrap());
      square.middleware[0].call(square, src, function done (err, compiled, leaks) {
        should.not.exist(err);

        compiled.should.not.equal(src);
        leaks.length.should.equal(0);
        next();
      });
    }

  , 'window.var + anonymous function': function (next) {
      var square = new Square()
        , src = '(function (global) { window.hello = "world"; }(this));';

      square.use(wrap());
      square.middleware[0].call(square, src, function done (err, compiled, leaks) {
        should.not.exist(err);

        compiled.should.not.equal(src);
        leaks.length.should.equal(0);
        next();
      });
    }
};
