module.exports = {
    // output config
    dist: {
        min: '~/square.{type}.{ext}'
      , dev: '~/square.{type}.{ext}'
    }

    // plugin configuration
  , plugin: {}

    // hinting and linting
  , jshint: require('./jshint')
  , csslint: require('./csshint')
};
