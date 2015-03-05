var BaseExtension = require('javascripts/base-extension');
var animations = require('animations');

var page3 = _.defaults({
  initialize: function(view) {

  },
  loaded: function(view) {

  },
  playing: function(view) {

  },
  paused: function(view) {

  },
  stopped: function(view) {

  },
  completed: function(view) {

  },
  unloading: function(view, onComplete) {

    onComplete();
  }
}, BaseExtension);

module.exports = page3;