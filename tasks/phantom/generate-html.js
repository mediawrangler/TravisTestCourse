var system = require('system');
var args = system.args;

var page = require('webpage').create();
page.open('__url__', function(status) {
  var content = page.evaluate(function() {
    return document.documentElement.outerHTML;
  });
  console.log('<!DOCTYPE>');
  console.log(content);

  phantom.exit();
});
