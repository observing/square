'use strict';

/**!
 * [square]
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.it>
 * MIT Licensed
 */

/**
 * A list of different comment styles used by pre-processors and programming
 * languages. This allows us to easily add and remove files that might require
 * comment injection.
 *
 * @type {Object}
 * @api public
 */
exports.styles = {
    star: {
        header: '/*!'
      , body:   ' *'
      , footer: ' */'
    }
  , arrow: {
        header: '<!--'
      , body:   ' //'
      , footer: '-->'
    }
  , slash: {
        header: '//'
      , body:   '//'
      , footer: '//'
    }
  , triplehash: {
        header: '###'
      , body:   ''
      , footer: '###'
    }
  , hash: {
        header: '#'
      , body:   '#'
      , footer: '#'
    }
};

/**
 * Export the list with valid comment styles for each file extension.
 *
 * @type {Object}
 * @api public
 */
exports.ext = {
    // regular files
    js:     exports.styles.star
  , css:    exports.styles.star
  , html:   exports.styles.arrow

    // pre-processor styles
  , jade:   exports.styles.slash
  , less:   exports.styles.star
  , sass:   exports.styles.star
  , styl:   exports.styles.star
  , coffee: exports.styles.triplehash
};
