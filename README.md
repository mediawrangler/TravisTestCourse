# EverFi SDK Skeleton

![bwc-logo](/readme_files/everfi-skeletor.jpg?raw=true)

This is HTML5 application, built with
[EverFi-SDK](http://everfi.com/sdk), 
[Gulp](http://gulpjs.com/) and [Chaplin](http://chaplinjs.org).

Commands for installing on Mac OSX
---
* install ruby
    * `brew install ruby`
* install compass
    * `sudo gem install compass`
* install node/npm - npm install
    * `brew install node`
* install global bower
    * `npm install -g bower`
* install gulp
    * `npm install -g gulp`

Commands for installing on Ubuntu
---
* install ruby
    * `sudo apt-get install ruby`
    * `sudo apt-get install ruby-dev` (if issues with building native extensions)
* install compass
    * `sudo gem install compass`
* install node/npm - npm install
    * `sudo apt-get install node npm`
* may need to deal with a pathing issue on linux:
    * `sudo ln -s /usr/bin/nodejs /usr/bin/node`
* install global bower
    * `sudo npm install -g bower`
* install gulp
    * `sudo npm install -g gulp`

Getting Dependencies:
---
 * `npm install` 
 * `bower install`
  

Getting Started
---
* Run `gulp` to start a server with a continuous build process
* Run `gulp build` to build the production assets and application to `public/`
* Run `gulp module` to scaffold a new module and begin

  
* More Information: [Here](http://everfi.github.io/ContentPartnerAPI/process/build-process.html)


