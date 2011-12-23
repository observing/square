var Oz = require('../lib/oz');

module.exports = {
    'constructing': function () {
      var oz = new Oz;

      oz.env.should.equal('development');
      oz.middleware.length.should.equal(0);
    }

  , 'configuring': function () {
      var oz = new Oz
        , configured = 0;

      oz.configure(function () {
       ++configured;

       this.should.equal(oz);
      });

      oz.configure('test', function () {
       ++configured;
      });

      oz.configure('production', function () {
       ++configured;
      });

      oz.configure('production', 'test', function () {
       ++configured;
      });

      oz.configure('production', 'development', function () {
       ++configured;
      });

      configured.should.equal(2);
    }

  , 'middleware': function () {
      var oz = new Oz;

      oz.middleware.length.should.equal(0);

      oz.use(require('../plugins/localize')());

      oz.middleware.length.should.equal(1);

      oz.use('not a function');
      oz.middleware.length.should.equal(1);
    }
};
