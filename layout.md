# Application structure for course development

app/config.json # Course Configuration Options

app/modules/modules.json
app/modules/module-1/module.json # Module configuration
app/modules/module-1/activity-1/activity.json # Activity Level configuration (needed?)
app/modules/module-1/activity-1/page-1/page.json # Page configuration
app/modules/module-1/activity-1/page-1/page-content.json # Page content
app/modules/module-1/activity-1/page-1/styles/page-1.css
app/modules/module-1/activity-1/page-1/assets/images/page-1.png # Assets get copied wholesale
app/modules/module-1/activity-1/page-1/js/page_1.png # animation JS

app/menu/config # needed?
app/menu/stylesheets/menu.css
app/menu/images/menu.png

app/assets/javascripts/ # base js and libs
app/assets/stylesheets/ # base styles


# We provide the following, which should not be touched.
app/assets/index.html
app/assets/javascripts/ef.js
app/assets/javascripts/ef-app.js
app/assets/javascripts/ef-vendor.js
app/assets/stylsheets/ef-app.css
app/assets/* any other assets we need to provide


# Compiles into the following:

## Course Content
public/content/modules.json
public/content/modules/module-1/module-1.js
public/content/modules/module-1/module-1.css
public/content/modules/module-1/images/*
public/content/modules/module-1/audio/*

public/content/images/*
public/content/stylesheets/* # Module styles compile into here
public/content/javaascripts/* # Module JS compile into here

## Course Package
public/index.html # Only used for local development
public/package/js/app.js
public/package/js/vendor.js
public/package/css/app.css
public/package/config.json


# What is in the config.json?
Course Package Name (NHL)
Version
Enabled options
  forced order
  resources?
  Notebook?

# What is not in the config.json?
Location of the assets. This should be injected into the app.

# Course Deployment & Init
Course containts a bower.json file with a main property
Homeroom consumes the bower.json to know which files to include on the page
when rendering the course.  bower config will have a property for where the
course content and packages are deployed to.
Page calls require('initialize') and gets everything poppin'


