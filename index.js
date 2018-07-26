var loaderUtils = require("loader-utils");
var validateOptions = require("schema-utils");
var mime = require("mime");

function removeExport(string) {
  return string.replace(/^module\.exports\s?=\s?/i, "").replace(/;$/, "");
}

module.exports = function(content) {
  this.cacheable && this.cacheable();

  var options = loaderUtils.getOptions(this) || {};
  validateOptions(require("./options"), options, "URL Loader");

  var mimetype = mime.lookup(this.resourcePath);
  var limit = options.limit || (this.options && this.options.url && this.options.url.dataUrlLimit);
  var isJSON = mimetype === "application/json";
  var isSVG = mimetype === "image/svg+xml";

  if (limit) limit = parseInt(limit, 10);

  if (!limit || content.length < limit) {
    if (isJSON) {
      if (content instanceof Buffer || typeof content === "string") {
        content = JSON.parse(content.toString());
      }

      content = JSON.stringify(content)
        .replace(/\u2028/g, "\\u2028")
        .replace(/\u2029/g, "\\u2029");
    } else {
      var loader = isSVG ? require("svg-inline-loader") : require("url-loader");
      content = removeExport(loader.call(this, content));
    }

    return "module.exports = Promise.resolve(" + content + ")";
  }

  var fileLoader = require("file-loader");
  var fetch = "fetch(" + removeExport(fileLoader.call(this, content)) + ")";
  switch (true) {
    case isJSON:
      fetch += ".then(function(res) { return res.json(); })";
      break;
    case isSVG:
      fetch += ".then(function(res) { return res.text(); })";
      break;
  }

  return "module.exports = " + fetch;
};

module.exports.raw = true;
