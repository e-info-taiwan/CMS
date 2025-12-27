"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.invalidateCacheAfterOperation = invalidateCacheAfterOperation;
var _subscriptionWebhooksShare = require("@mirrormedia/subscription-webhooks-share");
const log = (0, _subscriptionWebhooksShare.createLogger)();
function checkURLIsDesignated(invalidateCDNCacheURL) {
  if (!invalidateCDNCacheURL) {
    log(_subscriptionWebhooksShare.LogSeverity.DEBUG, 'invalidateCDNCacheServerURL is not designated', {
      invalidateCDNCacheURL
    });
    return false;
  }
  return true;
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
function requestAPI(url, data) {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
}
async function invalidateCache(invalidateCDNCacheURL, /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
request) {
  try {
    await requestAPI(invalidateCDNCacheURL, request);
  } catch (err) {
    const payload = {
      request,
      error: {}
    };
    if (err instanceof Error) {
      payload.error = {
        message: err.message ?? err.toString(),
        stack: err.stack
      };
    }
    log(_subscriptionWebhooksShare.LogSeverity.ERROR, `Encountered error while invalidating CDN cache`, payload);
  }
}

/**
 * combine afterOperation functions
 */
function combineAfterOperationHooks(...hooks) {
  // params is came from hooks : afterOperation, item...etc
  return async params => {
    await Promise.allSettled(hooks.filter(hook => typeof hook === 'function').map(hook => hook(params)));
  };
}

/**
  hooks: call invalidate CDN  cache API after operation
*/
function invalidateCacheAfterOperation(list, invalidateCDNCacheURL, requestGenerator) {
  var _list$hooks;
  if (checkURLIsDesignated(invalidateCDNCacheURL) === false) return list;

  // list's original hooks.afterOperation came from list
  const originalAfterOperation = (_list$hooks = list.hooks) === null || _list$hooks === void 0 ? void 0 : _list$hooks.afterOperation;

  // custom hooks.resolveInput
  const newAfterOperation = async ({
    item,
    originalItem
  }) => {
    const requestObj = requestGenerator(item, originalItem);
    // @ts-ignore: invalidateCDNCacheURL is string
    await invalidateCache(invalidateCDNCacheURL, requestObj);
  };

  // add custom hooks
  // combine the original hook and the custom one
  list.hooks = {
    ...list.hooks,
    afterOperation: combineAfterOperationHooks(originalAfterOperation, newAfterOperation)
  };
  return list;
}