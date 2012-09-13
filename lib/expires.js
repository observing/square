'use strict';

/**
 * Simple automatic expiring cache.
 *
 * @constructor
 * @param {Number} expire amount of miliseconds we should cache the data
 * @api public
 */
function Expire(expire) {
  this.cache = {};
  this.expire = Expire.parse(expire || '5 minutes');

  // Start watching for expired items.
  this.start();
}

/**
 * Get an item from the cache based on the given key.
 *
 * @param {String} key
 * @param {Boolean} dontUpdate don't update the expiree value
 * @returns {Mixed} undefined if there isn't a match, otherwise the result
 * @api public
 */
Expire.prototype.get = function get(key, dontUpdate) {
  var result = this.cache[key];
  if (!result) return undefined;

  var now = Date.now();

  // We found a match, make sure that it's not expired.
  if (now - result.last >= this.expire) {
    delete this.cache[key];
    return undefined;
  }

  // Update the last used time stamp.
  if (!dontUpdate) result.last = now;

  return result.value;
};

/**
 * Stores a new item in the cache, if the key already exists it will override
 * it with the new value.
 *
 * @param {String} key
 * @param {Mixed} value
 * @returns {Mixed} the value you gave it
 * @api public
 */
Expire.prototype.set = function set(key, value) {
  this.cache[key] = {
      last: Date.now()
    , value: value
  };

  return value;
};

/**
 * Checks if the item exists in the cache.
 *
 * @param {String} key
 * @returns {Boolean}
 * @api public
 */
Expire.prototype.has = function has(key) {
  var now = Date.now();

  return key in this.cache && (now - this.cache[key].last) >= this.expire;
};

/**
 * Remove an item from the cache.
 *
 * @param {String} key
 * @api public
 */
Expire.prototype.remove = function remove(key) {
  delete this.cache[key];
};

/**
 * Scans the cache for potential items that should expire.
 *
 * @api private
 */
Expire.prototype.scan = function scan() {
  var now = Date.now(), key;

  for (key in this.cache) {
    if (now - this.cache[key].last >= this.expire) {
      delete this.cache[key];
    }
  }
};

/**
 * Stops the expire check timer.
 *
 * @api public
 */
Expire.prototype.stop = function stop() {
  if (this.timer) clearInterval(this.timer);
};

/**
 * Starts the expire check timer.
 *
 * @api public
 */
Expire.prototype.start = function start() {
  // Top old timers before starting a new one
  this.stop();

  this.timer = setInterval(this.scan.bind(this), this.expire);
};

/**
 * Destroy the whole cache.
 *
 * @api public
 */
Expire.prototype.destroy = function destroy() {
  this.stop();
  this.cache = {};
};

/**
 * Parse durations to miliseconds. Bluntly copy and pasted from `ms.js` so all
 * copyright belongs to them. Except the parts that I fixed because it did some
 * stupid things like not always returning numbers or only accepting strings..
 *
 * @param {String} str
 * @return {Number}
 */
Expire.parse = function parse(str) {
  if (+str) return +str;

  var m = /^((?:\d+)?\.?\d+) *(ms|seconds?|s|minutes?|m|hours?|h|days?|d|years?|y)?$/i.exec(str);
  if (!m) return 0;

  var n = parseFloat(m[1])
    , type = (m[2] || 'ms').toLowerCase();

  switch (type) {
    case 'years':
    case 'year':
    case 'y':
      return n * 31557600000;

    case 'days':
    case 'day':
    case 'd':
      return n * 86400000;

    case 'hours':
    case 'hour':
    case 'h':
      return n * 3600000;

    case 'minutes':
    case 'minute':
    case 'm':
      return n * 60000;

    case 'seconds':
    case 'second':
    case 's':
      return n * 1000;

    case 'ms':
      return n;
  }
};

// Expose the Expire helper so we can do some unit testing against it.
module.exports = Expire;
