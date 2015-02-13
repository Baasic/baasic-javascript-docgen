'use strict';
var jsdox = require("jsdox-baasic"),
fileSystem = require('fs'),
nodePath = require('path'),
SIDEBAR_FILENAME = "_Sidebar",
index = 0,
convertedFiles = [],
inputFolder = "",
outputFolder = "",
sidebarTitle = "",
filePaths,
templateDir = "",
ignoreFiles;

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
  return filePath.substring(0, filePath.lastIndexOf("\\")).replace(inputFolder, outputFolder);
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

  var mdFile = filePath.replace(/.js/g, ".md");
  mdFile = mdFile.substring(mdFile.lastIndexOf("\\") + 1);
  convertedFiles.push(outputPath + "\\" + mdFile);
  jsdox.generateForDir(filePath, outputPath, templateDir, function () {
    index++;
    parseDox();
  });
}
function generateSidebar() {
  var outputPath = outputFolder;
  var paths = getFiles(outputPath).sort();
  var sidebar = "**" + sidebarTitle + "**\n\n";
  var sidebarPaths = getSidebarPaths(paths);

  for (var i in sidebarPaths) {
    var sidebarPath = sidebarPaths[i];
    var sidebarHeader = convertPathToUri(sidebarPath).replace(outputFolder, '');
    if (sidebarHeader) {
      sidebar += "* " + sidebarHeader + "\n\n";
    }

    for (var i in paths) {
      var filePath = getOutputPath(paths[i]);
      if (filePath == sidebarPath) {
        var fileName = nodePath.basename(paths[i], '.md');
        if (fileName == SIDEBAR_FILENAME || fileName == ".git")
          continue;

        var name = fileName;
        if (fileName.lastIndexOf("-") > -1) {
          name = fileName.substring(fileName.lastIndexOf("-") + 1);
        }

        if (filePath !== outputFolder && convertedFiles.indexOf(paths[i]) > -1) {
          var newFileName = filePath.replace(/\\/g, "-").replace(outputFolder + "-", "") + "-" + fileName;
          var path = filePath + "\\" + newFileName + ".md";
          if (fileSystem.existsSync(path)) {
            fileSystem.unlinkSync(path)
          }
          fileSystem.renameSync(paths[i], path);
          sidebar += " * [" + name + "](" + newFileName + ")\n";
        } else {
          sidebar += " * [" + name + "](" + fileName + ")\n";
        }
      }
    }

    sidebar += "\n";
  }

  saveSidebar(sidebar);
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
  var projPath = "\\";
  return path.replace(projPath, '').split('\\').join('/');
}

function saveSidebar(sidebar) {
  var sidebarPath = outputFolder + "\\" + SIDEBAR_FILENAME + ".md";
  fileSystem.writeFile(sidebarPath, sidebar, function (error) {});
}

module.exports.generateBaasicDocs = function (inputLocation, outputLocation, title, filesToIgnore) {
  inputFolder = inputLocation;
  outputFolder = outputLocation;
  sidebarTitle = title;
  filePaths = getFiles(inputFolder);
  templateDir = nodePath.resolve(__dirname, 'templates');
  if (filesToIgnore && filesToIgnore.length > 0) {
    var files = [];
    for (var i = 0; i < filesToIgnore.length; i++) {
      files.push(inputLocation + "\\" + filesToIgnore[i]);
    };
    ignoreFiles = files;
  }
  parseDox();
};
