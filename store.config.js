// App Store listing for EAS Metadata. Edit store.config.json, then merge to the default
// branch (store-push.yml publishes it) or run: npm run store:push
// The version always follows the app config, so listing changes land on the version being
// prepared rather than the one already live, and the App Review phone comes from
// STORE_REVIEW_PHONE so it stays out of git.
const config = require('./store.config.json');

function appVersion() {
  try {
    return require('@expo/config').getConfig(__dirname, { skipSDKVersionRequirement: true }).exp.version;
  } catch {
    for (const read of [
      () => {
        const m = require('./app.config.js');
        const c = m && m.__esModule ? m.default : m;
        const v = typeof c === 'function' ? c({ config: {} }) : c;
        return (v.expo || v).version;
      },
      () => require('./app.json').expo.version,
    ]) {
      try {
        const v = read();
        if (v) return v;
      } catch {}
    }
    return config.apple.version;
  }
}

const review = { ...config.apple.review };
if (process.env.STORE_REVIEW_PHONE) review.phone = process.env.STORE_REVIEW_PHONE;
module.exports = { ...config, apple: { ...config.apple, version: appVersion(), review } };
