"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createLoginLoggingPlugin = createLoginLoggingPlugin;
/**
 * 創建登入日誌插件
 * 用於記錄用戶登入事件
 */
function createLoginLoggingPlugin() {
  return {
    async requestDidStart() {
      let isLoginMutation = false;
      let requestHttp = null;
      return {
        async didResolveOperation(requestContext) {
          var _requestContext$opera, _requestContext$docum;
          // 檢查是否為登入 mutation
          const operationName = requestContext.request.operationName || ((_requestContext$opera = requestContext.operation) === null || _requestContext$opera === void 0 || (_requestContext$opera = _requestContext$opera.name) === null || _requestContext$opera === void 0 ? void 0 : _requestContext$opera.value);
          isLoginMutation = operationName === 'authenticateUserWithPassword' || ((_requestContext$docum = requestContext.document) === null || _requestContext$docum === void 0 ? void 0 : _requestContext$docum.definitions.some(def => {
            var _def$selectionSet;
            return def.kind === 'OperationDefinition' && def.operation === 'mutation' && ((_def$selectionSet = def.selectionSet) === null || _def$selectionSet === void 0 || (_def$selectionSet = _def$selectionSet.selections) === null || _def$selectionSet === void 0 ? void 0 : _def$selectionSet.some(sel => {
              var _sel$name;
              return ((_sel$name = sel.name) === null || _sel$name === void 0 ? void 0 : _sel$name.value) === 'authenticateUserWithPassword';
            }));
          }));
          requestHttp = requestContext.request.http;
        },
        async willSendResponse(requestContext) {
          try {
            if (isLoginMutation) {
              var _body$singleResult, _body$singleResult2, _result, _result2;
              // 嘗試多種方式獲取響應數據
              const body = requestContext.response.body;
              let result = null;

              // 嘗試不同的響應結構
              if (body !== null && body !== void 0 && (_body$singleResult = body.singleResult) !== null && _body$singleResult !== void 0 && _body$singleResult.data) {
                result = body.singleResult.data;
              } else if ((body === null || body === void 0 ? void 0 : body.kind) === 'single' && (_body$singleResult2 = body.singleResult) !== null && _body$singleResult2 !== void 0 && _body$singleResult2.data) {
                result = body.singleResult.data;
              } else if (body !== null && body !== void 0 && body.data) {
                result = body.data;
              } else if (typeof body === 'object' && 'data' in body && body.data) {
                result = body.data;
              }

              // 檢查 authenticate 或 authenticateUserWithPassword
              const authResult = ((_result = result) === null || _result === void 0 ? void 0 : _result.authenticate) || ((_result2 = result) === null || _result2 === void 0 ? void 0 : _result2.authenticateUserWithPassword);
              if (authResult) {
                // 檢查是否為成功登入
                if (authResult.__typename === 'UserAuthenticationWithPasswordSuccess') {
                  var _requestHttp, _requestHttp2, _requestHttp3;
                  const user = authResult.item;
                  const userId = user.id;

                  // 通過 context 查詢完整的用戶信息
                  let userInfo = {
                    id: userId,
                    email: user.email || null,
                    name: user.name || null,
                    role: user.role || null
                  };
                  try {
                    // 如果響應中沒有完整信息，通過 context 查詢
                    if (!user.email || !user.name || !user.role) {
                      var _context$query, _context$prisma, _context$db;
                      const context = requestContext.contextValue;

                      // 嘗試多種方式訪問 context
                      let fullUser = null;

                      // 方式 1: 通過 query API
                      if (context !== null && context !== void 0 && (_context$query = context.query) !== null && _context$query !== void 0 && (_context$query = _context$query.User) !== null && _context$query !== void 0 && _context$query.findOne) {
                        try {
                          fullUser = await context.query.User.findOne({
                            where: {
                              id: userId
                            },
                            query: 'id email name role'
                          });
                        } catch (e) {
                          console.error('[登入日誌] query.User.findOne 錯誤:', e);
                        }
                      }

                      // 方式 2: 通過 Prisma 直接查詢
                      if (!fullUser && context !== null && context !== void 0 && (_context$prisma = context.prisma) !== null && _context$prisma !== void 0 && (_context$prisma = _context$prisma.User) !== null && _context$prisma !== void 0 && _context$prisma.findUnique) {
                        try {
                          fullUser = await context.prisma.User.findUnique({
                            where: {
                              id: parseInt(userId)
                            },
                            select: {
                              id: true,
                              email: true,
                              name: true,
                              role: true
                            }
                          });
                        } catch (e) {
                          console.error('[登入日誌] prisma.User.findUnique 錯誤:', e);
                        }
                      }

                      // 方式 3: 嘗試其他 context 路徑
                      if (!fullUser && context !== null && context !== void 0 && (_context$db = context.db) !== null && _context$db !== void 0 && (_context$db = _context$db.User) !== null && _context$db !== void 0 && _context$db.findOne) {
                        try {
                          fullUser = await context.db.User.findOne({
                            where: {
                              id: userId
                            },
                            query: 'id email name role'
                          });
                        } catch (e) {
                          console.error('[登入日誌] db.User.findOne 錯誤:', e);
                        }
                      }
                      if (fullUser) {
                        userInfo = {
                          id: fullUser.id,
                          email: fullUser.email || null,
                          name: fullUser.name || null,
                          role: fullUser.role || null
                        };
                      } else {
                        // 調試：打印 context 結構
                        console.log('[登入日誌] 無法查詢用戶信息，context 結構:', {
                          hasContextValue: !!context,
                          hasQuery: !!(context !== null && context !== void 0 && context.query),
                          hasPrisma: !!(context !== null && context !== void 0 && context.prisma),
                          hasDb: !!(context !== null && context !== void 0 && context.db),
                          contextKeys: context ? Object.keys(context) : []
                        });
                      }
                    }
                  } catch (queryError) {
                    console.error('[登入日誌] 查詢用戶信息錯誤:', queryError);
                  }

                  // 獲取 IP 地址
                  let ipAddress = ((_requestHttp = requestHttp) === null || _requestHttp === void 0 || (_requestHttp = _requestHttp.headers) === null || _requestHttp === void 0 || (_requestHttp = _requestHttp.get('x-forwarded-for')) === null || _requestHttp === void 0 || (_requestHttp = _requestHttp.split(',')[0]) === null || _requestHttp === void 0 ? void 0 : _requestHttp.trim()) || ((_requestHttp2 = requestHttp) === null || _requestHttp2 === void 0 || (_requestHttp2 = _requestHttp2.headers) === null || _requestHttp2 === void 0 ? void 0 : _requestHttp2.get('x-real-ip')) || ((_requestHttp3 = requestHttp) === null || _requestHttp3 === void 0 || (_requestHttp3 = _requestHttp3.socket) === null || _requestHttp3 === void 0 ? void 0 : _requestHttp3.remoteAddress) || 'unknown';

                  // 將 IPv6 localhost 轉換為 IPv4
                  if (ipAddress === '::1' || ipAddress === '::ffff:127.0.0.1') {
                    ipAddress = '127.0.0.1';
                  }
                  console.log('[登入日誌]', {
                    timestamp: new Date().toISOString(),
                    userId: userInfo.id,
                    email: userInfo.email || 'N/A',
                    name: userInfo.name || 'N/A',
                    role: userInfo.role || 'N/A',
                    ipAddress
                  });
                } else if (authResult.__typename === 'UserAuthenticationWithPasswordFailure') {
                  console.log('[登入日誌] 登入失敗:', authResult.message);
                }
              }
            }
          } catch (error) {
            console.error('[登入日誌錯誤]', error);
            if (error instanceof Error) {
              console.error('[登入日誌錯誤] Stack:', error.stack);
            }
          }
        }
      };
    }
  };
}