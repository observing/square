"use strict";

var Square = require('../lib/square');

module.exports = {
    'constructing': function () {
      var square = new Square();

      square.env.should.equal('development');
      square.middleware.length.should.equal(0);
    }

  , 'configuring': function () {
      var square = new Square()
        , configured = 0;

      square.configure(function () {
       ++configured;

       this.should.equal(square);
      });

      square.configure('test', function () {
       ++configured;
      });

      square.configure('production', function () {
       ++configured;
      });

      square.configure('production', 'test', function () {
       ++configured;
      });

      square.configure('production', 'development', function () {
       ++configured;
      });

      configured.should.equal(2);
    }

  , 'middleware': function () {
      var square = new Square();

      square.middleware.length.should.equal(0);

      square.use(require('../plugins/wrap')());

      square.middleware.length.should.equal(1);

      square.use('not a function');
      square.middleware.length.should.equal(1);
    }
};
