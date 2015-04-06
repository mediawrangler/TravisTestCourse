var system = require('system');
var args = system.args;

var page = require('webpage').create();
page.open('__url__', function(status) {
  //working: runs google axs audit and outputs the results
  if (!page.injectJs('node_modules/accessibility-developer-tools/dist/js/axs_testing.js')){
    console.log('failed to inject axs_testing')
  } else {
    //console.log('*** Accessibility Report for: __url__ ***');
    var report = page.evaluate(function () {
      var configuration = new axs.AuditConfiguration();
      configuration.scope = document.querySelector('main');  // or however you wish to choose your scope element
      var results = axs.Audit.run(configuration);

      var failCount = 0;
      _(results).where({ result: 'FAIL' }).each(function(r) {
        failCount += r.elements.length;
      });
      var summary = {
        passCount: _(results).where({result: 'PASS'}).value().length,
        failCount: failCount
      };

      return JSON.stringify(summary);
    });
    console.log(report);
  }

  phantom.exit();
});