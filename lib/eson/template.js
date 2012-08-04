"use strict";

/**
 * template.js: Eson parser that handles square supported template tags.
 */

/**
 * Parses square tags.
 *
 * @param {String} key the JSON key
 * @param {String} value the value of the key
 * @param {Parser} parser eson parser instance
 * @returns {String}
 */
module.exports = function template(key, value, parser) {
  var square = this;

  // make sure it's a string..
  if (typeof value !== 'string') return value;

  // glob's uses the same curly brace syntax, we really don't to replace that
  if (value.indexOf('glob') === 0) return value;

  // the following keys should not be changed as that will be done during build
  // or processing
  if (/dist|min|dev/.test(key)) return value;

  // now that we are sure that it's a key we are allowed to change, template it
  return square.template(value);
};
