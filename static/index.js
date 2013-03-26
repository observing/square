"use strict";

// try to parse out the package.json as we want to use some data from it to fill
// in our defaults
var packagejson;
try { packagejson = require(require('path').join(process.env.PWD, 'package.json')); }
catch (e) { packagejson = {}; }

/**
 * The default configuration for the square.json files.
 *
 * @type {Object}
 */

module.exports = {
    /**
     * Default configuration output. This is where the different distribution
     * are written to.
     *
     * The keys in this Object are the type's of distribution and the value is
     * the path where the files should be written to.
     *
     * If there are no differences path, you can also specify this as an String
     * instead of an Object.
     *
     * @type {Mixed}
     */

    dist: {
        min: '~/square.{type}.{ext}'
      , dev: '~/square.{type}.{ext}'
    }

    /**
     * Dedicated configuration section for the plugins. The key of this Object
     * should be the name of the plugin in lowercase and the value an Object
     * with the options that you wish to configure.
     *
     * @type {Object}
     */

  , plugins: {}

    /**
     * Determine which distribution should be made, if the user omits this key
     * from the configuration, both dev and min distributions will be run by
     * default.
     *
     * @type {Array}
     */

  , distribute: ['dev', 'min']

    /**
     * Default storage engine.
     *
     * @type {Array}
     */

  , storage: ['disk']

    /**
     * Default platform to build the files for.
     *
     * @type {Array}
     */

  , platform: ['web']

    /**
     * List of platforms that can be used to target specifically in stylus..
     *
     * @type {Array}
     */

  , platforms: ['android', 'iphone', 'ipad', 'web']

    /**
     * Code quality is always important, so we have list of the jshint and the
     * csslint configuration flags here, if you want to to use the `lint`
     * plugin. Other wise it's pretty useless..
     *
     * @type {Object}
     */

  , jshint: require('./jshint')
  , csslint: require('./csshint')

    /**
     * Expose the package.json in the tags property so it can be used to
     * generate names and other sorts of content.
     *
     * @type {Object}
     */

  , tags: packagejson

    /**
     * This version is depricated, use the `tags` property instead.
     *
     * @deprecated
     */

  , vars: packagejson
};
