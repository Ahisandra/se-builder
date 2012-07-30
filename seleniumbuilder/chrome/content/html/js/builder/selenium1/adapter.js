/**
 * Functions for interfacing with the code from Selenium IDE in the selenium-ide folder.
 */
builder.selenium1.adapter = {};

// Load in bits and pieces evidently required to get export to work. Taken from test-api-doc.js in
// Selenium IDE and modified mildly.
builder.selenium1.adapter.seleniumAPI = {};
var subScriptLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader);
subScriptLoader.loadSubScript('chrome://seleniumbuilder/content/html/js/selenium-ide/selenium/scripts/selenium-api.js', builder.selenium1.adapter.seleniumAPI);
var parser = new DOMParser();
var apidoc = parser.parseFromString(FileUtils.readURL("chrome://seleniumbuilder/content/html/js/selenium-ide/selenium/iedoc-core.xml"), "text/xml");
Command.apiDocuments = [apidoc];
Command.prototype.getAPI = function() {
  return builder.selenium1.adapter.seleniumAPI;
};

/**
 * @return Format objects that have a name property that can be displayed.
 */
builder.selenium1.adapter.availableFormats = function() {
  return builder.selenium1.adapter.formatCollection().presetFormats;
};

/**
 * Allows user to parse a suite.
 * @return A suiteInfo object, or null on failure.
 * SuiteInfo structure:
 * {
 *    suitePath: path to the suite file,
 *    scripts: list of script objects with path set
 * }
 */
builder.selenium1.adapter.parseSuite = function(file) {
  try {
    var format = builder.selenium1.adapter.formatCollection().findFormat('default');
    var ts = TestSuite.loadFile(file);
    var si = { scripts: [], path: ts.file.path };
    for (var i = 0; i < ts.tests.length; i++) {
      var script = builder.selenium1.adapter.convertTestCaseToScript(
        format.loadFile(ts.tests[i].getFile()),
        format);
      if (script === null) {
        alert("Could not open suite: Could not open script.");
        return null;
      }
      si.scripts.push(script);
    }
    return si;
  } catch (e) {
    return null;
  }
};

builder.selenium1.loadSuite = builder.selenium1.adapter.importSuite;

/**
 * Allows user to export a suite.
 * @return The path saved to, or null.
 */
builder.selenium1.adapter.exportSuite = function(scripts, path) {
  try {
    var ts = new TestSuite();
    for (var i = 0; i < scripts.length; i++) {
      var script = scripts[i];
      var tc = builder.selenium1.adapter.convertScriptToTestCase(script);
      ts.addTestCaseFromContent(tc);
    }
    if (path) {
      ts.file = FileUtils.getFile(path);
    }
    if (ts.save(false)) {
      return ts.file.path;
    } else {
      return null;
    }
  } catch (e) {
    alert("Could not save suite.");
    return null;
  }
};

/**
 * Allows user to parse a script in the default format.
 * @return A script, or null on failure.
 */
builder.selenium1.adapter.parseScript = function(file) {
  try {
    var format = builder.selenium1.adapter.formatCollection().findFormat('default');
    return builder.selenium1.adapter.convertTestCaseToScript(format.loadFile(file, false), format);
  } catch (e) {
    return null;
  }
};

builder.selenium1.io = {};
builder.selenium1.io.parseScript = builder.selenium1.adapter.parseScript;
builder.selenium1.io.parseSuite = builder.selenium1.adapter.parseSuite;
  
/**
 * Exports the given script using the default format.
 * @param script The script to export
 */
builder.selenium1.adapter.exportScript = function(script) {
  return builder.selenium1.adapter.exportScriptWithFormat(
    script,
    formatCollection().findFormat('default')
  );
};

/**
 * Exports the given script using the given format.
 * @param script The script to export
 * @param format The format to use, chosen from availableFormats
 * @return A nsiLocalFile on success, or false on failure
 */
builder.selenium1.adapter.exportScriptWithFormat = function(script, format, extraOptions) {
  var formatter = format.getFormatter();
  try {
    var testCase = builder.selenium1.adapter.convertScriptToTestCase(script);
    if (format.saveAs(testCase)) {
      return testCase.file;
    } else {
      return false;
    }
  } catch (e) {
    alert("Could not export script:\n" + e);
    return false;
  }
};

/**
 * Exports the given script using the given format to the given path.
 * @param script The script to export
 * @param format The format to use, chosen from availableFormats
 * @param path The path to export to
 * @return A nsiLocalFile on success, or false on failure
 */
builder.selenium1.adapter.exportScriptWithFormatToPath = function(script, format, path, extraOptions) {
  try {
    var testCase = builder.selenium1.adapter.convertScriptToTestCase(script);
    if (format.saveAs(testCase, path, false)) {
      return testCase.file;
    } else {
      return false;
    }
  } catch (e) {
    alert("Could not export script:\n" + e);
    return false;
  }
};

builder.selenium1.adapter.formatCollection = function() {
  return new FormatCollection(SeleniumIDE.Preferences.DEFAULT_OPTIONS);
};

builder.selenium1.adapter.findBaseUrl = function(script) {
  for (var i = 0; i < script.steps.length; i++) {
    if (script.steps[i].type === builder.selenium1.stepTypes.open) {
      return new builder.Url(script.steps[i].url).server();
    }
  }
  return "http://localhost"; // qqDPS A bit of a desparation move.
};

builder.selenium1.adapter.convertScriptToTestCase = function(script) {
  var testCase = new TestCase();
  testCase.setBaseURL(builder.selenium1.adapter.findBaseUrl(script));
  for (var i = 0; i < script.steps.length; i++) {
    var step = script.steps[i];
    var pNames = step.type.getParamNames();
    var params = [];
    for (var j = 0; j < 2; j++) {
      if (pNames.length > j) {
        if (step.type.getParamType(pNames[j]) === "locator") {
          params.push(step[pNames[j]].getName(builder.selenium1) + "=" + step[pNames[j]].getValue());
        } else {
          params.push(step[pNames[j]] + "");
        }
      } else {
        params.push("");
      }
    }
    var name = step.type.getName();
    if (step.type.getNegatable() && step.negated) {
      name = step.type.negator(name);
    }
    testCase.commands.push(new Command(name, params[0], params[1]));
  }
  if (script.path && script.path.where === "local") {
    testCase.file = FileUtils.getFile(script.path.path);
  }
  return testCase;
};

builder.selenium1.adapter.convertTestCaseToScript = function(testCase, originalFormat) {
  if (!testCase) { return null; }
  var script = new builder.Script(builder.selenium1);
  script.path = {
    where: "local",
    path: (testCase.file ? testCase.file.path : null),
    format: originalFormat
  };
  // qqDPS baseurl treatment?
  var baseURL = testCase.baseURL;
  for (var i = 0; i < testCase.commands.length; i++) {
    var negated = false;
    var stepType = builder.selenium1.stepTypes[testCase.commands[i].command];
    if (!stepType) {
      stepType = builder.selenium1.negatedStepTypes[testCase.commands[i].command];
      negated = true;
    }
    var params = [];
    var pNames = stepType.getParamNames();
    for (var j = 0; j < 2; j++) {
      if (j >= pNames.length) {
        params.push("");
      } else {
        var p = testCase.commands[i][["target", "value"][j]];
        if (stepType.getParamType(pNames[j]) === "locator") {
          var lType = p.substring(0, p.indexOf("="));
          var lValue = p.substring(p.indexOf("=") + 1);
          var locMethod = builder.locator.methodForName(builder.selenium1, lType);
          var locValues = {};
          locValues[locMethod] = [lValue];
          params.push(new builder.locator.Locator(locMethod, 0, locValues));
        } else {
          params.push(p);
        }
      }
    }
    // Internally we don't have base URLs, so we have to put them straight in here.
    if (stepType == builder.selenium1.stepTypes.open) {
      params[0] = baseURL + params[0];
    }
    var step = new builder.Step(
      stepType,
      params[0],
      params[1]
    );
    step.negated = negated;
    script.steps.push(step);
  }
  return script;
};