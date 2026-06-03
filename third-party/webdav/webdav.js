(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["WebDAV"] = factory();
	else
		root["WebDAV"] = factory();
})(self, () => {
return /******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 5056:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = __webpack_require__(203);

/***/ }),

/***/ 3198:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var utils = __webpack_require__(3401);

var settle = __webpack_require__(5888);

var cookies = __webpack_require__(4963);

var buildURL = __webpack_require__(8826);

var buildFullPath = __webpack_require__(4466);

var parseHeaders = __webpack_require__(8418);

var isURLSameOrigin = __webpack_require__(6130);

var transitionalDefaults = __webpack_require__(8760);

var AxiosError = __webpack_require__(4200);

var CanceledError = __webpack_require__(2800);

var parseProtocol = __webpack_require__(4830);

module.exports = function xhrAdapter(config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    var requestData = config.data;
    var requestHeaders = config.headers;
    var responseType = config.responseType;
    var onCanceled;

    function done() {
      if (config.cancelToken) {
        config.cancelToken.unsubscribe(onCanceled);
      }

      if (config.signal) {
        config.signal.removeEventListener('abort', onCanceled);
      }
    }

    if (utils.isFormData(requestData) && utils.isStandardBrowserEnv()) {
      delete requestHeaders['Content-Type']; // Let the browser set it
    }

    var request = new XMLHttpRequest(); // HTTP basic authentication

    if (config.auth) {
      var username = config.auth.username || '';
      var password = config.auth.password ? unescape(encodeURIComponent(config.auth.password)) : '';
      requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
    }

    var fullPath = buildFullPath(config.baseURL, config.url);
    request.open(config.method.toUpperCase(), buildURL(fullPath, config.params, config.paramsSerializer), true); // Set the request timeout in MS

    request.timeout = config.timeout;

    function onloadend() {
      if (!request) {
        return;
      } // Prepare the response


      var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
      var responseData = !responseType || responseType === 'text' || responseType === 'json' ? request.responseText : request.response;
      var response = {
        data: responseData,
        status: request.status,
        statusText: request.statusText,
        headers: responseHeaders,
        config: config,
        request: request
      };
      settle(function _resolve(value) {
        resolve(value);
        done();
      }, function _reject(err) {
        reject(err);
        done();
      }, response); // Clean up request

      request = null;
    }

    if ('onloadend' in request) {
      // Use onloadend if available
      request.onloadend = onloadend;
    } else {
      // Listen for ready state to emulate onloadend
      request.onreadystatechange = function handleLoad() {
        if (!request || request.readyState !== 4) {
          return;
        } // The request errored out and we didn't get a response, this will be
        // handled by onerror instead
        // With one exception: request that using file: protocol, most browsers
        // will return status as 0 even though it's a successful request


        if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
          return;
        } // readystate handler is calling before onerror or ontimeout handlers,
        // so we should call onloadend on the next 'tick'


        setTimeout(onloadend);
      };
    } // Handle browser request cancellation (as opposed to a manual cancellation)


    request.onabort = function handleAbort() {
      if (!request) {
        return;
      }

      reject(new AxiosError('Request aborted', AxiosError.ECONNABORTED, config, request)); // Clean up request

      request = null;
    }; // Handle low level network errors


    request.onerror = function handleError() {
      // Real errors are hidden from us by the browser
      // onerror should only fire if it's a network error
      reject(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config, request, request)); // Clean up request

      request = null;
    }; // Handle timeout


    request.ontimeout = function handleTimeout() {
      var timeoutErrorMessage = config.timeout ? 'timeout of ' + config.timeout + 'ms exceeded' : 'timeout exceeded';
      var transitional = config.transitional || transitionalDefaults;

      if (config.timeoutErrorMessage) {
        timeoutErrorMessage = config.timeoutErrorMessage;
      }

      reject(new AxiosError(timeoutErrorMessage, transitional.clarifyTimeoutError ? AxiosError.ETIMEDOUT : AxiosError.ECONNABORTED, config, request)); // Clean up request

      request = null;
    }; // Add xsrf header
    // This is only done if running in a standard browser environment.
    // Specifically not if we're in a web worker, or react-native.


    if (utils.isStandardBrowserEnv()) {
      // Add xsrf header
      var xsrfValue = (config.withCredentials || isURLSameOrigin(fullPath)) && config.xsrfCookieName ? cookies.read(config.xsrfCookieName) : undefined;

      if (xsrfValue) {
        requestHeaders[config.xsrfHeaderName] = xsrfValue;
      }
    } // Add headers to the request


    if ('setRequestHeader' in request) {
      utils.forEach(requestHeaders, function setRequestHeader(val, key) {
        if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
          // Remove Content-Type if data is undefined
          delete requestHeaders[key];
        } else {
          // Otherwise add header to the request
          request.setRequestHeader(key, val);
        }
      });
    } // Add withCredentials to request if needed


    if (!utils.isUndefined(config.withCredentials)) {
      request.withCredentials = !!config.withCredentials;
    } // Add responseType to request if needed


    if (responseType && responseType !== 'json') {
      request.responseType = config.responseType;
    } // Handle progress if needed


    if (typeof config.onDownloadProgress === 'function') {
      request.addEventListener('progress', config.onDownloadProgress);
    } // Not all browsers support upload events


    if (typeof config.onUploadProgress === 'function' && request.upload) {
      request.upload.addEventListener('progress', config.onUploadProgress);
    }

    if (config.cancelToken || config.signal) {
      // Handle cancellation
      // eslint-disable-next-line func-names
      onCanceled = function onCanceled(cancel) {
        if (!request) {
          return;
        }

        reject(!cancel || cancel && cancel.type ? new CanceledError() : cancel);
        request.abort();
        request = null;
      };

      config.cancelToken && config.cancelToken.subscribe(onCanceled);

      if (config.signal) {
        config.signal.aborted ? onCanceled() : config.signal.addEventListener('abort', onCanceled);
      }
    }

    if (!requestData) {
      requestData = null;
    }

    var protocol = parseProtocol(fullPath);

    if (protocol && ['http', 'https', 'file'].indexOf(protocol) === -1) {
      reject(new AxiosError('Unsupported protocol ' + protocol + ':', AxiosError.ERR_BAD_REQUEST, config));
      return;
    } // Send the request


    request.send(requestData);
  });
};

/***/ }),

/***/ 203:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var utils = __webpack_require__(3401);

var bind = __webpack_require__(9366);

var Axios = __webpack_require__(1112);

var mergeConfig = __webpack_require__(3674);

var defaults = __webpack_require__(9050);
/**
 * Create an instance of Axios
 *
 * @param {Object} defaultConfig The default config for the instance
 * @return {Axios} A new instance of Axios
 */


function createInstance(defaultConfig) {
  var context = new Axios(defaultConfig);
  var instance = bind(Axios.prototype.request, context); // Copy axios.prototype to instance

  utils.extend(instance, Axios.prototype, context); // Copy context to instance

  utils.extend(instance, context); // Factory for creating new instances

  instance.create = function create(instanceConfig) {
    return createInstance(mergeConfig(defaultConfig, instanceConfig));
  };

  return instance;
} // Create the default instance to be exported


var axios = createInstance(defaults); // Expose Axios class to allow class inheritance

axios.Axios = Axios; // Expose Cancel & CancelToken

axios.CanceledError = __webpack_require__(2800);
axios.CancelToken = __webpack_require__(4078);
axios.isCancel = __webpack_require__(1907);
axios.VERSION = (__webpack_require__(8963).version);
axios.toFormData = __webpack_require__(7427); // Expose AxiosError class

axios.AxiosError = __webpack_require__(4200); // alias for CanceledError for backward compatibility

axios.Cancel = axios.CanceledError; // Expose all/spread

axios.all = function all(promises) {
  return Promise.all(promises);
};

axios.spread = __webpack_require__(7998); // Expose isAxiosError

axios.isAxiosError = __webpack_require__(1720);
module.exports = axios; // Allow use of default import syntax in TypeScript

module.exports["default"] = axios;

/***/ }),

/***/ 4078:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var CanceledError = __webpack_require__(2800);
/**
 * A `CancelToken` is an object that can be used to request cancellation of an operation.
 *
 * @class
 * @param {Function} executor The executor function.
 */


function CancelToken(executor) {
  if (typeof executor !== 'function') {
    throw new TypeError('executor must be a function.');
  }

  var resolvePromise;
  this.promise = new Promise(function promiseExecutor(resolve) {
    resolvePromise = resolve;
  });
  var token = this; // eslint-disable-next-line func-names

  this.promise.then(function (cancel) {
    if (!token._listeners) return;
    var i;
    var l = token._listeners.length;

    for (i = 0; i < l; i++) {
      token._listeners[i](cancel);
    }

    token._listeners = null;
  }); // eslint-disable-next-line func-names

  this.promise.then = function (onfulfilled) {
    var _resolve; // eslint-disable-next-line func-names


    var promise = new Promise(function (resolve) {
      token.subscribe(resolve);
      _resolve = resolve;
    }).then(onfulfilled);

    promise.cancel = function reject() {
      token.unsubscribe(_resolve);
    };

    return promise;
  };

  executor(function cancel(message) {
    if (token.reason) {
      // Cancellation has already been requested
      return;
    }

    token.reason = new CanceledError(message);
    resolvePromise(token.reason);
  });
}
/**
 * Throws a `CanceledError` if cancellation has been requested.
 */


CancelToken.prototype.throwIfRequested = function throwIfRequested() {
  if (this.reason) {
    throw this.reason;
  }
};
/**
 * Subscribe to the cancel signal
 */


CancelToken.prototype.subscribe = function subscribe(listener) {
  if (this.reason) {
    listener(this.reason);
    return;
  }

  if (this._listeners) {
    this._listeners.push(listener);
  } else {
    this._listeners = [listener];
  }
};
/**
 * Unsubscribe from the cancel signal
 */


CancelToken.prototype.unsubscribe = function unsubscribe(listener) {
  if (!this._listeners) {
    return;
  }

  var index = this._listeners.indexOf(listener);

  if (index !== -1) {
    this._listeners.splice(index, 1);
  }
};
/**
 * Returns an object that contains a new `CancelToken` and a function that, when called,
 * cancels the `CancelToken`.
 */


CancelToken.source = function source() {
  var cancel;
  var token = new CancelToken(function executor(c) {
    cancel = c;
  });
  return {
    token: token,
    cancel: cancel
  };
};

module.exports = CancelToken;

/***/ }),

/***/ 2800:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var AxiosError = __webpack_require__(4200);

var utils = __webpack_require__(3401);
/**
 * A `CanceledError` is an object that is thrown when an operation is canceled.
 *
 * @class
 * @param {string=} message The message.
 */


function CanceledError(message) {
  // eslint-disable-next-line no-eq-null,eqeqeq
  AxiosError.call(this, message == null ? 'canceled' : message, AxiosError.ERR_CANCELED);
  this.name = 'CanceledError';
}

utils.inherits(CanceledError, AxiosError, {
  __CANCEL__: true
});
module.exports = CanceledError;

/***/ }),

/***/ 1907:
/***/ ((module) => {

"use strict";


module.exports = function isCancel(value) {
  return !!(value && value.__CANCEL__);
};

/***/ }),

/***/ 1112:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var utils = __webpack_require__(3401);

var buildURL = __webpack_require__(8826);

var InterceptorManager = __webpack_require__(9655);

var dispatchRequest = __webpack_require__(4412);

var mergeConfig = __webpack_require__(3674);

var buildFullPath = __webpack_require__(4466);

var validator = __webpack_require__(3465);

var validators = validator.validators;
/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 */

function Axios(instanceConfig) {
  this.defaults = instanceConfig;
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };
}
/**
 * Dispatch a request
 *
 * @param {Object} config The config specific for this request (merged with this.defaults)
 */


Axios.prototype.request = function request(configOrUrl, config) {
  /*eslint no-param-reassign:0*/
  // Allow for axios('example/url'[, config]) a la fetch API
  if (typeof configOrUrl === 'string') {
    config = config || {};
    config.url = configOrUrl;
  } else {
    config = configOrUrl || {};
  }

  config = mergeConfig(this.defaults, config); // Set config.method

  if (config.method) {
    config.method = config.method.toLowerCase();
  } else if (this.defaults.method) {
    config.method = this.defaults.method.toLowerCase();
  } else {
    config.method = 'get';
  }

  var transitional = config.transitional;

  if (transitional !== undefined) {
    validator.assertOptions(transitional, {
      silentJSONParsing: validators.transitional(validators.boolean),
      forcedJSONParsing: validators.transitional(validators.boolean),
      clarifyTimeoutError: validators.transitional(validators.boolean)
    }, false);
  } // filter out skipped interceptors


  var requestInterceptorChain = [];
  var synchronousRequestInterceptors = true;
  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
      return;
    }

    synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;
    requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
  });
  var responseInterceptorChain = [];
  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
  });
  var promise;

  if (!synchronousRequestInterceptors) {
    var chain = [dispatchRequest, undefined];
    Array.prototype.unshift.apply(chain, requestInterceptorChain);
    chain = chain.concat(responseInterceptorChain);
    promise = Promise.resolve(config);

    while (chain.length) {
      promise = promise.then(chain.shift(), chain.shift());
    }

    return promise;
  }

  var newConfig = config;

  while (requestInterceptorChain.length) {
    var onFulfilled = requestInterceptorChain.shift();
    var onRejected = requestInterceptorChain.shift();

    try {
      newConfig = onFulfilled(newConfig);
    } catch (error) {
      onRejected(error);
      break;
    }
  }

  try {
    promise = dispatchRequest(newConfig);
  } catch (error) {
    return Promise.reject(error);
  }

  while (responseInterceptorChain.length) {
    promise = promise.then(responseInterceptorChain.shift(), responseInterceptorChain.shift());
  }

  return promise;
};

Axios.prototype.getUri = function getUri(config) {
  config = mergeConfig(this.defaults, config);
  var fullPath = buildFullPath(config.baseURL, config.url);
  return buildURL(fullPath, config.params, config.paramsSerializer);
}; // Provide aliases for supported request methods


utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function (url, config) {
    return this.request(mergeConfig(config || {}, {
      method: method,
      url: url,
      data: (config || {}).data
    }));
  };
});
utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  /*eslint func-names:0*/
  function generateHTTPMethod(isForm) {
    return function httpMethod(url, data, config) {
      return this.request(mergeConfig(config || {}, {
        method: method,
        headers: isForm ? {
          'Content-Type': 'multipart/form-data'
        } : {},
        url: url,
        data: data
      }));
    };
  }

  Axios.prototype[method] = generateHTTPMethod();
  Axios.prototype[method + 'Form'] = generateHTTPMethod(true);
});
module.exports = Axios;

/***/ }),

/***/ 4200:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var utils = __webpack_require__(3401);
/**
 * Create an Error with the specified message, config, error code, request and response.
 *
 * @param {string} message The error message.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 * @param {Object} [config] The config.
 * @param {Object} [request] The request.
 * @param {Object} [response] The response.
 * @returns {Error} The created error.
 */


function AxiosError(message, code, config, request, response) {
  Error.call(this);
  this.message = message;
  this.name = 'AxiosError';
  code && (this.code = code);
  config && (this.config = config);
  request && (this.request = request);
  response && (this.response = response);
}

utils.inherits(AxiosError, Error, {
  toJSON: function toJSON() {
    return {
      // Standard
      message: this.message,
      name: this.name,
      // Microsoft
      description: this.description,
      number: this.number,
      // Mozilla
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      // Axios
      config: this.config,
      code: this.code,
      status: this.response && this.response.status ? this.response.status : null
    };
  }
});
var prototype = AxiosError.prototype;
var descriptors = {};
['ERR_BAD_OPTION_VALUE', 'ERR_BAD_OPTION', 'ECONNABORTED', 'ETIMEDOUT', 'ERR_NETWORK', 'ERR_FR_TOO_MANY_REDIRECTS', 'ERR_DEPRECATED', 'ERR_BAD_RESPONSE', 'ERR_BAD_REQUEST', 'ERR_CANCELED' // eslint-disable-next-line func-names
].forEach(function (code) {
  descriptors[code] = {
    value: code
  };
});
Object.defineProperties(AxiosError, descriptors);
Object.defineProperty(prototype, 'isAxiosError', {
  value: true
}); // eslint-disable-next-line func-names

AxiosError.from = function (error, code, config, request, response, customProps) {
  var axiosError = Object.create(prototype);
  utils.toFlatObject(error, axiosError, function filter(obj) {
    return obj !== Error.prototype;
  });
  AxiosError.call(axiosError, error.message, code, config, request, response);
  axiosError.name = error.name;
  customProps && Object.assign(axiosError, customProps);
  return axiosError;
};

module.exports = AxiosError;

/***/ }),

/***/ 9655:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var utils = __webpack_require__(3401);

function InterceptorManager() {
  this.handlers = [];
}
/**
 * Add a new interceptor to the stack
 *
 * @param {Function} fulfilled The function to handle `then` for a `Promise`
 * @param {Function} rejected The function to handle `reject` for a `Promise`
 *
 * @return {Number} An ID used to remove interceptor later
 */


InterceptorManager.prototype.use = function use(fulfilled, rejected, options) {
  this.handlers.push({
    fulfilled: fulfilled,
    rejected: rejected,
    synchronous: options ? options.synchronous : false,
    runWhen: options ? options.runWhen : null
  });
  return this.handlers.length - 1;
};
/**
 * Remove an interceptor from the stack
 *
 * @param {Number} id The ID that was returned by `use`
 */


InterceptorManager.prototype.eject = function eject(id) {
  if (this.handlers[id]) {
    this.handlers[id] = null;
  }
};
/**
 * Iterate over all the registered interceptors
 *
 * This method is particularly useful for skipping over any
 * interceptors that may have become `null` calling `eject`.
 *
 * @param {Function} fn The function to call for each interceptor
 */


InterceptorManager.prototype.forEach = function forEach(fn) {
  utils.forEach(this.handlers, function forEachHandler(h) {
    if (h !== null) {
      fn(h);
    }
  });
};

module.exports = InterceptorManager;

/***/ }),

/***/ 4466:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var isAbsoluteURL = __webpack_require__(4206);

var combineURLs = __webpack_require__(7955);
/**
 * Creates a new URL by combining the baseURL with the requestedURL,
 * only when the requestedURL is not already an absolute URL.
 * If the requestURL is absolute, this function returns the requestedURL untouched.
 *
 * @param {string} baseURL The base URL
 * @param {string} requestedURL Absolute or relative URL to combine
 * @returns {string} The combined full path
 */


module.exports = function buildFullPath(baseURL, requestedURL) {
  if (baseURL && !isAbsoluteURL(requestedURL)) {
    return combineURLs(baseURL, requestedURL);
  }

  return requestedURL;
};

/***/ }),

/***/ 4412:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var utils = __webpack_require__(3401);

var transformData = __webpack_require__(8092);

var isCancel = __webpack_require__(1907);

var defaults = __webpack_require__(9050);

var CanceledError = __webpack_require__(2800);
/**
 * Throws a `CanceledError` if cancellation has been requested.
 */


function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }

  if (config.signal && config.signal.aborted) {
    throw new CanceledError();
  }
}
/**
 * Dispatch a request to the server using the configured adapter.
 *
 * @param {object} config The config that is to be used for the request
 * @returns {Promise} The Promise to be fulfilled
 */


module.exports = function dispatchRequest(config) {
  throwIfCancellationRequested(config); // Ensure headers exist

  config.headers = config.headers || {}; // Transform request data

  config.data = transformData.call(config, config.data, config.headers, config.transformRequest); // Flatten headers

  config.headers = utils.merge(config.headers.common || {}, config.headers[config.method] || {}, config.headers);
  utils.forEach(['delete', 'get', 'head', 'post', 'put', 'patch', 'common'], function cleanHeaderConfig(method) {
    delete config.headers[method];
  });
  var adapter = config.adapter || defaults.adapter;
  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config); // Transform response data

    response.data = transformData.call(config, response.data, response.headers, config.transformResponse);
    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config); // Transform response data

      if (reason && reason.response) {
        reason.response.data = transformData.call(config, reason.response.data, reason.response.headers, config.transformResponse);
      }
    }

    return Promise.reject(reason);
  });
};

/***/ }),

/***/ 3674:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var utils = __webpack_require__(3401);
/**
 * Config-specific merge-function which creates a new config-object
 * by merging two configuration objects together.
 *
 * @param {Object} config1
 * @param {Object} config2
 * @returns {Object} New object resulting from merging config2 to config1
 */


module.exports = function mergeConfig(config1, config2) {
  // eslint-disable-next-line no-param-reassign
  config2 = config2 || {};
  var config = {};

  function getMergedValue(target, source) {
    if (utils.isPlainObject(target) && utils.isPlainObject(source)) {
      return utils.merge(target, source);
    } else if (utils.isPlainObject(source)) {
      return utils.merge({}, source);
    } else if (utils.isArray(source)) {
      return source.slice();
    }

    return source;
  } // eslint-disable-next-line consistent-return


  function mergeDeepProperties(prop) {
    if (!utils.isUndefined(config2[prop])) {
      return getMergedValue(config1[prop], config2[prop]);
    } else if (!utils.isUndefined(config1[prop])) {
      return getMergedValue(undefined, config1[prop]);
    }
  } // eslint-disable-next-line consistent-return


  function valueFromConfig2(prop) {
    if (!utils.isUndefined(config2[prop])) {
      return getMergedValue(undefined, config2[prop]);
    }
  } // eslint-disable-next-line consistent-return


  function defaultToConfig2(prop) {
    if (!utils.isUndefined(config2[prop])) {
      return getMergedValue(undefined, config2[prop]);
    } else if (!utils.isUndefined(config1[prop])) {
      return getMergedValue(undefined, config1[prop]);
    }
  } // eslint-disable-next-line consistent-return


  function mergeDirectKeys(prop) {
    if (prop in config2) {
      return getMergedValue(config1[prop], config2[prop]);
    } else if (prop in config1) {
      return getMergedValue(undefined, config1[prop]);
    }
  }

  var mergeMap = {
    'url': valueFromConfig2,
    'method': valueFromConfig2,
    'data': valueFromConfig2,
    'baseURL': defaultToConfig2,
    'transformRequest': defaultToConfig2,
    'transformResponse': defaultToConfig2,
    'paramsSerializer': defaultToConfig2,
    'timeout': defaultToConfig2,
    'timeoutMessage': defaultToConfig2,
    'withCredentials': defaultToConfig2,
    'adapter': defaultToConfig2,
    'responseType': defaultToConfig2,
    'xsrfCookieName': defaultToConfig2,
    'xsrfHeaderName': defaultToConfig2,
    'onUploadProgress': defaultToConfig2,
    'onDownloadProgress': defaultToConfig2,
    'decompress': defaultToConfig2,
    'maxContentLength': defaultToConfig2,
    'maxBodyLength': defaultToConfig2,
    'beforeRedirect': defaultToConfig2,
    'transport': defaultToConfig2,
    'httpAgent': defaultToConfig2,
    'httpsAgent': defaultToConfig2,
    'cancelToken': defaultToConfig2,
    'socketPath': defaultToConfig2,
    'responseEncoding': defaultToConfig2,
    'validateStatus': mergeDirectKeys
  };
  utils.forEach(Object.keys(config1).concat(Object.keys(config2)), function computeConfigValue(prop) {
    var merge = mergeMap[prop] || mergeDeepProperties;
    var configValue = merge(prop);
    utils.isUndefined(configValue) && merge !== mergeDirectKeys || (config[prop] = configValue);
  });
  return config;
};

/***/ }),

/***/ 5888:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var AxiosError = __webpack_require__(4200);
/**
 * Resolve or reject a Promise based on response status.
 *
 * @param {Function} resolve A function that resolves the promise.
 * @param {Function} reject A function that rejects the promise.
 * @param {object} response The response.
 */


module.exports = function settle(resolve, reject, response) {
  var validateStatus = response.config.validateStatus;

  if (!response.status || !validateStatus || validateStatus(response.status)) {
    resolve(response);
  } else {
    reject(new AxiosError('Request failed with status code ' + response.status, [AxiosError.ERR_BAD_REQUEST, AxiosError.ERR_BAD_RESPONSE][Math.floor(response.status / 100) - 4], response.config, response.request, response));
  }
};

/***/ }),

/***/ 8092:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var utils = __webpack_require__(3401);

var defaults = __webpack_require__(9050);
/**
 * Transform the data for a request or a response
 *
 * @param {Object|String} data The data to be transformed
 * @param {Array} headers The headers for the request or response
 * @param {Array|Function} fns A single function or Array of functions
 * @returns {*} The resulting transformed data
 */


module.exports = function transformData(data, headers, fns) {
  var context = this || defaults;
  /*eslint no-param-reassign:0*/

  utils.forEach(fns, function transform(fn) {
    data = fn.call(context, data, headers);
  });
  return data;
};

/***/ }),

/***/ 9050:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var utils = __webpack_require__(3401);

var normalizeHeaderName = __webpack_require__(5854);

var AxiosError = __webpack_require__(4200);

var transitionalDefaults = __webpack_require__(8760);

var toFormData = __webpack_require__(7427);

var DEFAULT_CONTENT_TYPE = {
  'Content-Type': 'application/x-www-form-urlencoded'
};

function setContentTypeIfUnset(headers, value) {
  if (!utils.isUndefined(headers) && utils.isUndefined(headers['Content-Type'])) {
    headers['Content-Type'] = value;
  }
}

function getDefaultAdapter() {
  var adapter;

  if (typeof XMLHttpRequest !== 'undefined') {
    // For browsers use XHR adapter
    adapter = __webpack_require__(3198);
  } else if (typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]') {
    // For node use HTTP adapter
    adapter = __webpack_require__(3198);
  }

  return adapter;
}

function stringifySafely(rawValue, parser, encoder) {
  if (utils.isString(rawValue)) {
    try {
      (parser || JSON.parse)(rawValue);
      return utils.trim(rawValue);
    } catch (e) {
      if (e.name !== 'SyntaxError') {
        throw e;
      }
    }
  }

  return (encoder || JSON.stringify)(rawValue);
}

var defaults = {
  transitional: transitionalDefaults,
  adapter: getDefaultAdapter(),
  transformRequest: [function transformRequest(data, headers) {
    normalizeHeaderName(headers, 'Accept');
    normalizeHeaderName(headers, 'Content-Type');

    if (utils.isFormData(data) || utils.isArrayBuffer(data) || utils.isBuffer(data) || utils.isStream(data) || utils.isFile(data) || utils.isBlob(data)) {
      return data;
    }

    if (utils.isArrayBufferView(data)) {
      return data.buffer;
    }

    if (utils.isURLSearchParams(data)) {
      setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
      return data.toString();
    }

    var isObjectPayload = utils.isObject(data);
    var contentType = headers && headers['Content-Type'];
    var isFileList;

    if ((isFileList = utils.isFileList(data)) || isObjectPayload && contentType === 'multipart/form-data') {
      var _FormData = this.env && this.env.FormData;

      return toFormData(isFileList ? {
        'files[]': data
      } : data, _FormData && new _FormData());
    } else if (isObjectPayload || contentType === 'application/json') {
      setContentTypeIfUnset(headers, 'application/json');
      return stringifySafely(data);
    }

    return data;
  }],
  transformResponse: [function transformResponse(data) {
    var transitional = this.transitional || defaults.transitional;
    var silentJSONParsing = transitional && transitional.silentJSONParsing;
    var forcedJSONParsing = transitional && transitional.forcedJSONParsing;
    var strictJSONParsing = !silentJSONParsing && this.responseType === 'json';

    if (strictJSONParsing || forcedJSONParsing && utils.isString(data) && data.length) {
      try {
        return JSON.parse(data);
      } catch (e) {
        if (strictJSONParsing) {
          if (e.name === 'SyntaxError') {
            throw AxiosError.from(e, AxiosError.ERR_BAD_RESPONSE, this, null, this.response);
          }

          throw e;
        }
      }
    }

    return data;
  }],

  /**
   * A timeout in milliseconds to abort a request. If set to 0 (default) a
   * timeout is not created.
   */
  timeout: 0,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  maxContentLength: -1,
  maxBodyLength: -1,
  env: {
    FormData: __webpack_require__(846)
  },
  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  },
  headers: {
    common: {
      'Accept': 'application/json, text/plain, */*'
    }
  }
};
utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
  defaults.headers[method] = {};
});
utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
});
module.exports = defaults;

/***/ }),

/***/ 8760:
/***/ ((module) => {

"use strict";


module.exports = {
  silentJSONParsing: true,
  forcedJSONParsing: true,
  clarifyTimeoutError: false
};

/***/ }),

/***/ 8963:
/***/ ((module) => {

module.exports = {
  "version": "0.27.2"
};

/***/ }),

/***/ 9366:
/***/ ((module) => {

"use strict";


module.exports = function bind(fn, thisArg) {
  return function wrap() {
    var args = new Array(arguments.length);

    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }

    return fn.apply(thisArg, args);
  };
};

/***/ }),

/***/ 8826:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var utils = __webpack_require__(3401);

function encode(val) {
  return encodeURIComponent(val).replace(/%3A/gi, ':').replace(/%24/g, '$').replace(/%2C/gi, ',').replace(/%20/g, '+').replace(/%5B/gi, '[').replace(/%5D/gi, ']');
}
/**
 * Build a URL by appending params to the end
 *
 * @param {string} url The base of the url (e.g., http://www.google.com)
 * @param {object} [params] The params to be appended
 * @returns {string} The formatted url
 */


module.exports = function buildURL(url, params, paramsSerializer) {
  /*eslint no-param-reassign:0*/
  if (!params) {
    return url;
  }

  var serializedParams;

  if (paramsSerializer) {
    serializedParams = paramsSerializer(params);
  } else if (utils.isURLSearchParams(params)) {
    serializedParams = params.toString();
  } else {
    var parts = [];
    utils.forEach(params, function serialize(val, key) {
      if (val === null || typeof val === 'undefined') {
        return;
      }

      if (utils.isArray(val)) {
        key = key + '[]';
      } else {
        val = [val];
      }

      utils.forEach(val, function parseValue(v) {
        if (utils.isDate(v)) {
          v = v.toISOString();
        } else if (utils.isObject(v)) {
          v = JSON.stringify(v);
        }

        parts.push(encode(key) + '=' + encode(v));
      });
    });
    serializedParams = parts.join('&');
  }

  if (serializedParams) {
    var hashmarkIndex = url.indexOf('#');

    if (hashmarkIndex !== -1) {
      url = url.slice(0, hashmarkIndex);
    }

    url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
  }

  return url;
};

/***/ }),

/***/ 7955:
/***/ ((module) => {

"use strict";

/**
 * Creates a new URL by combining the specified URLs
 *
 * @param {string} baseURL The base URL
 * @param {string} relativeURL The relative URL
 * @returns {string} The combined URL
 */

module.exports = function combineURLs(baseURL, relativeURL) {
  return relativeURL ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '') : baseURL;
};

/***/ }),

/***/ 4963:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var utils = __webpack_require__(3401);

module.exports = utils.isStandardBrowserEnv() ? // Standard browser envs support document.cookie
function standardBrowserEnv() {
  return {
    write: function write(name, value, expires, path, domain, secure) {
      var cookie = [];
      cookie.push(name + '=' + encodeURIComponent(value));

      if (utils.isNumber(expires)) {
        cookie.push('expires=' + new Date(expires).toGMTString());
      }

      if (utils.isString(path)) {
        cookie.push('path=' + path);
      }

      if (utils.isString(domain)) {
        cookie.push('domain=' + domain);
      }

      if (secure === true) {
        cookie.push('secure');
      }

      document.cookie = cookie.join('; ');
    },
    read: function read(name) {
      var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
      return match ? decodeURIComponent(match[3]) : null;
    },
    remove: function remove(name) {
      this.write(name, '', Date.now() - 86400000);
    }
  };
}() : // Non standard browser env (web workers, react-native) lack needed support.
function nonStandardBrowserEnv() {
  return {
    write: function write() {},
    read: function read() {
      return null;
    },
    remove: function remove() {}
  };
}();

/***/ }),

/***/ 4206:
/***/ ((module) => {

"use strict";

/**
 * Determines whether the specified URL is absolute
 *
 * @param {string} url The URL to test
 * @returns {boolean} True if the specified URL is absolute, otherwise false
 */

module.exports = function isAbsoluteURL(url) {
  // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
  // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
  // by any combination of letters, digits, plus, period, or hyphen.
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
};

/***/ }),

/***/ 1720:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var utils = __webpack_require__(3401);
/**
 * Determines whether the payload is an error thrown by Axios
 *
 * @param {*} payload The value to test
 * @returns {boolean} True if the payload is an error thrown by Axios, otherwise false
 */


module.exports = function isAxiosError(payload) {
  return utils.isObject(payload) && payload.isAxiosError === true;
};

/***/ }),

/***/ 6130:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var utils = __webpack_require__(3401);

module.exports = utils.isStandardBrowserEnv() ? // Standard browser envs have full support of the APIs needed to test
// whether the request URL is of the same origin as current location.
function standardBrowserEnv() {
  var msie = /(msie|trident)/i.test(navigator.userAgent);
  var urlParsingNode = document.createElement('a');
  var originURL;
  /**
  * Parse a URL to discover it's components
  *
  * @param {String} url The URL to be parsed
  * @returns {Object}
  */

  function resolveURL(url) {
    var href = url;

    if (msie) {
      // IE needs attribute set twice to normalize properties
      urlParsingNode.setAttribute('href', href);
      href = urlParsingNode.href;
    }

    urlParsingNode.setAttribute('href', href); // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils

    return {
      href: urlParsingNode.href,
      protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
      host: urlParsingNode.host,
      search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
      hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
      hostname: urlParsingNode.hostname,
      port: urlParsingNode.port,
      pathname: urlParsingNode.pathname.charAt(0) === '/' ? urlParsingNode.pathname : '/' + urlParsingNode.pathname
    };
  }

  originURL = resolveURL(window.location.href);
  /**
  * Determine if a URL shares the same origin as the current location
  *
  * @param {String} requestURL The URL to test
  * @returns {boolean} True if URL shares the same origin, otherwise false
  */

  return function isURLSameOrigin(requestURL) {
    var parsed = utils.isString(requestURL) ? resolveURL(requestURL) : requestURL;
    return parsed.protocol === originURL.protocol && parsed.host === originURL.host;
  };
}() : // Non standard browser envs (web workers, react-native) lack needed support.
function nonStandardBrowserEnv() {
  return function isURLSameOrigin() {
    return true;
  };
}();

/***/ }),

/***/ 5854:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var utils = __webpack_require__(3401);

module.exports = function normalizeHeaderName(headers, normalizedName) {
  utils.forEach(headers, function processHeader(value, name) {
    if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
      headers[normalizedName] = value;
      delete headers[name];
    }
  });
};

/***/ }),

/***/ 846:
/***/ ((module) => {

// eslint-disable-next-line strict
module.exports = null;

/***/ }),

/***/ 8418:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var utils = __webpack_require__(3401); // Headers whose duplicates are ignored by node
// c.f. https://nodejs.org/api/http.html#http_message_headers


var ignoreDuplicateOf = ['age', 'authorization', 'content-length', 'content-type', 'etag', 'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since', 'last-modified', 'location', 'max-forwards', 'proxy-authorization', 'referer', 'retry-after', 'user-agent'];
/**
 * Parse headers into an object
 *
 * ```
 * Date: Wed, 27 Aug 2014 08:58:49 GMT
 * Content-Type: application/json
 * Connection: keep-alive
 * Transfer-Encoding: chunked
 * ```
 *
 * @param {String} headers Headers needing to be parsed
 * @returns {Object} Headers parsed into an object
 */

module.exports = function parseHeaders(headers) {
  var parsed = {};
  var key;
  var val;
  var i;

  if (!headers) {
    return parsed;
  }

  utils.forEach(headers.split('\n'), function parser(line) {
    i = line.indexOf(':');
    key = utils.trim(line.substr(0, i)).toLowerCase();
    val = utils.trim(line.substr(i + 1));

    if (key) {
      if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
        return;
      }

      if (key === 'set-cookie') {
        parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
      } else {
        parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
      }
    }
  });
  return parsed;
};

/***/ }),

/***/ 4830:
/***/ ((module) => {

"use strict";


module.exports = function parseProtocol(url) {
  var match = /^([-+\w]{1,25})(:?\/\/|:)/.exec(url);
  return match && match[1] || '';
};

/***/ }),

/***/ 7998:
/***/ ((module) => {

"use strict";

/**
 * Syntactic sugar for invoking a function and expanding an array for arguments.
 *
 * Common use case would be to use `Function.prototype.apply`.
 *
 *  ```js
 *  function f(x, y, z) {}
 *  var args = [1, 2, 3];
 *  f.apply(null, args);
 *  ```
 *
 * With `spread` this example can be re-written.
 *
 *  ```js
 *  spread(function(x, y, z) {})([1, 2, 3]);
 *  ```
 *
 * @param {Function} callback
 * @returns {Function}
 */

module.exports = function spread(callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
};

/***/ }),

/***/ 7427:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

var utils = __webpack_require__(3401);
/**
 * Convert a data object to FormData
 * @param {Object} obj
 * @param {?Object} [formData]
 * @returns {Object}
 **/


function toFormData(obj, formData) {
  // eslint-disable-next-line no-param-reassign
  formData = formData || new FormData();
  var stack = [];

  function convertValue(value) {
    if (value === null) return '';

    if (utils.isDate(value)) {
      return value.toISOString();
    }

    if (utils.isArrayBuffer(value) || utils.isTypedArray(value)) {
      return typeof Blob === 'function' ? new Blob([value]) : Buffer.from(value);
    }

    return value;
  }

  function build(data, parentKey) {
    if (utils.isPlainObject(data) || utils.isArray(data)) {
      if (stack.indexOf(data) !== -1) {
        throw Error('Circular reference detected in ' + parentKey);
      }

      stack.push(data);
      utils.forEach(data, function each(value, key) {
        if (utils.isUndefined(value)) return;
        var fullKey = parentKey ? parentKey + '.' + key : key;
        var arr;

        if (value && !parentKey && _typeof(value) === 'object') {
          if (utils.endsWith(key, '{}')) {
            // eslint-disable-next-line no-param-reassign
            value = JSON.stringify(value);
          } else if (utils.endsWith(key, '[]') && (arr = utils.toArray(value))) {
            // eslint-disable-next-line func-names
            arr.forEach(function (el) {
              !utils.isUndefined(el) && formData.append(fullKey, convertValue(el));
            });
            return;
          }
        }

        build(value, fullKey);
      });
      stack.pop();
    } else {
      formData.append(parentKey, convertValue(data));
    }
  }

  build(obj);
  return formData;
}

module.exports = toFormData;

/***/ }),

/***/ 3465:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

var VERSION = (__webpack_require__(8963).version);

var AxiosError = __webpack_require__(4200);

var validators = {}; // eslint-disable-next-line func-names

['object', 'boolean', 'number', 'function', 'string', 'symbol'].forEach(function (type, i) {
  validators[type] = function validator(thing) {
    return _typeof(thing) === type || 'a' + (i < 1 ? 'n ' : ' ') + type;
  };
});
var deprecatedWarnings = {};
/**
 * Transitional option validator
 * @param {function|boolean?} validator - set to false if the transitional option has been removed
 * @param {string?} version - deprecated version / removed since version
 * @param {string?} message - some message with additional info
 * @returns {function}
 */

validators.transitional = function transitional(validator, version, message) {
  function formatMessage(opt, desc) {
    return '[Axios v' + VERSION + '] Transitional option \'' + opt + '\'' + desc + (message ? '. ' + message : '');
  } // eslint-disable-next-line func-names


  return function (value, opt, opts) {
    if (validator === false) {
      throw new AxiosError(formatMessage(opt, ' has been removed' + (version ? ' in ' + version : '')), AxiosError.ERR_DEPRECATED);
    }

    if (version && !deprecatedWarnings[opt]) {
      deprecatedWarnings[opt] = true; // eslint-disable-next-line no-console

      console.warn(formatMessage(opt, ' has been deprecated since v' + version + ' and will be removed in the near future'));
    }

    return validator ? validator(value, opt, opts) : true;
  };
};
/**
 * Assert object's properties type
 * @param {object} options
 * @param {object} schema
 * @param {boolean?} allowUnknown
 */


function assertOptions(options, schema, allowUnknown) {
  if (_typeof(options) !== 'object') {
    throw new AxiosError('options must be an object', AxiosError.ERR_BAD_OPTION_VALUE);
  }

  var keys = Object.keys(options);
  var i = keys.length;

  while (i-- > 0) {
    var opt = keys[i];
    var validator = schema[opt];

    if (validator) {
      var value = options[opt];
      var result = value === undefined || validator(value, opt, options);

      if (result !== true) {
        throw new AxiosError('option ' + opt + ' must be ' + result, AxiosError.ERR_BAD_OPTION_VALUE);
      }

      continue;
    }

    if (allowUnknown !== true) {
      throw new AxiosError('Unknown option ' + opt, AxiosError.ERR_BAD_OPTION);
    }
  }
}

module.exports = {
  assertOptions: assertOptions,
  validators: validators
};

/***/ }),

/***/ 3401:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

var bind = __webpack_require__(9366); // utils is a library of generic helper functions non-specific to axios


var toString = Object.prototype.toString; // eslint-disable-next-line func-names

var kindOf = function (cache) {
  // eslint-disable-next-line func-names
  return function (thing) {
    var str = toString.call(thing);
    return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
  };
}(Object.create(null));

function kindOfTest(type) {
  type = type.toLowerCase();
  return function isKindOf(thing) {
    return kindOf(thing) === type;
  };
}
/**
 * Determine if a value is an Array
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Array, otherwise false
 */


function isArray(val) {
  return Array.isArray(val);
}
/**
 * Determine if a value is undefined
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if the value is undefined, otherwise false
 */


function isUndefined(val) {
  return typeof val === 'undefined';
}
/**
 * Determine if a value is a Buffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Buffer, otherwise false
 */


function isBuffer(val) {
  return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor) && typeof val.constructor.isBuffer === 'function' && val.constructor.isBuffer(val);
}
/**
 * Determine if a value is an ArrayBuffer
 *
 * @function
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an ArrayBuffer, otherwise false
 */


var isArrayBuffer = kindOfTest('ArrayBuffer');
/**
 * Determine if a value is a view on an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
 */

function isArrayBufferView(val) {
  var result;

  if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView) {
    result = ArrayBuffer.isView(val);
  } else {
    result = val && val.buffer && isArrayBuffer(val.buffer);
  }

  return result;
}
/**
 * Determine if a value is a String
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a String, otherwise false
 */


function isString(val) {
  return typeof val === 'string';
}
/**
 * Determine if a value is a Number
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Number, otherwise false
 */


function isNumber(val) {
  return typeof val === 'number';
}
/**
 * Determine if a value is an Object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Object, otherwise false
 */


function isObject(val) {
  return val !== null && _typeof(val) === 'object';
}
/**
 * Determine if a value is a plain Object
 *
 * @param {Object} val The value to test
 * @return {boolean} True if value is a plain Object, otherwise false
 */


function isPlainObject(val) {
  if (kindOf(val) !== 'object') {
    return false;
  }

  var prototype = Object.getPrototypeOf(val);
  return prototype === null || prototype === Object.prototype;
}
/**
 * Determine if a value is a Date
 *
 * @function
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Date, otherwise false
 */


var isDate = kindOfTest('Date');
/**
 * Determine if a value is a File
 *
 * @function
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a File, otherwise false
 */

var isFile = kindOfTest('File');
/**
 * Determine if a value is a Blob
 *
 * @function
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Blob, otherwise false
 */

var isBlob = kindOfTest('Blob');
/**
 * Determine if a value is a FileList
 *
 * @function
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a File, otherwise false
 */

var isFileList = kindOfTest('FileList');
/**
 * Determine if a value is a Function
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Function, otherwise false
 */

function isFunction(val) {
  return toString.call(val) === '[object Function]';
}
/**
 * Determine if a value is a Stream
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Stream, otherwise false
 */


function isStream(val) {
  return isObject(val) && isFunction(val.pipe);
}
/**
 * Determine if a value is a FormData
 *
 * @param {Object} thing The value to test
 * @returns {boolean} True if value is an FormData, otherwise false
 */


function isFormData(thing) {
  var pattern = '[object FormData]';
  return thing && (typeof FormData === 'function' && thing instanceof FormData || toString.call(thing) === pattern || isFunction(thing.toString) && thing.toString() === pattern);
}
/**
 * Determine if a value is a URLSearchParams object
 * @function
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a URLSearchParams object, otherwise false
 */


var isURLSearchParams = kindOfTest('URLSearchParams');
/**
 * Trim excess whitespace off the beginning and end of a string
 *
 * @param {String} str The String to trim
 * @returns {String} The String freed of excess whitespace
 */

function trim(str) {
  return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, '');
}
/**
 * Determine if we're running in a standard browser environment
 *
 * This allows axios to run in a web worker, and react-native.
 * Both environments support XMLHttpRequest, but not fully standard globals.
 *
 * web workers:
 *  typeof window -> undefined
 *  typeof document -> undefined
 *
 * react-native:
 *  navigator.product -> 'ReactNative'
 * nativescript
 *  navigator.product -> 'NativeScript' or 'NS'
 */


function isStandardBrowserEnv() {
  if (typeof navigator !== 'undefined' && (navigator.product === 'ReactNative' || navigator.product === 'NativeScript' || navigator.product === 'NS')) {
    return false;
  }

  return typeof window !== 'undefined' && typeof document !== 'undefined';
}
/**
 * Iterate over an Array or an Object invoking a function for each item.
 *
 * If `obj` is an Array callback will be called passing
 * the value, index, and complete array for each item.
 *
 * If 'obj' is an Object callback will be called passing
 * the value, key, and complete object for each property.
 *
 * @param {Object|Array} obj The object to iterate
 * @param {Function} fn The callback to invoke for each item
 */


function forEach(obj, fn) {
  // Don't bother if no value provided
  if (obj === null || typeof obj === 'undefined') {
    return;
  } // Force an array if not already something iterable


  if (_typeof(obj) !== 'object') {
    /*eslint no-param-reassign:0*/
    obj = [obj];
  }

  if (isArray(obj)) {
    // Iterate over array values
    for (var i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    // Iterate over object keys
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        fn.call(null, obj[key], key, obj);
      }
    }
  }
}
/**
 * Accepts varargs expecting each argument to be an object, then
 * immutably merges the properties of each object and returns result.
 *
 * When multiple objects contain the same key the later object in
 * the arguments list will take precedence.
 *
 * Example:
 *
 * ```js
 * var result = merge({foo: 123}, {foo: 456});
 * console.log(result.foo); // outputs 456
 * ```
 *
 * @param {Object} obj1 Object to merge
 * @returns {Object} Result of all merge properties
 */


function
  /* obj1, obj2, obj3, ... */
merge() {
  var result = {};

  function assignValue(val, key) {
    if (isPlainObject(result[key]) && isPlainObject(val)) {
      result[key] = merge(result[key], val);
    } else if (isPlainObject(val)) {
      result[key] = merge({}, val);
    } else if (isArray(val)) {
      result[key] = val.slice();
    } else {
      result[key] = val;
    }
  }

  for (var i = 0, l = arguments.length; i < l; i++) {
    forEach(arguments[i], assignValue);
  }

  return result;
}
/**
 * Extends object a by mutably adding to it the properties of object b.
 *
 * @param {Object} a The object to be extended
 * @param {Object} b The object to copy properties from
 * @param {Object} thisArg The object to bind function to
 * @return {Object} The resulting value of object a
 */


function extend(a, b, thisArg) {
  forEach(b, function assignValue(val, key) {
    if (thisArg && typeof val === 'function') {
      a[key] = bind(val, thisArg);
    } else {
      a[key] = val;
    }
  });
  return a;
}
/**
 * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
 *
 * @param {string} content with BOM
 * @return {string} content value without BOM
 */


function stripBOM(content) {
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }

  return content;
}
/**
 * Inherit the prototype methods from one constructor into another
 * @param {function} constructor
 * @param {function} superConstructor
 * @param {object} [props]
 * @param {object} [descriptors]
 */


function inherits(constructor, superConstructor, props, descriptors) {
  constructor.prototype = Object.create(superConstructor.prototype, descriptors);
  constructor.prototype.constructor = constructor;
  props && Object.assign(constructor.prototype, props);
}
/**
 * Resolve object with deep prototype chain to a flat object
 * @param {Object} sourceObj source object
 * @param {Object} [destObj]
 * @param {Function} [filter]
 * @returns {Object}
 */


function toFlatObject(sourceObj, destObj, filter) {
  var props;
  var i;
  var prop;
  var merged = {};
  destObj = destObj || {};

  do {
    props = Object.getOwnPropertyNames(sourceObj);
    i = props.length;

    while (i-- > 0) {
      prop = props[i];

      if (!merged[prop]) {
        destObj[prop] = sourceObj[prop];
        merged[prop] = true;
      }
    }

    sourceObj = Object.getPrototypeOf(sourceObj);
  } while (sourceObj && (!filter || filter(sourceObj, destObj)) && sourceObj !== Object.prototype);

  return destObj;
}
/*
 * determines whether a string ends with the characters of a specified string
 * @param {String} str
 * @param {String} searchString
 * @param {Number} [position= 0]
 * @returns {boolean}
 */


function endsWith(str, searchString, position) {
  str = String(str);

  if (position === undefined || position > str.length) {
    position = str.length;
  }

  position -= searchString.length;
  var lastIndex = str.indexOf(searchString, position);
  return lastIndex !== -1 && lastIndex === position;
}
/**
 * Returns new array from array like object
 * @param {*} [thing]
 * @returns {Array}
 */


function toArray(thing) {
  if (!thing) return null;
  var i = thing.length;
  if (isUndefined(i)) return null;
  var arr = new Array(i);

  while (i-- > 0) {
    arr[i] = thing[i];
  }

  return arr;
} // eslint-disable-next-line func-names


var isTypedArray = function (TypedArray) {
  // eslint-disable-next-line func-names
  return function (thing) {
    return TypedArray && thing instanceof TypedArray;
  };
}(typeof Uint8Array !== 'undefined' && Object.getPrototypeOf(Uint8Array));

module.exports = {
  isArray: isArray,
  isArrayBuffer: isArrayBuffer,
  isBuffer: isBuffer,
  isFormData: isFormData,
  isArrayBufferView: isArrayBufferView,
  isString: isString,
  isNumber: isNumber,
  isObject: isObject,
  isPlainObject: isPlainObject,
  isUndefined: isUndefined,
  isDate: isDate,
  isFile: isFile,
  isBlob: isBlob,
  isFunction: isFunction,
  isStream: isStream,
  isURLSearchParams: isURLSearchParams,
  isStandardBrowserEnv: isStandardBrowserEnv,
  forEach: forEach,
  merge: merge,
  extend: extend,
  trim: trim,
  stripBOM: stripBOM,
  inherits: inherits,
  toFlatObject: toFlatObject,
  kindOf: kindOf,
  kindOfTest: kindOfTest,
  endsWith: endsWith,
  toArray: toArray,
  isTypedArray: isTypedArray,
  isFileList: isFileList
};

/***/ }),

/***/ 9584:
/***/ ((module) => {

"use strict";


module.exports = balanced;

function balanced(a, b, str) {
  if (a instanceof RegExp) a = maybeMatch(a, str);
  if (b instanceof RegExp) b = maybeMatch(b, str);
  var r = range(a, b, str);
  return r && {
    start: r[0],
    end: r[1],
    pre: str.slice(0, r[0]),
    body: str.slice(r[0] + a.length, r[1]),
    post: str.slice(r[1] + b.length)
  };
}

function maybeMatch(reg, str) {
  var m = str.match(reg);
  return m ? m[0] : null;
}

balanced.range = range;

function range(a, b, str) {
  var begs, beg, left, right, result;
  var ai = str.indexOf(a);
  var bi = str.indexOf(b, ai + 1);
  var i = ai;

  if (ai >= 0 && bi > 0) {
    begs = [];
    left = str.length;

    while (i >= 0 && !result) {
      if (i == ai) {
        begs.push(i);
        ai = str.indexOf(a, i + 1);
      } else if (begs.length == 1) {
        result = [begs.pop(), bi];
      } else {
        beg = begs.pop();

        if (beg < left) {
          left = beg;
          right = bi;
        }

        bi = str.indexOf(b, i + 1);
      }

      i = ai < bi && ai >= 0 ? ai : bi;
    }

    if (begs.length) {
      result = [left, right];
    }
  }

  return result;
}

/***/ }),

/***/ 9146:
/***/ (function(module, exports, __webpack_require__) {

/* module decorator */ module = __webpack_require__.nmd(module);
var __WEBPACK_AMD_DEFINE_RESULT__;function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

/*! https://mths.be/base64 v1.0.0 by @mathias | MIT license */
;

(function (root) {
  // Detect free variables `exports`.
  var freeExports = ( false ? 0 : _typeof(exports)) == 'object' && exports; // Detect free variable `module`.

  var freeModule = ( false ? 0 : _typeof(module)) == 'object' && module && module.exports == freeExports && module; // Detect free variable `global`, from Node.js or Browserified code, and use
  // it as `root`.

  var freeGlobal = (typeof global === "undefined" ? "undefined" : _typeof(global)) == 'object' && global;

  if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
    root = freeGlobal;
  }
  /*--------------------------------------------------------------------------*/


  var InvalidCharacterError = function InvalidCharacterError(message) {
    this.message = message;
  };

  InvalidCharacterError.prototype = new Error();
  InvalidCharacterError.prototype.name = 'InvalidCharacterError';

  var error = function error(message) {
    // Note: the error messages used throughout this file match those used by
    // the native `atob`/`btoa` implementation in Chromium.
    throw new InvalidCharacterError(message);
  };

  var TABLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'; // http://whatwg.org/html/common-microsyntaxes.html#space-character

  var REGEX_SPACE_CHARACTERS = /[\t\n\f\r ]/g; // `decode` is designed to be fully compatible with `atob` as described in the
  // HTML Standard. http://whatwg.org/html/webappapis.html#dom-windowbase64-atob
  // The optimized base64-decoding algorithm used is based on @atk’s excellent
  // implementation. https://gist.github.com/atk/1020396

  var decode = function decode(input) {
    input = String(input).replace(REGEX_SPACE_CHARACTERS, '');
    var length = input.length;

    if (length % 4 == 0) {
      input = input.replace(/==?$/, '');
      length = input.length;
    }

    if (length % 4 == 1 || // http://whatwg.org/C#alphanumeric-ascii-characters
    /[^+a-zA-Z0-9/]/.test(input)) {
      error('Invalid character: the string to be decoded is not correctly encoded.');
    }

    var bitCounter = 0;
    var bitStorage;
    var buffer;
    var output = '';
    var position = -1;

    while (++position < length) {
      buffer = TABLE.indexOf(input.charAt(position));
      bitStorage = bitCounter % 4 ? bitStorage * 64 + buffer : buffer; // Unless this is the first of a group of 4 characters…

      if (bitCounter++ % 4) {
        // …convert the first 8 bits to a single ASCII character.
        output += String.fromCharCode(0xFF & bitStorage >> (-2 * bitCounter & 6));
      }
    }

    return output;
  }; // `encode` is designed to be fully compatible with `btoa` as described in the
  // HTML Standard: http://whatwg.org/html/webappapis.html#dom-windowbase64-btoa


  var encode = function encode(input) {
    input = String(input);

    if (/[^\0-\xFF]/.test(input)) {
      // Note: no need to special-case astral symbols here, as surrogates are
      // matched, and the input is supposed to only contain ASCII anyway.
      error('The string to be encoded contains characters outside of the ' + 'Latin1 range.');
    }

    var padding = input.length % 3;
    var output = '';
    var position = -1;
    var a;
    var b;
    var c;
    var buffer; // Make sure any padding is handled outside of the loop.

    var length = input.length - padding;

    while (++position < length) {
      // Read three bytes, i.e. 24 bits.
      a = input.charCodeAt(position) << 16;
      b = input.charCodeAt(++position) << 8;
      c = input.charCodeAt(++position);
      buffer = a + b + c; // Turn the 24 bits into four chunks of 6 bits each, and append the
      // matching character for each of them to the output.

      output += TABLE.charAt(buffer >> 18 & 0x3F) + TABLE.charAt(buffer >> 12 & 0x3F) + TABLE.charAt(buffer >> 6 & 0x3F) + TABLE.charAt(buffer & 0x3F);
    }

    if (padding == 2) {
      a = input.charCodeAt(position) << 8;
      b = input.charCodeAt(++position);
      buffer = a + b;
      output += TABLE.charAt(buffer >> 10) + TABLE.charAt(buffer >> 4 & 0x3F) + TABLE.charAt(buffer << 2 & 0x3F) + '=';
    } else if (padding == 1) {
      buffer = input.charCodeAt(position);
      output += TABLE.charAt(buffer >> 2) + TABLE.charAt(buffer << 4 & 0x3F) + '==';
    }

    return output;
  };

  var base64 = {
    'encode': encode,
    'decode': decode,
    'version': '1.0.0'
  }; // Some AMD build optimizers, like r.js, check for specific condition patterns
  // like the following:

  if ( true && _typeof(__webpack_require__.amdO) == 'object' && __webpack_require__.amdO) {
    !(__WEBPACK_AMD_DEFINE_RESULT__ = (function () {
      return base64;
    }).call(exports, __webpack_require__, exports, module),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
  } else if (freeExports && !freeExports.nodeType) {
    if (freeModule) {
      // in Node.js or RingoJS v0.8.0+
      freeModule.exports = base64;
    } else {
      // in Narwhal or RingoJS v0.7.0-
      for (var key in base64) {
        base64.hasOwnProperty(key) && (freeExports[key] = base64[key]);
      }
    }
  } else {
    // in Rhino or a web browser
    root.base64 = base64;
  }
})(this);

/***/ }),

/***/ 8918:
/***/ ((__unused_webpack_module, exports) => {

"use strict";
var __webpack_unused_export__;


__webpack_unused_export__ = ({
  value: true
});
/*
 * Calculate the byte lengths for utf8 encoded strings.
 */

function byteLength(str) {
  if (!str) {
    return 0;
  }

  str = str.toString();
  var len = str.length;

  for (var i = str.length; i--;) {
    var code = str.charCodeAt(i);

    if (0xdc00 <= code && code <= 0xdfff) {
      i--;
    }

    if (0x7f < code && code <= 0x7ff) {
      len++;
    } else if (0x7ff < code && code <= 0xffff) {
      len += 2;
    }
  }

  return len;
}

exports.k = byteLength;

/***/ }),

/***/ 5106:
/***/ ((module) => {

var charenc = {
  // UTF-8 encoding
  utf8: {
    // Convert a string to a byte array
    stringToBytes: function stringToBytes(str) {
      return charenc.bin.stringToBytes(unescape(encodeURIComponent(str)));
    },
    // Convert a byte array to a string
    bytesToString: function bytesToString(bytes) {
      return decodeURIComponent(escape(charenc.bin.bytesToString(bytes)));
    }
  },
  // Binary encoding
  bin: {
    // Convert a string to a byte array
    stringToBytes: function stringToBytes(str) {
      for (var bytes = [], i = 0; i < str.length; i++) {
        bytes.push(str.charCodeAt(i) & 0xFF);
      }

      return bytes;
    },
    // Convert a byte array to a string
    bytesToString: function bytesToString(bytes) {
      for (var str = [], i = 0; i < bytes.length; i++) {
        str.push(String.fromCharCode(bytes[i]));
      }

      return str.join('');
    }
  }
};
module.exports = charenc;

/***/ }),

/***/ 3718:
/***/ ((module) => {

(function () {
  var base64map = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
      crypt = {
    // Bit-wise rotation left
    rotl: function rotl(n, b) {
      return n << b | n >>> 32 - b;
    },
    // Bit-wise rotation right
    rotr: function rotr(n, b) {
      return n << 32 - b | n >>> b;
    },
    // Swap big-endian to little-endian and vice versa
    endian: function endian(n) {
      // If number given, swap endian
      if (n.constructor == Number) {
        return crypt.rotl(n, 8) & 0x00FF00FF | crypt.rotl(n, 24) & 0xFF00FF00;
      } // Else, assume array and swap all items


      for (var i = 0; i < n.length; i++) {
        n[i] = crypt.endian(n[i]);
      }

      return n;
    },
    // Generate an array of any length of random bytes
    randomBytes: function randomBytes(n) {
      for (var bytes = []; n > 0; n--) {
        bytes.push(Math.floor(Math.random() * 256));
      }

      return bytes;
    },
    // Convert a byte array to big-endian 32-bit words
    bytesToWords: function bytesToWords(bytes) {
      for (var words = [], i = 0, b = 0; i < bytes.length; i++, b += 8) {
        words[b >>> 5] |= bytes[i] << 24 - b % 32;
      }

      return words;
    },
    // Convert big-endian 32-bit words to a byte array
    wordsToBytes: function wordsToBytes(words) {
      for (var bytes = [], b = 0; b < words.length * 32; b += 8) {
        bytes.push(words[b >>> 5] >>> 24 - b % 32 & 0xFF);
      }

      return bytes;
    },
    // Convert a byte array to a hex string
    bytesToHex: function bytesToHex(bytes) {
      for (var hex = [], i = 0; i < bytes.length; i++) {
        hex.push((bytes[i] >>> 4).toString(16));
        hex.push((bytes[i] & 0xF).toString(16));
      }

      return hex.join('');
    },
    // Convert a hex string to a byte array
    hexToBytes: function hexToBytes(hex) {
      for (var bytes = [], c = 0; c < hex.length; c += 2) {
        bytes.push(parseInt(hex.substr(c, 2), 16));
      }

      return bytes;
    },
    // Convert a byte array to a base-64 string
    bytesToBase64: function bytesToBase64(bytes) {
      for (var base64 = [], i = 0; i < bytes.length; i += 3) {
        var triplet = bytes[i] << 16 | bytes[i + 1] << 8 | bytes[i + 2];

        for (var j = 0; j < 4; j++) {
          if (i * 8 + j * 6 <= bytes.length * 8) base64.push(base64map.charAt(triplet >>> 6 * (3 - j) & 0x3F));else base64.push('=');
        }
      }

      return base64.join('');
    },
    // Convert a base-64 string to a byte array
    base64ToBytes: function base64ToBytes(base64) {
      // Remove non-base-64 characters
      base64 = base64.replace(/[^A-Z0-9+\/]/ig, '');

      for (var bytes = [], i = 0, imod4 = 0; i < base64.length; imod4 = ++i % 4) {
        if (imod4 == 0) continue;
        bytes.push((base64map.indexOf(base64.charAt(i - 1)) & Math.pow(2, -2 * imod4 + 8) - 1) << imod4 * 2 | base64map.indexOf(base64.charAt(i)) >>> 6 - imod4 * 2);
      }

      return bytes;
    }
  };
  module.exports = crypt;
})();

/***/ }),

/***/ 7412:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
 //parse Empty Node as self closing node

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var buildOptions = (__webpack_require__(6410).buildOptions);

var defaultOptions = {
  attributeNamePrefix: '@_',
  attrNodeName: false,
  textNodeName: '#text',
  ignoreAttributes: true,
  cdataTagName: false,
  cdataPositionChar: '\\c',
  format: false,
  indentBy: '  ',
  supressEmptyNode: false,
  tagValueProcessor: function tagValueProcessor(a) {
    return a;
  },
  attrValueProcessor: function attrValueProcessor(a) {
    return a;
  }
};
var props = ['attributeNamePrefix', 'attrNodeName', 'textNodeName', 'ignoreAttributes', 'cdataTagName', 'cdataPositionChar', 'format', 'indentBy', 'supressEmptyNode', 'tagValueProcessor', 'attrValueProcessor', 'rootNodeName' //when array as root
];

function Parser(options) {
  this.options = buildOptions(options, defaultOptions, props);

  if (this.options.ignoreAttributes || this.options.attrNodeName) {
    this.isAttribute = function
      /*a*/
    () {
      return false;
    };
  } else {
    this.attrPrefixLen = this.options.attributeNamePrefix.length;
    this.isAttribute = isAttribute;
  }

  if (this.options.cdataTagName) {
    this.isCDATA = isCDATA;
  } else {
    this.isCDATA = function
      /*a*/
    () {
      return false;
    };
  }

  this.replaceCDATAstr = replaceCDATAstr;
  this.replaceCDATAarr = replaceCDATAarr;
  this.processTextOrObjNode = processTextOrObjNode;

  if (this.options.format) {
    this.indentate = indentate;
    this.tagEndChar = '>\n';
    this.newLine = '\n';
  } else {
    this.indentate = function () {
      return '';
    };

    this.tagEndChar = '>';
    this.newLine = '';
  }

  if (this.options.supressEmptyNode) {
    this.buildTextNode = buildEmptyTextNode;
    this.buildObjNode = buildEmptyObjNode;
  } else {
    this.buildTextNode = buildTextValNode;
    this.buildObjNode = buildObjectNode;
  }

  this.buildTextValNode = buildTextValNode;
  this.buildObjectNode = buildObjectNode;
}

Parser.prototype.parse = function (jObj) {
  if (Array.isArray(jObj) && this.options.rootNodeName && this.options.rootNodeName.length > 1) {
    jObj = _defineProperty({}, this.options.rootNodeName, jObj);
  }

  return this.j2x(jObj, 0).val;
};

Parser.prototype.j2x = function (jObj, level) {
  var attrStr = '';
  var val = '';

  for (var key in jObj) {
    if (typeof jObj[key] === 'undefined') {// supress undefined node
    } else if (jObj[key] === null) {
      val += this.indentate(level) + '<' + key + '/' + this.tagEndChar;
    } else if (jObj[key] instanceof Date) {
      val += this.buildTextNode(jObj[key], key, '', level);
    } else if (_typeof(jObj[key]) !== 'object') {
      //premitive type
      var attr = this.isAttribute(key);

      if (attr) {
        attrStr += ' ' + attr + '="' + this.options.attrValueProcessor('' + jObj[key]) + '"';
      } else if (this.isCDATA(key)) {
        if (jObj[this.options.textNodeName]) {
          val += this.replaceCDATAstr(jObj[this.options.textNodeName], jObj[key]);
        } else {
          val += this.replaceCDATAstr('', jObj[key]);
        }
      } else {
        //tag value
        if (key === this.options.textNodeName) {
          if (jObj[this.options.cdataTagName]) {//value will added while processing cdata
          } else {
            val += this.options.tagValueProcessor('' + jObj[key]);
          }
        } else {
          val += this.buildTextNode(jObj[key], key, '', level);
        }
      }
    } else if (Array.isArray(jObj[key])) {
      //repeated nodes
      if (this.isCDATA(key)) {
        val += this.indentate(level);

        if (jObj[this.options.textNodeName]) {
          val += this.replaceCDATAarr(jObj[this.options.textNodeName], jObj[key]);
        } else {
          val += this.replaceCDATAarr('', jObj[key]);
        }
      } else {
        //nested nodes
        var arrLen = jObj[key].length;

        for (var j = 0; j < arrLen; j++) {
          var item = jObj[key][j];

          if (typeof item === 'undefined') {// supress undefined node
          } else if (item === null) {
            val += this.indentate(level) + '<' + key + '/' + this.tagEndChar;
          } else if (_typeof(item) === 'object') {
            val += this.processTextOrObjNode(item, key, level);
          } else {
            val += this.buildTextNode(item, key, '', level);
          }
        }
      }
    } else {
      //nested node
      if (this.options.attrNodeName && key === this.options.attrNodeName) {
        var Ks = Object.keys(jObj[key]);
        var L = Ks.length;

        for (var _j = 0; _j < L; _j++) {
          attrStr += ' ' + Ks[_j] + '="' + this.options.attrValueProcessor('' + jObj[key][Ks[_j]]) + '"';
        }
      } else {
        val += this.processTextOrObjNode(jObj[key], key, level);
      }
    }
  }

  return {
    attrStr: attrStr,
    val: val
  };
};

function processTextOrObjNode(object, key, level) {
  var result = this.j2x(object, level + 1);

  if (object[this.options.textNodeName] !== undefined && Object.keys(object).length === 1) {
    return this.buildTextNode(result.val, key, result.attrStr, level);
  } else {
    return this.buildObjNode(result.val, key, result.attrStr, level);
  }
}

function replaceCDATAstr(str, cdata) {
  str = this.options.tagValueProcessor('' + str);

  if (this.options.cdataPositionChar === '' || str === '') {
    return str + '<![CDATA[' + cdata + ']]' + this.tagEndChar;
  } else {
    return str.replace(this.options.cdataPositionChar, '<![CDATA[' + cdata + ']]' + this.tagEndChar);
  }
}

function replaceCDATAarr(str, cdata) {
  str = this.options.tagValueProcessor('' + str);

  if (this.options.cdataPositionChar === '' || str === '') {
    return str + '<![CDATA[' + cdata.join(']]><![CDATA[') + ']]' + this.tagEndChar;
  } else {
    for (var v in cdata) {
      str = str.replace(this.options.cdataPositionChar, '<![CDATA[' + cdata[v] + ']]>');
    }

    return str + this.newLine;
  }
}

function buildObjectNode(val, key, attrStr, level) {
  if (attrStr && val.indexOf('<') === -1) {
    return this.indentate(level) + '<' + key + attrStr + '>' + val + //+ this.newLine
    // + this.indentate(level)
    '</' + key + this.tagEndChar;
  } else {
    return this.indentate(level) + '<' + key + attrStr + this.tagEndChar + val + //+ this.newLine
    this.indentate(level) + '</' + key + this.tagEndChar;
  }
}

function buildEmptyObjNode(val, key, attrStr, level) {
  if (val !== '') {
    return this.buildObjectNode(val, key, attrStr, level);
  } else {
    return this.indentate(level) + '<' + key + attrStr + '/' + this.tagEndChar; //+ this.newLine
  }
}

function buildTextValNode(val, key, attrStr, level) {
  return this.indentate(level) + '<' + key + attrStr + '>' + this.options.tagValueProcessor(val) + '</' + key + this.tagEndChar;
}

function buildEmptyTextNode(val, key, attrStr, level) {
  if (val !== '') {
    return this.buildTextValNode(val, key, attrStr, level);
  } else {
    return this.indentate(level) + '<' + key + attrStr + '/' + this.tagEndChar;
  }
}

function indentate(level) {
  return this.options.indentBy.repeat(level);
}

function isAttribute(name
/*, options*/
) {
  if (name.startsWith(this.options.attributeNamePrefix)) {
    return name.substr(this.attrPrefixLen);
  } else {
    return false;
  }
}

function isCDATA(name) {
  return name === this.options.cdataTagName;
} //formatting
//indentation
//\n after each closing or self closing tag


module.exports = Parser;

/***/ }),

/***/ 3927:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


var char = function char(a) {
  return String.fromCharCode(a);
};

var chars = {
  nilChar: char(176),
  missingChar: char(201),
  nilPremitive: char(175),
  missingPremitive: char(200),
  emptyChar: char(178),
  emptyValue: char(177),
  //empty Premitive
  boundryChar: char(179),
  objStart: char(198),
  arrStart: char(204),
  arrayEnd: char(185)
};
var charsArr = [chars.nilChar, chars.nilPremitive, chars.missingChar, chars.missingPremitive, chars.boundryChar, chars.emptyChar, chars.emptyValue, chars.arrayEnd, chars.objStart, chars.arrStart];

var _e = function _e(node, e_schema, options) {
  if (typeof e_schema === 'string') {
    //premitive
    if (node && node[0] && node[0].val !== undefined) {
      return getValue(node[0].val, e_schema);
    } else {
      return getValue(node, e_schema);
    }
  } else {
    var hasValidData = hasData(node);

    if (hasValidData === true) {
      var str = '';

      if (Array.isArray(e_schema)) {
        //attributes can't be repeated. hence check in children tags only
        str += chars.arrStart;
        var itemSchema = e_schema[0]; //const itemSchemaType = itemSchema;

        var arr_len = node.length;

        if (typeof itemSchema === 'string') {
          for (var arr_i = 0; arr_i < arr_len; arr_i++) {
            var r = getValue(node[arr_i].val, itemSchema);
            str = processValue(str, r);
          }
        } else {
          for (var _arr_i = 0; _arr_i < arr_len; _arr_i++) {
            var _r = _e(node[_arr_i], itemSchema, options);

            str = processValue(str, _r);
          }
        }

        str += chars.arrayEnd; //indicates that next item is not array item
      } else {
        //object
        str += chars.objStart;
        var keys = Object.keys(e_schema);

        if (Array.isArray(node)) {
          node = node[0];
        }

        for (var i in keys) {
          var key = keys[i]; //a property defined in schema can be present either in attrsMap or children tags
          //options.textNodeName will not present in both maps, take it's value from val
          //options.attrNodeName will be present in attrsMap

          var _r2 = void 0;

          if (!options.ignoreAttributes && node.attrsMap && node.attrsMap[key]) {
            _r2 = _e(node.attrsMap[key], e_schema[key], options);
          } else if (key === options.textNodeName) {
            _r2 = _e(node.val, e_schema[key], options);
          } else {
            _r2 = _e(node.child[key], e_schema[key], options);
          }

          str = processValue(str, _r2);
        }
      }

      return str;
    } else {
      return hasValidData;
    }
  }
};

var getValue = function getValue(a
/*, type*/
) {
  switch (a) {
    case undefined:
      return chars.missingPremitive;

    case null:
      return chars.nilPremitive;

    case '':
      return chars.emptyValue;

    default:
      return a;
  }
};

var processValue = function processValue(str, r) {
  if (!isAppChar(r[0]) && !isAppChar(str[str.length - 1])) {
    str += chars.boundryChar;
  }

  return str + r;
};

var isAppChar = function isAppChar(ch) {
  return charsArr.indexOf(ch) !== -1;
};

function hasData(jObj) {
  if (jObj === undefined) {
    return chars.missingChar;
  } else if (jObj === null) {
    return chars.nilChar;
  } else if (jObj.child && Object.keys(jObj.child).length === 0 && (!jObj.attrsMap || Object.keys(jObj.attrsMap).length === 0)) {
    return chars.emptyChar;
  } else {
    return true;
  }
}

var x2j = __webpack_require__(4369);

var buildOptions = (__webpack_require__(6410).buildOptions);

var convert2nimn = function convert2nimn(node, e_schema, options) {
  options = buildOptions(options, x2j.defaultOptions, x2j.props);
  return _e(node, e_schema, options);
};

exports.convert2nimn = convert2nimn;

/***/ }),

/***/ 504:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

var util = __webpack_require__(6410);

var convertToJson = function convertToJson(node, options, parentTagName) {
  var jObj = {}; // when no child node or attr is present

  if (!options.alwaysCreateTextNode && (!node.child || util.isEmptyObject(node.child)) && (!node.attrsMap || util.isEmptyObject(node.attrsMap))) {
    return util.isExist(node.val) ? node.val : '';
  } // otherwise create a textnode if node has some text


  if (util.isExist(node.val) && !(typeof node.val === 'string' && (node.val === '' || node.val === options.cdataPositionChar))) {
    var asArray = util.isTagNameInArrayMode(node.tagname, options.arrayMode, parentTagName);
    jObj[options.textNodeName] = asArray ? [node.val] : node.val;
  }

  util.merge(jObj, node.attrsMap, options.arrayMode);
  var keys = Object.keys(node.child);

  for (var index = 0; index < keys.length; index++) {
    var tagName = keys[index];

    if (node.child[tagName] && node.child[tagName].length > 1) {
      jObj[tagName] = [];

      for (var tag in node.child[tagName]) {
        if (node.child[tagName].hasOwnProperty(tag)) {
          jObj[tagName].push(convertToJson(node.child[tagName][tag], options, tagName));
        }
      }
    } else {
      var result = convertToJson(node.child[tagName][0], options, tagName);

      var _asArray = options.arrayMode === true && _typeof(result) === 'object' || util.isTagNameInArrayMode(tagName, options.arrayMode, parentTagName);

      jObj[tagName] = _asArray ? [result] : result;
    }
  } //add value


  return jObj;
};

exports.convertToJson = convertToJson;

/***/ }),

/***/ 5651:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


var util = __webpack_require__(6410);

var buildOptions = (__webpack_require__(6410).buildOptions);

var x2j = __webpack_require__(4369); //TODO: do it later


var convertToJsonString = function convertToJsonString(node, options) {
  options = buildOptions(options, x2j.defaultOptions, x2j.props);
  options.indentBy = options.indentBy || '';
  return _cToJsonStr(node, options, 0);
};

var _cToJsonStr = function _cToJsonStr(node, options, level) {
  var jObj = '{'; //traver through all the children

  var keys = Object.keys(node.child);

  for (var index = 0; index < keys.length; index++) {
    var tagname = keys[index];

    if (node.child[tagname] && node.child[tagname].length > 1) {
      jObj += '"' + tagname + '" : [ ';

      for (var tag in node.child[tagname]) {
        jObj += _cToJsonStr(node.child[tagname][tag], options) + ' , ';
      }

      jObj = jObj.substr(0, jObj.length - 1) + ' ] '; //remove extra comma in last
    } else {
      jObj += '"' + tagname + '" : ' + _cToJsonStr(node.child[tagname][0], options) + ' ,';
    }
  }

  util.merge(jObj, node.attrsMap); //add attrsMap as new children

  if (util.isEmptyObject(jObj)) {
    return util.isExist(node.val) ? node.val : '';
  } else {
    if (util.isExist(node.val)) {
      if (!(typeof node.val === 'string' && (node.val === '' || node.val === options.cdataPositionChar))) {
        jObj += '"' + options.textNodeName + '" : ' + stringval(node.val);
      }
    }
  } //add value


  if (jObj[jObj.length - 1] === ',') {
    jObj = jObj.substr(0, jObj.length - 2);
  }

  return jObj + '}';
};

function stringval(v) {
  if (v === true || v === false || !isNaN(v)) {
    return v;
  } else {
    return '"' + v + '"';
  }
}

function indentate(options, level) {
  return options.indentBy.repeat(level);
}

exports.convertToJsonString = convertToJsonString;

/***/ }),

/***/ 8819:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


var nodeToJson = __webpack_require__(504);

var xmlToNodeobj = __webpack_require__(4369);

var x2xmlnode = __webpack_require__(4369);

var buildOptions = (__webpack_require__(6410).buildOptions);

var validator = __webpack_require__(1135);

exports.parse = function (xmlData) {
  var givenOptions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var validationOption = arguments.length > 2 ? arguments[2] : undefined;

  if (validationOption) {
    if (validationOption === true) validationOption = {};
    var result = validator.validate(xmlData, validationOption);

    if (result !== true) {
      throw Error(result.err.msg);
    }
  }

  if (givenOptions.parseTrueNumberOnly && givenOptions.parseNodeValue !== false && !givenOptions.numParseOptions) {
    givenOptions.numParseOptions = {
      leadingZeros: false
    };
  }

  var options = buildOptions(givenOptions, x2xmlnode.defaultOptions, x2xmlnode.props);
  var traversableObj = xmlToNodeobj.getTraversalObj(xmlData, options); //print(traversableObj, "  ");

  return nodeToJson.convertToJson(traversableObj, options);
};

exports.convertTonimn = __webpack_require__(3927).convert2nimn;
exports.getTraversalObj = xmlToNodeobj.getTraversalObj;
exports.convertToJson = nodeToJson.convertToJson;
exports.convertToJsonString = __webpack_require__(5651).convertToJsonString;
exports.validate = validator.validate;
exports.j2xParser = __webpack_require__(7412);

exports.parseToNimn = function (xmlData, schema, options) {
  return exports.convertTonimn(exports.getTraversalObj(xmlData, options), schema, options);
};

function print(xmlNode, indentation) {
  if (xmlNode) {
    console.log(indentation + "{");
    console.log(indentation + "  \"tagName\": \"" + xmlNode.tagname + "\", ");

    if (xmlNode.parent) {
      console.log(indentation + "  \"parent\": \"" + xmlNode.parent.tagname + "\", ");
    }

    console.log(indentation + "  \"val\": \"" + xmlNode.val + "\", ");
    console.log(indentation + "  \"attrs\": " + JSON.stringify(xmlNode.attrsMap, null, 4) + ", ");

    if (xmlNode.child) {
      console.log(indentation + "\"child\": {");
      var indentation2 = indentation + indentation;
      Object.keys(xmlNode.child).forEach(function (key) {
        var node = xmlNode.child[key];

        if (Array.isArray(node)) {
          console.log(indentation + "\"" + key + "\" :[");
          node.forEach(function (item, index) {
            //console.log(indentation + " \""+index+"\" : [")
            print(item, indentation2);
          });
          console.log(indentation + "],");
        } else {
          console.log(indentation + " \"" + key + "\" : {");
          print(node, indentation2);
          console.log(indentation + "},");
        }
      });
      console.log(indentation + "},");
    }

    console.log(indentation + "},");
  }
}

/***/ }),

/***/ 6410:
/***/ ((__unused_webpack_module, exports) => {

"use strict";


var nameStartChar = ":A-Za-z_\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD";
var nameChar = nameStartChar + "\\-.\\d\\u00B7\\u0300-\\u036F\\u203F-\\u2040";
var nameRegexp = '[' + nameStartChar + '][' + nameChar + ']*';
var regexName = new RegExp('^' + nameRegexp + '$');

var getAllMatches = function getAllMatches(string, regex) {
  var matches = [];
  var match = regex.exec(string);

  while (match) {
    var allmatches = [];
    allmatches.startIndex = regex.lastIndex - match[0].length;
    var len = match.length;

    for (var index = 0; index < len; index++) {
      allmatches.push(match[index]);
    }

    matches.push(allmatches);
    match = regex.exec(string);
  }

  return matches;
};

var isName = function isName(string) {
  var match = regexName.exec(string);
  return !(match === null || typeof match === 'undefined');
};

exports.isExist = function (v) {
  return typeof v !== 'undefined';
};

exports.isEmptyObject = function (obj) {
  return Object.keys(obj).length === 0;
};
/**
 * Copy all the properties of a into b.
 * @param {*} target
 * @param {*} a
 */


exports.merge = function (target, a, arrayMode) {
  if (a) {
    var keys = Object.keys(a); // will return an array of own properties

    var len = keys.length; //don't make it inline

    for (var i = 0; i < len; i++) {
      if (arrayMode === 'strict') {
        target[keys[i]] = [a[keys[i]]];
      } else {
        target[keys[i]] = a[keys[i]];
      }
    }
  }
};
/* exports.merge =function (b,a){
  return Object.assign(b,a);
} */


exports.getValue = function (v) {
  if (exports.isExist(v)) {
    return v;
  } else {
    return '';
  }
}; // const fakeCall = function(a) {return a;};
// const fakeCallNoReturn = function() {};


exports.buildOptions = function (options, defaultOptions, props) {
  var newOptions = {};

  if (!options) {
    return defaultOptions; //if there are not options
  }

  for (var i = 0; i < props.length; i++) {
    if (options[props[i]] !== undefined) {
      newOptions[props[i]] = options[props[i]];
    } else {
      newOptions[props[i]] = defaultOptions[props[i]];
    }
  }

  return newOptions;
};
/**
 * Check if a tag name should be treated as array
 *
 * @param tagName the node tagname
 * @param arrayMode the array mode option
 * @param parentTagName the parent tag name
 * @returns {boolean} true if node should be parsed as array
 */


exports.isTagNameInArrayMode = function (tagName, arrayMode, parentTagName) {
  if (arrayMode === false) {
    return false;
  } else if (arrayMode instanceof RegExp) {
    return arrayMode.test(tagName);
  } else if (typeof arrayMode === 'function') {
    return !!arrayMode(tagName, parentTagName);
  }

  return arrayMode === "strict";
};

exports.isName = isName;
exports.getAllMatches = getAllMatches;
exports.nameRegexp = nameRegexp;

/***/ }),

/***/ 1135:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


var util = __webpack_require__(6410);

var defaultOptions = {
  allowBooleanAttributes: false //A tag can have attributes without any value

};
var props = ['allowBooleanAttributes']; //const tagsPattern = new RegExp("<\\/?([\\w:\\-_\.]+)\\s*\/?>","g");

exports.validate = function (xmlData, options) {
  options = util.buildOptions(options, defaultOptions, props); //xmlData = xmlData.replace(/(\r\n|\n|\r)/gm,"");//make it single line
  //xmlData = xmlData.replace(/(^\s*<\?xml.*?\?>)/g,"");//Remove XML starting tag
  //xmlData = xmlData.replace(/(<!DOCTYPE[\s\w\"\.\/\-\:]+(\[.*\])*\s*>)/g,"");//Remove DOCTYPE

  var tags = [];
  var tagFound = false; //indicates that the root tag has been closed (aka. depth 0 has been reached)

  var reachedRoot = false;

  if (xmlData[0] === "\uFEFF") {
    // check for byte order mark (BOM)
    xmlData = xmlData.substr(1);
  }

  for (var i = 0; i < xmlData.length; i++) {
    if (xmlData[i] === '<' && xmlData[i + 1] === '?') {
      i += 2;
      i = readPI(xmlData, i);
      if (i.err) return i;
    } else if (xmlData[i] === '<') {
      //starting of tag
      //read until you reach to '>' avoiding any '>' in attribute value
      var tagStartPos = i;
      i++;

      if (xmlData[i] === '!') {
        i = readCommentAndCDATA(xmlData, i);
        continue;
      } else {
        var closingTag = false;

        if (xmlData[i] === '/') {
          //closing tag
          closingTag = true;
          i++;
        } //read tagname


        var tagName = '';

        for (; i < xmlData.length && xmlData[i] !== '>' && xmlData[i] !== ' ' && xmlData[i] !== '\t' && xmlData[i] !== '\n' && xmlData[i] !== '\r'; i++) {
          tagName += xmlData[i];
        }

        tagName = tagName.trim(); //console.log(tagName);

        if (tagName[tagName.length - 1] === '/') {
          //self closing tag without attributes
          tagName = tagName.substring(0, tagName.length - 1); //continue;

          i--;
        }

        if (!validateTagName(tagName)) {
          var msg = void 0;

          if (tagName.trim().length === 0) {
            msg = "Invalid space after '<'.";
          } else {
            msg = "Tag '" + tagName + "' is an invalid name.";
          }

          return getErrorObject('InvalidTag', msg, getLineNumberForPosition(xmlData, i));
        }

        var result = readAttributeStr(xmlData, i);

        if (result === false) {
          return getErrorObject('InvalidAttr', "Attributes for '" + tagName + "' have open quote.", getLineNumberForPosition(xmlData, i));
        }

        var attrStr = result.value;
        i = result.index;

        if (attrStr[attrStr.length - 1] === '/') {
          //self closing tag
          var attrStrStart = i - attrStr.length;
          attrStr = attrStr.substring(0, attrStr.length - 1);
          var isValid = validateAttributeString(attrStr, options);

          if (isValid === true) {
            tagFound = true; //continue; //text may presents after self closing tag
          } else {
            //the result from the nested function returns the position of the error within the attribute
            //in order to get the 'true' error line, we need to calculate the position where the attribute begins (i - attrStr.length) and then add the position within the attribute
            //this gives us the absolute index in the entire xml, which we can use to find the line at last
            return getErrorObject(isValid.err.code, isValid.err.msg, getLineNumberForPosition(xmlData, attrStrStart + isValid.err.line));
          }
        } else if (closingTag) {
          if (!result.tagClosed) {
            return getErrorObject('InvalidTag', "Closing tag '" + tagName + "' doesn't have proper closing.", getLineNumberForPosition(xmlData, i));
          } else if (attrStr.trim().length > 0) {
            return getErrorObject('InvalidTag', "Closing tag '" + tagName + "' can't have attributes or invalid starting.", getLineNumberForPosition(xmlData, tagStartPos));
          } else {
            var otg = tags.pop();

            if (tagName !== otg.tagName) {
              var openPos = getLineNumberForPosition(xmlData, otg.tagStartPos);
              return getErrorObject('InvalidTag', "Expected closing tag '" + otg.tagName + "' (opened in line " + openPos.line + ", col " + openPos.col + ") instead of closing tag '" + tagName + "'.", getLineNumberForPosition(xmlData, tagStartPos));
            } //when there are no more tags, we reached the root level.


            if (tags.length == 0) {
              reachedRoot = true;
            }
          }
        } else {
          var _isValid = validateAttributeString(attrStr, options);

          if (_isValid !== true) {
            //the result from the nested function returns the position of the error within the attribute
            //in order to get the 'true' error line, we need to calculate the position where the attribute begins (i - attrStr.length) and then add the position within the attribute
            //this gives us the absolute index in the entire xml, which we can use to find the line at last
            return getErrorObject(_isValid.err.code, _isValid.err.msg, getLineNumberForPosition(xmlData, i - attrStr.length + _isValid.err.line));
          } //if the root level has been reached before ...


          if (reachedRoot === true) {
            return getErrorObject('InvalidXml', 'Multiple possible root nodes found.', getLineNumberForPosition(xmlData, i));
          } else {
            tags.push({
              tagName: tagName,
              tagStartPos: tagStartPos
            });
          }

          tagFound = true;
        } //skip tag text value
        //It may include comments and CDATA value


        for (i++; i < xmlData.length; i++) {
          if (xmlData[i] === '<') {
            if (xmlData[i + 1] === '!') {
              //comment or CADATA
              i++;
              i = readCommentAndCDATA(xmlData, i);
              continue;
            } else if (xmlData[i + 1] === '?') {
              i = readPI(xmlData, ++i);
              if (i.err) return i;
            } else {
              break;
            }
          } else if (xmlData[i] === '&') {
            var afterAmp = validateAmpersand(xmlData, i);
            if (afterAmp == -1) return getErrorObject('InvalidChar', "char '&' is not expected.", getLineNumberForPosition(xmlData, i));
            i = afterAmp;
          }
        } //end of reading tag text value


        if (xmlData[i] === '<') {
          i--;
        }
      }
    } else {
      if (xmlData[i] === ' ' || xmlData[i] === '\t' || xmlData[i] === '\n' || xmlData[i] === '\r') {
        continue;
      }

      return getErrorObject('InvalidChar', "char '" + xmlData[i] + "' is not expected.", getLineNumberForPosition(xmlData, i));
    }
  }

  if (!tagFound) {
    return getErrorObject('InvalidXml', 'Start tag expected.', 1);
  } else if (tags.length == 1) {
    return getErrorObject('InvalidTag', "Unclosed tag '" + tags[0].tagName + "'.", getLineNumberForPosition(xmlData, tags[0].tagStartPos));
  } else if (tags.length > 0) {
    return getErrorObject('InvalidXml', "Invalid '" + JSON.stringify(tags.map(function (t) {
      return t.tagName;
    }), null, 4).replace(/\r?\n/g, '') + "' found.", {
      line: 1,
      col: 1
    });
  }

  return true;
};
/**
 * Read Processing insstructions and skip
 * @param {*} xmlData
 * @param {*} i
 */


function readPI(xmlData, i) {
  var start = i;

  for (; i < xmlData.length; i++) {
    if (xmlData[i] == '?' || xmlData[i] == ' ') {
      //tagname
      var tagname = xmlData.substr(start, i - start);

      if (i > 5 && tagname === 'xml') {
        return getErrorObject('InvalidXml', 'XML declaration allowed only at the start of the document.', getLineNumberForPosition(xmlData, i));
      } else if (xmlData[i] == '?' && xmlData[i + 1] == '>') {
        //check if valid attribut string
        i++;
        break;
      } else {
        continue;
      }
    }
  }

  return i;
}

function readCommentAndCDATA(xmlData, i) {
  if (xmlData.length > i + 5 && xmlData[i + 1] === '-' && xmlData[i + 2] === '-') {
    //comment
    for (i += 3; i < xmlData.length; i++) {
      if (xmlData[i] === '-' && xmlData[i + 1] === '-' && xmlData[i + 2] === '>') {
        i += 2;
        break;
      }
    }
  } else if (xmlData.length > i + 8 && xmlData[i + 1] === 'D' && xmlData[i + 2] === 'O' && xmlData[i + 3] === 'C' && xmlData[i + 4] === 'T' && xmlData[i + 5] === 'Y' && xmlData[i + 6] === 'P' && xmlData[i + 7] === 'E') {
    var angleBracketsCount = 1;

    for (i += 8; i < xmlData.length; i++) {
      if (xmlData[i] === '<') {
        angleBracketsCount++;
      } else if (xmlData[i] === '>') {
        angleBracketsCount--;

        if (angleBracketsCount === 0) {
          break;
        }
      }
    }
  } else if (xmlData.length > i + 9 && xmlData[i + 1] === '[' && xmlData[i + 2] === 'C' && xmlData[i + 3] === 'D' && xmlData[i + 4] === 'A' && xmlData[i + 5] === 'T' && xmlData[i + 6] === 'A' && xmlData[i + 7] === '[') {
    for (i += 8; i < xmlData.length; i++) {
      if (xmlData[i] === ']' && xmlData[i + 1] === ']' && xmlData[i + 2] === '>') {
        i += 2;
        break;
      }
    }
  }

  return i;
}

var doubleQuote = '"';
var singleQuote = "'";
/**
 * Keep reading xmlData until '<' is found outside the attribute value.
 * @param {string} xmlData
 * @param {number} i
 */

function readAttributeStr(xmlData, i) {
  var attrStr = '';
  var startChar = '';
  var tagClosed = false;

  for (; i < xmlData.length; i++) {
    if (xmlData[i] === doubleQuote || xmlData[i] === singleQuote) {
      if (startChar === '') {
        startChar = xmlData[i];
      } else if (startChar !== xmlData[i]) {//if vaue is enclosed with double quote then single quotes are allowed inside the value and vice versa
      } else {
        startChar = '';
      }
    } else if (xmlData[i] === '>') {
      if (startChar === '') {
        tagClosed = true;
        break;
      }
    }

    attrStr += xmlData[i];
  }

  if (startChar !== '') {
    return false;
  }

  return {
    value: attrStr,
    index: i,
    tagClosed: tagClosed
  };
}
/**
 * Select all the attributes whether valid or invalid.
 */


var validAttrStrRegxp = new RegExp('(\\s*)([^\\s=]+)(\\s*=)?(\\s*([\'"])(([\\s\\S])*?)\\5)?', 'g'); //attr, ="sd", a="amit's", a="sd"b="saf", ab  cd=""

function validateAttributeString(attrStr, options) {
  //console.log("start:"+attrStr+":end");
  //if(attrStr.trim().length === 0) return true; //empty string
  var matches = util.getAllMatches(attrStr, validAttrStrRegxp);
  var attrNames = {};

  for (var i = 0; i < matches.length; i++) {
    if (matches[i][1].length === 0) {
      //nospace before attribute name: a="sd"b="saf"
      return getErrorObject('InvalidAttr', "Attribute '" + matches[i][2] + "' has no space in starting.", getPositionFromMatch(matches[i]));
    } else if (matches[i][3] === undefined && !options.allowBooleanAttributes) {
      //independent attribute: ab
      return getErrorObject('InvalidAttr', "boolean attribute '" + matches[i][2] + "' is not allowed.", getPositionFromMatch(matches[i]));
    }
    /* else if(matches[i][6] === undefined){//attribute without value: ab=
                    return { err: { code:"InvalidAttr",msg:"attribute " + matches[i][2] + " has no value assigned."}};
                } */


    var attrName = matches[i][2];

    if (!validateAttrName(attrName)) {
      return getErrorObject('InvalidAttr', "Attribute '" + attrName + "' is an invalid name.", getPositionFromMatch(matches[i]));
    }

    if (!attrNames.hasOwnProperty(attrName)) {
      //check for duplicate attribute.
      attrNames[attrName] = 1;
    } else {
      return getErrorObject('InvalidAttr', "Attribute '" + attrName + "' is repeated.", getPositionFromMatch(matches[i]));
    }
  }

  return true;
}

function validateNumberAmpersand(xmlData, i) {
  var re = /\d/;

  if (xmlData[i] === 'x') {
    i++;
    re = /[\da-fA-F]/;
  }

  for (; i < xmlData.length; i++) {
    if (xmlData[i] === ';') return i;
    if (!xmlData[i].match(re)) break;
  }

  return -1;
}

function validateAmpersand(xmlData, i) {
  // https://www.w3.org/TR/xml/#dt-charref
  i++;
  if (xmlData[i] === ';') return -1;

  if (xmlData[i] === '#') {
    i++;
    return validateNumberAmpersand(xmlData, i);
  }

  var count = 0;

  for (; i < xmlData.length; i++, count++) {
    if (xmlData[i].match(/\w/) && count < 20) continue;
    if (xmlData[i] === ';') break;
    return -1;
  }

  return i;
}

function getErrorObject(code, message, lineNumber) {
  return {
    err: {
      code: code,
      msg: message,
      line: lineNumber.line || lineNumber,
      col: lineNumber.col
    }
  };
}

function validateAttrName(attrName) {
  return util.isName(attrName);
} // const startsWithXML = /^xml/i;


function validateTagName(tagname) {
  return util.isName(tagname)
  /* && !tagname.match(startsWithXML) */
  ;
} //this function returns the line number for the character at the given index


function getLineNumberForPosition(xmlData, index) {
  var lines = xmlData.substring(0, index).split(/\r?\n/);
  return {
    line: lines.length,
    // column number is last line's length + 1, because column numbering starts at 1:
    col: lines[lines.length - 1].length + 1
  };
} //this function returns the position of the first character of match within attrStr


function getPositionFromMatch(match) {
  return match.startIndex + match[1].length;
}

/***/ }),

/***/ 6613:
/***/ ((module) => {

"use strict";


module.exports = function (tagname, parent, val) {
  this.tagname = tagname;
  this.parent = parent;
  this.child = {}; //child tags

  this.attrsMap = {}; //attributes map

  this.val = val; //text only

  this.addChild = function (child) {
    if (Array.isArray(this.child[child.tagname])) {
      //already presents
      this.child[child.tagname].push(child);
    } else {
      this.child[child.tagname] = [child];
    }
  };
};

/***/ }),

/***/ 4369:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


var util = __webpack_require__(6410);

var buildOptions = (__webpack_require__(6410).buildOptions);

var xmlNode = __webpack_require__(6613);

var toNumber = __webpack_require__(5512);

var regx = '<((!\\[CDATA\\[([\\s\\S]*?)(]]>))|((NAME:)?(NAME))([^>]*)>|((\\/)(NAME)\\s*>))([^<]*)'.replace(/NAME/g, util.nameRegexp); //const tagsRegx = new RegExp("<(\\/?[\\w:\\-\._]+)([^>]*)>(\\s*"+cdataRegx+")*([^<]+)?","g");
//const tagsRegx = new RegExp("<(\\/?)((\\w*:)?([\\w:\\-\._]+))([^>]*)>([^<]*)("+cdataRegx+"([^<]*))*([^<]+)?","g");
//polyfill

if (!Number.parseInt && window.parseInt) {
  Number.parseInt = window.parseInt;
}

if (!Number.parseFloat && window.parseFloat) {
  Number.parseFloat = window.parseFloat;
}

var defaultOptions = {
  attributeNamePrefix: '@_',
  attrNodeName: false,
  textNodeName: '#text',
  ignoreAttributes: true,
  ignoreNameSpace: false,
  allowBooleanAttributes: false,
  //a tag can have attributes without any value
  //ignoreRootElement : false,
  parseNodeValue: true,
  parseAttributeValue: false,
  arrayMode: false,
  trimValues: true,
  //Trim string values of tag and attributes
  cdataTagName: false,
  cdataPositionChar: '\\c',
  numParseOptions: {
    hex: true,
    leadingZeros: true
  },
  tagValueProcessor: function tagValueProcessor(a, tagName) {
    return a;
  },
  attrValueProcessor: function attrValueProcessor(a, attrName) {
    return a;
  },
  stopNodes: [],
  alwaysCreateTextNode: false //decodeStrict: false,

};
exports.defaultOptions = defaultOptions;
var props = ['attributeNamePrefix', 'attrNodeName', 'textNodeName', 'ignoreAttributes', 'ignoreNameSpace', 'allowBooleanAttributes', 'parseNodeValue', 'parseAttributeValue', 'arrayMode', 'trimValues', 'cdataTagName', 'cdataPositionChar', 'tagValueProcessor', 'attrValueProcessor', 'parseTrueNumberOnly', 'numParseOptions', 'stopNodes', 'alwaysCreateTextNode'];
exports.props = props;
/**
 * Trim -> valueProcessor -> parse value
 * @param {string} tagName
 * @param {string} val
 * @param {object} options
 */

function processTagValue(tagName, val, options) {
  if (val) {
    if (options.trimValues) {
      val = val.trim();
    }

    val = options.tagValueProcessor(val, tagName);
    val = parseValue(val, options.parseNodeValue, options.numParseOptions);
  }

  return val;
}

function resolveNameSpace(tagname, options) {
  if (options.ignoreNameSpace) {
    var tags = tagname.split(':');
    var prefix = tagname.charAt(0) === '/' ? '/' : '';

    if (tags[0] === 'xmlns') {
      return '';
    }

    if (tags.length === 2) {
      tagname = prefix + tags[1];
    }
  }

  return tagname;
}

function parseValue(val, shouldParse, options) {
  if (shouldParse && typeof val === 'string') {
    //console.log(options)
    var newval = val.trim();
    if (newval === 'true') return true;else if (newval === 'false') return false;else return toNumber(val, options);
  } else {
    if (util.isExist(val)) {
      return val;
    } else {
      return '';
    }
  }
} //TODO: change regex to capture NS
//const attrsRegx = new RegExp("([\\w\\-\\.\\:]+)\\s*=\\s*(['\"])((.|\n)*?)\\2","gm");


var attrsRegx = new RegExp('([^\\s=]+)\\s*(=\\s*([\'"])(.*?)\\3)?', 'g');

function buildAttributesMap(attrStr, options) {
  if (!options.ignoreAttributes && typeof attrStr === 'string') {
    attrStr = attrStr.replace(/\r?\n/g, ' '); //attrStr = attrStr || attrStr.trim();

    var matches = util.getAllMatches(attrStr, attrsRegx);
    var len = matches.length; //don't make it inline

    var attrs = {};

    for (var i = 0; i < len; i++) {
      var attrName = resolveNameSpace(matches[i][1], options);

      if (attrName.length) {
        if (matches[i][4] !== undefined) {
          if (options.trimValues) {
            matches[i][4] = matches[i][4].trim();
          }

          matches[i][4] = options.attrValueProcessor(matches[i][4], attrName);
          attrs[options.attributeNamePrefix + attrName] = parseValue(matches[i][4], options.parseAttributeValue, options.numParseOptions);
        } else if (options.allowBooleanAttributes) {
          attrs[options.attributeNamePrefix + attrName] = true;
        }
      }
    }

    if (!Object.keys(attrs).length) {
      return;
    }

    if (options.attrNodeName) {
      var attrCollection = {};
      attrCollection[options.attrNodeName] = attrs;
      return attrCollection;
    }

    return attrs;
  }
}

var getTraversalObj = function getTraversalObj(xmlData, options) {
  xmlData = xmlData.replace(/\r\n?/g, "\n");
  options = buildOptions(options, defaultOptions, props);
  var xmlObj = new xmlNode('!xml');
  var currentNode = xmlObj;
  var textData = ""; //function match(xmlData){

  for (var i = 0; i < xmlData.length; i++) {
    var ch = xmlData[i];

    if (ch === '<') {
      if (xmlData[i + 1] === '/') {
        //Closing Tag
        var closeIndex = findClosingIndex(xmlData, ">", i, "Closing Tag is not closed.");
        var tagName = xmlData.substring(i + 2, closeIndex).trim();

        if (options.ignoreNameSpace) {
          var colonIndex = tagName.indexOf(":");

          if (colonIndex !== -1) {
            tagName = tagName.substr(colonIndex + 1);
          }
        }
        /* if (currentNode.parent) {
          currentNode.parent.val = util.getValue(currentNode.parent.val) + '' + processTagValue2(tagName, textData , options);
        } */


        if (currentNode) {
          if (currentNode.val) {
            currentNode.val = util.getValue(currentNode.val) + '' + processTagValue(tagName, textData, options);
          } else {
            currentNode.val = processTagValue(tagName, textData, options);
          }
        }

        if (options.stopNodes.length && options.stopNodes.includes(currentNode.tagname)) {
          currentNode.child = [];

          if (currentNode.attrsMap == undefined) {
            currentNode.attrsMap = {};
          }

          currentNode.val = xmlData.substr(currentNode.startIndex + 1, i - currentNode.startIndex - 1);
        }

        currentNode = currentNode.parent;
        textData = "";
        i = closeIndex;
      } else if (xmlData[i + 1] === '?') {
        i = findClosingIndex(xmlData, "?>", i, "Pi Tag is not closed.");
      } else if (xmlData.substr(i + 1, 3) === '!--') {
        i = findClosingIndex(xmlData, "-->", i, "Comment is not closed.");
      } else if (xmlData.substr(i + 1, 2) === '!D') {
        var _closeIndex = findClosingIndex(xmlData, ">", i, "DOCTYPE is not closed.");

        var tagExp = xmlData.substring(i, _closeIndex);

        if (tagExp.indexOf("[") >= 0) {
          i = xmlData.indexOf("]>", i) + 1;
        } else {
          i = _closeIndex;
        }
      } else if (xmlData.substr(i + 1, 2) === '![') {
        var _closeIndex2 = findClosingIndex(xmlData, "]]>", i, "CDATA is not closed.") - 2;

        var _tagExp = xmlData.substring(i + 9, _closeIndex2); //considerations
        //1. CDATA will always have parent node
        //2. A tag with CDATA is not a leaf node so it's value would be string type.


        if (textData) {
          currentNode.val = util.getValue(currentNode.val) + '' + processTagValue(currentNode.tagname, textData, options);
          textData = "";
        }

        if (options.cdataTagName) {
          //add cdata node
          var childNode = new xmlNode(options.cdataTagName, currentNode, _tagExp);
          currentNode.addChild(childNode); //for backtracking

          currentNode.val = util.getValue(currentNode.val) + options.cdataPositionChar; //add rest value to parent node

          if (_tagExp) {
            childNode.val = _tagExp;
          }
        } else {
          currentNode.val = (currentNode.val || '') + (_tagExp || '');
        }

        i = _closeIndex2 + 2;
      } else {
        //Opening tag
        var result = closingIndexForOpeningTag(xmlData, i + 1);
        var _tagExp2 = result.data;
        var _closeIndex3 = result.index;

        var separatorIndex = _tagExp2.indexOf(" ");

        var _tagName = _tagExp2;
        var shouldBuildAttributesMap = true;

        if (separatorIndex !== -1) {
          _tagName = _tagExp2.substr(0, separatorIndex).replace(/\s\s*$/, '');
          _tagExp2 = _tagExp2.substr(separatorIndex + 1);
        }

        if (options.ignoreNameSpace) {
          var _colonIndex = _tagName.indexOf(":");

          if (_colonIndex !== -1) {
            _tagName = _tagName.substr(_colonIndex + 1);
            shouldBuildAttributesMap = _tagName !== result.data.substr(_colonIndex + 1);
          }
        } //save text to parent node


        if (currentNode && textData) {
          if (currentNode.tagname !== '!xml') {
            currentNode.val = util.getValue(currentNode.val) + '' + processTagValue(currentNode.tagname, textData, options);
          }
        }

        if (_tagExp2.length > 0 && _tagExp2.lastIndexOf("/") === _tagExp2.length - 1) {
          //selfClosing tag
          if (_tagName[_tagName.length - 1] === "/") {
            //remove trailing '/'
            _tagName = _tagName.substr(0, _tagName.length - 1);
            _tagExp2 = _tagName;
          } else {
            _tagExp2 = _tagExp2.substr(0, _tagExp2.length - 1);
          }

          var _childNode = new xmlNode(_tagName, currentNode, '');

          if (_tagName !== _tagExp2) {
            _childNode.attrsMap = buildAttributesMap(_tagExp2, options);
          }

          currentNode.addChild(_childNode);
        } else {
          //opening tag
          var _childNode2 = new xmlNode(_tagName, currentNode);

          if (options.stopNodes.length && options.stopNodes.includes(_childNode2.tagname)) {
            _childNode2.startIndex = _closeIndex3;
          }

          if (_tagName !== _tagExp2 && shouldBuildAttributesMap) {
            _childNode2.attrsMap = buildAttributesMap(_tagExp2, options);
          }

          currentNode.addChild(_childNode2);
          currentNode = _childNode2;
        }

        textData = "";
        i = _closeIndex3;
      }
    } else {
      textData += xmlData[i];
    }
  }

  return xmlObj;
};

function closingIndexForOpeningTag(data, i) {
  var attrBoundary;
  var tagExp = "";

  for (var index = i; index < data.length; index++) {
    var ch = data[index];

    if (attrBoundary) {
      if (ch === attrBoundary) attrBoundary = ""; //reset
    } else if (ch === '"' || ch === "'") {
      attrBoundary = ch;
    } else if (ch === '>') {
      return {
        data: tagExp,
        index: index
      };
    } else if (ch === '\t') {
      ch = " ";
    }

    tagExp += ch;
  }
}

function findClosingIndex(xmlData, str, i, errMsg) {
  var closingIndex = xmlData.indexOf(str, i);

  if (closingIndex === -1) {
    throw new Error(errMsg);
  } else {
    return closingIndex + str.length - 1;
  }
}

exports.getTraversalObj = getTraversalObj;

/***/ }),

/***/ 2519:
/***/ ((module) => {

function sequence() {
  for (var _len = arguments.length, methods = new Array(_len), _key = 0; _key < _len; _key++) {
    methods[_key] = arguments[_key];
  }

  if (methods.length === 0) {
    throw new Error("Failed creating sequence: No functions provided");
  }

  return function __executeSequence() {
    for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      args[_key2] = arguments[_key2];
    }

    var result = args;

    var _this = this;

    while (methods.length > 0) {
      var method = methods.shift();
      result = [method.apply(_this, result)];
    }

    return result[0];
  };
}

module.exports = {
  sequence: sequence
};

/***/ }),

/***/ 9254:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

var _require = __webpack_require__(2519),
    sequence = _require.sequence;

var HOT_PATCHER_TYPE = "@@HOTPATCHER";

var NOOP = function NOOP() {};

function createNewItem(method) {
  return {
    original: method,
    methods: [method],
    final: false
  };
}
/**
 * Hot patching manager class
 */


var HotPatcher = /*#__PURE__*/function () {
  function HotPatcher() {
    _classCallCheck(this, HotPatcher);

    this._configuration = {
      registry: {},
      getEmptyAction: "null"
    };
    this.__type__ = HOT_PATCHER_TYPE;
  }
  /**
   * Configuration object reference
   * @type {Object}
   * @memberof HotPatcher
   * @readonly
   */


  _createClass(HotPatcher, [{
    key: "configuration",
    get: function get() {
      return this._configuration;
    }
    /**
     * The action to take when a non-set method is requested
     * Possible values: null/throw
     * @type {String}
     * @memberof HotPatcher
     */

  }, {
    key: "getEmptyAction",
    get: function get() {
      return this.configuration.getEmptyAction;
    },
    set: function set(newAction) {
      this.configuration.getEmptyAction = newAction;
    }
    /**
     * Control another hot-patcher instance
     * Force the remote instance to use patched methods from calling instance
     * @param {HotPatcher} target The target instance to control
     * @param {Boolean=} allowTargetOverrides Allow the target to override patched methods on
     * the controller (default is false)
     * @memberof HotPatcher
     * @returns {HotPatcher} Returns self
     * @throws {Error} Throws if the target is invalid
     */

  }, {
    key: "control",
    value: function control(target) {
      var _this = this;

      var allowTargetOverrides = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

      if (!target || target.__type__ !== HOT_PATCHER_TYPE) {
        throw new Error("Failed taking control of target HotPatcher instance: Invalid type or object");
      }

      Object.keys(target.configuration.registry).forEach(function (foreignKey) {
        if (_this.configuration.registry.hasOwnProperty(foreignKey)) {
          if (allowTargetOverrides) {
            _this.configuration.registry[foreignKey] = Object.assign({}, target.configuration.registry[foreignKey]);
          }
        } else {
          _this.configuration.registry[foreignKey] = Object.assign({}, target.configuration.registry[foreignKey]);
        }
      });
      target._configuration = this.configuration;
      return this;
    }
    /**
     * Execute a patched method
     * @param {String} key The method key
     * @param {...*} args Arguments to pass to the method (optional)
     * @memberof HotPatcher
     * @see HotPatcher#get
     * @returns {*} The output of the called method
     */

  }, {
    key: "execute",
    value: function execute(key) {
      var method = this.get(key) || NOOP;

      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      return method.apply(void 0, args);
    }
    /**
     * Get a method for a key
     * @param {String} key The method key
     * @returns {Function|null} Returns the requested function or null if the function
     * does not exist and the host is configured to return null (and not throw)
     * @memberof HotPatcher
     * @throws {Error} Throws if the configuration specifies to throw and the method
     * does not exist
     * @throws {Error} Throws if the `getEmptyAction` value is invalid
     */

  }, {
    key: "get",
    value: function get(key) {
      var item = this.configuration.registry[key];

      if (!item) {
        switch (this.getEmptyAction) {
          case "null":
            return null;

          case "throw":
            throw new Error("Failed handling method request: No method provided for override: ".concat(key));

          default:
            throw new Error("Failed handling request which resulted in an empty method: Invalid empty-action specified: ".concat(this.getEmptyAction));
        }
      }

      return sequence.apply(void 0, _toConsumableArray(item.methods));
    }
    /**
     * Check if a method has been patched
     * @param {String} key The function key
     * @returns {Boolean} True if already patched
     * @memberof HotPatcher
     */

  }, {
    key: "isPatched",
    value: function isPatched(key) {
      return !!this.configuration.registry[key];
    }
    /**
     * @typedef {Object} PatchOptions
     * @property {Boolean=} chain - Whether or not to allow chaining execution. Chained
     *  execution allows for attaching multiple callbacks to a key, where the callbacks
     *  will be executed in order of when they were patched (oldest to newest), the
     *  values being passed from one method to another.
     */

    /**
     * Patch a method name
     * @param {String} key The method key to patch
     * @param {Function} method The function to set
     * @param {PatchOptions=} options Patch options
     * @memberof HotPatcher
     * @returns {HotPatcher} Returns self
     */

  }, {
    key: "patch",
    value: function patch(key, method) {
      var _ref = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {},
          _ref$chain = _ref.chain,
          chain = _ref$chain === void 0 ? false : _ref$chain;

      if (this.configuration.registry[key] && this.configuration.registry[key].final) {
        throw new Error("Failed patching '".concat(key, "': Method marked as being final"));
      }

      if (typeof method !== "function") {
        throw new Error("Failed patching '".concat(key, "': Provided method is not a function"));
      }

      if (chain) {
        // Add new method to the chain
        if (!this.configuration.registry[key]) {
          // New key, create item
          this.configuration.registry[key] = createNewItem(method);
        } else {
          // Existing, push the method
          this.configuration.registry[key].methods.push(method);
        }
      } else {
        // Replace the original
        if (this.isPatched(key)) {
          var original = this.configuration.registry[key].original;
          this.configuration.registry[key] = Object.assign(createNewItem(method), {
            original: original
          });
        } else {
          this.configuration.registry[key] = createNewItem(method);
        }
      }

      return this;
    }
    /**
     * Patch a method inline, execute it and return the value
     * Used for patching contents of functions. This method will not apply a patched
     * function if it has already been patched, allowing for external overrides to
     * function. It also means that the function is cached so that it is not
     * instantiated every time the outer function is invoked.
     * @param {String} key The function key to use
     * @param {Function} method The function to patch (once, only if not patched)
     * @param {...*} args Arguments to pass to the function
     * @returns {*} The output of the patched function
     * @memberof HotPatcher
     * @example
     *  function mySpecialFunction(a, b) {
     *      return hotPatcher.patchInline("func", (a, b) => {
     *          return a + b;
     *      }, a, b);
     *  }
     */

  }, {
    key: "patchInline",
    value: function patchInline(key, method) {
      if (!this.isPatched(key)) {
        this.patch(key, method);
      }

      for (var _len2 = arguments.length, args = new Array(_len2 > 2 ? _len2 - 2 : 0), _key2 = 2; _key2 < _len2; _key2++) {
        args[_key2 - 2] = arguments[_key2];
      }

      return this.execute.apply(this, [key].concat(args));
    }
    /**
     * Patch a method (or methods) in sequential-mode
     * See `patch()` with the option `chain: true`
     * @see patch
     * @param {String} key The key to patch
     * @param {...Function} methods The methods to patch
     * @returns {HotPatcher} Returns self
     * @memberof HotPatcher
     */

  }, {
    key: "plugin",
    value: function plugin(key) {
      var _this2 = this;

      for (var _len3 = arguments.length, methods = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
        methods[_key3 - 1] = arguments[_key3];
      }

      methods.forEach(function (method) {
        _this2.patch(key, method, {
          chain: true
        });
      });
      return this;
    }
    /**
     * Restore a patched method if it has been overridden
     * @param {String} key The method key
     * @memberof HotPatcher
     */

  }, {
    key: "restore",
    value: function restore(key) {
      if (!this.isPatched(key)) {
        throw new Error("Failed restoring method: No method present for key: ".concat(key));
      } else if (typeof this.configuration.registry[key].original !== "function") {
        throw new Error("Failed restoring method: Original method not found or of invalid type for key: ".concat(key));
      }

      this.configuration.registry[key].methods = [this.configuration.registry[key].original];
    }
    /**
     * Set a method as being final
     * This sets a method as having been finally overridden. Attempts at overriding
     * again will fail with an error.
     * @param {String} key The key to make final
     * @memberof HotPatcher
     * @returns {HotPatcher} Returns self
     */

  }, {
    key: "setFinal",
    value: function setFinal(key) {
      if (!this.configuration.registry.hasOwnProperty(key)) {
        throw new Error("Failed marking '".concat(key, "' as final: No method found for key"));
      }

      this.configuration.registry[key].final = true;
      return this;
    }
  }]);

  return HotPatcher;
}();

module.exports = HotPatcher;

/***/ }),

/***/ 163:
/***/ ((module) => {

/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
module.exports = function (obj) {
  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer);
};

function isBuffer(obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj);
} // For Node v0.10 support. Remove this eventually.


function isSlowBuffer(obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0));
}

/***/ }),

/***/ 6893:
/***/ ((__unused_webpack_module, exports) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports.isError = exports.inherit = exports.assertError = void 0;

function assertError(err) {
  if (!isError(err)) {
    throw new Error("Parameter was not an error");
  }
}

exports.assertError = assertError;

function inherit(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = Object.create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
}

exports.inherit = inherit;

function isError(err) {
  return objectToString(err) === "[object Error]" || err instanceof Error;
}

exports.isError = isError;

function objectToString(obj) {
  return Object.prototype.toString.call(obj);
}

/***/ }),

/***/ 9104:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";


var __createBinding = this && this.__createBinding || (Object.create ? function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  Object.defineProperty(o, k2, {
    enumerable: true,
    get: function get() {
      return m[k];
    }
  });
} : function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  o[k2] = m[k];
});

var __exportStar = this && this.__exportStar || function (m, exports) {
  for (var p in m) {
    if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
  }
};

Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports.Layerr = void 0;

var layerr_1 = __webpack_require__(2248);

Object.defineProperty(exports, "Layerr", ({
  enumerable: true,
  get: function get() {
    return layerr_1.Layerr;
  }
}));

__exportStar(__webpack_require__(8646), exports);

/***/ }),

/***/ 2248:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports.Layerr = void 0;

var error_1 = __webpack_require__(6893);

var tools_1 = __webpack_require__(7235);

function Layerr(errorOptionsOrMessage, messageText) {
  var args = Array.prototype.slice.call(arguments);

  if (this instanceof Layerr === false) {
    throw new Error("Cannot invoke 'Layerr' like a function: It must be called with 'new'");
  }

  var _tools_1$parseArgumen = tools_1.parseArguments(args),
      options = _tools_1$parseArgumen.options,
      shortMessage = _tools_1$parseArgumen.shortMessage;

  this.name = "Layerr";

  if (options.name && typeof options.name === "string") {
    this.name = options.name;
  }

  var message = shortMessage;

  if (options.cause) {
    Object.defineProperty(this, "_cause", {
      value: options.cause
    });
    message = "".concat(message, ": ").concat(options.cause.message);
  }

  this.message = message;
  Object.defineProperty(this, "_info", {
    value: {}
  });

  if (options.info && _typeof(options.info) === "object") {
    Object.assign(this._info, options.info);
  }

  Error.call(this, message);

  if (Error.captureStackTrace) {
    var ctor = options.constructorOpt || this.constructor;
    Error.captureStackTrace(this, ctor);
  }

  return this;
}

exports.Layerr = Layerr;
error_1.inherit(Layerr, Error);

Layerr.prototype.cause = function _getCause() {
  return Layerr.cause(this) || undefined;
};

Layerr.prototype.toString = function _toString() {
  var output = this.name || this.constructor.name || this.constructor.prototype.name;

  if (this.message) {
    output = "".concat(output, ": ").concat(this.message);
  }

  return output;
};

Layerr.cause = function __getCause(err) {
  error_1.assertError(err);
  return error_1.isError(err._cause) ? err._cause : null;
};

Layerr.fullStack = function __getFullStack(err) {
  error_1.assertError(err);
  var cause = Layerr.cause(err);

  if (cause) {
    return "".concat(err.stack, "\ncaused by: ").concat(Layerr.fullStack(cause));
  }

  return err.stack;
};

Layerr.info = function __getInfo(err) {
  error_1.assertError(err);
  var output = {};
  var cause = Layerr.cause(err);

  if (cause) {
    Object.assign(output, Layerr.info(cause));
  }

  if (err._info) {
    Object.assign(output, err._info);
  }

  return output;
};

/***/ }),

/***/ 7235:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports.parseArguments = void 0;

var error_1 = __webpack_require__(6893);

function parseArguments(args) {
  var options,
      shortMessage = "";

  if (args.length === 0) {
    options = {};
  } else if (error_1.isError(args[0])) {
    options = {
      cause: args[0]
    };
    shortMessage = args.slice(1).join(" ") || "";
  } else if (args[0] && _typeof(args[0]) === "object") {
    options = Object.assign({}, args[0]);
    shortMessage = args.slice(1).join(" ") || "";
  } else if (typeof args[0] === "string") {
    options = {};
    shortMessage = shortMessage = args.join(" ") || "";
  } else {
    throw new Error("Invalid arguments passed to Layerr");
  }

  return {
    options: options,
    shortMessage: shortMessage
  };
}

exports.parseArguments = parseArguments;

/***/ }),

/***/ 8646:
/***/ ((__unused_webpack_module, exports) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));

/***/ }),

/***/ 9243:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

(function () {
  var crypt = __webpack_require__(3718),
      utf8 = (__webpack_require__(5106).utf8),
      isBuffer = __webpack_require__(163),
      bin = (__webpack_require__(5106).bin),
      // The core
  md5 = function md5(message, options) {
    // Convert to byte array
    if (message.constructor == String) {
      if (options && options.encoding === 'binary') message = bin.stringToBytes(message);else message = utf8.stringToBytes(message);
    } else if (isBuffer(message)) message = Array.prototype.slice.call(message, 0);else if (!Array.isArray(message) && message.constructor !== Uint8Array) message = message.toString(); // else, assume byte array already

    var m = crypt.bytesToWords(message),
        l = message.length * 8,
        a = 1732584193,
        b = -271733879,
        c = -1732584194,
        d = 271733878; // Swap endian

    for (var i = 0; i < m.length; i++) {
      m[i] = (m[i] << 8 | m[i] >>> 24) & 0x00FF00FF | (m[i] << 24 | m[i] >>> 8) & 0xFF00FF00;
    } // Padding


    m[l >>> 5] |= 0x80 << l % 32;
    m[(l + 64 >>> 9 << 4) + 14] = l; // Method shortcuts

    var FF = md5._ff,
        GG = md5._gg,
        HH = md5._hh,
        II = md5._ii;

    for (var i = 0; i < m.length; i += 16) {
      var aa = a,
          bb = b,
          cc = c,
          dd = d;
      a = FF(a, b, c, d, m[i + 0], 7, -680876936);
      d = FF(d, a, b, c, m[i + 1], 12, -389564586);
      c = FF(c, d, a, b, m[i + 2], 17, 606105819);
      b = FF(b, c, d, a, m[i + 3], 22, -1044525330);
      a = FF(a, b, c, d, m[i + 4], 7, -176418897);
      d = FF(d, a, b, c, m[i + 5], 12, 1200080426);
      c = FF(c, d, a, b, m[i + 6], 17, -1473231341);
      b = FF(b, c, d, a, m[i + 7], 22, -45705983);
      a = FF(a, b, c, d, m[i + 8], 7, 1770035416);
      d = FF(d, a, b, c, m[i + 9], 12, -1958414417);
      c = FF(c, d, a, b, m[i + 10], 17, -42063);
      b = FF(b, c, d, a, m[i + 11], 22, -1990404162);
      a = FF(a, b, c, d, m[i + 12], 7, 1804603682);
      d = FF(d, a, b, c, m[i + 13], 12, -40341101);
      c = FF(c, d, a, b, m[i + 14], 17, -1502002290);
      b = FF(b, c, d, a, m[i + 15], 22, 1236535329);
      a = GG(a, b, c, d, m[i + 1], 5, -165796510);
      d = GG(d, a, b, c, m[i + 6], 9, -1069501632);
      c = GG(c, d, a, b, m[i + 11], 14, 643717713);
      b = GG(b, c, d, a, m[i + 0], 20, -373897302);
      a = GG(a, b, c, d, m[i + 5], 5, -701558691);
      d = GG(d, a, b, c, m[i + 10], 9, 38016083);
      c = GG(c, d, a, b, m[i + 15], 14, -660478335);
      b = GG(b, c, d, a, m[i + 4], 20, -405537848);
      a = GG(a, b, c, d, m[i + 9], 5, 568446438);
      d = GG(d, a, b, c, m[i + 14], 9, -1019803690);
      c = GG(c, d, a, b, m[i + 3], 14, -187363961);
      b = GG(b, c, d, a, m[i + 8], 20, 1163531501);
      a = GG(a, b, c, d, m[i + 13], 5, -1444681467);
      d = GG(d, a, b, c, m[i + 2], 9, -51403784);
      c = GG(c, d, a, b, m[i + 7], 14, 1735328473);
      b = GG(b, c, d, a, m[i + 12], 20, -1926607734);
      a = HH(a, b, c, d, m[i + 5], 4, -378558);
      d = HH(d, a, b, c, m[i + 8], 11, -2022574463);
      c = HH(c, d, a, b, m[i + 11], 16, 1839030562);
      b = HH(b, c, d, a, m[i + 14], 23, -35309556);
      a = HH(a, b, c, d, m[i + 1], 4, -1530992060);
      d = HH(d, a, b, c, m[i + 4], 11, 1272893353);
      c = HH(c, d, a, b, m[i + 7], 16, -155497632);
      b = HH(b, c, d, a, m[i + 10], 23, -1094730640);
      a = HH(a, b, c, d, m[i + 13], 4, 681279174);
      d = HH(d, a, b, c, m[i + 0], 11, -358537222);
      c = HH(c, d, a, b, m[i + 3], 16, -722521979);
      b = HH(b, c, d, a, m[i + 6], 23, 76029189);
      a = HH(a, b, c, d, m[i + 9], 4, -640364487);
      d = HH(d, a, b, c, m[i + 12], 11, -421815835);
      c = HH(c, d, a, b, m[i + 15], 16, 530742520);
      b = HH(b, c, d, a, m[i + 2], 23, -995338651);
      a = II(a, b, c, d, m[i + 0], 6, -198630844);
      d = II(d, a, b, c, m[i + 7], 10, 1126891415);
      c = II(c, d, a, b, m[i + 14], 15, -1416354905);
      b = II(b, c, d, a, m[i + 5], 21, -57434055);
      a = II(a, b, c, d, m[i + 12], 6, 1700485571);
      d = II(d, a, b, c, m[i + 3], 10, -1894986606);
      c = II(c, d, a, b, m[i + 10], 15, -1051523);
      b = II(b, c, d, a, m[i + 1], 21, -2054922799);
      a = II(a, b, c, d, m[i + 8], 6, 1873313359);
      d = II(d, a, b, c, m[i + 15], 10, -30611744);
      c = II(c, d, a, b, m[i + 6], 15, -1560198380);
      b = II(b, c, d, a, m[i + 13], 21, 1309151649);
      a = II(a, b, c, d, m[i + 4], 6, -145523070);
      d = II(d, a, b, c, m[i + 11], 10, -1120210379);
      c = II(c, d, a, b, m[i + 2], 15, 718787259);
      b = II(b, c, d, a, m[i + 9], 21, -343485551);
      a = a + aa >>> 0;
      b = b + bb >>> 0;
      c = c + cc >>> 0;
      d = d + dd >>> 0;
    }

    return crypt.endian([a, b, c, d]);
  }; // Auxiliary functions


  md5._ff = function (a, b, c, d, x, s, t) {
    var n = a + (b & c | ~b & d) + (x >>> 0) + t;
    return (n << s | n >>> 32 - s) + b;
  };

  md5._gg = function (a, b, c, d, x, s, t) {
    var n = a + (b & d | c & ~d) + (x >>> 0) + t;
    return (n << s | n >>> 32 - s) + b;
  };

  md5._hh = function (a, b, c, d, x, s, t) {
    var n = a + (b ^ c ^ d) + (x >>> 0) + t;
    return (n << s | n >>> 32 - s) + b;
  };

  md5._ii = function (a, b, c, d, x, s, t) {
    var n = a + (c ^ (b | ~d)) + (x >>> 0) + t;
    return (n << s | n >>> 32 - s) + b;
  }; // Package private blocksize


  md5._blocksize = 16;
  md5._digestsize = 16;

  module.exports = function (message, options) {
    if (message === undefined || message === null) throw new Error('Illegal argument ' + message);
    var digestbytes = crypt.wordsToBytes(md5(message, options));
    return options && options.asBytes ? digestbytes : options && options.asString ? bin.bytesToString(digestbytes) : crypt.bytesToHex(digestbytes);
  };
})();

/***/ }),

/***/ 1050:
/***/ ((module) => {

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

var isWindows = (typeof process === "undefined" ? "undefined" : _typeof(process)) === 'object' && process && process.platform === 'win32';
module.exports = isWindows ? {
  sep: '\\'
} : {
  sep: '/'
};

/***/ }),

/***/ 3000:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

var minimatch = module.exports = function (p, pattern) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  assertValidPattern(pattern); // shortcut: comments match nothing.

  if (!options.nocomment && pattern.charAt(0) === '#') {
    return false;
  }

  return new Minimatch(pattern, options).match(p);
};

module.exports = minimatch;

var path = __webpack_require__(1050);

minimatch.sep = path.sep;
var GLOBSTAR = Symbol('globstar **');
minimatch.GLOBSTAR = GLOBSTAR;

var expand = __webpack_require__(3637);

var plTypes = {
  '!': {
    open: '(?:(?!(?:',
    close: '))[^/]*?)'
  },
  '?': {
    open: '(?:',
    close: ')?'
  },
  '+': {
    open: '(?:',
    close: ')+'
  },
  '*': {
    open: '(?:',
    close: ')*'
  },
  '@': {
    open: '(?:',
    close: ')'
  }
}; // any single thing other than /
// don't need to escape / when using new RegExp()

var qmark = '[^/]'; // * => any number of characters

var star = qmark + '*?'; // ** when dots are allowed.  Anything goes, except .. and .
// not (^ or / followed by one or two dots followed by $ or /),
// followed by anything, any number of times.

var twoStarDot = '(?:(?!(?:\\\/|^)(?:\\.{1,2})($|\\\/)).)*?'; // not a ^ or / followed by a dot,
// followed by anything, any number of times.

var twoStarNoDot = '(?:(?!(?:\\\/|^)\\.).)*?'; // "abc" -> { a:true, b:true, c:true }

var charSet = function charSet(s) {
  return s.split('').reduce(function (set, c) {
    set[c] = true;
    return set;
  }, {});
}; // characters that need to be escaped in RegExp.


var reSpecials = charSet('().*{}+?[]^$\\!'); // characters that indicate we have to add the pattern start

var addPatternStartSet = charSet('[.('); // normalizes slashes.

var slashSplit = /\/+/;

minimatch.filter = function (pattern) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  return function (p, i, list) {
    return minimatch(p, pattern, options);
  };
};

var ext = function ext(a) {
  var b = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var t = {};
  Object.keys(a).forEach(function (k) {
    return t[k] = a[k];
  });
  Object.keys(b).forEach(function (k) {
    return t[k] = b[k];
  });
  return t;
};

minimatch.defaults = function (def) {
  if (!def || _typeof(def) !== 'object' || !Object.keys(def).length) {
    return minimatch;
  }

  var orig = minimatch;

  var m = function m(p, pattern, options) {
    return orig(p, pattern, ext(def, options));
  };

  m.Minimatch = /*#__PURE__*/function (_orig$Minimatch) {
    _inherits(Minimatch, _orig$Minimatch);

    var _super = _createSuper(Minimatch);

    function Minimatch(pattern, options) {
      _classCallCheck(this, Minimatch);

      return _super.call(this, pattern, ext(def, options));
    }

    return _createClass(Minimatch);
  }(orig.Minimatch);

  m.Minimatch.defaults = function (options) {
    return orig.defaults(ext(def, options)).Minimatch;
  };

  m.filter = function (pattern, options) {
    return orig.filter(pattern, ext(def, options));
  };

  m.defaults = function (options) {
    return orig.defaults(ext(def, options));
  };

  m.makeRe = function (pattern, options) {
    return orig.makeRe(pattern, ext(def, options));
  };

  m.braceExpand = function (pattern, options) {
    return orig.braceExpand(pattern, ext(def, options));
  };

  m.match = function (list, pattern, options) {
    return orig.match(list, pattern, ext(def, options));
  };

  return m;
}; // Brace expansion:
// a{b,c}d -> abd acd
// a{b,}c -> abc ac
// a{0..3}d -> a0d a1d a2d a3d
// a{b,c{d,e}f}g -> abg acdfg acefg
// a{b,c}d{e,f}g -> abdeg acdeg abdeg abdfg
//
// Invalid sets are not expanded.
// a{2..}b -> a{2..}b
// a{b}c -> a{b}c


minimatch.braceExpand = function (pattern, options) {
  return _braceExpand(pattern, options);
};

var _braceExpand = function braceExpand(pattern) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  assertValidPattern(pattern); // Thanks to Yeting Li <https://github.com/yetingli> for
  // improving this regexp to avoid a ReDOS vulnerability.

  if (options.nobrace || !/\{(?:(?!\{).)*\}/.test(pattern)) {
    // shortcut. no need to expand.
    return [pattern];
  }

  return expand(pattern);
};

var MAX_PATTERN_LENGTH = 1024 * 64;

var assertValidPattern = function assertValidPattern(pattern) {
  if (typeof pattern !== 'string') {
    throw new TypeError('invalid pattern');
  }

  if (pattern.length > MAX_PATTERN_LENGTH) {
    throw new TypeError('pattern is too long');
  }
}; // parse a component of the expanded set.
// At this point, no pattern may contain "/" in it
// so we're going to return a 2d array, where each entry is the full
// pattern, split on '/', and then turned into a regular expression.
// A regexp is made at the end which joins each array with an
// escaped /, and another full one which joins each regexp with |.
//
// Following the lead of Bash 4.1, note that "**" only has special meaning
// when it is the *only* thing in a path portion.  Otherwise, any series
// of * is equivalent to a single *.  Globstar behavior is enabled by
// default, and can be disabled by setting options.noglobstar.


var SUBPARSE = Symbol('subparse');

minimatch.makeRe = function (pattern, options) {
  return new Minimatch(pattern, options || {}).makeRe();
};

minimatch.match = function (list, pattern) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var mm = new Minimatch(pattern, options);
  list = list.filter(function (f) {
    return mm.match(f);
  });

  if (mm.options.nonull && !list.length) {
    list.push(pattern);
  }

  return list;
}; // replace stuff like \* with *


var globUnescape = function globUnescape(s) {
  return s.replace(/\\(.)/g, '$1');
};

var regExpEscape = function regExpEscape(s) {
  return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

var Minimatch = /*#__PURE__*/function () {
  function Minimatch(pattern, options) {
    _classCallCheck(this, Minimatch);

    assertValidPattern(pattern);
    if (!options) options = {};
    this.options = options;
    this.set = [];
    this.pattern = pattern;
    this.regexp = null;
    this.negate = false;
    this.comment = false;
    this.empty = false;
    this.partial = !!options.partial; // make the set of regexps etc.

    this.make();
  }

  _createClass(Minimatch, [{
    key: "debug",
    value: function debug() {}
  }, {
    key: "make",
    value: function make() {
      var _this = this;

      var pattern = this.pattern;
      var options = this.options; // empty patterns and comments match nothing.

      if (!options.nocomment && pattern.charAt(0) === '#') {
        this.comment = true;
        return;
      }

      if (!pattern) {
        this.empty = true;
        return;
      } // step 1: figure out negation, etc.


      this.parseNegate(); // step 2: expand braces

      var set = this.globSet = this.braceExpand();
      if (options.debug) this.debug = function () {
        var _console;

        return (_console = console).error.apply(_console, arguments);
      };
      this.debug(this.pattern, set); // step 3: now we have a set, so turn each one into a series of path-portion
      // matching patterns.
      // These will be regexps, except in the case of "**", which is
      // set to the GLOBSTAR object for globstar behavior,
      // and will not contain any / characters

      set = this.globParts = set.map(function (s) {
        return s.split(slashSplit);
      });
      this.debug(this.pattern, set); // glob --> regexps

      set = set.map(function (s, si, set) {
        return s.map(_this.parse, _this);
      });
      this.debug(this.pattern, set); // filter out everything that didn't compile properly.

      set = set.filter(function (s) {
        return s.indexOf(false) === -1;
      });
      this.debug(this.pattern, set);
      this.set = set;
    }
  }, {
    key: "parseNegate",
    value: function parseNegate() {
      if (this.options.nonegate) return;
      var pattern = this.pattern;
      var negate = false;
      var negateOffset = 0;

      for (var i = 0; i < pattern.length && pattern.charAt(i) === '!'; i++) {
        negate = !negate;
        negateOffset++;
      }

      if (negateOffset) this.pattern = pattern.substr(negateOffset);
      this.negate = negate;
    } // set partial to true to test if, for example,
    // "/a/b" matches the start of "/*/b/*/d"
    // Partial means, if you run out of file before you run
    // out of pattern, then that's fine, as long as all
    // the parts match.

  }, {
    key: "matchOne",
    value: function matchOne(file, pattern, partial) {
      var options = this.options;
      this.debug('matchOne', {
        'this': this,
        file: file,
        pattern: pattern
      });
      this.debug('matchOne', file.length, pattern.length);

      for (var fi = 0, pi = 0, fl = file.length, pl = pattern.length; fi < fl && pi < pl; fi++, pi++) {
        this.debug('matchOne loop');
        var p = pattern[pi];
        var f = file[fi];
        this.debug(pattern, p, f); // should be impossible.
        // some invalid regexp stuff in the set.

        /* istanbul ignore if */

        if (p === false) return false;

        if (p === GLOBSTAR) {
          this.debug('GLOBSTAR', [pattern, p, f]); // "**"
          // a/**/b/**/c would match the following:
          // a/b/x/y/z/c
          // a/x/y/z/b/c
          // a/b/x/b/x/c
          // a/b/c
          // To do this, take the rest of the pattern after
          // the **, and see if it would match the file remainder.
          // If so, return success.
          // If not, the ** "swallows" a segment, and try again.
          // This is recursively awful.
          //
          // a/**/b/**/c matching a/b/x/y/z/c
          // - a matches a
          // - doublestar
          //   - matchOne(b/x/y/z/c, b/**/c)
          //     - b matches b
          //     - doublestar
          //       - matchOne(x/y/z/c, c) -> no
          //       - matchOne(y/z/c, c) -> no
          //       - matchOne(z/c, c) -> no
          //       - matchOne(c, c) yes, hit

          var fr = fi;
          var pr = pi + 1;

          if (pr === pl) {
            this.debug('** at the end'); // a ** at the end will just swallow the rest.
            // We have found a match.
            // however, it will not swallow /.x, unless
            // options.dot is set.
            // . and .. are *never* matched by **, for explosively
            // exponential reasons.

            for (; fi < fl; fi++) {
              if (file[fi] === '.' || file[fi] === '..' || !options.dot && file[fi].charAt(0) === '.') return false;
            }

            return true;
          } // ok, let's see if we can swallow whatever we can.


          while (fr < fl) {
            var swallowee = file[fr];
            this.debug('\nglobstar while', file, fr, pattern, pr, swallowee); // XXX remove this slice.  Just pass the start index.

            if (this.matchOne(file.slice(fr), pattern.slice(pr), partial)) {
              this.debug('globstar found match!', fr, fl, swallowee); // found a match.

              return true;
            } else {
              // can't swallow "." or ".." ever.
              // can only swallow ".foo" when explicitly asked.
              if (swallowee === '.' || swallowee === '..' || !options.dot && swallowee.charAt(0) === '.') {
                this.debug('dot detected!', file, fr, pattern, pr);
                break;
              } // ** swallows a segment, and continue.


              this.debug('globstar swallow a segment, and continue');
              fr++;
            }
          } // no match was found.
          // However, in partial mode, we can't say this is necessarily over.
          // If there's more *pattern* left, then

          /* istanbul ignore if */


          if (partial) {
            // ran out of file
            this.debug('\n>>> no match, partial?', file, fr, pattern, pr);
            if (fr === fl) return true;
          }

          return false;
        } // something other than **
        // non-magic patterns just have to match exactly
        // patterns with magic have been turned into regexps.


        var hit;

        if (typeof p === 'string') {
          hit = f === p;
          this.debug('string match', p, f, hit);
        } else {
          hit = f.match(p);
          this.debug('pattern match', p, f, hit);
        }

        if (!hit) return false;
      } // Note: ending in / means that we'll get a final ""
      // at the end of the pattern.  This can only match a
      // corresponding "" at the end of the file.
      // If the file ends in /, then it can only match a
      // a pattern that ends in /, unless the pattern just
      // doesn't have any more for it. But, a/b/ should *not*
      // match "a/b/*", even though "" matches against the
      // [^/]*? pattern, except in partial mode, where it might
      // simply not be reached yet.
      // However, a/b/ should still satisfy a/*
      // now either we fell off the end of the pattern, or we're done.


      if (fi === fl && pi === pl) {
        // ran out of pattern and filename at the same time.
        // an exact hit!
        return true;
      } else if (fi === fl) {
        // ran out of file, but still had pattern left.
        // this is ok if we're doing the match as part of
        // a glob fs traversal.
        return partial;
      } else
        /* istanbul ignore else */
        if (pi === pl) {
          // ran out of pattern, still have file left.
          // this is only acceptable if we're on the very last
          // empty segment of a file with a trailing slash.
          // a/* should match a/b/
          return fi === fl - 1 && file[fi] === '';
        } // should be unreachable.

      /* istanbul ignore next */


      throw new Error('wtf?');
    }
  }, {
    key: "braceExpand",
    value: function braceExpand() {
      return _braceExpand(this.pattern, this.options);
    }
  }, {
    key: "parse",
    value: function parse(pattern, isSub) {
      var _this2 = this;

      assertValidPattern(pattern);
      var options = this.options; // shortcuts

      if (pattern === '**') {
        if (!options.noglobstar) return GLOBSTAR;else pattern = '*';
      }

      if (pattern === '') return '';
      var re = '';
      var hasMagic = !!options.nocase;
      var escaping = false; // ? => one single character

      var patternListStack = [];
      var negativeLists = [];
      var stateChar;
      var inClass = false;
      var reClassStart = -1;
      var classStart = -1;
      var cs;
      var pl;
      var sp; // . and .. never match anything that doesn't start with .,
      // even when options.dot is set.

      var patternStart = pattern.charAt(0) === '.' ? '' // anything
      // not (start or / followed by . or .. followed by / or end)
      : options.dot ? '(?!(?:^|\\\/)\\.{1,2}(?:$|\\\/))' : '(?!\\.)';

      var clearStateChar = function clearStateChar() {
        if (stateChar) {
          // we had some state-tracking character
          // that wasn't consumed by this pass.
          switch (stateChar) {
            case '*':
              re += star;
              hasMagic = true;
              break;

            case '?':
              re += qmark;
              hasMagic = true;
              break;

            default:
              re += '\\' + stateChar;
              break;
          }

          _this2.debug('clearStateChar %j %j', stateChar, re);

          stateChar = false;
        }
      };

      for (var i = 0, c; i < pattern.length && (c = pattern.charAt(i)); i++) {
        this.debug('%s\t%s %s %j', pattern, i, re, c); // skip over any that are escaped.

        if (escaping) {
          /* istanbul ignore next - completely not allowed, even escaped. */
          if (c === '/') {
            return false;
          }

          if (reSpecials[c]) {
            re += '\\';
          }

          re += c;
          escaping = false;
          continue;
        }

        switch (c) {
          /* istanbul ignore next */
          case '/':
            {
              // Should already be path-split by now.
              return false;
            }

          case '\\':
            clearStateChar();
            escaping = true;
            continue;
          // the various stateChar values
          // for the "extglob" stuff.

          case '?':
          case '*':
          case '+':
          case '@':
          case '!':
            this.debug('%s\t%s %s %j <-- stateChar', pattern, i, re, c); // all of those are literals inside a class, except that
            // the glob [!a] means [^a] in regexp

            if (inClass) {
              this.debug('  in class');
              if (c === '!' && i === classStart + 1) c = '^';
              re += c;
              continue;
            } // if we already have a stateChar, then it means
            // that there was something like ** or +? in there.
            // Handle the stateChar, then proceed with this one.


            this.debug('call clearStateChar %j', stateChar);
            clearStateChar();
            stateChar = c; // if extglob is disabled, then +(asdf|foo) isn't a thing.
            // just clear the statechar *now*, rather than even diving into
            // the patternList stuff.

            if (options.noext) clearStateChar();
            continue;

          case '(':
            if (inClass) {
              re += '(';
              continue;
            }

            if (!stateChar) {
              re += '\\(';
              continue;
            }

            patternListStack.push({
              type: stateChar,
              start: i - 1,
              reStart: re.length,
              open: plTypes[stateChar].open,
              close: plTypes[stateChar].close
            }); // negation is (?:(?!js)[^/]*)

            re += stateChar === '!' ? '(?:(?!(?:' : '(?:';
            this.debug('plType %j %j', stateChar, re);
            stateChar = false;
            continue;

          case ')':
            if (inClass || !patternListStack.length) {
              re += '\\)';
              continue;
            }

            clearStateChar();
            hasMagic = true;
            pl = patternListStack.pop(); // negation is (?:(?!js)[^/]*)
            // The others are (?:<pattern>)<type>

            re += pl.close;

            if (pl.type === '!') {
              negativeLists.push(pl);
            }

            pl.reEnd = re.length;
            continue;

          case '|':
            if (inClass || !patternListStack.length) {
              re += '\\|';
              continue;
            }

            clearStateChar();
            re += '|';
            continue;
          // these are mostly the same in regexp and glob

          case '[':
            // swallow any state-tracking char before the [
            clearStateChar();

            if (inClass) {
              re += '\\' + c;
              continue;
            }

            inClass = true;
            classStart = i;
            reClassStart = re.length;
            re += c;
            continue;

          case ']':
            //  a right bracket shall lose its special
            //  meaning and represent itself in
            //  a bracket expression if it occurs
            //  first in the list.  -- POSIX.2 2.8.3.2
            if (i === classStart + 1 || !inClass) {
              re += '\\' + c;
              continue;
            } // handle the case where we left a class open.
            // "[z-a]" is valid, equivalent to "\[z-a\]"
            // split where the last [ was, make sure we don't have
            // an invalid re. if so, re-walk the contents of the
            // would-be class to re-translate any characters that
            // were passed through as-is
            // TODO: It would probably be faster to determine this
            // without a try/catch and a new RegExp, but it's tricky
            // to do safely.  For now, this is safe and works.


            cs = pattern.substring(classStart + 1, i);

            try {
              RegExp('[' + cs + ']');
            } catch (er) {
              // not a valid class!
              sp = this.parse(cs, SUBPARSE);
              re = re.substr(0, reClassStart) + '\\[' + sp[0] + '\\]';
              hasMagic = hasMagic || sp[1];
              inClass = false;
              continue;
            } // finish up the class.


            hasMagic = true;
            inClass = false;
            re += c;
            continue;

          default:
            // swallow any state char that wasn't consumed
            clearStateChar();

            if (reSpecials[c] && !(c === '^' && inClass)) {
              re += '\\';
            }

            re += c;
            break;
        } // switch

      } // for
      // handle the case where we left a class open.
      // "[abc" is valid, equivalent to "\[abc"


      if (inClass) {
        // split where the last [ was, and escape it
        // this is a huge pita.  We now have to re-walk
        // the contents of the would-be class to re-translate
        // any characters that were passed through as-is
        cs = pattern.substr(classStart + 1);
        sp = this.parse(cs, SUBPARSE);
        re = re.substr(0, reClassStart) + '\\[' + sp[0];
        hasMagic = hasMagic || sp[1];
      } // handle the case where we had a +( thing at the *end*
      // of the pattern.
      // each pattern list stack adds 3 chars, and we need to go through
      // and escape any | chars that were passed through as-is for the regexp.
      // Go through and escape them, taking care not to double-escape any
      // | chars that were already escaped.


      for (pl = patternListStack.pop(); pl; pl = patternListStack.pop()) {
        var tail = void 0;
        tail = re.slice(pl.reStart + pl.open.length);
        this.debug('setting tail', re, pl); // maybe some even number of \, then maybe 1 \, followed by a |

        tail = tail.replace(/((?:\\{2}){0,64})(\\?)\|/g, function (_, $1, $2) {
          /* istanbul ignore else - should already be done */
          if (!$2) {
            // the | isn't already escaped, so escape it.
            $2 = '\\';
          } // need to escape all those slashes *again*, without escaping the
          // one that we need for escaping the | character.  As it works out,
          // escaping an even number of slashes can be done by simply repeating
          // it exactly after itself.  That's why this trick works.
          //
          // I am sorry that you have to see this.


          return $1 + $1 + $2 + '|';
        });
        this.debug('tail=%j\n   %s', tail, tail, pl, re);
        var t = pl.type === '*' ? star : pl.type === '?' ? qmark : '\\' + pl.type;
        hasMagic = true;
        re = re.slice(0, pl.reStart) + t + '\\(' + tail;
      } // handle trailing things that only matter at the very end.


      clearStateChar();

      if (escaping) {
        // trailing \\
        re += '\\\\';
      } // only need to apply the nodot start if the re starts with
      // something that could conceivably capture a dot


      var addPatternStart = addPatternStartSet[re.charAt(0)]; // Hack to work around lack of negative lookbehind in JS
      // A pattern like: *.!(x).!(y|z) needs to ensure that a name
      // like 'a.xyz.yz' doesn't match.  So, the first negative
      // lookahead, has to look ALL the way ahead, to the end of
      // the pattern.

      for (var n = negativeLists.length - 1; n > -1; n--) {
        var nl = negativeLists[n];
        var nlBefore = re.slice(0, nl.reStart);
        var nlFirst = re.slice(nl.reStart, nl.reEnd - 8);
        var nlAfter = re.slice(nl.reEnd);
        var nlLast = re.slice(nl.reEnd - 8, nl.reEnd) + nlAfter; // Handle nested stuff like *(*.js|!(*.json)), where open parens
        // mean that we should *not* include the ) in the bit that is considered
        // "after" the negated section.

        var openParensBefore = nlBefore.split('(').length - 1;
        var cleanAfter = nlAfter;

        for (var _i = 0; _i < openParensBefore; _i++) {
          cleanAfter = cleanAfter.replace(/\)[+*?]?/, '');
        }

        nlAfter = cleanAfter;
        var dollar = nlAfter === '' && isSub !== SUBPARSE ? '$' : '';
        re = nlBefore + nlFirst + nlAfter + dollar + nlLast;
      } // if the re is not "" at this point, then we need to make sure
      // it doesn't match against an empty path part.
      // Otherwise a/* will match a/, which it should not.


      if (re !== '' && hasMagic) {
        re = '(?=.)' + re;
      }

      if (addPatternStart) {
        re = patternStart + re;
      } // parsing just a piece of a larger pattern.


      if (isSub === SUBPARSE) {
        return [re, hasMagic];
      } // skip the regexp for non-magical patterns
      // unescape anything in it, though, so that it'll be
      // an exact match against a file etc.


      if (!hasMagic) {
        return globUnescape(pattern);
      }

      var flags = options.nocase ? 'i' : '';

      try {
        return Object.assign(new RegExp('^' + re + '$', flags), {
          _glob: pattern,
          _src: re
        });
      } catch (er)
      /* istanbul ignore next - should be impossible */
      {
        // If it was an invalid regular expression, then it can't match
        // anything.  This trick looks for a character after the end of
        // the string, which is of course impossible, except in multi-line
        // mode, but it's not a /m regex.
        return new RegExp('$.');
      }
    }
  }, {
    key: "makeRe",
    value: function makeRe() {
      if (this.regexp || this.regexp === false) return this.regexp; // at this point, this.set is a 2d array of partial
      // pattern strings, or "**".
      //
      // It's better to use .match().  This function shouldn't
      // be used, really, but it's pretty convenient sometimes,
      // when you just want to work with a regex.

      var set = this.set;

      if (!set.length) {
        this.regexp = false;
        return this.regexp;
      }

      var options = this.options;
      var twoStar = options.noglobstar ? star : options.dot ? twoStarDot : twoStarNoDot;
      var flags = options.nocase ? 'i' : ''; // coalesce globstars and regexpify non-globstar patterns
      // if it's the only item, then we just do one twoStar
      // if it's the first, and there are more, prepend (\/|twoStar\/)? to next
      // if it's the last, append (\/twoStar|) to previous
      // if it's in the middle, append (\/|\/twoStar\/) to previous
      // then filter out GLOBSTAR symbols

      var re = set.map(function (pattern) {
        pattern = pattern.map(function (p) {
          return typeof p === 'string' ? regExpEscape(p) : p === GLOBSTAR ? GLOBSTAR : p._src;
        }).reduce(function (set, p) {
          if (!(set[set.length - 1] === GLOBSTAR && p === GLOBSTAR)) {
            set.push(p);
          }

          return set;
        }, []);
        pattern.forEach(function (p, i) {
          if (p !== GLOBSTAR || pattern[i - 1] === GLOBSTAR) {
            return;
          }

          if (i === 0) {
            if (pattern.length > 1) {
              pattern[i + 1] = '(?:\\\/|' + twoStar + '\\\/)?' + pattern[i + 1];
            } else {
              pattern[i] = twoStar;
            }
          } else if (i === pattern.length - 1) {
            pattern[i - 1] += '(?:\\\/|' + twoStar + ')?';
          } else {
            pattern[i - 1] += '(?:\\\/|\\\/' + twoStar + '\\\/)' + pattern[i + 1];
            pattern[i + 1] = GLOBSTAR;
          }
        });
        return pattern.filter(function (p) {
          return p !== GLOBSTAR;
        }).join('/');
      }).join('|'); // must match entire pattern
      // ending in a * or ** will make it less strict.

      re = '^(?:' + re + ')$'; // can match anything, as long as it's not this.

      if (this.negate) re = '^(?!' + re + ').*$';

      try {
        this.regexp = new RegExp(re, flags);
      } catch (ex)
      /* istanbul ignore next - should be impossible */
      {
        this.regexp = false;
      }

      return this.regexp;
    }
  }, {
    key: "match",
    value: function match(f) {
      var partial = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this.partial;
      this.debug('match', f, this.pattern); // short-circuit in the case of busted things.
      // comments, etc.

      if (this.comment) return false;
      if (this.empty) return f === '';
      if (f === '/' && partial) return true;
      var options = this.options; // windows: need to use /, not \

      if (path.sep !== '/') {
        f = f.split(path.sep).join('/');
      } // treat the test path as a set of pathparts.


      f = f.split(slashSplit);
      this.debug(this.pattern, 'split', f); // just ONE of the pattern sets in this.set needs to match
      // in order for it to be valid.  If negating, then just one
      // match means that we have failed.
      // Either way, return on the first hit.

      var set = this.set;
      this.debug(this.pattern, 'set', set); // Find the basename of the path by looking for the last non-empty segment

      var filename;

      for (var i = f.length - 1; i >= 0; i--) {
        filename = f[i];
        if (filename) break;
      }

      for (var _i2 = 0; _i2 < set.length; _i2++) {
        var pattern = set[_i2];
        var file = f;

        if (options.matchBase && pattern.length === 1) {
          file = [filename];
        }

        var hit = this.matchOne(file, pattern, partial);

        if (hit) {
          if (options.flipNegate) return true;
          return !this.negate;
        }
      } // didn't get any hits.  this is success if it's a negative
      // pattern, failure otherwise.


      if (options.flipNegate) return false;
      return this.negate;
    }
  }], [{
    key: "defaults",
    value: function defaults(def) {
      return minimatch.defaults(def).Minimatch;
    }
  }]);

  return Minimatch;
}();

minimatch.Minimatch = Minimatch;

/***/ }),

/***/ 3637:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var balanced = __webpack_require__(9584);

module.exports = expandTop;
var escSlash = '\0SLASH' + Math.random() + '\0';
var escOpen = '\0OPEN' + Math.random() + '\0';
var escClose = '\0CLOSE' + Math.random() + '\0';
var escComma = '\0COMMA' + Math.random() + '\0';
var escPeriod = '\0PERIOD' + Math.random() + '\0';

function numeric(str) {
  return parseInt(str, 10) == str ? parseInt(str, 10) : str.charCodeAt(0);
}

function escapeBraces(str) {
  return str.split('\\\\').join(escSlash).split('\\{').join(escOpen).split('\\}').join(escClose).split('\\,').join(escComma).split('\\.').join(escPeriod);
}

function unescapeBraces(str) {
  return str.split(escSlash).join('\\').split(escOpen).join('{').split(escClose).join('}').split(escComma).join(',').split(escPeriod).join('.');
} // Basically just str.split(","), but handling cases
// where we have nested braced sections, which should be
// treated as individual members, like {a,{b,c},d}


function parseCommaParts(str) {
  if (!str) return [''];
  var parts = [];
  var m = balanced('{', '}', str);
  if (!m) return str.split(',');
  var pre = m.pre;
  var body = m.body;
  var post = m.post;
  var p = pre.split(',');
  p[p.length - 1] += '{' + body + '}';
  var postParts = parseCommaParts(post);

  if (post.length) {
    p[p.length - 1] += postParts.shift();
    p.push.apply(p, postParts);
  }

  parts.push.apply(parts, p);
  return parts;
}

function expandTop(str) {
  if (!str) return []; // I don't know why Bash 4.3 does this, but it does.
  // Anything starting with {} will have the first two bytes preserved
  // but *only* at the top level, so {},a}b will not expand to anything,
  // but a{},b}c will be expanded to [a}c,abc].
  // One could argue that this is a bug in Bash, but since the goal of
  // this module is to match Bash's rules, we escape a leading {}

  if (str.substr(0, 2) === '{}') {
    str = '\\{\\}' + str.substr(2);
  }

  return expand(escapeBraces(str), true).map(unescapeBraces);
}

function embrace(str) {
  return '{' + str + '}';
}

function isPadded(el) {
  return /^-?0\d/.test(el);
}

function lte(i, y) {
  return i <= y;
}

function gte(i, y) {
  return i >= y;
}

function expand(str, isTop) {
  var expansions = [];
  var m = balanced('{', '}', str);
  if (!m) return [str]; // no need to expand pre, since it is guaranteed to be free of brace-sets

  var pre = m.pre;
  var post = m.post.length ? expand(m.post, false) : [''];

  if (/\$$/.test(m.pre)) {
    for (var k = 0; k < post.length; k++) {
      var expansion = pre + '{' + m.body + '}' + post[k];
      expansions.push(expansion);
    }
  } else {
    var isNumericSequence = /^-?\d+\.\.-?\d+(?:\.\.-?\d+)?$/.test(m.body);
    var isAlphaSequence = /^[a-zA-Z]\.\.[a-zA-Z](?:\.\.-?\d+)?$/.test(m.body);
    var isSequence = isNumericSequence || isAlphaSequence;
    var isOptions = m.body.indexOf(',') >= 0;

    if (!isSequence && !isOptions) {
      // {a},b}
      if (m.post.match(/,.*\}/)) {
        str = m.pre + '{' + m.body + escClose + m.post;
        return expand(str);
      }

      return [str];
    }

    var n;

    if (isSequence) {
      n = m.body.split(/\.\./);
    } else {
      n = parseCommaParts(m.body);

      if (n.length === 1) {
        // x{{a,b}}y ==> x{a}y x{b}y
        n = expand(n[0], false).map(embrace);

        if (n.length === 1) {
          return post.map(function (p) {
            return m.pre + n[0] + p;
          });
        }
      }
    } // at this point, n is the parts, and we know it's not a comma set
    // with a single entry.


    var N;

    if (isSequence) {
      var x = numeric(n[0]);
      var y = numeric(n[1]);
      var width = Math.max(n[0].length, n[1].length);
      var incr = n.length == 3 ? Math.abs(numeric(n[2])) : 1;
      var test = lte;
      var reverse = y < x;

      if (reverse) {
        incr *= -1;
        test = gte;
      }

      var pad = n.some(isPadded);
      N = [];

      for (var i = x; test(i, y); i += incr) {
        var c;

        if (isAlphaSequence) {
          c = String.fromCharCode(i);
          if (c === '\\') c = '';
        } else {
          c = String(i);

          if (pad) {
            var need = width - c.length;

            if (need > 0) {
              var z = new Array(need + 1).join('0');
              if (i < 0) c = '-' + z + c.slice(1);else c = z + c;
            }
          }
        }

        N.push(c);
      }
    } else {
      N = [];

      for (var j = 0; j < n.length; j++) {
        N.push.apply(N, expand(n[j], false));
      }
    }

    for (var j = 0; j < N.length; j++) {
      for (var k = 0; k < post.length; k++) {
        var expansion = pre + N[j] + post[k];
        if (!isTop || isSequence || expansion) expansions.push(expansion);
      }
    }
  }

  return expansions;
}

/***/ }),

/***/ 2421:
/***/ ((module) => {

"use strict";
/**
* @license nested-property https://github.com/cosmosio/nested-property
*
* The MIT License (MIT)
*
* Copyright (c) 2014-2020 Olivier Scherrer <pode.fr@gmail.com>
*/


function _typeof(obj) {
  "@babel/helpers - typeof";

  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
    _typeof = function _typeof(obj) {
      return typeof obj;
    };
  } else {
    _typeof = function _typeof(obj) {
      return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    };
  }

  return _typeof(obj);
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (call && (_typeof(call) === "object" || typeof call === "function")) {
    return call;
  }

  return _assertThisInitialized(self);
}

function _assertThisInitialized(self) {
  if (self === void 0) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function");
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      writable: true,
      configurable: true
    }
  });
  if (superClass) _setPrototypeOf(subClass, superClass);
}

function _wrapNativeSuper(Class) {
  var _cache = typeof Map === "function" ? new Map() : undefined;

  _wrapNativeSuper = function _wrapNativeSuper(Class) {
    if (Class === null || !_isNativeFunction(Class)) return Class;

    if (typeof Class !== "function") {
      throw new TypeError("Super expression must either be null or a function");
    }

    if (typeof _cache !== "undefined") {
      if (_cache.has(Class)) return _cache.get(Class);

      _cache.set(Class, Wrapper);
    }

    function Wrapper() {
      return _construct(Class, arguments, _getPrototypeOf(this).constructor);
    }

    Wrapper.prototype = Object.create(Class.prototype, {
      constructor: {
        value: Wrapper,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    return _setPrototypeOf(Wrapper, Class);
  };

  return _wrapNativeSuper(Class);
}

function _construct(Parent, args, Class) {
  if (_isNativeReflectConstruct()) {
    _construct = Reflect.construct;
  } else {
    _construct = function _construct(Parent, args, Class) {
      var a = [null];
      a.push.apply(a, args);
      var Constructor = Function.bind.apply(Parent, a);
      var instance = new Constructor();
      if (Class) _setPrototypeOf(instance, Class.prototype);
      return instance;
    };
  }

  return _construct.apply(null, arguments);
}

function _isNativeReflectConstruct() {
  if (typeof Reflect === "undefined" || !Reflect.construct) return false;
  if (Reflect.construct.sham) return false;
  if (typeof Proxy === "function") return true;

  try {
    Date.prototype.toString.call(Reflect.construct(Date, [], function () {}));
    return true;
  } catch (e) {
    return false;
  }
}

function _isNativeFunction(fn) {
  return Function.toString.call(fn).indexOf("[native code]") !== -1;
}

function _setPrototypeOf(o, p) {
  _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
    o.__proto__ = p;
    return o;
  };

  return _setPrototypeOf(o, p);
}

function _getPrototypeOf(o) {
  _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) {
    return o.__proto__ || Object.getPrototypeOf(o);
  };
  return _getPrototypeOf(o);
}

var ARRAY_WILDCARD = "+";
var PATH_DELIMITER = ".";

var ObjectPrototypeMutationError = /*#__PURE__*/function (_Error) {
  _inherits(ObjectPrototypeMutationError, _Error);

  function ObjectPrototypeMutationError(params) {
    var _this;

    _classCallCheck(this, ObjectPrototypeMutationError);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(ObjectPrototypeMutationError).call(this, params));
    _this.name = "ObjectPrototypeMutationError";
    return _this;
  }

  return ObjectPrototypeMutationError;
}(_wrapNativeSuper(Error));

module.exports = {
  set: setNestedProperty,
  get: getNestedProperty,
  has: hasNestedProperty,
  hasOwn: function hasOwn(object, property, options) {
    return this.has(object, property, options || {
      own: true
    });
  },
  isIn: isInNestedProperty,
  ObjectPrototypeMutationError: ObjectPrototypeMutationError
};
/**
 * Get the property of an object nested in one or more objects or array
 * Given an object such as a.b.c.d = 5, getNestedProperty(a, "b.c.d") will return 5.
 * It also works through arrays. Given a nested array such as a[0].b = 5, getNestedProperty(a, "0.b") will return 5.
 * For accessing nested properties through all items in an array, you may use the array wildcard "+".
 * For instance, getNestedProperty([{a:1}, {a:2}, {a:3}], "+.a") will return [1, 2, 3]
 * @param {Object} object the object to get the property from
 * @param {String} property the path to the property as a string
 * @returns the object or the the property value if found
 */

function getNestedProperty(object, property) {
  if (_typeof(object) != "object" || object === null) {
    return object;
  }

  if (typeof property == "undefined") {
    return object;
  }

  if (typeof property == "number") {
    return object[property];
  }

  try {
    return traverse(object, property, function _getNestedProperty(currentObject, currentProperty) {
      return currentObject[currentProperty];
    });
  } catch (err) {
    return object;
  }
}
/**
 * Tell if a nested object has a given property (or array a given index)
 * given an object such as a.b.c.d = 5, hasNestedProperty(a, "b.c.d") will return true.
 * It also returns true if the property is in the prototype chain.
 * @param {Object} object the object to get the property from
 * @param {String} property the path to the property as a string
 * @param {Object} options:
 *  - own: set to reject properties from the prototype
 * @returns true if has (property in object), false otherwise
 */


function hasNestedProperty(object, property) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  if (_typeof(object) != "object" || object === null) {
    return false;
  }

  if (typeof property == "undefined") {
    return false;
  }

  if (typeof property == "number") {
    return property in object;
  }

  try {
    var has = false;
    traverse(object, property, function _hasNestedProperty(currentObject, currentProperty, segments, index) {
      if (isLastSegment(segments, index)) {
        if (options.own) {
          has = currentObject.hasOwnProperty(currentProperty);
        } else {
          has = currentProperty in currentObject;
        }
      } else {
        return currentObject && currentObject[currentProperty];
      }
    });
    return has;
  } catch (err) {
    return false;
  }
}
/**
 * Set the property of an object nested in one or more objects
 * If the property doesn't exist, it gets created.
 * @param {Object} object
 * @param {String} property
 * @param value the value to set
 * @returns object if no assignment was made or the value if the assignment was made
 */


function setNestedProperty(object, property, value) {
  if (_typeof(object) != "object" || object === null) {
    return object;
  }

  if (typeof property == "undefined") {
    return object;
  }

  if (typeof property == "number") {
    object[property] = value;
    return object[property];
  }

  try {
    return traverse(object, property, function _setNestedProperty(currentObject, currentProperty, segments, index) {
      if (currentObject === Reflect.getPrototypeOf({})) {
        throw new ObjectPrototypeMutationError("Attempting to mutate Object.prototype");
      }

      if (!currentObject[currentProperty]) {
        var nextPropIsNumber = Number.isInteger(Number(segments[index + 1]));
        var nextPropIsArrayWildcard = segments[index + 1] === ARRAY_WILDCARD;

        if (nextPropIsNumber || nextPropIsArrayWildcard) {
          currentObject[currentProperty] = [];
        } else {
          currentObject[currentProperty] = {};
        }
      }

      if (isLastSegment(segments, index)) {
        currentObject[currentProperty] = value;
      }

      return currentObject[currentProperty];
    });
  } catch (err) {
    if (err instanceof ObjectPrototypeMutationError) {
      // rethrow
      throw err;
    } else {
      return object;
    }
  }
}
/**
 * Tell if an object is on the path to a nested property
 * If the object is on the path, and the path exists, it returns true, and false otherwise.
 * @param {Object} object to get the nested property from
 * @param {String} property name of the nested property
 * @param {Object} objectInPath the object to check
 * @param {Object} options:
 *  - validPath: return false if the path is invalid, even if the object is in the path
 * @returns {boolean} true if the object is on the path
 */


function isInNestedProperty(object, property, objectInPath) {
  var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

  if (_typeof(object) != "object" || object === null) {
    return false;
  }

  if (typeof property == "undefined") {
    return false;
  }

  try {
    var isIn = false,
        pathExists = false;
    traverse(object, property, function _isInNestedProperty(currentObject, currentProperty, segments, index) {
      isIn = isIn || currentObject === objectInPath || !!currentObject && currentObject[currentProperty] === objectInPath;
      pathExists = isLastSegment(segments, index) && _typeof(currentObject) === "object" && currentProperty in currentObject;
      return currentObject && currentObject[currentProperty];
    });

    if (options.validPath) {
      return isIn && pathExists;
    } else {
      return isIn;
    }
  } catch (err) {
    return false;
  }
}

function traverse(object, path) {
  var callback = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function () {};
  var segments = path.split(PATH_DELIMITER);
  var length = segments.length;

  var _loop = function _loop(idx) {
    var currentSegment = segments[idx];

    if (!object) {
      return {
        v: void 0
      };
    }

    if (currentSegment === ARRAY_WILDCARD) {
      if (Array.isArray(object)) {
        return {
          v: object.map(function (value, index) {
            var remainingSegments = segments.slice(idx + 1);

            if (remainingSegments.length > 0) {
              return traverse(value, remainingSegments.join(PATH_DELIMITER), callback);
            } else {
              return callback(object, index, segments, idx);
            }
          })
        };
      } else {
        var pathToHere = segments.slice(0, idx).join(PATH_DELIMITER);
        throw new Error("Object at wildcard (".concat(pathToHere, ") is not an array"));
      }
    } else {
      object = callback(object, currentSegment, segments, idx);
    }
  };

  for (var idx = 0; idx < length; idx++) {
    var _ret = _loop(idx);

    if (_typeof(_ret) === "object") return _ret.v;
  }

  return object;
}

function isLastSegment(segments, index) {
  return segments.length === index + 1;
}

/***/ }),

/***/ 1441:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.


function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

var util = __webpack_require__(6930);

var isString = function isString(x) {
  return typeof x === 'string';
}; // resolves . and .. elements in a path array with directory names there
// must be no slashes or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)


function normalizeArray(parts, allowAboveRoot) {
  var res = [];

  for (var i = 0; i < parts.length; i++) {
    var p = parts[i]; // ignore empty parts

    if (!p || p === '.') continue;

    if (p === '..') {
      if (res.length && res[res.length - 1] !== '..') {
        res.pop();
      } else if (allowAboveRoot) {
        res.push('..');
      }
    } else {
      res.push(p);
    }
  }

  return res;
} // Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.


var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var posix = {};

function posixSplitPath(filename) {
  return splitPathRe.exec(filename).slice(1);
} // path.resolve([from ...], to)
// posix version


posix.resolve = function () {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = i >= 0 ? arguments[i] : process.cwd(); // Skip empty and invalid entries

    if (!isString(path)) {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  } // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)
  // Normalize the path


  resolvedPath = normalizeArray(resolvedPath.split('/'), !resolvedAbsolute).join('/');
  return (resolvedAbsolute ? '/' : '') + resolvedPath || '.';
}; // path.normalize(path)
// posix version


posix.normalize = function (path) {
  var isAbsolute = posix.isAbsolute(path),
      trailingSlash = path.substr(-1) === '/'; // Normalize the path

  path = normalizeArray(path.split('/'), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }

  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
}; // posix version


posix.isAbsolute = function (path) {
  return path.charAt(0) === '/';
}; // posix version


posix.join = function () {
  var path = '';

  for (var i = 0; i < arguments.length; i++) {
    var segment = arguments[i];

    if (!isString(segment)) {
      throw new TypeError('Arguments to path.join must be strings');
    }

    if (segment) {
      if (!path) {
        path += segment;
      } else {
        path += '/' + segment;
      }
    }
  }

  return posix.normalize(path);
}; // path.relative(from, to)
// posix version


posix.relative = function (from, to) {
  from = posix.resolve(from).substr(1);
  to = posix.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;

    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;

    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));
  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;

  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];

  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));
  return outputParts.join('/');
};

posix._makeLong = function (path) {
  return path;
};

posix.dirname = function (path) {
  var result = posixSplitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};

posix.basename = function (path, ext) {
  var f = posixSplitPath(path)[2]; // TODO: make this comparison case-insensitive on windows?

  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }

  return f;
};

posix.extname = function (path) {
  return posixSplitPath(path)[3];
};

posix.format = function (pathObject) {
  if (!util.isObject(pathObject)) {
    throw new TypeError("Parameter 'pathObject' must be an object, not " + _typeof(pathObject));
  }

  var root = pathObject.root || '';

  if (!isString(root)) {
    throw new TypeError("'pathObject.root' must be a string or undefined, not " + _typeof(pathObject.root));
  }

  var dir = pathObject.dir ? pathObject.dir + posix.sep : '';
  var base = pathObject.base || '';
  return dir + base;
};

posix.parse = function (pathString) {
  if (!isString(pathString)) {
    throw new TypeError("Parameter 'pathString' must be a string, not " + _typeof(pathString));
  }

  var allParts = posixSplitPath(pathString);

  if (!allParts || allParts.length !== 4) {
    throw new TypeError("Invalid path '" + pathString + "'");
  }

  allParts[1] = allParts[1] || '';
  allParts[2] = allParts[2] || '';
  allParts[3] = allParts[3] || '';
  return {
    root: allParts[0],
    dir: allParts[0] + allParts[1].slice(0, allParts[1].length - 1),
    base: allParts[2],
    ext: allParts[3],
    name: allParts[2].slice(0, allParts[2].length - allParts[3].length)
  };
};

posix.sep = '/';
posix.delimiter = ':';
module.exports = posix;

/***/ }),

/***/ 1361:
/***/ ((__unused_webpack_module, exports) => {

"use strict";


var has = Object.prototype.hasOwnProperty,
    undef;
/**
 * Decode a URI encoded string.
 *
 * @param {String} input The URI encoded string.
 * @returns {String|Null} The decoded string.
 * @api private
 */

function decode(input) {
  try {
    return decodeURIComponent(input.replace(/\+/g, ' '));
  } catch (e) {
    return null;
  }
}
/**
 * Attempts to encode a given input.
 *
 * @param {String} input The string that needs to be encoded.
 * @returns {String|Null} The encoded string.
 * @api private
 */


function encode(input) {
  try {
    return encodeURIComponent(input);
  } catch (e) {
    return null;
  }
}
/**
 * Simple query string parser.
 *
 * @param {String} query The query string that needs to be parsed.
 * @returns {Object}
 * @api public
 */


function querystring(query) {
  var parser = /([^=?#&]+)=?([^&]*)/g,
      result = {},
      part;

  while (part = parser.exec(query)) {
    var key = decode(part[1]),
        value = decode(part[2]); //
    // Prevent overriding of existing properties. This ensures that build-in
    // methods like `toString` or __proto__ are not overriden by malicious
    // querystrings.
    //
    // In the case if failed decoding, we want to omit the key/value pairs
    // from the result.
    //

    if (key === null || value === null || key in result) continue;
    result[key] = value;
  }

  return result;
}
/**
 * Transform a query string to an object.
 *
 * @param {Object} obj Object that should be transformed.
 * @param {String} prefix Optional prefix.
 * @returns {String}
 * @api public
 */


function querystringify(obj, prefix) {
  prefix = prefix || '';
  var pairs = [],
      value,
      key; //
  // Optionally prefix with a '?' if needed
  //

  if ('string' !== typeof prefix) prefix = '?';

  for (key in obj) {
    if (has.call(obj, key)) {
      value = obj[key]; //
      // Edge cases where we actually want to encode the value to an empty
      // string instead of the stringified value.
      //

      if (!value && (value === null || value === undef || isNaN(value))) {
        value = '';
      }

      key = encode(key);
      value = encode(value); //
      // If we failed to encode the strings, we should bail out as we don't
      // want to add invalid strings to the query.
      //

      if (key === null || value === null) continue;
      pairs.push(key + '=' + value);
    }
  }

  return pairs.length ? prefix + pairs.join('&') : '';
} //
// Expose the module.
//


exports.stringify = querystringify;
exports.parse = querystring;

/***/ }),

/***/ 4095:
/***/ ((module) => {

"use strict";

/**
 * Check if we're required to add a port number.
 *
 * @see https://url.spec.whatwg.org/#default-port
 * @param {Number|String} port Port number we need to check
 * @param {String} protocol Protocol we need to check against.
 * @returns {Boolean} Is it a default port for the given protocol
 * @api private
 */

module.exports = function required(port, protocol) {
  protocol = protocol.split(':')[0];
  port = +port;
  if (!port) return false;

  switch (protocol) {
    case 'http':
    case 'ws':
      return port !== 80;

    case 'https':
    case 'wss':
      return port !== 443;

    case 'ftp':
      return port !== 21;

    case 'gopher':
      return port !== 70;

    case 'file':
      return false;
  }

  return port !== 0;
};

/***/ }),

/***/ 5512:
/***/ ((module) => {

var hexRegex = /^[-+]?0x[a-fA-F0-9]+$/;
var numRegex = /^([\-\+])?(0*)(\.[0-9]+([eE]\-?[0-9]+)?|[0-9]+(\.[0-9]+([eE]\-?[0-9]+)?)?)$/; // const octRegex = /0x[a-z0-9]+/;
// const binRegex = /0x[a-z0-9]+/;
//polyfill

if (!Number.parseInt && window.parseInt) {
  Number.parseInt = window.parseInt;
}

if (!Number.parseFloat && window.parseFloat) {
  Number.parseFloat = window.parseFloat;
}

var consider = {
  hex: true,
  leadingZeros: true,
  decimalPoint: "\.",
  eNotation: true //skipLike: /regex/

};

function toNumber(str) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  // const options = Object.assign({}, consider);
  // if(opt.leadingZeros === false){
  //     options.leadingZeros = false;
  // }else if(opt.hex === false){
  //     options.hex = false;
  // }
  options = Object.assign({}, consider, options);
  if (!str || typeof str !== "string") return str;
  var trimmedStr = str.trim(); // if(trimmedStr === "0.0") return 0;
  // else if(trimmedStr === "+0.0") return 0;
  // else if(trimmedStr === "-0.0") return -0;

  if (options.skipLike !== undefined && options.skipLike.test(trimmedStr)) return str;else if (options.hex && hexRegex.test(trimmedStr)) {
    return Number.parseInt(trimmedStr, 16); // } else if (options.parseOct && octRegex.test(str)) {
    //     return Number.parseInt(val, 8);
    // }else if (options.parseBin && binRegex.test(str)) {
    //     return Number.parseInt(val, 2);
  } else {
    //separate negative sign, leading zeros, and rest number
    var match = numRegex.exec(trimmedStr);

    if (match) {
      var sign = match[1];
      var leadingZeros = match[2];
      var numTrimmedByZeros = trimZeros(match[3]); //complete num without leading zeros
      //trim ending zeros for floating number

      var eNotation = match[4] || match[6];
      if (!options.leadingZeros && leadingZeros.length > 0 && sign && trimmedStr[2] !== ".") return str; //-0123
      else if (!options.leadingZeros && leadingZeros.length > 0 && !sign && trimmedStr[1] !== ".") return str; //0123
      else {
        //no leading zeros or leading zeros are allowed
        var num = Number(trimmedStr);
        var numStr = "" + num;

        if (numStr.search(/[eE]/) !== -1) {
          //given number is long and parsed to eNotation
          if (options.eNotation) return num;else return str;
        } else if (eNotation) {
          //given number has enotation
          if (options.eNotation) return num;else return str;
        } else if (trimmedStr.indexOf(".") !== -1) {
          //floating number
          // const decimalPart = match[5].substr(1);
          // const intPart = trimmedStr.substr(0,trimmedStr.indexOf("."));
          // const p = numStr.indexOf(".");
          // const givenIntPart = numStr.substr(0,p);
          // const givenDecPart = numStr.substr(p+1);
          if (numStr === "0" && numTrimmedByZeros === "") return num; //0.0
          else if (numStr === numTrimmedByZeros) return num; //0.456. 0.79000
          else if (sign && numStr === "-" + numTrimmedByZeros) return num;else return str;
        }

        if (leadingZeros) {
          // if(numTrimmedByZeros === numStr){
          //     if(options.leadingZeros) return num;
          //     else return str;
          // }else return str;
          if (numTrimmedByZeros === numStr) return num;else if (sign + numTrimmedByZeros === numStr) return num;else return str;
        }

        if (trimmedStr === numStr) return num;else if (trimmedStr === sign + numStr) return num; // else{
        //     //number with +/- sign
        //     trimmedStr.test(/[-+][0-9]);
        // }

        return str;
      } // else if(!eNotation && trimmedStr && trimmedStr !== Number(trimmedStr) ) return str;
    } else {
      //non-numeric string
      return str;
    }
  }
}
/**
 * 
 * @param {string} numStr without leading zeros
 * @returns 
 */


function trimZeros(numStr) {
  if (numStr && numStr.indexOf(".") !== -1) {
    //float
    numStr = numStr.replace(/0+$/, ""); //remove ending zeros

    if (numStr === ".") numStr = "0";else if (numStr[0] === ".") numStr = "0" + numStr;else if (numStr[numStr.length - 1] === ".") numStr = numStr.substr(0, numStr.length - 1);
    return numStr;
  }

  return numStr;
}

module.exports = toNumber;

/***/ }),

/***/ 5842:
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_RESULT__;function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

(function (name, context, definition) {
  if ( true && module.exports) module.exports = definition();else if (true) !(__WEBPACK_AMD_DEFINE_FACTORY__ = (definition),
		__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ?
		(__WEBPACK_AMD_DEFINE_FACTORY__.call(exports, __webpack_require__, exports, module)) :
		__WEBPACK_AMD_DEFINE_FACTORY__),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));else {}
})('urljoin', this, function () {
  function normalize(strArray) {
    var resultArray = [];

    if (strArray.length === 0) {
      return '';
    }

    if (typeof strArray[0] !== 'string') {
      throw new TypeError('Url must be a string. Received ' + strArray[0]);
    } // If the first part is a plain protocol, we combine it with the next part.


    if (strArray[0].match(/^[^/:]+:\/*$/) && strArray.length > 1) {
      var first = strArray.shift();
      strArray[0] = first + strArray[0];
    } // There must be two or three slashes in the file protocol, two slashes in anything else.


    if (strArray[0].match(/^file:\/\/\//)) {
      strArray[0] = strArray[0].replace(/^([^/:]+):\/*/, '$1:///');
    } else {
      strArray[0] = strArray[0].replace(/^([^/:]+):\/*/, '$1://');
    }

    for (var i = 0; i < strArray.length; i++) {
      var component = strArray[i];

      if (typeof component !== 'string') {
        throw new TypeError('Url must be a string. Received ' + component);
      }

      if (component === '') {
        continue;
      }

      if (i > 0) {
        // Removing the starting slashes for each component but the first.
        component = component.replace(/^[\/]+/, '');
      }

      if (i < strArray.length - 1) {
        // Removing the ending slashes for each component but the last.
        component = component.replace(/[\/]+$/, '');
      } else {
        // For the last component we will combine multiple slashes to a single one.
        component = component.replace(/[\/]+$/, '/');
      }

      resultArray.push(component);
    }

    var str = resultArray.join('/'); // Each input component is now separated by a single slash except the possible first plain protocol part.
    // remove trailing slash before parameters or hash

    str = str.replace(/\/(\?|&|#[^!])/g, '$1'); // replace ? in parameters with &

    var parts = str.split('?');
    str = parts.shift() + (parts.length > 0 ? '?' : '') + parts.join('&');
    return str;
  }

  return function () {
    var input;

    if (_typeof(arguments[0]) === 'object') {
      input = arguments[0];
    } else {
      input = [].slice.call(arguments);
    }

    return normalize(input);
  };
});

/***/ }),

/***/ 1095:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

var required = __webpack_require__(4095),
    qs = __webpack_require__(1361),
    controlOrWhitespace = /^[\x00-\x20\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+/,
    CRHTLF = /[\n\r\t]/g,
    slashes = /^[A-Za-z][A-Za-z0-9+-.]*:\/\//,
    port = /:\d+$/,
    protocolre = /^([a-z][a-z0-9.+-]*:)?(\/\/)?([\\/]+)?([\S\s]*)/i,
    windowsDriveLetter = /^[a-zA-Z]:/;
/**
 * Remove control characters and whitespace from the beginning of a string.
 *
 * @param {Object|String} str String to trim.
 * @returns {String} A new string representing `str` stripped of control
 *     characters and whitespace from its beginning.
 * @public
 */


function trimLeft(str) {
  return (str ? str : '').toString().replace(controlOrWhitespace, '');
}
/**
 * These are the parse rules for the URL parser, it informs the parser
 * about:
 *
 * 0. The char it Needs to parse, if it's a string it should be done using
 *    indexOf, RegExp using exec and NaN means set as current value.
 * 1. The property we should set when parsing this value.
 * 2. Indication if it's backwards or forward parsing, when set as number it's
 *    the value of extra chars that should be split off.
 * 3. Inherit from location if non existing in the parser.
 * 4. `toLowerCase` the resulting value.
 */


var rules = [['#', 'hash'], // Extract from the back.
['?', 'query'], // Extract from the back.
function sanitize(address, url) {
  // Sanitize what is left of the address
  return isSpecial(url.protocol) ? address.replace(/\\/g, '/') : address;
}, ['/', 'pathname'], // Extract from the back.
['@', 'auth', 1], // Extract from the front.
[NaN, 'host', undefined, 1, 1], // Set left over value.
[/:(\d*)$/, 'port', undefined, 1], // RegExp the back.
[NaN, 'hostname', undefined, 1, 1] // Set left over.
];
/**
 * These properties should not be copied or inherited from. This is only needed
 * for all non blob URL's as a blob URL does not include a hash, only the
 * origin.
 *
 * @type {Object}
 * @private
 */

var ignore = {
  hash: 1,
  query: 1
};
/**
 * The location object differs when your code is loaded through a normal page,
 * Worker or through a worker using a blob. And with the blobble begins the
 * trouble as the location object will contain the URL of the blob, not the
 * location of the page where our code is loaded in. The actual origin is
 * encoded in the `pathname` so we can thankfully generate a good "default"
 * location from it so we can generate proper relative URL's again.
 *
 * @param {Object|String} loc Optional default location object.
 * @returns {Object} lolcation object.
 * @public
 */

function lolcation(loc) {
  var globalVar;
  if (typeof window !== 'undefined') globalVar = window;else if (typeof global !== 'undefined') globalVar = global;else if (typeof self !== 'undefined') globalVar = self;else globalVar = {};
  var location = globalVar.location || {};
  loc = loc || location;

  var finaldestination = {},
      type = _typeof(loc),
      key;

  if ('blob:' === loc.protocol) {
    finaldestination = new Url(unescape(loc.pathname), {});
  } else if ('string' === type) {
    finaldestination = new Url(loc, {});

    for (key in ignore) {
      delete finaldestination[key];
    }
  } else if ('object' === type) {
    for (key in loc) {
      if (key in ignore) continue;
      finaldestination[key] = loc[key];
    }

    if (finaldestination.slashes === undefined) {
      finaldestination.slashes = slashes.test(loc.href);
    }
  }

  return finaldestination;
}
/**
 * Check whether a protocol scheme is special.
 *
 * @param {String} The protocol scheme of the URL
 * @return {Boolean} `true` if the protocol scheme is special, else `false`
 * @private
 */


function isSpecial(scheme) {
  return scheme === 'file:' || scheme === 'ftp:' || scheme === 'http:' || scheme === 'https:' || scheme === 'ws:' || scheme === 'wss:';
}
/**
 * @typedef ProtocolExtract
 * @type Object
 * @property {String} protocol Protocol matched in the URL, in lowercase.
 * @property {Boolean} slashes `true` if protocol is followed by "//", else `false`.
 * @property {String} rest Rest of the URL that is not part of the protocol.
 */

/**
 * Extract protocol information from a URL with/without double slash ("//").
 *
 * @param {String} address URL we want to extract from.
 * @param {Object} location
 * @return {ProtocolExtract} Extracted information.
 * @private
 */


function extractProtocol(address, location) {
  address = trimLeft(address);
  address = address.replace(CRHTLF, '');
  location = location || {};
  var match = protocolre.exec(address);
  var protocol = match[1] ? match[1].toLowerCase() : '';
  var forwardSlashes = !!match[2];
  var otherSlashes = !!match[3];
  var slashesCount = 0;
  var rest;

  if (forwardSlashes) {
    if (otherSlashes) {
      rest = match[2] + match[3] + match[4];
      slashesCount = match[2].length + match[3].length;
    } else {
      rest = match[2] + match[4];
      slashesCount = match[2].length;
    }
  } else {
    if (otherSlashes) {
      rest = match[3] + match[4];
      slashesCount = match[3].length;
    } else {
      rest = match[4];
    }
  }

  if (protocol === 'file:') {
    if (slashesCount >= 2) {
      rest = rest.slice(2);
    }
  } else if (isSpecial(protocol)) {
    rest = match[4];
  } else if (protocol) {
    if (forwardSlashes) {
      rest = rest.slice(2);
    }
  } else if (slashesCount >= 2 && isSpecial(location.protocol)) {
    rest = match[4];
  }

  return {
    protocol: protocol,
    slashes: forwardSlashes || isSpecial(protocol),
    slashesCount: slashesCount,
    rest: rest
  };
}
/**
 * Resolve a relative URL pathname against a base URL pathname.
 *
 * @param {String} relative Pathname of the relative URL.
 * @param {String} base Pathname of the base URL.
 * @return {String} Resolved pathname.
 * @private
 */


function resolve(relative, base) {
  if (relative === '') return base;
  var path = (base || '/').split('/').slice(0, -1).concat(relative.split('/')),
      i = path.length,
      last = path[i - 1],
      unshift = false,
      up = 0;

  while (i--) {
    if (path[i] === '.') {
      path.splice(i, 1);
    } else if (path[i] === '..') {
      path.splice(i, 1);
      up++;
    } else if (up) {
      if (i === 0) unshift = true;
      path.splice(i, 1);
      up--;
    }
  }

  if (unshift) path.unshift('');
  if (last === '.' || last === '..') path.push('');
  return path.join('/');
}
/**
 * The actual URL instance. Instead of returning an object we've opted-in to
 * create an actual constructor as it's much more memory efficient and
 * faster and it pleases my OCD.
 *
 * It is worth noting that we should not use `URL` as class name to prevent
 * clashes with the global URL instance that got introduced in browsers.
 *
 * @constructor
 * @param {String} address URL we want to parse.
 * @param {Object|String} [location] Location defaults for relative paths.
 * @param {Boolean|Function} [parser] Parser for the query string.
 * @private
 */


function Url(address, location, parser) {
  address = trimLeft(address);
  address = address.replace(CRHTLF, '');

  if (!(this instanceof Url)) {
    return new Url(address, location, parser);
  }

  var relative,
      extracted,
      parse,
      instruction,
      index,
      key,
      instructions = rules.slice(),
      type = _typeof(location),
      url = this,
      i = 0; //
  // The following if statements allows this module two have compatibility with
  // 2 different API:
  //
  // 1. Node.js's `url.parse` api which accepts a URL, boolean as arguments
  //    where the boolean indicates that the query string should also be parsed.
  //
  // 2. The `URL` interface of the browser which accepts a URL, object as
  //    arguments. The supplied object will be used as default values / fall-back
  //    for relative paths.
  //


  if ('object' !== type && 'string' !== type) {
    parser = location;
    location = null;
  }

  if (parser && 'function' !== typeof parser) parser = qs.parse;
  location = lolcation(location); //
  // Extract protocol information before running the instructions.
  //

  extracted = extractProtocol(address || '', location);
  relative = !extracted.protocol && !extracted.slashes;
  url.slashes = extracted.slashes || relative && location.slashes;
  url.protocol = extracted.protocol || location.protocol || '';
  address = extracted.rest; //
  // When the authority component is absent the URL starts with a path
  // component.
  //

  if (extracted.protocol === 'file:' && (extracted.slashesCount !== 2 || windowsDriveLetter.test(address)) || !extracted.slashes && (extracted.protocol || extracted.slashesCount < 2 || !isSpecial(url.protocol))) {
    instructions[3] = [/(.*)/, 'pathname'];
  }

  for (; i < instructions.length; i++) {
    instruction = instructions[i];

    if (typeof instruction === 'function') {
      address = instruction(address, url);
      continue;
    }

    parse = instruction[0];
    key = instruction[1];

    if (parse !== parse) {
      url[key] = address;
    } else if ('string' === typeof parse) {
      index = parse === '@' ? address.lastIndexOf(parse) : address.indexOf(parse);

      if (~index) {
        if ('number' === typeof instruction[2]) {
          url[key] = address.slice(0, index);
          address = address.slice(index + instruction[2]);
        } else {
          url[key] = address.slice(index);
          address = address.slice(0, index);
        }
      }
    } else if (index = parse.exec(address)) {
      url[key] = index[1];
      address = address.slice(0, index.index);
    }

    url[key] = url[key] || (relative && instruction[3] ? location[key] || '' : ''); //
    // Hostname, host and protocol should be lowercased so they can be used to
    // create a proper `origin`.
    //

    if (instruction[4]) url[key] = url[key].toLowerCase();
  } //
  // Also parse the supplied query string in to an object. If we're supplied
  // with a custom parser as function use that instead of the default build-in
  // parser.
  //


  if (parser) url.query = parser(url.query); //
  // If the URL is relative, resolve the pathname against the base URL.
  //

  if (relative && location.slashes && url.pathname.charAt(0) !== '/' && (url.pathname !== '' || location.pathname !== '')) {
    url.pathname = resolve(url.pathname, location.pathname);
  } //
  // Default to a / for pathname if none exists. This normalizes the URL
  // to always have a /
  //


  if (url.pathname.charAt(0) !== '/' && isSpecial(url.protocol)) {
    url.pathname = '/' + url.pathname;
  } //
  // We should not add port numbers if they are already the default port number
  // for a given protocol. As the host also contains the port number we're going
  // override it with the hostname which contains no port number.
  //


  if (!required(url.port, url.protocol)) {
    url.host = url.hostname;
    url.port = '';
  } //
  // Parse down the `auth` for the username and password.
  //


  url.username = url.password = '';

  if (url.auth) {
    index = url.auth.indexOf(':');

    if (~index) {
      url.username = url.auth.slice(0, index);
      url.username = encodeURIComponent(decodeURIComponent(url.username));
      url.password = url.auth.slice(index + 1);
      url.password = encodeURIComponent(decodeURIComponent(url.password));
    } else {
      url.username = encodeURIComponent(decodeURIComponent(url.auth));
    }

    url.auth = url.password ? url.username + ':' + url.password : url.username;
  }

  url.origin = url.protocol !== 'file:' && isSpecial(url.protocol) && url.host ? url.protocol + '//' + url.host : 'null'; //
  // The href is just the compiled result.
  //

  url.href = url.toString();
}
/**
 * This is convenience method for changing properties in the URL instance to
 * insure that they all propagate correctly.
 *
 * @param {String} part          Property we need to adjust.
 * @param {Mixed} value          The newly assigned value.
 * @param {Boolean|Function} fn  When setting the query, it will be the function
 *                               used to parse the query.
 *                               When setting the protocol, double slash will be
 *                               removed from the final url if it is true.
 * @returns {URL} URL instance for chaining.
 * @public
 */


function set(part, value, fn) {
  var url = this;

  switch (part) {
    case 'query':
      if ('string' === typeof value && value.length) {
        value = (fn || qs.parse)(value);
      }

      url[part] = value;
      break;

    case 'port':
      url[part] = value;

      if (!required(value, url.protocol)) {
        url.host = url.hostname;
        url[part] = '';
      } else if (value) {
        url.host = url.hostname + ':' + value;
      }

      break;

    case 'hostname':
      url[part] = value;
      if (url.port) value += ':' + url.port;
      url.host = value;
      break;

    case 'host':
      url[part] = value;

      if (port.test(value)) {
        value = value.split(':');
        url.port = value.pop();
        url.hostname = value.join(':');
      } else {
        url.hostname = value;
        url.port = '';
      }

      break;

    case 'protocol':
      url.protocol = value.toLowerCase();
      url.slashes = !fn;
      break;

    case 'pathname':
    case 'hash':
      if (value) {
        var char = part === 'pathname' ? '/' : '#';
        url[part] = value.charAt(0) !== char ? char + value : value;
      } else {
        url[part] = value;
      }

      break;

    case 'username':
    case 'password':
      url[part] = encodeURIComponent(value);
      break;

    case 'auth':
      var index = value.indexOf(':');

      if (~index) {
        url.username = value.slice(0, index);
        url.username = encodeURIComponent(decodeURIComponent(url.username));
        url.password = value.slice(index + 1);
        url.password = encodeURIComponent(decodeURIComponent(url.password));
      } else {
        url.username = encodeURIComponent(decodeURIComponent(value));
      }

  }

  for (var i = 0; i < rules.length; i++) {
    var ins = rules[i];
    if (ins[4]) url[ins[1]] = url[ins[1]].toLowerCase();
  }

  url.auth = url.password ? url.username + ':' + url.password : url.username;
  url.origin = url.protocol !== 'file:' && isSpecial(url.protocol) && url.host ? url.protocol + '//' + url.host : 'null';
  url.href = url.toString();
  return url;
}
/**
 * Transform the properties back in to a valid and full URL string.
 *
 * @param {Function} stringify Optional query stringify function.
 * @returns {String} Compiled version of the URL.
 * @public
 */


function toString(stringify) {
  if (!stringify || 'function' !== typeof stringify) stringify = qs.stringify;
  var query,
      url = this,
      host = url.host,
      protocol = url.protocol;
  if (protocol && protocol.charAt(protocol.length - 1) !== ':') protocol += ':';
  var result = protocol + (url.protocol && url.slashes || isSpecial(url.protocol) ? '//' : '');

  if (url.username) {
    result += url.username;
    if (url.password) result += ':' + url.password;
    result += '@';
  } else if (url.password) {
    result += ':' + url.password;
    result += '@';
  } else if (url.protocol !== 'file:' && isSpecial(url.protocol) && !host && url.pathname !== '/') {
    //
    // Add back the empty userinfo, otherwise the original invalid URL
    // might be transformed into a valid one with `url.pathname` as host.
    //
    result += '@';
  } //
  // Trailing colon is removed from `url.host` when it is parsed. If it still
  // ends with a colon, then add back the trailing colon that was removed. This
  // prevents an invalid URL from being transformed into a valid one.
  //


  if (host[host.length - 1] === ':' || port.test(url.hostname) && !url.port) {
    host += ':';
  }

  result += host + url.pathname;
  query = 'object' === _typeof(url.query) ? stringify(url.query) : url.query;
  if (query) result += '?' !== query.charAt(0) ? '?' + query : query;
  if (url.hash) result += url.hash;
  return result;
}

Url.prototype = {
  set: set,
  toString: toString
}; //
// Expose the URL parser and some additional properties that might be useful for
// others or testing.
//

Url.extractProtocol = extractProtocol;
Url.location = lolcation;
Url.trimLeft = trimLeft;
Url.qs = qs;
module.exports = Url;

/***/ }),

/***/ 6930:
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ 9227:
/***/ (() => {

/* (ignored) */

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			loaded: false,
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/amd options */
/******/ 	(() => {
/******/ 		__webpack_require__.amdO = {};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/node module decorator */
/******/ 	(() => {
/******/ 		__webpack_require__.nmd = (module) => {
/******/ 			module.paths = [];
/******/ 			if (!module.children) module.children = [];
/******/ 			return module;
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "AuthType": () => (/* reexport */ AuthType),
  "ErrorCode": () => (/* reexport */ ErrorCode),
  "createClient": () => (/* reexport */ createClient),
  "getPatcher": () => (/* reexport */ getPatcher),
  "parseStat": () => (/* reexport */ parseStat),
  "parseXML": () => (/* reexport */ parseXML)
});

// EXTERNAL MODULE: ./node_modules/url-parse/index.js
var url_parse = __webpack_require__(1095);
var url_parse_default = /*#__PURE__*/__webpack_require__.n(url_parse);
// EXTERNAL MODULE: ./node_modules/url-join/lib/url-join.js
var url_join = __webpack_require__(5842);
var url_join_default = /*#__PURE__*/__webpack_require__.n(url_join);
// EXTERNAL MODULE: ./node_modules/path-posix/index.js
var path_posix = __webpack_require__(1441);
var path_posix_default = /*#__PURE__*/__webpack_require__.n(path_posix);
;// CONCATENATED MODULE: ./source/tools/path.ts

var SEP_PATH_POSIX = "__PATH_SEPARATOR_POSIX__";
var SEP_PATH_WINDOWS = "__PATH_SEPARATOR_WINDOWS__";
function encodePath(path) {
  var replaced = path.replace(/\//g, SEP_PATH_POSIX).replace(/\\\\/g, SEP_PATH_WINDOWS);
  var formatted = encodeURIComponent(replaced);
  return formatted.split(SEP_PATH_WINDOWS).join("\\\\").split(SEP_PATH_POSIX).join("/");
}
function getAllDirectories(path) {
  if (!path || path === "/") return [];
  var currentPath = path;
  var output = [];

  do {
    output.push(currentPath);
    currentPath = (0,path_posix.dirname)(currentPath);
  } while (currentPath && currentPath !== "/");

  return output;
}
function normalisePath(pathStr) {
  var normalisedPath = pathStr;

  if (normalisedPath[0] !== "/") {
    normalisedPath = "/" + normalisedPath;
  }

  if (/^.+\/$/.test(normalisedPath)) {
    normalisedPath = normalisedPath.substr(0, normalisedPath.length - 1);
  }

  return normalisedPath;
}
;// CONCATENATED MODULE: ./source/tools/url.ts



function extractURLPath(fullURL) {
  var url = new (url_parse_default())(fullURL);
  var urlPath = url.pathname;

  if (urlPath.length <= 0) {
    urlPath = "/";
  }

  return normalisePath(urlPath);
}
function joinURL() {
  for (var _len = arguments.length, parts = new Array(_len), _key = 0; _key < _len; _key++) {
    parts[_key] = arguments[_key];
  }

  return url_join_default()(parts.reduce(function (output, nextPart, partIndex) {
    if (partIndex === 0 || nextPart !== "/" || nextPart === "/" && output[output.length - 1] !== "/") {
      output.push(nextPart);
    }

    return output;
  }, []));
}
function normaliseHREF(href) {
  var normalisedHref = href.replace(/^https?:\/\/[^\/]+/, "");
  return normalisedHref;
}
// EXTERNAL MODULE: ./node_modules/layerr/dist/index.js
var dist = __webpack_require__(9104);
// EXTERNAL MODULE: ./node_modules/md5/md5.js
var md5 = __webpack_require__(9243);
var md5_default = /*#__PURE__*/__webpack_require__.n(md5);
;// CONCATENATED MODULE: ./source/tools/crypto.ts

function ha1Compute(algorithm, user, realm, pass, nonce, cnonce) {
  var ha1 = md5_default()("".concat(user, ":").concat(realm, ":").concat(pass));

  if (algorithm && algorithm.toLowerCase() === "md5-sess") {
    return md5_default()("".concat(ha1, ":").concat(nonce, ":").concat(cnonce));
  }

  return ha1;
}
;// CONCATENATED MODULE: ./source/auth/digest.ts


var NONCE_CHARS = "abcdef0123456789";
var NONCE_SIZE = 32;
function createDigestContext(username, password) {
  return {
    username: username,
    password: password,
    nc: 0,
    algorithm: "md5",
    hasDigestAuth: false
  };
}
function generateDigestAuthHeader(options, digest) {
  var url = options.url.replace("//", "");
  var uri = url.indexOf("/") == -1 ? "/" : url.slice(url.indexOf("/"));
  var method = options.method ? options.method.toUpperCase() : "GET";
  var qop = /(^|,)\s*auth\s*($|,)/.test(digest.qop) ? "auth" : false;
  var ncString = "00000000".concat(digest.nc).slice(-8);
  var ha1 = ha1Compute(digest.algorithm, digest.username, digest.realm, digest.password, digest.nonce, digest.cnonce);
  var ha2 = md5_default()("".concat(method, ":").concat(uri));
  var digestResponse = qop ? md5_default()("".concat(ha1, ":").concat(digest.nonce, ":").concat(ncString, ":").concat(digest.cnonce, ":").concat(qop, ":").concat(ha2)) : md5_default()("".concat(ha1, ":").concat(digest.nonce, ":").concat(ha2));
  var authValues = {
    username: digest.username,
    realm: digest.realm,
    nonce: digest.nonce,
    uri: uri,
    qop: qop,
    response: digestResponse,
    nc: ncString,
    cnonce: digest.cnonce,
    algorithm: digest.algorithm,
    opaque: digest.opaque
  };
  var authHeader = [];

  for (var k in authValues) {
    if (authValues[k]) {
      if (k === "qop" || k === "nc" || k === "algorithm") {
        authHeader.push("".concat(k, "=").concat(authValues[k]));
      } else {
        authHeader.push("".concat(k, "=\"").concat(authValues[k], "\""));
      }
    }
  }

  return "Digest ".concat(authHeader.join(", "));
}

function makeNonce() {
  var uid = "";

  for (var i = 0; i < NONCE_SIZE; ++i) {
    uid = "".concat(uid).concat(NONCE_CHARS[Math.floor(Math.random() * NONCE_CHARS.length)]);
  }

  return uid;
}

function parseDigestAuth(response, _digest) {
  var authHeader = response.headers["www-authenticate"] || "";

  if (authHeader.split(/\s/)[0].toLowerCase() !== "digest") {
    return false;
  }

  var re = /([a-z0-9_-]+)=(?:"([^"]+)"|([a-z0-9_-]+))/gi;

  for (;;) {
    var match = re.exec(authHeader);

    if (!match) {
      break;
    }

    _digest[match[1]] = match[2] || match[3];
  }

  _digest.nc += 1;
  _digest.cnonce = makeNonce();
  return true;
}
// EXTERNAL MODULE: ./node_modules/base-64/base64.js
var base64 = __webpack_require__(9146);
;// CONCATENATED MODULE: ./source/tools/encode.ts

function decodeHTMLEntities(text) {
  if (false) { var he; } else {
    // Nasty browser way
    var txt = document.createElement("textarea");
    txt.innerHTML = text;
    return txt.value;
  }
}
function fromBase64(text) {
  return (0,base64.decode)(text);
}
function toBase64(text) {
  return (0,base64.encode)(text);
}
;// CONCATENATED MODULE: ./source/auth/basic.ts

function generateBasicAuthHeader(username, password) {
  var encoded = toBase64("".concat(username, ":").concat(password));
  return "Basic ".concat(encoded);
}
;// CONCATENATED MODULE: ./source/auth/oauth.ts
function generateTokenAuthHeader(token) {
  return "".concat(token.token_type, " ").concat(token.access_token);
}
;// CONCATENATED MODULE: ./source/types.ts
var AuthType;

(function (AuthType) {
  AuthType["Digest"] = "digest";
  AuthType["None"] = "none";
  AuthType["Password"] = "password";
  AuthType["Token"] = "token";
})(AuthType || (AuthType = {}));

var ErrorCode;

(function (ErrorCode) {
  ErrorCode["DataTypeNoLength"] = "data-type-no-length";
  ErrorCode["InvalidAuthType"] = "invalid-auth-type";
  ErrorCode["InvalidOutputFormat"] = "invalid-output-format";
  ErrorCode["LinkUnsupportedAuthType"] = "link-unsupported-auth";
})(ErrorCode || (ErrorCode = {}));
;// CONCATENATED MODULE: ./source/auth/index.ts





function setupAuth(context, username, password, oauthToken) {
  switch (context.authType) {
    case AuthType.Digest:
      context.digest = createDigestContext(username, password);
      break;

    case AuthType.None:
      // Do nothing
      break;

    case AuthType.Password:
      context.headers.Authorization = generateBasicAuthHeader(username, password);
      break;

    case AuthType.Token:
      context.headers.Authorization = generateTokenAuthHeader(oauthToken);
      break;

    default:
      throw new dist.Layerr({
        info: {
          code: ErrorCode.InvalidAuthType
        }
      }, "Invalid auth type: ".concat(context.authType));
  }
}
// EXTERNAL MODULE: ./node_modules/axios/index.js
var axios = __webpack_require__(5056);
var axios_default = /*#__PURE__*/__webpack_require__.n(axios);
// EXTERNAL MODULE: ./node_modules/hot-patcher/source/index.js
var source = __webpack_require__(9254);
var source_default = /*#__PURE__*/__webpack_require__.n(source);
;// CONCATENATED MODULE: ./source/compat/patcher.ts

var __patcher = null;
function getPatcher() {
  if (!__patcher) {
    __patcher = new (source_default())();
  }

  return __patcher;
}
;// CONCATENATED MODULE: ./source/tools/merge.ts
function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

function cloneShallow(obj) {
  return isPlainObject(obj) ? Object.assign({}, obj) : Object.setPrototypeOf(Object.assign({}, obj), Object.getPrototypeOf(obj));
}

function isPlainObject(obj) {
  if (_typeof(obj) !== "object" || obj === null || Object.prototype.toString.call(obj) != "[object Object]") {
    // Not an object
    return false;
  }

  if (Object.getPrototypeOf(obj) === null) {
    return true;
  }

  var proto = obj; // Find the prototype

  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);
  }

  return Object.getPrototypeOf(obj) === proto;
}

function merge() {
  for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  var output = null,
      items = [].concat(args);

  while (items.length > 0) {
    var nextItem = items.shift();

    if (!output) {
      output = cloneShallow(nextItem);
    } else {
      output = mergeObjects(output, nextItem);
    }
  }

  return output;
}

function mergeObjects(obj1, obj2) {
  var output = cloneShallow(obj1);
  Object.keys(obj2).forEach(function (key) {
    if (!output.hasOwnProperty(key)) {
      output[key] = obj2[key];
      return;
    }

    if (Array.isArray(obj2[key])) {
      output[key] = Array.isArray(output[key]) ? [].concat(_toConsumableArray(output[key]), _toConsumableArray(obj2[key])) : _toConsumableArray(obj2[key]);
    } else if (_typeof(obj2[key]) === "object" && !!obj2[key]) {
      output[key] = _typeof(output[key]) === "object" && !!output[key] ? mergeObjects(output[key], obj2[key]) : cloneShallow(obj2[key]);
    } else {
      output[key] = obj2[key];
    }
  });
  return output;
}
;// CONCATENATED MODULE: ./source/tools/headers.ts
function mergeHeaders() {
  for (var _len = arguments.length, headerPayloads = new Array(_len), _key = 0; _key < _len; _key++) {
    headerPayloads[_key] = arguments[_key];
  }

  if (headerPayloads.length === 0) return {};
  var headerKeys = {};
  return headerPayloads.reduce(function (output, headers) {
    Object.keys(headers).forEach(function (header) {
      var lowerHeader = header.toLowerCase();

      if (headerKeys.hasOwnProperty(lowerHeader)) {
        output[headerKeys[lowerHeader]] = headers[header];
      } else {
        headerKeys[lowerHeader] = header;
        output[header] = headers[header];
      }
    });
    return output;
  }, {});
}
;// CONCATENATED MODULE: ./source/request.ts






function _request(requestOptions) {
  return getPatcher().patchInline("request", function (options) {
    return axios_default()(options);
  }, requestOptions);
}

function prepareRequestOptions(requestOptions, context, userOptions) {
  var finalOptions = cloneShallow(requestOptions);
  finalOptions.headers = mergeHeaders(context.headers, finalOptions.headers || {}, userOptions.headers || {});

  if (typeof userOptions.data !== "undefined") {
    finalOptions.data = userOptions.data;
  }

  if (userOptions.signal) {
    finalOptions.signal = userOptions.signal;
  }

  if (context.httpAgent) {
    finalOptions.httpAgent = context.httpAgent;
  }

  if (context.httpsAgent) {
    finalOptions.httpsAgent = context.httpsAgent;
  }

  if (context.digest) {
    finalOptions._digest = context.digest;
  }

  if (typeof context.withCredentials === "boolean") {
    finalOptions.withCredentials = context.withCredentials;
  }

  if (context.maxContentLength) {
    finalOptions.maxContentLength = context.maxContentLength;
  }

  if (context.maxBodyLength) {
    finalOptions.maxBodyLength = context.maxBodyLength;
  }

  if (userOptions.hasOwnProperty("onUploadProgress")) {
    finalOptions.onUploadProgress = userOptions["onUploadProgress"];
  }

  if (userOptions.hasOwnProperty("onDownloadProgress")) {
    finalOptions.onDownloadProgress = userOptions["onDownloadProgress"];
  } // Take full control of all response status codes


  finalOptions.validateStatus = function () {
    return true;
  };

  return finalOptions;
}
function request(requestOptions) {
  // Client not configured for digest authentication
  if (!requestOptions._digest) {
    return _request(requestOptions);
  } // Remove client's digest authentication object from request options


  var _digest = requestOptions._digest;
  delete requestOptions._digest; // If client is already using digest authentication, include the digest authorization header

  if (_digest.hasDigestAuth) {
    requestOptions = merge(requestOptions, {
      headers: {
        Authorization: generateDigestAuthHeader(requestOptions, _digest)
      }
    });
  } // Perform the request and handle digest authentication


  return _request(requestOptions).then(function (response) {
    if (response.status == 401) {
      _digest.hasDigestAuth = parseDigestAuth(response, _digest);

      if (_digest.hasDigestAuth) {
        requestOptions = merge(requestOptions, {
          headers: {
            Authorization: generateDigestAuthHeader(requestOptions, _digest)
          }
        });
        return _request(requestOptions).then(function (response2) {
          if (response2.status == 401) {
            _digest.hasDigestAuth = false;
          } else {
            _digest.nc++;
          }

          return response2;
        });
      }
    } else {
      _digest.nc++;
    }

    return response;
  });
}
// EXTERNAL MODULE: ./node_modules/minimatch/minimatch.js
var minimatch = __webpack_require__(3000);
var minimatch_default = /*#__PURE__*/__webpack_require__.n(minimatch);
;// CONCATENATED MODULE: ./source/response.ts

function createErrorFromResponse(response) {
  var prefix = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "";
  var err = new Error("".concat(prefix, "Invalid response: ").concat(response.status, " ").concat(response.statusText));
  err.status = response.status;
  err.response = response;
  return err;
}
function handleResponseCode(context, response) {
  var status = response.status;
  if (status === 401 && context.digest) return response;

  if (status >= 400) {
    var err = createErrorFromResponse(response);
    throw err;
  }

  return response;
}
function processGlobFilter(files, glob) {
  return files.filter(function (file) {
    return minimatch_default()(file.filename, glob, {
      matchBase: true
    });
  });
}
function processResponsePayload(response, data) {
  var isDetailed = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
  return isDetailed ? {
    data: data,
    headers: response.headers || {},
    status: response.status,
    statusText: response.statusText
  } : data;
}
;// CONCATENATED MODULE: ./source/operations/copyFile.ts





function _await(value, then, direct) {
  if (direct) {
    return then ? then(value) : value;
  }

  if (!value || !value.then) {
    value = Promise.resolve(value);
  }

  return then ? value.then(then) : value;
}

function _async(f) {
  return function () {
    for (var args = [], i = 0; i < arguments.length; i++) {
      args[i] = arguments[i];
    }

    try {
      return Promise.resolve(f.apply(this, args));
    } catch (e) {
      return Promise.reject(e);
    }
  };
}

var copyFile_copyFile = _async(function (context, filename, destination) {
  var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  var requestOptions = prepareRequestOptions({
    url: joinURL(context.remoteURL, encodePath(filename)),
    method: "COPY",
    headers: {
      Destination: joinURL(context.remoteURL, encodePath(destination))
    }
  }, context, options);
  return _await(request(requestOptions), function (response) {
    handleResponseCode(context, response);
  });
});
// EXTERNAL MODULE: ./node_modules/fast-xml-parser/src/parser.js
var parser = __webpack_require__(8819);
// EXTERNAL MODULE: ./node_modules/nested-property/dist/nested-property.js
var nested_property = __webpack_require__(2421);
var nested_property_default = /*#__PURE__*/__webpack_require__.n(nested_property);
;// CONCATENATED MODULE: ./source/tools/dav.ts
function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || dav_unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function dav_unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return dav_arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return dav_arrayLikeToArray(o, minLen); }

function dav_arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function dav_typeof(obj) { "@babel/helpers - typeof"; return dav_typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, dav_typeof(obj); }






var PropertyType;

(function (PropertyType) {
  PropertyType["Array"] = "array";
  PropertyType["Object"] = "object";
  PropertyType["Original"] = "original";
})(PropertyType || (PropertyType = {}));

function getPropertyOfType(obj, prop) {
  var type = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : PropertyType.Original;
  var val = nested_property_default().get(obj, prop);

  if (type === "array" && Array.isArray(val) === false) {
    return [val];
  } else if (type === "object" && Array.isArray(val)) {
    return val[0];
  }

  return val;
}

function normaliseResponse(response) {
  var output = Object.assign({}, response);
  nested_property_default().set(output, "propstat", getPropertyOfType(output, "propstat", PropertyType.Object));
  nested_property_default().set(output, "propstat.prop", getPropertyOfType(output, "propstat.prop", PropertyType.Object));
  return output;
}

function normaliseResult(result) {
  var multistatus = result.multistatus;

  if (multistatus === "") {
    return {
      multistatus: {
        response: []
      }
    };
  }

  if (!multistatus) {
    throw new Error("Invalid response: No root multistatus found");
  }

  var output = {
    multistatus: Array.isArray(multistatus) ? multistatus[0] : multistatus
  };
  nested_property_default().set(output, "multistatus.response", getPropertyOfType(output, "multistatus.response", PropertyType.Array));
  nested_property_default().set(output, "multistatus.response", nested_property_default().get(output, "multistatus.response").map(function (response) {
    return normaliseResponse(response);
  }));
  return output;
}

function parseXML(xml) {
  return new Promise(function (resolve) {
    var result = parser.parse(xml, {
      arrayMode: false,
      ignoreNameSpace: true // // We don't use the processors here as decoding is done manually
      // // later on - decoding early would break some path checks.
      // attrValueProcessor: val => decodeHTMLEntities(decodeURIComponent(val)),
      // tagValueProcessor: val => decodeHTMLEntities(decodeURIComponent(val))

    });
    resolve(normaliseResult(result));
  });
}
function prepareFileFromProps(props, rawFilename) {
  var isDetailed = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
  // Last modified time, raw size, item type and mime
  var _props$getlastmodifie = props.getlastmodified,
      lastMod = _props$getlastmodifie === void 0 ? null : _props$getlastmodifie,
      _props$getcontentleng = props.getcontentlength,
      rawSize = _props$getcontentleng === void 0 ? "0" : _props$getcontentleng,
      _props$resourcetype = props.resourcetype,
      resourceType = _props$resourcetype === void 0 ? null : _props$resourcetype,
      _props$getcontenttype = props.getcontenttype,
      mimeType = _props$getcontenttype === void 0 ? null : _props$getcontenttype,
      _props$getetag = props.getetag,
      etag = _props$getetag === void 0 ? null : _props$getetag;
  var type = resourceType && dav_typeof(resourceType) === "object" && typeof resourceType.collection !== "undefined" ? "directory" : "file";
  var filename = decodeHTMLEntities(rawFilename);
  var stat = {
    filename: filename,
    basename: path_posix_default().basename(filename),
    lastmod: lastMod,
    size: parseInt(rawSize, 10),
    type: type,
    etag: typeof etag === "string" ? etag.replace(/"/g, "") : null
  };

  if (type === "file") {
    stat.mime = mimeType && typeof mimeType === "string" ? mimeType.split(";")[0] : "";
  }

  if (isDetailed) {
    stat.props = props;
  }

  return stat;
}
function parseStat(result, filename) {
  var isDetailed = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
  var responseItem = null;

  try {
    responseItem = result.multistatus.response[0];
  } catch (e) {
    /* ignore */
  }

  if (!responseItem) {
    throw new Error("Failed getting item stat: bad response");
  }

  var _responseItem = responseItem,
      _responseItem$propsta = _responseItem.propstat,
      props = _responseItem$propsta.prop,
      statusLine = _responseItem$propsta.status; // As defined in https://tools.ietf.org/html/rfc2068#section-6.1

  var _statusLine$split = statusLine.split(" ", 3),
      _statusLine$split2 = _slicedToArray(_statusLine$split, 3),
      _ = _statusLine$split2[0],
      statusCodeStr = _statusLine$split2[1],
      statusText = _statusLine$split2[2];

  var statusCode = parseInt(statusCodeStr, 10);

  if (statusCode >= 400) {
    var err = new Error("Invalid response: ".concat(statusCode, " ").concat(statusText));
    err.status = statusCode;
    throw err;
  }

  var filePath = normalisePath(filename);
  return prepareFileFromProps(props, filePath, isDetailed);
}
function translateDiskSpace(value) {
  switch (value.toString()) {
    case "-3":
      return "unlimited";

    case "-2":
    /* falls-through */

    case "-1":
      // -1 is non-computed
      return "unknown";

    default:
      return parseInt(value, 10);
  }
}
;// CONCATENATED MODULE: ./source/operations/stat.ts






function stat_await(value, then, direct) {
  if (direct) {
    return then ? then(value) : value;
  }

  if (!value || !value.then) {
    value = Promise.resolve(value);
  }

  return then ? value.then(then) : value;
}

function stat_async(f) {
  return function () {
    for (var args = [], i = 0; i < arguments.length; i++) {
      args[i] = arguments[i];
    }

    try {
      return Promise.resolve(f.apply(this, args));
    } catch (e) {
      return Promise.reject(e);
    }
  };
}

var getStat = stat_async(function (context, filename) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var _options$details = options.details,
      isDetailed = _options$details === void 0 ? false : _options$details;
  var requestOptions = prepareRequestOptions({
    url: joinURL(context.remoteURL, encodePath(filename)),
    method: "PROPFIND",
    headers: {
      Accept: "text/plain,application/xml",
      Depth: "0"
    },
    responseType: "text"
  }, context, options);
  return stat_await(request(requestOptions), function (response) {
    handleResponseCode(context, response);
    return stat_await(parseXML(response.data), function (result) {
      var stat = parseStat(result, filename, isDetailed);
      return processResponsePayload(response, stat, isDetailed);
    });
  });
});
;// CONCATENATED MODULE: ./source/operations/createDirectory.ts
function createDirectory_await(value, then, direct) {
  if (direct) {
    return then ? then(value) : value;
  }

  if (!value || !value.then) {
    value = Promise.resolve(value);
  }

  return then ? value.then(then) : value;
}

function createDirectory_async(f) {
  return function () {
    for (var args = [], i = 0; i < arguments.length; i++) {
      args[i] = arguments[i];
    }

    try {
      return Promise.resolve(f.apply(this, args));
    } catch (e) {
      return Promise.reject(e);
    }
  };
}

function _empty() {}

function _awaitIgnored(value, direct) {
  if (!direct) {
    return value && value.then ? value.then(_empty) : Promise.resolve();
  }
}

function _catch(body, recover) {
  try {
    var result = body();
  } catch (e) {
    return recover(e);
  }

  if (result && result.then) {
    return result.then(void 0, recover);
  }

  return result;
}

function _invoke(body, then) {
  var result = body();

  if (result && result.then) {
    return result.then(then);
  }

  return then(result);
}

var _iteratorSymbol = /*#__PURE__*/typeof Symbol !== "undefined" ? Symbol.iterator || (Symbol.iterator = Symbol("Symbol.iterator")) : "@@iterator";

function _settle(pact, state, value) {
  if (!pact.s) {
    if (value instanceof _Pact) {
      if (value.s) {
        if (state & 1) {
          state = value.s;
        }

        value = value.v;
      } else {
        value.o = _settle.bind(null, pact, state);
        return;
      }
    }

    if (value && value.then) {
      value.then(_settle.bind(null, pact, state), _settle.bind(null, pact, 2));
      return;
    }

    pact.s = state;
    pact.v = value;
    var observer = pact.o;

    if (observer) {
      observer(pact);
    }
  }
}

var _Pact = /*#__PURE__*/function () {
  function _Pact() {}

  _Pact.prototype.then = function (onFulfilled, onRejected) {
    var result = new _Pact();
    var state = this.s;

    if (state) {
      var callback = state & 1 ? onFulfilled : onRejected;

      if (callback) {
        try {
          _settle(result, 1, callback(this.v));
        } catch (e) {
          _settle(result, 2, e);
        }

        return result;
      } else {
        return this;
      }
    }

    this.o = function (_this) {
      try {
        var value = _this.v;

        if (_this.s & 1) {
          _settle(result, 1, onFulfilled ? onFulfilled(value) : value);
        } else if (onRejected) {
          _settle(result, 1, onRejected(value));
        } else {
          _settle(result, 2, value);
        }
      } catch (e) {
        _settle(result, 2, e);
      }
    };

    return result;
  };

  return _Pact;
}();

function _isSettledPact(thenable) {
  return thenable instanceof _Pact && thenable.s & 1;
}

function _forTo(array, body, check) {
  var i = -1,
      pact,
      reject;

  function _cycle(result) {
    try {
      while (++i < array.length && (!check || !check())) {
        result = body(i);

        if (result && result.then) {
          if (_isSettledPact(result)) {
            result = result.v;
          } else {
            result.then(_cycle, reject || (reject = _settle.bind(null, pact = new _Pact(), 2)));
            return;
          }
        }
      }

      if (pact) {
        _settle(pact, 1, result);
      } else {
        pact = result;
      }
    } catch (e) {
      _settle(pact || (pact = new _Pact()), 2, e);
    }
  }

  _cycle();

  return pact;
}

function _forOf(target, body, check) {
  if (typeof target[_iteratorSymbol] === "function") {
    var iterator = target[_iteratorSymbol](),
        step,
        pact,
        reject;

    function _cycle(result) {
      try {
        while (!(step = iterator.next()).done && (!check || !check())) {
          result = body(step.value);

          if (result && result.then) {
            if (_isSettledPact(result)) {
              result = result.v;
            } else {
              result.then(_cycle, reject || (reject = _settle.bind(null, pact = new _Pact(), 2)));
              return;
            }
          }
        }

        if (pact) {
          _settle(pact, 1, result);
        } else {
          pact = result;
        }
      } catch (e) {
        _settle(pact || (pact = new _Pact()), 2, e);
      }
    }

    _cycle();

    if (iterator.return) {
      var _fixup = function _fixup(value) {
        try {
          if (!step.done) {
            iterator.return();
          }
        } catch (e) {}

        return value;
      };

      if (pact && pact.then) {
        return pact.then(_fixup, function (e) {
          throw _fixup(e);
        });
      }

      _fixup();
    }

    return pact;
  } // No support for Symbol.iterator


  // No support for Symbol.iterator
  if (!("length" in target)) {
    throw new TypeError("Object is not iterable");
  } // Handle live collections properly


  // Handle live collections properly
  var values = [];

  for (var i = 0; i < target.length; i++) {
    values.push(target[i]);
  }

  return _forTo(values, function (i) {
    return body(values[i]);
  }, check);
}

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }







var createDirectoryRecursively = createDirectory_async(function (context, dirPath) {
  var _exit = false;
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var paths = getAllDirectories(normalisePath(dirPath));
  paths.sort(function (a, b) {
    if (a.length > b.length) {
      return 1;
    } else if (b.length > a.length) {
      return -1;
    }

    return 0;
  });
  var creating = false;
  return _forOf(paths, function (testPath) {
    return _invoke(function () {
      if (creating) {
        return _awaitIgnored(createDirectory_createDirectory(context, testPath, _objectSpread(_objectSpread({}, options), {}, {
          recursive: false
        })));
      }
    }, function () {
      return _catch(function () {
        return createDirectory_await(getStat(context, testPath), function (_getStat) {
          var testStat = _getStat;

          if (testStat.type !== "directory") {
            throw new Error("Path includes a file: ".concat(dirPath));
          }
        });
      }, function (err) {
        var error = err;
        return function () {
          if (error.status === 404) {
            creating = true;
            return _awaitIgnored(createDirectory_createDirectory(context, testPath, _objectSpread(_objectSpread({}, options), {}, {
              recursive: false
            })));
          } else {
            throw err;
          }
        }();
      });
    });
  }, function () {
    return _exit;
  });
});

var createDirectory_createDirectory = createDirectory_async(function (context, dirPath) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  if (options.recursive === true) return createDirectoryRecursively(context, dirPath, options);
  var requestOptions = prepareRequestOptions({
    url: joinURL(context.remoteURL, ensureCollectionPath(encodePath(dirPath))),
    method: "MKCOL"
  }, context, options);
  return createDirectory_await(request(requestOptions), function (response) {
    handleResponseCode(context, response);
  });
});
/**
 * Ensure the path is a proper "collection" path by ensuring it has a trailing "/".
 * The proper format of collection according to the specification does contain the trailing slash.
 * http://www.webdav.org/specs/rfc4918.html#rfc.section.5.2
 * @param path Path of the collection
 * @return string Path of the collection with appended trailing "/" in case the `path` does not have it.
 */

function ensureCollectionPath(path) {
  if (!path.endsWith("/")) {
    return path + "/";
  }

  return path;
}
// EXTERNAL MODULE: stream (ignored)
var stream_ignored_ = __webpack_require__(9227);
var stream_ignored_default = /*#__PURE__*/__webpack_require__.n(stream_ignored_);
;// CONCATENATED MODULE: ./source/operations/createStream.ts
function createStream_await(value, then, direct) {
  if (direct) {
    return then ? then(value) : value;
  }

  if (!value || !value.then) {
    value = Promise.resolve(value);
  }

  return then ? value.then(then) : value;
}

function createStream_async(f) {
  return function () {
    for (var args = [], i = 0; i < arguments.length; i++) {
      args[i] = arguments[i];
    }

    try {
      return Promise.resolve(f.apply(this, args));
    } catch (e) {
      return Promise.reject(e);
    }
  };
}

function createStream_typeof(obj) { "@babel/helpers - typeof"; return createStream_typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, createStream_typeof(obj); }







var getFileStream = createStream_async(function (context, filePath) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var headers = {};

  if (createStream_typeof(options.range) === "object" && typeof options.range.start === "number") {
    var rangeHeader = "bytes=".concat(options.range.start, "-");

    if (typeof options.range.end === "number") {
      rangeHeader = "".concat(rangeHeader).concat(options.range.end);
    }

    headers.Range = rangeHeader;
  }

  var requestOptions = prepareRequestOptions({
    url: joinURL(context.remoteURL, encodePath(filePath)),
    method: "GET",
    headers: headers,
    responseType: "stream"
  }, context, options);
  return createStream_await(request(requestOptions), function (response) {
    handleResponseCode(context, response);

    if (headers.Range && response.status !== 206) {
      var responseError = new Error("Invalid response code for partial request: ".concat(response.status));
      responseError.status = response.status;
      throw responseError;
    }

    if (options.callback) {
      setTimeout(function () {
        options.callback(response);
      }, 0);
    }

    return response.data;
  });
});

var NOOP = function NOOP() {};

function createStream_createReadStream(context, filePath) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var PassThroughStream = (stream_ignored_default()).PassThrough;
  var outStream = new PassThroughStream();
  getFileStream(context, filePath, options).then(function (stream) {
    stream.pipe(outStream);
  }).catch(function (err) {
    outStream.emit("error", err);
  });
  return outStream;
}
function createStream_createWriteStream(context, filePath) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var callback = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : NOOP;
  var PassThroughStream = (stream_ignored_default()).PassThrough;
  var writeStream = new PassThroughStream();
  var headers = {};

  if (options.overwrite === false) {
    headers["If-None-Match"] = "*";
  }

  var requestOptions = prepareRequestOptions({
    url: joinURL(context.remoteURL, encodePath(filePath)),
    method: "PUT",
    headers: headers,
    data: writeStream,
    maxRedirects: 0
  }, context, options);
  request(requestOptions).then(function (response) {
    return handleResponseCode(context, response);
  }).then(function (response) {
    // Fire callback asynchronously to avoid errors
    setTimeout(function () {
      callback(response);
    }, 0);
  }).catch(function (err) {
    writeStream.emit("error", err);
  });
  return writeStream;
}
;// CONCATENATED MODULE: ./source/operations/customRequest.ts





function customRequest_await(value, then, direct) {
  if (direct) {
    return then ? then(value) : value;
  }

  if (!value || !value.then) {
    value = Promise.resolve(value);
  }

  return then ? value.then(then) : value;
}

function customRequest_async(f) {
  return function () {
    for (var args = [], i = 0; i < arguments.length; i++) {
      args[i] = arguments[i];
    }

    try {
      return Promise.resolve(f.apply(this, args));
    } catch (e) {
      return Promise.reject(e);
    }
  };
}

var customRequest_customRequest = customRequest_async(function (context, remotePath, requestOptions) {
  if (!requestOptions.url) {
    requestOptions.url = joinURL(context.remoteURL, encodePath(remotePath));
  }

  var finalOptions = prepareRequestOptions(requestOptions, context, {});
  return customRequest_await(request(finalOptions), function (response) {
    handleResponseCode(context, response);
    return response;
  });
});
;// CONCATENATED MODULE: ./source/operations/deleteFile.ts





function deleteFile_await(value, then, direct) {
  if (direct) {
    return then ? then(value) : value;
  }

  if (!value || !value.then) {
    value = Promise.resolve(value);
  }

  return then ? value.then(then) : value;
}

function deleteFile_async(f) {
  return function () {
    for (var args = [], i = 0; i < arguments.length; i++) {
      args[i] = arguments[i];
    }

    try {
      return Promise.resolve(f.apply(this, args));
    } catch (e) {
      return Promise.reject(e);
    }
  };
}

var deleteFile_deleteFile = deleteFile_async(function (context, filename) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var requestOptions = prepareRequestOptions({
    url: joinURL(context.remoteURL, encodePath(filename)),
    method: "DELETE"
  }, context, options);
  return deleteFile_await(request(requestOptions), function (response) {
    handleResponseCode(context, response);
  });
});
;// CONCATENATED MODULE: ./source/operations/exists.ts


function exists_await(value, then, direct) {
  if (direct) {
    return then ? then(value) : value;
  }

  if (!value || !value.then) {
    value = Promise.resolve(value);
  }

  return then ? value.then(then) : value;
}

function exists_catch(body, recover) {
  try {
    var result = body();
  } catch (e) {
    return recover(e);
  }

  if (result && result.then) {
    return result.then(void 0, recover);
  }

  return result;
}

function exists_async(f) {
  return function () {
    for (var args = [], i = 0; i < arguments.length; i++) {
      args[i] = arguments[i];
    }

    try {
      return Promise.resolve(f.apply(this, args));
    } catch (e) {
      return Promise.reject(e);
    }
  };
}

var exists_exists = exists_async(function (context, remotePath) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  return exists_catch(function () {
    return exists_await(getStat(context, remotePath, options), function () {
      return true;
    });
  }, function (err) {
    if (err.status === 404) {
      return false;
    }

    throw err;
  });
});
;// CONCATENATED MODULE: ./source/operations/directoryContents.ts







function directoryContents_await(value, then, direct) {
  if (direct) {
    return then ? then(value) : value;
  }

  if (!value || !value.then) {
    value = Promise.resolve(value);
  }

  return then ? value.then(then) : value;
}

function directoryContents_async(f) {
  return function () {
    for (var args = [], i = 0; i < arguments.length; i++) {
      args[i] = arguments[i];
    }

    try {
      return Promise.resolve(f.apply(this, args));
    } catch (e) {
      return Promise.reject(e);
    }
  };
}

var directoryContents_getDirectoryContents = directoryContents_async(function (context, remotePath) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var requestOptions = prepareRequestOptions({
    url: joinURL(context.remoteURL, encodePath(remotePath), "/"),
    method: "PROPFIND",
    headers: {
      Accept: "text/plain",
      Depth: options.deep ? "infinity" : "1"
    },
    responseType: "text"
  }, context, options);
  return directoryContents_await(request(requestOptions), function (response) {
    handleResponseCode(context, response);
    return directoryContents_await(parseXML(response.data), function (davResp) {
      var files = getDirectoryFiles(davResp, context.remotePath, remotePath, options.details);

      if (options.glob) {
        files = processGlobFilter(files, options.glob);
      }

      return processResponsePayload(response, files, options.details);
    });
  });
});

function getDirectoryFiles(result, serverBasePath, requestPath) {
  var isDetailed = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
  var serverBase = path_posix_default().join(serverBasePath, "/"); // Extract the response items (directory contents)

  var responseItems = result.multistatus.response;
  return responseItems // Map all items to a consistent output structure (results)
  .map(function (item) {
    // HREF is the file path (in full)
    var href = normaliseHREF(item.href); // Each item should contain a stat object

    var props = item.propstat.prop; // Process the true full filename (minus the base server path)

    var filename = serverBase === "/" ? decodeURIComponent(normalisePath(href)) : decodeURIComponent(normalisePath(path_posix_default().relative(serverBase, href)));
    return prepareFileFromProps(props, filename, isDetailed);
  }) // Filter out the item pointing to the current directory (not needed)
  .filter(function (item) {
    return item.basename && (item.type === "file" || item.filename !== requestPath.replace(/\/$/, ""));
  });
}
;// CONCATENATED MODULE: ./source/operations/getFileContents.ts








function getFileContents_async(f) {
  return function () {
    for (var args = [], i = 0; i < arguments.length; i++) {
      args[i] = arguments[i];
    }

    try {
      return Promise.resolve(f.apply(this, args));
    } catch (e) {
      return Promise.reject(e);
    }
  };
}

var getFileContentsString = getFileContents_async(function (context, filePath) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var requestOptions = prepareRequestOptions({
    url: joinURL(context.remoteURL, encodePath(filePath)),
    method: "GET",
    responseType: "text",
    transformResponse: [TRANSFORM_RETAIN_FORMAT]
  }, context, options);
  return getFileContents_await(request(requestOptions), function (response) {
    handleResponseCode(context, response);
    return processResponsePayload(response, response.data, options.details);
  });
});

function getFileContents_await(value, then, direct) {
  if (direct) {
    return then ? then(value) : value;
  }

  if (!value || !value.then) {
    value = Promise.resolve(value);
  }

  return then ? value.then(then) : value;
}

var getFileContentsBuffer = getFileContents_async(function (context, filePath) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var requestOptions = prepareRequestOptions({
    url: joinURL(context.remoteURL, encodePath(filePath)),
    method: "GET",
    responseType: "arraybuffer"
  }, context, options);
  return getFileContents_await(request(requestOptions), function (response) {
    handleResponseCode(context, response);
    return processResponsePayload(response, response.data, options.details);
  });
});

var getFileContents_getFileContents = getFileContents_async(function (context, filePath) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var _options$format = options.format,
      format = _options$format === void 0 ? "binary" : _options$format;

  if (format !== "binary" && format !== "text") {
    throw new dist.Layerr({
      info: {
        code: ErrorCode.InvalidOutputFormat
      }
    }, "Invalid output format: ".concat(format));
  }

  return format === "text" ? getFileContentsString(context, filePath, options) : getFileContentsBuffer(context, filePath, options);
});

var TRANSFORM_RETAIN_FORMAT = function TRANSFORM_RETAIN_FORMAT(v) {
  return v;
};

function getFileContents_getFileDownloadLink(context, filePath) {
  var url = joinURL(context.remoteURL, encodePath(filePath));
  var protocol = /^https:/i.test(url) ? "https" : "http";

  switch (context.authType) {
    case AuthType.None:
      // Do nothing
      break;

    case AuthType.Password:
      {
        var authPart = context.headers.Authorization.replace(/^Basic /i, "").trim();
        var authContents = fromBase64(authPart);
        url = url.replace(/^https?:\/\//, "".concat(protocol, "://").concat(authContents, "@"));
        break;
      }

    default:
      throw new dist.Layerr({
        info: {
          code: ErrorCode.LinkUnsupportedAuthType
        }
      }, "Unsupported auth type for file link: ".concat(context.authType));
  }

  return url;
}
;// CONCATENATED MODULE: ./source/tools/xml.ts
function xml_typeof(obj) { "@babel/helpers - typeof"; return xml_typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, xml_typeof(obj); }

function xml_ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function xml_objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? xml_ownKeys(Object(source), !0).forEach(function (key) { xml_defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : xml_ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

function xml_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }


function generateLockXML(ownerHREF) {
  return getParser().parse(namespace({
    lockinfo: {
      "@_xmlns:d": "DAV:",
      lockscope: {
        exclusive: {}
      },
      locktype: {
        write: {}
      },
      owner: {
        href: ownerHREF
      }
    }
  }, "d"));
}

function getParser() {
  return new parser.j2xParser({
    attributeNamePrefix: "@_",
    format: true,
    ignoreAttributes: false,
    supressEmptyNode: true
  });
}

function namespace(obj, ns) {
  var copy = xml_objectSpread({}, obj);

  for (var _key in copy) {
    if (!copy.hasOwnProperty(_key)) {
      continue;
    }

    if (copy[_key] && xml_typeof(copy[_key]) === "object" && _key.indexOf(":") === -1) {
      copy["".concat(ns, ":").concat(_key)] = namespace(copy[_key], ns);
      delete copy[_key];
    } else if (/^@_/.test(_key) === false) {
      copy["".concat(ns, ":").concat(_key)] = copy[_key];
      delete copy[_key];
    }
  }

  return copy;
}

function parseGenericResponse(xml) {
  return parser.parse(xml, {
    arrayMode: false,
    ignoreNameSpace: true,
    parseAttributeValue: true,
    parseNodeValue: true
  });
}
;// CONCATENATED MODULE: ./source/operations/lock.ts







function lock_await(value, then, direct) {
  if (direct) {
    return then ? then(value) : value;
  }

  if (!value || !value.then) {
    value = Promise.resolve(value);
  }

  return then ? value.then(then) : value;
}

function lock_async(f) {
  return function () {
    for (var args = [], i = 0; i < arguments.length; i++) {
      args[i] = arguments[i];
    }

    try {
      return Promise.resolve(f.apply(this, args));
    } catch (e) {
      return Promise.reject(e);
    }
  };
}

var lock_unlock = lock_async(function (context, path, token) {
  var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  var requestOptions = prepareRequestOptions({
    url: joinURL(context.remoteURL, encodePath(path)),
    method: "UNLOCK",
    headers: {
      "Lock-Token": token
    }
  }, context, options);
  return lock_await(request(requestOptions), function (response) {
    handleResponseCode(context, response);

    if (response.status !== 204 && response.status !== 200) {
      var err = createErrorFromResponse(response);
      throw err;
    }
  });
});
var lock_lock = lock_async(function (context, path) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var refreshToken = options.refreshToken,
      _options$timeout = options.timeout,
      timeout = _options$timeout === void 0 ? DEFAULT_TIMEOUT : _options$timeout;
  var headers = {
    Accept: "text/plain,application/xml",
    Timeout: timeout
  };

  if (refreshToken) {
    headers.If = refreshToken;
  }

  var requestOptions = prepareRequestOptions({
    url: joinURL(context.remoteURL, encodePath(path)),
    method: "LOCK",
    headers: headers,
    data: generateLockXML(context.contactHref),
    responseType: "text"
  }, context, options);
  return lock_await(request(requestOptions), function (response) {
    handleResponseCode(context, response);
    var lockPayload = parseGenericResponse(response.data);
    var token = nested_property_default().get(lockPayload, "prop.lockdiscovery.activelock.locktoken.href");
    var serverTimeout = nested_property_default().get(lockPayload, "prop.lockdiscovery.activelock.timeout");

    if (!token) {
      var err = createErrorFromResponse(response, "No lock token received: ");
      throw err;
    }

    return {
      token: token,
      serverTimeout: serverTimeout
    };
  });
});
var DEFAULT_TIMEOUT = "Infinite, Second-4100000000";
;// CONCATENATED MODULE: ./source/tools/quota.ts
function quota_slicedToArray(arr, i) { return quota_arrayWithHoles(arr) || quota_iterableToArrayLimit(arr, i) || quota_unsupportedIterableToArray(arr, i) || quota_nonIterableRest(); }

function quota_nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function quota_unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return quota_arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return quota_arrayLikeToArray(o, minLen); }

function quota_arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function quota_iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function quota_arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }


function parseQuota(result) {
  try {
    var _result$multistatus$r = quota_slicedToArray(result.multistatus.response, 1),
        responseItem = _result$multistatus$r[0];

    var _responseItem$propsta = responseItem.propstat.prop,
        quotaUsed = _responseItem$propsta["quota-used-bytes"],
        quotaAvail = _responseItem$propsta["quota-available-bytes"];
    return typeof quotaUsed !== "undefined" && typeof quotaAvail !== "undefined" ? {
      used: parseInt(quotaUsed, 10),
      available: translateDiskSpace(quotaAvail)
    } : null;
  } catch (err) {
    /* ignore */
  }

  return null;
}
;// CONCATENATED MODULE: ./source/operations/getQuota.ts






function getQuota_await(value, then, direct) {
  if (direct) {
    return then ? then(value) : value;
  }

  if (!value || !value.then) {
    value = Promise.resolve(value);
  }

  return then ? value.then(then) : value;
}

function getQuota_async(f) {
  return function () {
    for (var args = [], i = 0; i < arguments.length; i++) {
      args[i] = arguments[i];
    }

    try {
      return Promise.resolve(f.apply(this, args));
    } catch (e) {
      return Promise.reject(e);
    }
  };
}

var getQuota_getQuota = getQuota_async(function (context) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var path = options.path || "/";
  var requestOptions = prepareRequestOptions({
    url: joinURL(context.remoteURL, path),
    method: "PROPFIND",
    headers: {
      Accept: "text/plain",
      Depth: "0"
    },
    responseType: "text"
  }, context, options);
  return getQuota_await(request(requestOptions), function (response) {
    handleResponseCode(context, response);
    return getQuota_await(parseXML(response.data), function (result) {
      var quota = parseQuota(result);
      return processResponsePayload(response, quota, options.details);
    });
  });
});
;// CONCATENATED MODULE: ./source/operations/moveFile.ts





function moveFile_await(value, then, direct) {
  if (direct) {
    return then ? then(value) : value;
  }

  if (!value || !value.then) {
    value = Promise.resolve(value);
  }

  return then ? value.then(then) : value;
}

function moveFile_async(f) {
  return function () {
    for (var args = [], i = 0; i < arguments.length; i++) {
      args[i] = arguments[i];
    }

    try {
      return Promise.resolve(f.apply(this, args));
    } catch (e) {
      return Promise.reject(e);
    }
  };
}

var moveFile_moveFile = moveFile_async(function (context, filename, destination) {
  var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  var requestOptions = prepareRequestOptions({
    url: joinURL(context.remoteURL, encodePath(filename)),
    method: "MOVE",
    headers: {
      Destination: joinURL(context.remoteURL, encodePath(destination))
    }
  }, context, options);
  return moveFile_await(request(requestOptions), function (response) {
    handleResponseCode(context, response);
  });
});
// EXTERNAL MODULE: ./node_modules/byte-length/dist/index.js
var byte_length_dist = __webpack_require__(8918);
;// CONCATENATED MODULE: ./source/compat/arrayBuffer.ts
var hasArrayBuffer = typeof ArrayBuffer === "function";
var objToString = Object.prototype.toString; // Taken from: https://github.com/fengyuanchen/is-array-buffer/blob/master/src/index.js

function isArrayBuffer(value) {
  return hasArrayBuffer && (value instanceof ArrayBuffer || objToString.call(value) === "[object ArrayBuffer]");
}
;// CONCATENATED MODULE: ./source/compat/buffer.ts
function isBuffer(value) {
  return value != null && value.constructor != null && typeof value.constructor.isBuffer === "function" && value.constructor.isBuffer(value);
}
;// CONCATENATED MODULE: ./source/tools/size.ts





function calculateDataLength(data) {
  if (isArrayBuffer(data)) {
    return data.byteLength;
  } else if (isBuffer(data)) {
    return data.length;
  } else if (typeof data === "string") {
    return (0,byte_length_dist/* byteLength */.k)(data);
  }

  throw new dist.Layerr({
    info: {
      code: ErrorCode.DataTypeNoLength
    }
  }, "Cannot calculate data length: Invalid type");
}
;// CONCATENATED MODULE: ./source/operations/putFileContents.ts










function putFileContents_await(value, then, direct) {
  if (direct) {
    return then ? then(value) : value;
  }

  if (!value || !value.then) {
    value = Promise.resolve(value);
  }

  return then ? value.then(then) : value;
}

function putFileContents_async(f) {
  return function () {
    for (var args = [], i = 0; i < arguments.length; i++) {
      args[i] = arguments[i];
    }

    try {
      return Promise.resolve(f.apply(this, args));
    } catch (e) {
      return Promise.reject(e);
    }
  };
}

var putFileContents_putFileContents = putFileContents_async(function (context, filePath, data) {
  var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  var _options$contentLengt = options.contentLength,
      contentLength = _options$contentLengt === void 0 ? true : _options$contentLengt,
      _options$overwrite = options.overwrite,
      overwrite = _options$overwrite === void 0 ? true : _options$overwrite;
  var headers = {
    "Content-Type": "application/octet-stream"
  };

  if (false) {} else if (contentLength === false) {// Skip, disabled
  } else if (typeof contentLength === "number") {
    headers["Content-Length"] = "".concat(contentLength);
  } else {
    headers["Content-Length"] = "".concat(calculateDataLength(data));
  }

  if (!overwrite) {
    headers["If-None-Match"] = "*";
  }

  var requestOptions = prepareRequestOptions({
    url: joinURL(context.remoteURL, encodePath(filePath)),
    method: "PUT",
    headers: headers,
    data: data
  }, context, options);
  return putFileContents_await(request(requestOptions), function (response) {
    try {
      handleResponseCode(context, response);
    } catch (err) {
      var error = err;

      if (error.status === 412 && !overwrite) {
        return false;
      } else {
        throw error;
      }
    }

    return true;
  });
});
function putFileContents_getFileUploadLink(context, filePath) {
  var url = "".concat(joinURL(context.remoteURL, encodePath(filePath)), "?Content-Type=application/octet-stream");
  var protocol = /^https:/i.test(url) ? "https" : "http";

  switch (context.authType) {
    case AuthType.None:
      // Do nothing
      break;

    case AuthType.Password:
      {
        var authPart = context.headers.Authorization.replace(/^Basic /i, "").trim();
        var authContents = fromBase64(authPart);
        url = url.replace(/^https?:\/\//, "".concat(protocol, "://").concat(authContents, "@"));
        break;
      }

    default:
      throw new dist.Layerr({
        info: {
          code: ErrorCode.LinkUnsupportedAuthType
        }
      }, "Unsupported auth type for file link: ".concat(context.authType));
  }

  return url;
}
;// CONCATENATED MODULE: ./source/factory.ts
















var DEFAULT_CONTACT_HREF = "https://github.com/perry-mitchell/webdav-client/blob/master/LOCK_CONTACT.md";
function createClient(remoteURL) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var _options$authType = options.authType,
      authTypeRaw = _options$authType === void 0 ? null : _options$authType,
      _options$contactHref = options.contactHref,
      contactHref = _options$contactHref === void 0 ? DEFAULT_CONTACT_HREF : _options$contactHref,
      _options$headers = options.headers,
      headers = _options$headers === void 0 ? {} : _options$headers,
      httpAgent = options.httpAgent,
      httpsAgent = options.httpsAgent,
      maxBodyLength = options.maxBodyLength,
      maxContentLength = options.maxContentLength,
      password = options.password,
      token = options.token,
      username = options.username,
      withCredentials = options.withCredentials;
  var authType = authTypeRaw;

  if (!authType) {
    authType = username || password ? AuthType.Password : AuthType.None;
  }

  var context = {
    authType: authType,
    contactHref: contactHref,
    headers: Object.assign({}, headers),
    httpAgent: httpAgent,
    httpsAgent: httpsAgent,
    maxBodyLength: maxBodyLength,
    maxContentLength: maxContentLength,
    remotePath: extractURLPath(remoteURL),
    remoteURL: remoteURL,
    password: password,
    token: token,
    username: username,
    withCredentials: withCredentials
  };
  setupAuth(context, username, password, token);
  return {
    copyFile: function copyFile(filename, destination, options) {
      return copyFile_copyFile(context, filename, destination, options);
    },
    createDirectory: function createDirectory(path, options) {
      return createDirectory_createDirectory(context, path, options);
    },
    createReadStream: function createReadStream(filename, options) {
      return createStream_createReadStream(context, filename, options);
    },
    createWriteStream: function createWriteStream(filename, options, callback) {
      return createStream_createWriteStream(context, filename, options, callback);
    },
    customRequest: function customRequest(path, requestOptions) {
      return customRequest_customRequest(context, path, requestOptions);
    },
    deleteFile: function deleteFile(filename, options) {
      return deleteFile_deleteFile(context, filename, options);
    },
    exists: function exists(path, options) {
      return exists_exists(context, path, options);
    },
    getDirectoryContents: function getDirectoryContents(path, options) {
      return directoryContents_getDirectoryContents(context, path, options);
    },
    getFileContents: function getFileContents(filename, options) {
      return getFileContents_getFileContents(context, filename, options);
    },
    getFileDownloadLink: function getFileDownloadLink(filename) {
      return getFileContents_getFileDownloadLink(context, filename);
    },
    getFileUploadLink: function getFileUploadLink(filename) {
      return putFileContents_getFileUploadLink(context, filename);
    },
    getHeaders: function getHeaders() {
      return Object.assign({}, context.headers);
    },
    getQuota: function getQuota(options) {
      return getQuota_getQuota(context, options);
    },
    lock: function lock(path, options) {
      return lock_lock(context, path, options);
    },
    moveFile: function moveFile(filename, destinationFilename, options) {
      return moveFile_moveFile(context, filename, destinationFilename, options);
    },
    putFileContents: function putFileContents(filename, data, options) {
      return putFileContents_putFileContents(context, filename, data, options);
    },
    setHeaders: function setHeaders(headers) {
      context.headers = Object.assign({}, headers);
    },
    stat: function stat(path, options) {
      return getStat(context, path, options);
    },
    unlock: function unlock(path, token, options) {
      return lock_unlock(context, path, token, options);
    }
  };
}
;// CONCATENATED MODULE: ./source/index.ts




})();

/******/ 	return __webpack_exports__;
/******/ })()
;
});