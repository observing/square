'use strict';

/**!
 * [square]
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.it>
 * MIT Licensed
 */
var Plugin = require('../plugin');

/**
 * Can wrap you compiled code and plurge the leaked globals.
 *
 * Options:
 * - `timeout` time to wait for the script to be initialized, number in ms.
 * - `header` first section of the leak prevention, string.
 * - `body` content for the leak prevention function body, array.
 * - `footer` closing section of th leak prevention, string.
 * - `leaks` should we detect globals and patch it, boolean
 */
module.exports = Plugin.extend({
    /**
     * Name of the module.
     *
     * @type {String}
     */
    id: 'wrap'

    /**
     * Small description about the module.
     *
     * @type {String}
     */
  , description: 'Can wrap you compiled code and plurge the leaked globals.'

    /**
     * For which distributions should this run.
     *
     * @type {Array}
     */
  , distributions: ['min', 'dev']

    /**
     * Depends on this module to be lazy loaded in advance.
     *
     * @type {String}
     */
  , requires: 'lexical-scope'

    /**
     * Which file extension are accepted.
     *
     * @type {String}
     */
  , accepts: 'js'

    /**
     * The time in miliseconds to wait before the script needs to be initialized.
     *
     * @type {Number}
     */
  , timeout: 1000

    /**
     * The header that is used to wrap the code.
     *
     * @type {String}
     */
  , header: '(function (expose) {'

    /**
     * Should we attempt to detect leaked globals and patch them.
     *
     * @type {Boolean}
     */
  , leaks: true

    /**
     * Small initial body that is used for leak protection.
     *
     * @type {Array}
     */
  , body: [
        'this.contentWindow = this.self = this.window = this;'
      , 'var window = this'
      ,   ', document = expose.document'
      ,   ', self = this'
      ,   ', top = this'
      ,   ', location = expose.location'

      // Note we shouldn't close the var statement with a ; because this is
      // done in the wrapping function.
    ]

    /**
     * The footer that is used to end the wraping.
     *
     * @type {String}
     */
  , footer: '}).call({}, this);'

    /**
     * The module is initialized
     */
  , initialize: function initialize() {
      var self = this;

      if (!this.leaks) {
        return this.emit('data', this.header + this.content + this.footer);
      }

      this.sandboxleak(this.content, this.timeout, function found(err, leaks) {
        if (err) {
          self.logger.error('Sandboxing produced an error, canceling operation', err);
          self.logger.warning('The supplied code might leak globals');

          return self.emit('data', self.content);
        }

        // No leaks where found, we are all good to go
        if (!leaks) return self.emit(self.content);

        self.logger.debug('Global leaks detected:', leaks, 'patching the hole');

        var body = JSON.parse(JSON.stringify(self.body))
          , content;

        // Add more potential leaked variables
        self._.each(leaks, function (global) {
          body.push(', ' + global + ' = this');
        });

        // Close it, as our body array didn't have a closing semicolon
        body.push(';');

        self._.each(leaks, function leaking(global) {
          body.push('this.' + global + ' = this;');
        });

        body.push(self.content);

        // Silly variable upgrading
        self._.each(leaks, function leaking(global) {
          body.push(global + ' = ' + global + ' || this.' + global + ';');
        });

        // compile the new content
        content = self.header + body.join('\n') + self.footer;

        // try if we fixed all leaks
        self.sandboxleak(content, self.timeout, function final(err, newleaks) {
          if (err) {
            self.logger.error('Failed to compile the sandboxed script', err);
            self.logger.warn('The supplied code might leak globals');

            return self.emit('data', self.content);
          }

          // Output some compile information
          if (!newleaks.length) {
            self.logger.info('Successfully patched all leaks');
          } else if (newleaks.length < leaks.length) {
            self.logger.info('Patched some leaks, but not all', newleaks);
          } else {
            self.logger.info('Patching the code did not help, it avoided the sandbox');
          }

          self.emit('data', content);
        });
      });
    }

    /**
     * Detect leaking code.
     *
     * @param {String} content
     * @param {Number} timeout
     * @param {Function} fn
     * @api private
     */
  , sandboxleak: function sandboxleak(content, timeout, fn) {
      var scope;

      try { scope = this['lexical-scope'](content); }
      catch (e) { return fn(e); }

      if (!scope || !('globals' in scope)) return fn();
      fn(null, scope.globals.exported);
    }
});
