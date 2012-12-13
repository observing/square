'use strict';

/**!
 * [square]
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.it>
 * MIT Licensed
 */

/**
 * Native modules.
 */
var child = require('child_process')
  , cluster = require('cluster')
  , path = require('path')
  , os = require('os');

/**
 * Third party modules.
 */
var async = require('async');

/**
 * A fork received a new task to process.
 *
 * Task:
 *
 * task.engines: Comma seperated list of compressors that need to be used
 * task.content: The actual content that needs to be processed
 * task.analyze: Analyze which compression pattern would be optimal for the content
 *
 * @param {Object} task
 */
process.on('message', function message(task) {
  async.reduce(
      task.engines.split(/\,\s+?/)
    , task.content
    , function reduce(memo, engine, done) {
      }
    , function done(err, result) {
      }
  );
});

/**
 * Send a message to the workers that they need to start processing something.
 *
 * @param {String}
 * @api public
 */
exports.send = function send() {
  if (!exports.initialized) exports.initialize();

  var worker = exports.workers.pop();
  worker.send.apply(worker.send, arguments);

  // Add it back at the end of the array, so we implement a round robin load
  // balancing technique for our workers.
  exports.workers.push(worker);
};

/**
 * Is our cluster already initialized
 *
 * @type {Boolean}
 * @api private
 */
exports.initialized = false;

/**
 * Maintain a list of our workers. They should be ordered on usage, so we can
 * implement a round robin system by poping and pushing workers after usage.
 *
 * @type {Array}
 * @api private
 */
exports.workers = [];

/**
 * Initialize our cluster.
 *
 * @param {Number} workers
 * @api private
 */
exports.initialize = function initialize(workers) {
  var i = workers || os.cpus().length;

  while (i--) exports.workers.push(cluster.fork());
  exports.initialized = true;
};
