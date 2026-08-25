/**
 * Resolves the target store ID based on the user's role and requested store ID.
 * - Admin: Can optionally specify a storeId. If not specified, returns null (global scope).
 * - Manager/Staff: Always locked to their assigned storeId.
 * 
 * @param {Object} user - The authenticated user object from req.user
 * @param {String} reqStoreId - The storeId requested from query/body (optional)
 * @returns {String|null} The resolved target store ID, or null if global scope
 * @throws {Error} If a non-admin user has no assigned store
 */
const resolveTargetStoreId = (user, reqStoreId) => {
  const userRole = user.role;
  const userStoreId = user.storeId?._id || user.storeId;

  if (userRole === 'admin') {
    return (reqStoreId && reqStoreId !== 'all') ? reqStoreId : null;
  } else {
    if (!userStoreId) {
      throw new Error("No store assigned to this user.");
    }
    return userStoreId;
  }
};

module.exports = {
  resolveTargetStoreId
};
