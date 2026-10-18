// Metro config. On web (only used for the store screenshot export) native only
// modules resolve to small stubs in web-stubs/, so the web build renders.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const WEB_STUBS = {
  'expo-tracking-transparency': 'web-stubs/tracking-transparency.js',
  'react-native-purchases': 'web-stubs/purchases.js',
};

const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && WEB_STUBS[moduleName]) {
    return { type: 'sourceFile', filePath: path.join(__dirname, WEB_STUBS[moduleName]) };
  }
  return upstream ? upstream(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
