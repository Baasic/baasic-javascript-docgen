# baasic-javascript-docgen
Baasic Javascript Document Generator

## Overview
Baasic javascript document generator. Relies on gulp and jsdox to generate documents.

## Install
```
npm install mzilic/baasic-javascript-docgen --save-dev
```
## Usage
```
var docgen = require('baasic-javascript-docgen');

gulp.task('docs', function() {
  docgen.generateBaasicDocs("src files", "wiki files", "Sidebar title", ["exclude files.js"]);
});
```
