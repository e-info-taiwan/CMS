"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.owner = exports.moderator = exports.editor = exports.contributor = exports.allowRolesForUsers = exports.allowRoles = exports.admin = void 0;
const accessControlStrategy = process.env.ACCESS_CONTROL_STRATEGY;
const allowRoles = (...args) => {
  // 此function會返回Boolean到list.access中, true為能夠存取, false則是無存取權
  switch (accessControlStrategy) {
    case 'gql':
    case 'preview':
      {
        return () => true;
      }
    case 'cms':
    default:
      {
        return async auth => {
          return await checkAccessControl(args, auth);
        };
      }
  }
};
exports.allowRoles = allowRoles;
const allowRolesForUsers = (...args) => {
  // keystone若是發現user在db中沒有任何資料，會貼心地引導我們創立一個新的user
  // 然而，此CMS預設user會有access control（安全型考量）
  // 若user的create access control受到限制,則adminUI將會沒有權限幫我們新增
  // （陷入沒辦法登入進CMS的窘境）
  // 因此在user的access control需要多判斷「如果db中沒有user存在，就暫時關閉access control用以新增user」
  return async auth => {
    const newArgs = [...args, isNeedToTurnOffAccessControl];
    return await checkAccessControl(newArgs, auth);
  };
};
exports.allowRolesForUsers = allowRolesForUsers;
const isNeedToTurnOffAccessControl = async auth => {
  // if no users in db, then turn off access-control for creating first user
  const users = await auth.context.prisma.user.findMany();
  return users.length === 0;
};
async function checkAccessControl(checkFunctionArray, auth) {
  let accessControlResult = false;
  for (let i = 0; i < checkFunctionArray.length; i++) {
    // check是被傳入的role判斷function，admin、moderator、editor等等的
    // check()將會取得決定此user能否有存取權的boolean值
    const check = checkFunctionArray[i];
    const checkResult = await check(auth);
    if (checkResult) {
      accessControlResult = checkResult;
      break;
    }
  }
  return accessControlResult;
}
const admin = auth => {
  var _auth$session;
  // 我們可以在auth.session.data取得當下登入使用者的資料，用此來對比使用者的role
  // 預設auth.session.data只有user.name
  // 若要取得user.role或是其他user資料，可至auth.ts中的sessionData調整
  const user = auth === null || auth === void 0 || (_auth$session = auth.session) === null || _auth$session === void 0 ? void 0 : _auth$session.data;
  return Boolean(user && user.role === 'admin');
};
exports.admin = admin;
const moderator = auth => {
  var _auth$session2;
  const user = auth === null || auth === void 0 || (_auth$session2 = auth.session) === null || _auth$session2 === void 0 ? void 0 : _auth$session2.data;
  return Boolean(user && user.role === 'moderator');
};
exports.moderator = moderator;
const editor = auth => {
  var _auth$session3;
  const user = auth === null || auth === void 0 || (_auth$session3 = auth.session) === null || _auth$session3 === void 0 ? void 0 : _auth$session3.data;
  return Boolean(user && user.role === 'editor');
};
exports.editor = editor;
const contributor = auth => {
  var _auth$session4;
  const user = auth === null || auth === void 0 || (_auth$session4 = auth.session) === null || _auth$session4 === void 0 ? void 0 : _auth$session4.data;
  return Boolean(user && user.role === 'contributor');
};

// TODO: 完成owner
// eslint-disable-next-line @typescript-eslint/no-unused-vars
exports.contributor = contributor;
const owner = async auth => {
  //   const user = auth?.session?.data
  //   if (!user) return false
  //   console.log(auth.content)

  //   // const editedList =  await auth.context.prisma[auth.listKey].find()

  //   return Boolean(user && user.role === 'owner')

  return false;
};
exports.owner = owner;