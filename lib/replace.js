"use strict";

/**
 * Replace the variables by the keys in replacements surrounded by brackets in data.
 *
 * @param {Object} data
 * @param {String} type
 * @param {Object} replacements
 * @api private
 */

module.exports = function replace (data, type, replacements) {
  var literals = replacements[type];

  // Loop each key replacement combination, wrap in brackets.
  Object.keys(literals).forEach(function loopReplacements (original) {
    data.content = data.content.replace(
        new RegExp('{' + original + '}', 'g')
      , literals[original]
    );
  });

  return data.content;
};
