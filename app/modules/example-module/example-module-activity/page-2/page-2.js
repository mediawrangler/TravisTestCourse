var BaseExtension = require('base-extension');

var page2 = _.defaults({
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

module.exports = page2;