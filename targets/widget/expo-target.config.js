/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: 'widget',
  icon: '../../assets/icon.png',
  deploymentTarget: '17.0',
  colors: {
    $accent: '#F5A623',
    $widgetBackground: '#FFF8F0',
  },
  entitlements: {
    'com.apple.security.application-groups': ['group.com.saybright.app'],
  },
};
