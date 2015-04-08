var system = require('system');

var page = require('webpage').create();
page.open('__url__', function(status) {
  window.setTimeout(function () {
    console.log(page.content);
    phantom.exit();
  }, 200);
});
