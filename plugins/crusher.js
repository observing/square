'use strict';

/**!
 * [square]
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.it>
 * MIT Licensed
 */
var Plugin = require('../plugin')
  , cluster = require('./lib/crushter');

/**
 * Crush and compile different files a.k.a minify all the things.
 *
 * Options:
 * - engines: Which engines should we use to compile the content. This could
 *   either be comma separated string that contains the different engines you
 *   want to run it against. Or an Object which contains they different engines
 *   for each file extension.
 * - analyse: Analyse which crusher and / or combination provides the best
 *   crushing for your code. Should be a string containing the engines you want
 *   to test or a boolean for all engines.
 * - metrics: Should we output some metrics.
 *
 * @constructor
 * @api public
 */
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
     * Should we generate and output some metrics about the compilation?
     *
     * @type {Boolean}
     */
  , metrics: true

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

        self.logger.info('The fastest engine:     '+ results.fastest.engines);
        self.logger.info('The smallest content:   '+ results.filesize.engines);
        self.logger.info('The best compressed:    '+ results.bandwidth.engines);

        self.emit('data');
      });

      // Check if the engines key is an object or string, if it's an object it
      // has specific engines for each extension.. atleast that is something
      // that we are gonna assume here
      if (typeof this.engines === 'object') {
        if (Array.isArray(this.engines)) this.engines = this.engines.join(',');
        else this.engines = this.engines[this.extension] || '';
      }

      cluster.send({
          engines:    this.engines
        , extension:  this.extension
        , content:    this.content
        , gzip:       this.metrics
      }, function compiling(err, compiled) {
        if (err) return self.emit('error', err);

        if (self.metrics) {
          var factor = Buffer.byteLength(compiled.content) / compiled.gzip;
          self.logger.metric([
              'compressed: '.white + Buffer.byteLength(compiled.content).bytes(1).green
            , ' minified, '.white + compiled.gzip.bytes(1).green
            , ' gzip. Which is a factor of '.white
            , factor.toFixed(1).toString().green
          ].join(''));
        }

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
        , results = []
        , self = this
        , error
        , queue;

      this.logger.debug('analysing '+ combinations.length +' different combinations');

      // @TODO the permutation only include every combination, but it doesn't
      // include the compilers as stand alone option or duo like closure + yui
      // these combinations should also be included.
      //
      // To ensure that the system stays responsive during large permutations we
      // need to do this as a serial operation. Running more than 500 tasks
      // concurrently will fuck up your system and that is not something we want
      // to introduce.
      queue = this.async.queue(function forEach(list, callback) {
        cluster.send({
            extension: self.extension
          , engines: list.join(',')
          , content: self.content
          , gzip: true
        }, function compiling(err, data) {
          if (err)  self.logger.debug('Failed to analyse '+ list, err);
          if (err && !error) error = err;

          results.push(data);
          callback();
        });
      }, 20);

      queue.push(combinations);
      queue.drain = function ready() {
        if (error) console.log(error.message, error.stack);
        if (error) return cb(error);

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
      };
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
