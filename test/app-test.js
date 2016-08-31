// A few high level tests as a sanity check to make sure the build
// will load

var utils = require('lib/utils');

var Application = require('ef_sdk');

var initializer = require('initialize');

describe("Transit", function(){
  var app;

  before(function(){
    console.log("BEFORE")
    utils.initialize({
      courseUrl: "/course/"
    })
  })

  it("should not throw an error when initializing", function(){
    expect(initializer.configure).to.not.throw(Error);
  })

  describe("the application", function(){

    before(function(){
      app = initializer.configure({
        config: {
          settings: {
            courseUrl: "/course/"
          }
        }
      });
    });

    it("Should have a title", function(){
      expect(app).to.have.property('title').and.to.equal('EverFi SDK');
    });

    it("should be an instance of the application", function(){
      app.should.be.instanceOf(Chaplin.Application);
    });

    it("should respond to start", function(){
      expect(app).to.respondTo('start');
    });
  })

});
