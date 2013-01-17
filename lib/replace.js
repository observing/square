"use strict";

/**
 * Required modules.
 */

var Logger = require('devnull')
  , logger = new Logger;

/**
 * Replace the variables by the keys in replacements surrounded by brackets in data.
 *
 * @param {Object} data
 * @param {String} type
 * @param {Object} replacements
 * @api private
 */

module.exports = function replace (data, type, replacements) {
  if (!replacements) return data.content;

  var literals = replacements[type];

  // Loop each key replacement combination, wrap in brackets.
  Object.keys(literals).forEach(function loopReplacements (original) {
    var regex = typeof literals[original] === 'object';

    // Check for requirements.
    if (regex && (!literals[original].regex || !literals[original].value)) {
      return logger.warning(
        'Provide a proper regex and value if your using replace with ' +
        'regular expressions. Value for key `' + original + '` is not replaced.'
      );
    }

    // Regular expression is required to do global replace.
    data.content = data.content.replace(
        new RegExp(regex ? literals[original].regex : original, 'g')
      , regex ? literals[original].value : literals[original]
    );
  });

  return data.content;
};
