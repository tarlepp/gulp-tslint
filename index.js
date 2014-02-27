/*jslint node:true */
/*jslint nomen: true */

// Requires
var path = require('path');
var TSLint = require('tslint');

// Gulp
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var map = require('map-stream');

// Load rc configs
var Rcloader = require('rcloader');

"use strict";

// Helper function
function isFunction(f) {
    return Object.prototype.toString.call(f) === '[object Function]';
}

/*
 * Main plugin function
 */
var tslintPlugin = function(pluginOptions) {
    var loader,
        tslint;

    // If user options are undefined, set an empty options object
    if (!pluginOptions) {
        pluginOptions = {};
    }

    // Create rcloader
    loader = new Rcloader('tslint.json', pluginOptions.configuration);

    return map(function(file, cb) {
        // Skip
        if (file.isNull()) {
            return cb(null, file);
        }

        // Stream is not supported
        if (file.isStream()) {
            return cb(new PluginError('gulp-tslint', 'Streaming not supported'));
        }

        // Finds the config file closest to the linted file
        loader.for(file.path, function(error, fileopts) {
            // TSLint default options
            var options = {
                formatter: 'json',
                configuration: fileopts,
                rulesDirectory: pluginOptions.formatter || null,
                formattersDirectory: pluginOptions.formatter || null
            };

            if (error) {
                return cb(error, undefined);
            }

            tslint = new TSLint(path.basename(file.path), file.contents.toString('utf8'), options);
            file.tslint = tslint.lint();

            // Pass file
            cb(null, file);
        });


    });
};

/*
 * Define default reporters
 */
var jsonReporter = function (failures) {
    console.log(JSON.stringify(failures));
};

var proseReporter = function (failures) {
    failures.forEach(function (failure) {
        console.log(failure.name + "["
            // +1 because TSLint's first line and character is 0
            + (failure.startPosition.line + 1) + ", "
            + (failure.startPosition.character + 1) +  "]: "
            + failure.failure);
    });
};

var verboseReporter = function (failures) {
    failures.forEach(function (failure) {
        console.log("(" + failure.ruleName + ") " + failure.name
            // +1 because TSLint's first line and character is 0
            + "[" + (failure.startPosition.line + 1) + ", "
            + (failure.startPosition.character + 1) +  "]: "
            + failure.failure);
    });
};

// Like verbose, but prints full path
var fullReporter = function (failures, file) {
    failures.forEach(function (failure) {
        console.log("(" + failure.ruleName + ") " + file.path
            // +1 because TSLint's first line and character is 0
            + "[" + (failure.startPosition.line + 1) + ", "
            + (failure.startPosition.character + 1) +  "]: "
            + failure.failure);
    });
};


/* Output is in the following form:
 * [{
 *   "name": "invalid.ts",
 *   "failure": "missing whitespace",
 *   // Lines and characters start from 0
 *   "startPosition": {"position": 8, "line": 0, "character": 8},
 *   "endPosition": {"position": 9, "line": 0, "character": 9},
 *   "ruleName": "one-line"
 * }]
 */
tslintPlugin.report = function (reporter) {
    return map(function(file, cb) {
        var failures = JSON.parse(file.tslint.output);
        if (failures.length > 0) {
            if (reporter === 'json') {
                jsonReporter(failures);
            } else if (reporter === 'prose') {
                proseReporter(failures);
            } else if (reporter === 'verbose') {
                verboseReporter(failures);
            } else if (reporter === 'full') {
                fullReporter(failures, file);    
            } else if (isFunction(reporter)) {
                reporter(failures, file);
            }
        }

        // Pass
        cb(null, file);
    });
};

module.exports = tslintPlugin;