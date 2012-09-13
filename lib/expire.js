/**
 * Simple automatic expiring cache.
 *
 * @constructor
 * @param {Number} expire amount of miliseconds we should cache the data
 * @api public
 */
function Expire(expire) {
  this.cache = {};
  this.expire = expire || 5 * 1000 * 60;
  this.timer = setInterval(this.scan.bind(this), this.expire);
}

/**
 * Get an item from the cache based on the given key
 *
 * @param {String} key
 * @returns {Mixed} undefined if there isn't a match, otherwise the result
 * @api public
 */
Expire.prototype.get = function get(key) {
  var result = this.cache[key];
  if (!result) return undefined;

  var now = Date.now();

  // we found a match, make sure that it's not expired
  if (now - result.last >= this.expire) {
    delete this.cache[key];
    return undefined;
  }

  // update the last used time stamp
  result.last = now;
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

// expose the Expire helper so we can do some unit testing against it
module.exports = Expire;
