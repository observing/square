"use strict";

var Ion = require('../lib/ion');

module.exports = {
    'constructing': function () {
      var ion = new Ion();

      ion.env.should.equal('development');
      ion.middleware.length.should.equal(0);
    }

  , 'configuring': function () {
      var ion = new Ion()
        , configured = 0;

      ion.configure(function () {
       ++configured;

       this.should.equal(ion);
      });

      ion.configure('test', function () {
       ++configured;
      });

      ion.configure('production', function () {
       ++configured;
      });

      ion.configure('production', 'test', function () {
       ++configured;
      });

      ion.configure('production', 'development', function () {
       ++configured;
      });

      configured.should.equal(2);
    }

  , 'middleware': function () {
      var ion = new Ion();

      ion.middleware.length.should.equal(0);

      ion.use(require('../plugins/wrap')());

      ion.middleware.length.should.equal(1);

      ion.use('not a function');
      ion.middleware.length.should.equal(1);
    }
};
