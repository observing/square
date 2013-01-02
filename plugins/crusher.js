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
    name: 'crusher'

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
     * Which engines should be used for crushing the content? It can be a comma
     * separated list of engines. Each engine will process the result of the
     * previous engine and potentially creating a higher saving at the cost of
     * longer processing.
     *
     * @type {String}
     */
  , engines: ''

    /**
     * Should we analyse which crusher or combination of curshers yields the
     * best results? If's often possible that engine x works great on code base
     * y but doesn't work as good as expected on a different code base as each
     * engine has it's own bag of tricks to optimize the content.
     *
     * @type {Boolean|String}
     */
  , analyse: false

    /**
     * The module has been initialized.
     */
  , initialize: function initialize() {
      var self = this;

      // Check if we need to register the cluster as longrunning handle with the
      // square instance.
      // @NOTE: we might need to add this callback to every square instance not
      // just the one that started it..
      if (!cluster.initialized) {
        this.square.longrunning('cluster', cluster.kill);
      }

      // No engine property is set, so set a decent default, but make it aware
      // of the extension.
      if (!this.engines) {
        if (this.extension === 'js') this.engines = 'closure';
        else if (this.extension === 'css') this.engines = 'yuglify';
        else return this.emit('error', new Error('No engine is set'));
      }

      // The user has requested us to analyse the content and figure out the
      // best the compiler strategy
      if (this.analyse) return this.analyser(function analyser(err, results) {
        if (err) return self.emit('error', err);

        self.logger.info('The fastest engine:   %s', results.fastest.engines);
        self.logger.info('The smallest content: %s', results.filesize.engines);
        self.logger.info('The best compressed:  %s', results.bandwidth.engines);

        self.emit('data');
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
      var compilers = typeof this.analyse === 'string'
            ? this.analyse.split(/\s?\,\s?/).filter(Boolean)
            : Object.keys(cluster[this.extension])
        , combinations = this.permutations(compilers)
        , self = this;

      this.logger.debug('analysing '+ combinations.length+' different combinations');

      // @TODO the permutation only include every combination, but it doesn't
      // include the compilers as stand alone option or duo like closure + yui
      // these combinations should also be included.
      this.async.map(
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
            if (err) console.log(err.message, err.stack);
            if (err) return cb(err);

            // Map the results in to useful things
            results = results.map(function map(res) {
              return {
                  minified: Buffer.byteLength(res.content)
                , duration: res.duration || Infinity
                , engines: res.engines
                , content: res.content
                , gzip: +res.gzip || 0
              };
            });

            // Calculate some stats from the analytic procedure
            // - The fastest crusher
            // - The least file size
            // - The best bandwidth saving (using gzip)
            var stats = {};
            stats.fastest = results.sort(function sort(a, b) {
              return a.duration - b.duration;
            })[0];

            stats.filesize = results.sort(function sort(a, b) {
              return a.minified - b.minified;
            })[0];

            stats.bandwidth = results.sort(function sort(a, b) {
              return a.gzip - b.gzip;
            })[0];

            stats.results = results;
            cb(undefined, stats);
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
