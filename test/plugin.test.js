/*global expect, Square */
describe('[square] plugin API', function () {
  'use strict';

  var Plugin = Square.Plugin;

  it('is exported as function constructor', function () {
    expect(Plugin).to.be.a('function');
  });

  it('exposes the plugin types', function () {
    expect(Plugin.modifier).to.equal('plugin::modifier');
    expect(Plugin.after).to.equal('plugin::after');
    expect(Plugin.once).to.equal('plugin::once');
  });

  it('exposes a extend method to create custom plugins', function () {
    expect(Plugin.extend).to.be.a('function');
  });

  it('should override prototypes when use the extend method', function () {
    var Custom = Plugin.extend({
        name: 'custom'
      , description: 'foo'
      , initialize: function initialize() {
          this.emit('data', 'bar');
        }
    });

    expect(Custom).to.be.a('function');
    expect(Custom.prototype.name).to.equal('custom');
    expect(Custom.prototype.description).to.equal('foo');
    expect(Custom.prototype.initialize).to.be.a('function');
    expect(Custom.prototype.initialize.toString()).to.contain('bar');
  });
});
