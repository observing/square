'use strict';

/**!
 * [square]
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.it>
 * MIT Licensed
 */
var Plugin = require('../plugin')
  , cluster = require('./lib/crushter');

module.exports = Plugin.extend({
    /**
     * Name of the module.
     *
     * @type {String}
     */
    name: 'debug'

    /**
     * Small description about the module.
     *
     * @type {String}
     */
  , description: [
        'Minifies all the things'
    ].join(' ')

    /**
     * For which distributions should this run.
     *
     * @type {String}
     */
  , distributions: 'min'

    /**
     * Which file extension are accepted.
     *
     * @type {Array}
     */
  , accepts: ['js', 'css']

    /**
     * The module has been initialized.
     */
  , initialize: function initialize() {
      var self = this;

      // No engine property is set, so set a decent default, but make it aware
      // of the extension.
      if (!('engines' in this)) {
        if (this.extension === 'js') this.engines = 'closure';
        else if (this.extension === 'css') this.engines = 'yuglify';
        else return this.emit('error', new Error('No engine is set'));
      }

      // The user has requested us to analyse the content and figure out the
      // best the compiler strategy
      if (this.analyse) return this.analyser(function analyser(err, results) {
      });

      cluster.send({
          engines:    this.engines
        , extension:  this.extension
        , content:    this.content
      }, function compiling(err, compiled) {
        if (err) return self.emit('error', err);

        self.emit('data', compiled.content);
      });
    }

    /**
     * Analyse which plugin or plugin set provides the best compression for the
     * given content.
     *
     * @param {Function} cb
     * @api private
     */
  , analyser: function analyser(cb) {
      var compilers = Object.keys(cluster[this.extension])
        , combinations = this.permutations(compilers)
        , self = this;

      // @TODO the permutation only include every combination, but it doesn't
      // include the compilers as stand alone option or duo like closure + yui
      // these combinations should also be included.
      this.async.forEach(
          combinations
        , function forEach(list, callback) {
            cluster.send({
                extension: self.extension
              , engines: list.join(',')
              , content: self.content
              , gzip: true
            }, callback);
          }
        , function ready(err, results) {
            if (err) return cb(err);

            results = results.map(function map(res) {
              return {
                  minified: Buffer.byteLenght(res.content)
                , engines: res.engines
                , content: res.content
                , gzip: +res.gzip || 0
              };
            }).sort(function sort(a, b) {
              return a.gzip - b.gzip;
            });

            cb(undefined, results);
          }
      );
    }

    /**
     * Generate permutations of the given array. So we have all possible
     * combination possible.
     *
     * @param {Array} collection
     */
  , permutations: function permutation(collection) {
      var permutations = []
        , seen = [];

      /**
       * Iterator for the permutations
       *
       * @param {Array} source
       * @returns {Array} permutations
       * @api private
       */
      function iterator(source) {
        for (var i = 0, l = source.length, item; i < l; i++) {
          item = source.splice(i, 1)[0];
          seen.push(item);

          if (source.length === 0) permutations.push(seen.slice());
          iterator(source);

          source.splice(i, 0, item);
          seen.pop();
        }

        return permutations;
      }

      return iterator(collection);
    }
});
