var animations = require('animations');

var BaseExtension = {
  spinOver:  function(e){
    animations.arrowOver(e.currentTarget);
  },
  spinOff: function(e){
    animations.arrowOut(e.currentTarget);
  },
  completed: function(view){
    view.delegate('mouseenter', '.next-page', this.spinOver);
    view.delegate('mouseleave', '.next-page', this.spinOff);
    animations.arrowEnter($('.next-page'));
  }
};

module.exports = BaseExtension;
