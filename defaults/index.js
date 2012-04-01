var path = require('path')
  , file = path.join(process.env.PWD, 'package.json')
  , pkg;

try { pkg = require(file); }
catch (e) { pkg = {}; }

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

    // add package.json if it exists
  , vars: pkg
};
