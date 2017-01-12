'use strict';
var jsdox = require('jsdox-baasic'),
fileSystem = require('fs'),
nodePath = require('path'),
SIDEBAR_FILENAME = '_Sidebar',
FOOTER_FILENAME = '_Footer',
EXCLUDE_FILENAMES = [SIDEBAR_FILENAME, FOOTER_FILENAME],
index = 0,
convertedFiles = [],
addedFiles = [],
inputFolder = '',
outputFolder = '',
sidebarTitle = '',
filePaths,
templateDir = '',
ignoreFiles,
topNavItems = [],
footerData = '';

function getFiles(dir, files_) {
  files_ = files_ || [];

  if (typeof files_ === 'undefined')
    files_ = [];

  var files = fileSystem.readdirSync(dir);

  for (var i in files) {
    if (!files.hasOwnProperty(i))
      continue;

    var name = dir + '\\' + files[i];
    if (fileSystem.statSync(name).isDirectory()) {
      getFiles(name, files_);
    } else {
      files_.push(name);
    }
  }

  return files_;
}

function getOutputPath(filePath) {
  return filePath.substring(0, filePath.lastIndexOf('\\')).replace(inputFolder, outputFolder);
}

function ensureFolderExists(path) {
  if (!fileSystem.existsSync(path))
    mkdirParent(path);
}

function mkdirParent(dirPath, mode, callback) {
  fileSystem.mkdir(dirPath, mode, function (error) {
    if (error && error.errno === 34) {
      mkdirParent(nodePath.dirname(dirPath), mode, callback);
      mkdirParent(dirPath, mode, callback);
    }

    callback && callback(error);
  });
}

function parseDox() {
  if (index == filePaths.length) {
    generateSidebar();
    return;
  }

  var filePath = filePaths[index];
  if (ignoreFiles && ignoreFiles.indexOf(filePath) > -1) {
    index++;
    parseDox();
    return;
  }
  var outputPath = getOutputPath(filePath);
  ensureFolderExists(outputPath);

  var mdFile = filePath.replace(/.js/g, '.md');
  mdFile = mdFile.substring(mdFile.lastIndexOf('\\') + 1);
  convertedFiles.push(outputPath + '\\' + mdFile);
  jsdox.generateForDir(filePath, outputPath, templateDir, function () {
    index++;
    setTimeout(function () {
      parseDox();
    }, 250);
  });
}
function generateSidebar() {
  var outputPath = outputFolder;
  var paths = getFiles(outputPath).sort();
  var sidebar = '**' + sidebarTitle + '**\n\n';
  var sidebarPaths = getSidebarPaths(paths);

  var sidebarLines = [];
  var insertIndex = 0;

  for (var i in sidebarPaths) {
    var sidebarPath = sidebarPaths[i];
    var sidebarHeader = convertPathToUri(sidebarPath).replace(outputFolder, '');
    if (sidebarHeader) {
      sidebarLines.push('* ' + sidebarHeader + '\n\n');
    }

    for (var i in paths) {
      var filePath = getOutputPath(paths[i]);
      if (filePath == sidebarPath) {
        var fileName = nodePath.basename(paths[i], '.md');
        if (paths[i].indexOf('.markdown') >  - 1) {
          fileName = nodePath.basename(paths[i], '.markdown');
        }
        if (EXCLUDE_FILENAMES.indexOf(fileName) > -1 || fileName == '.git')
          continue;

        var name = fileName;
        if (fileName.lastIndexOf('-') > -1) {
          name = fileName.substring(fileName.lastIndexOf('-') + 1);
        }

        if (filePath !== outputFolder && convertedFiles.indexOf(paths[i]) > -1) {
          var newFileName = filePath.replace(/\\/g, '-').replace(outputFolder + '-', '') + '-' + fileName;
          var path = filePath + '\\' + newFileName + '.md';
          if (fileSystem.existsSync(path)) {
            fileSystem.unlinkSync(path)
          }
          fileSystem.renameSync(paths[i], path);
          if (topNavItems.indexOf(paths[i]) >  - 1) {
            sidebarLines.splice(insertIndex, 0, ' * [' + capitalizeFirstLetter(name) + '](' + newFileName + ')\n');
            addedFiles.push(newFileName);
            insertIndex++;
          } else if (addedFiles.indexOf(newFileName) === -1) {
            sidebarLines.push(' * [' + name + '](' + newFileName + ')\n');
            addedFiles.push(newFileName);
          }
        } else {
          if (topNavItems.indexOf(paths[i]) >  - 1) {
            sidebarLines.splice(insertIndex, 0, ' * [' + capitalizeFirstLetter(name) + '](' + fileName + ')\n');
            addedFiles.push(newFileName);
            insertIndex++;
          } else if (addedFiles.indexOf(fileName) === -1) {
            sidebarLines.push(' * [' + name + '](' + fileName + ')\n');
            addedFiles.push(fileName);
          }
        }
      }
    }

    sidebarLines.push('\n');
  }

  for (var i in sidebarLines) {
    sidebar += sidebarLines[i];
  }

  saveSidebar(sidebar);
  saveFooter();
}

function capitalizeFirstLetter(input) {
  return input.charAt(0).toUpperCase() + input.slice(1);
}

function getSidebarPaths(paths) {
  function getUnique(value, index, self) {
    return self.indexOf(value) === index;
  }

  var subPaths = [];

  for (var i in paths) {
    subPaths.push(getOutputPath(paths[i]));
  }

  return subPaths.filter(getUnique).sort();
}

function convertPathToUri(path) {
  var projPath = '\\';
  return path.replace(projPath, '').split('\\').join('/');
}

function saveSidebar(sidebar) {
  var sidebarPath = outputFolder + '\\' + SIDEBAR_FILENAME + '.md';
  fileSystem.writeFile(sidebarPath, sidebar, function (error) {});
}

function saveFooter() {
  var path = outputFolder + '\\' + FOOTER_FILENAME + '.md';
  fileSystem.writeFile(path, footerData, function (error) {});
}

function setupFooter() {
  var footerPath = nodePath.resolve(__dirname, 'template-footer') + '/_Footer.md';
  footerData = fileSystem.readFileSync(footerPath, {
      encoding : 'utf8'
    });
  var bowerData = fileSystem.readFileSync('bower.json', {
      encoding : 'utf8'
    });
  var bowserJson = JSON.parse(bowerData);
  footerData = footerData.replace('<version>', bowserJson.version);
  footerData = footerData.replace('<year>', new Date().getFullYear());
}

module.exports.generateBaasicDocs = function (inputLocation, outputLocation, title, filesToIgnore, navItems) {
  inputFolder = inputLocation;
  outputFolder = outputLocation;
  sidebarTitle = title;
  filePaths = getFiles(inputFolder);
  if (navItems && navItems.length > 0) {
    var files = [];
    for (var i = 0; i < navItems.length; i++) {
      files.push(outputLocation + '\\' + navItems[i]);
    };
    topNavItems = files;
  }
  templateDir = nodePath.resolve(__dirname, 'templates');
  if (filesToIgnore && filesToIgnore.length > 0) {
    var files = [];
    for (var i = 0; i < filesToIgnore.length; i++) {
      files.push(inputLocation + '\\' + filesToIgnore[i]);
    };
    ignoreFiles = files;
  }
  setupFooter();
  parseDox();
};
