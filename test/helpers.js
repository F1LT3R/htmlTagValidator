var expect            = require('chai').expect,
    fs                = require('fs'),
    _                 = require('lodash'),
    htmlTagValidator  = require('../index'),
    prettyjson        = require('prettyjson'),
    format, broadcast, getTree, assertOkTree, assertErrorTree,
    isDefined = function (arg) { return arg != null; };

format = function (arg, ugly) {
  return ugly ? ( _.isString(arg) ? arg : JSON.stringify(arg) ) :
                ( prettyjson.render(arg, {}) );
};

broadcast = function (args) {
  // Only broadcast when DEBUG=true is set in the environment
  if (broadcast.canBroadcast) {
    _.forEach(args, function (arg) {
      if (isDefined(arg)) {
        console.log('\n\n', format(arg), '\n');
      }
    });
  }
};

broadcast.canBroadcast = (function (c, p) {
  return ( isDefined(console) && isDefined(process) ? _.has(process.env, 'DEBUG') : false );
})(console, process);

/**
Load the source file for the current test and then try and generate the AST from it.
@note Uses the name of the test to determine what test input to use such that `bees-test`
  looks for the file `beesTest.html` in the `./test/html/` directory.
@note Alternative arguments format to pass options object is: that, options, callback.
@param [Object] that
  The context of the running test
@param [Function] callback
  The function to call when htmlTagValidator has generated the AST or an error.
*/
getTreeAsync = function (that, options, callback) {
  var args = Array.prototype.slice.call(arguments, 1),
      fileTitle = _.camelCase(that.test.title.trim()),
      filePath = __dirname + '/html/' + fileTitle + '.html';
  fs.readFile(filePath, "utf8", function(err, data) {
    if (err) {
      callback(err);
    } else {
      args.unshift(data);
      htmlTagValidator.apply(that, args);
    };
  });
};

/**
 Load the source file for the current test and then try and generate the AST from it.
 @note Uses the name of the test to determine what test input to use such that `bees-test`
 looks for the file `beesTest.html` in the `./test/html/` directory.
 @note Alternative arguments format to pass options object is: that, options, callback.
 @param [Object] that
 The context of the running test
 @param [Function] callback
 The function to call when htmlTagValidator has generated the AST or an error.
 */
getTreeSync = function (that, options, callback) {
  var fileTitle = _.camelCase(that.test.title.trim()),
      filePath = __dirname + '/html/' + fileTitle + '.html',
      ast;
  fs.readFile(filePath, "utf8", function(err, data) {
    if (err) {
      callback(err);
    } else {
      try {
        ast = htmlTagValidator.apply(that, [data, options]);
        callback(null, ast);
      }
      catch(error) {
        callback(error, ast);
      }
    };
  });
};

getTree = getTreeAsync

/**
Assert that the current file returns an AST without errors.
@note Alternative arguments format to pass options object is: that, options, done.
@param [Object] that
  The context of the running test
@param [Function] done
  The function to call when the test is completed
*/
assertOkTree = function (that, done) {
  var options = {}, func = done;
  if (arguments.length > 2) {
    options = done;
    func = arguments[2];
  }
  getTree.apply(that, [that, options, function (err, ast) {
    if (isDefined(err)) { broadcast(arguments); }
    expect(err).to.not.be.ok;
    expect(ast).to.be.ok;
    func.call(that);
  }]);
};

/**
Assert that the current file returns an error containing the properties and values in the
given object.
@note Alternative arguments format to pass options object is: obj, that, options, done.
@param [Object|String] obj
  The properties and values to assert within the error generated for the running test. If
  a string is given, then it is asserted that the error message contains the text provided.
@param [Object] that
  The context of the running test
@param [Function] done
  The function to call when the test is completed
*/
assertErrorTree = function (obj, that, done) {
  var options = {}, func = done;
  if (arguments.length > 3) {
    options = done;
    func = arguments[3];
  }
  if (_.isUndefined(obj)) { obj = {}; }
  else if (_.isString(obj)) { obj = { 'message': obj }; }
  getTree.apply(that, [that, options, function (err, ast) {
    if (isDefined(ast)) { broadcast(arguments); }
    expect(ast).to.not.be.ok;
    if (obj == null) {
      expect(err).to.be.ok;
    } else {
      _.forEach(obj, function (v, k) {
        expect(err).to.include.keys(k);
        expect(err[k]).to.equal(v);
      });
    }
    func.call(that);
  }]);
};

/**
Assert that the current file returns an AST containing the properties and values in the
given object.
@note Alternative arguments format to pass options object is: obj, that, options, done.
@param [Object|String] obj
  The properties and values to assert within the AST generated for the running test.
@param [Object] that
  The context of the running test
@param [Function] done
  The function to call when the test is completed
*/
assertEqualsTree = function (obj, that, done) {
  var options = {}, func = done;
  if (arguments.length > 3) {
    options = done;
    func = arguments[3];
  }
  if (_.isUndefined(obj)) { obj = {}; }
  getTree.apply(that, [that, options, function (err, ast) {
    if (isDefined(err)) { broadcast(arguments); }
    expect(err).to.not.be.ok;
    if (_.isString(obj)) {
      obj = JSON.parse(obj);
    }
    expect(ast).to.deep.equal(obj);
    func.call(that);
  }]);
};

module.exports = {
  'get': getTree,
  'ok': assertOkTree,
  'error': assertErrorTree,
  'equals': assertEqualsTree,
  'broadcast': broadcast,
  'synchronous': function() {
    getTree = getTreeSync;
  },
  'asynchronous': function() {
    getTree = getTreeAsync;
  }
};
