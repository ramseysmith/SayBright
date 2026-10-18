// Web export only (store screenshots). RevenueCat is never configured on web;
// the paywall shows demo plans instead.
const noop = async () => {};
const empty = { entitlements: { active: {}, all: {} }, activeSubscriptions: [] };
const Purchases = {
  configure: noop,
  setLogLevel: noop,
  getCustomerInfo: async () => empty,
  getOfferings: async () => ({ all: {}, current: null }),
  purchasePackage: async () => { throw Object.assign(new Error('web'), { userCancelled: true }); },
  restorePurchases: async () => empty,
  checkTrialOrIntroductoryPriceEligibility: async () => ({}),
  enableAdServicesAttributionTokenCollection: noop,
  addCustomerInfoUpdateListener: () => {},
};
module.exports = Purchases;
module.exports.default = Purchases;
module.exports.LOG_LEVEL = { VERBOSE: 'VERBOSE', DEBUG: 'DEBUG', INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR' };
module.exports.PACKAGE_TYPE = { ANNUAL: 'ANNUAL', MONTHLY: 'MONTHLY' };
module.exports.INTRO_ELIGIBILITY_STATUS = { INTRO_ELIGIBILITY_STATUS_ELIGIBLE: 2 };
