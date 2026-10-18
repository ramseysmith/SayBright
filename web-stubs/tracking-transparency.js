// Web export only (store screenshots): no App Tracking Transparency on web.
const answer = { status: 'denied', granted: false, canAskAgain: false, expires: 'never' };
module.exports = {
  requestTrackingPermissionsAsync: async () => answer,
  getTrackingPermissionsAsync: async () => answer,
  useTrackingPermissions: () => [answer, async () => answer, async () => answer],
  isAvailable: () => false,
};
