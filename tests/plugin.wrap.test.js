"use strict";

var wrap = require('../plugins/wrap')
  , Ion = require('../lib/ion')
  , should = require('should');

module.exports = {
    'missing var statement': function (next) {
      var ion = new Ion()
        , src = 'hello = "world";';

      ion.use(wrap());
      ion.middleware[0].call(ion, src, function done (err, compiled, leaks) {
        should.not.exist(err);

        compiled.should.not.equal(src);
        leaks.length.should.equal(0);
        next();
      });
    }

  , 'window.var statement': function (next) {
      var ion = new Ion()
        , src = 'window.hello = "world";';

      ion.use(wrap());
      ion.middleware[0].call(ion, src, function done (err, compiled, leaks) {
        should.not.exist(err);

        compiled.should.not.equal(src);
        leaks.length.should.equal(0);
        next();
      });
    }

  , 'this + anonymous function': function (next) {
      var ion = new Ion()
        , src = '(function (global) { global.hello = "world"; }(this));';

      ion.use(wrap());
      ion.middleware[0].call(ion, src, function done (err, compiled, leaks) {
        should.not.exist(err);

        compiled.should.not.equal(src);
        leaks.length.should.equal(0);
        next();
      });
    }

  , 'missing var + anonymous function': function (next) {
      var ion = new Ion()
        , src = '(function (global) { hello = "world"; }(this));';

      ion.use(wrap());
      ion.middleware[0].call(ion, src, function done (err, compiled, leaks) {
        should.not.exist(err);

        compiled.should.not.equal(src);
        leaks.length.should.equal(0);
        next();
      });
    }

  , 'window.var + anonymous function': function (next) {
      var ion = new Ion()
        , src = '(function (global) { window.hello = "world"; }(this));';

      ion.use(wrap());
      ion.middleware[0].call(ion, src, function done (err, compiled, leaks) {
        should.not.exist(err);

        compiled.should.not.equal(src);
        leaks.length.should.equal(0);
        next();
      });
    }
};
