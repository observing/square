module.exports = {
    // output config
    output: {
        js: '~/square.{type}.js'
      , css: '~/square.{type}.css'
    }

    // plugin configuration
  , plugin: {}

    // hinting and linting
  , jshint: require('./jshint')
  , csslint: require('./csshint')
};
