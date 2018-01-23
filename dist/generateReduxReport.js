'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _deepObjectDiff = require('deep-object-diff');

var _utility = require('./utility');

var _trackObjectUse = require('./trackObjectUse');

var localStorageKey = 'reduxUsageReportBreakpoints';

// so that JSON.stringify doesn't remove all undefined fields
function replaceUndefinedWithNull(obj) {
  Object.keys(obj).forEach(function (k) {
    var val = obj[k];
    if (val === undefined) {
      obj[k] = null;
    }
    if ((0, _utility.isObjectOrArray)(val)) {
      replaceUndefinedWithNull(val);
    }
  });
}

var globalObjectCache = void 0;

var shouldSkipProxy = function shouldSkipProxy(target, propKey) {
  if (!target.hasOwnProperty(propKey) || global.reduxReport.__inProgress || global.reduxReport.__reducerInProgress) {
    return true;
  }
  return false;
};

function generateReduxReport(global, rootReducer) {
  var debuggerPoints = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];

  globalObjectCache = globalObjectCache || global;
  global.reduxReport = global.reduxReport || {
    accessedState: {},
    state: {},
    setBreakpoint: function setBreakpoint(breakpoint) {
      if (!global.localStorage) return;
      global.localStorage.setItem(localStorageKey, breakpoint);
    },
    clearBreakpoint: function clearBreakpoint() {
      if (!global.localStorage) return;
      global.localStorage.setItem(localStorageKey, null);
    },
    generate: function generate() {
      global.reduxReport.__inProgress = true;
      var used = JSON.parse(JSON.stringify(this.accessedState));
      var stateCopy = JSON.parse(JSON.stringify(this.state));
      var unused = (0, _deepObjectDiff.diff)(stateCopy, used);
      replaceUndefinedWithNull(unused);
      var report = {
        used: used,
        unused: unused
      };
      global.reduxReport.__inProgress = false;
      return report;
    }
  };

  var makeProxy = (0, _trackObjectUse.createMakeProxyFunction)({
    shouldSkipProxy: shouldSkipProxy,
    accessedProperties: global.reduxReport.accessedState,
    breakpoint: global.localStorage && global.localStorage.getItem(localStorageKey) || []
  });

  return function (prevState, action) {
    global.reduxReport.__reducerInProgress = true;
    var state = rootReducer(prevState, action);
    global.reduxReport.__reducerInProgress = false;
    var proxiedState = makeProxy(state);
    global.reduxReport.state = proxiedState;
    return proxiedState;
  };
}

exports.default = generateReduxReport;