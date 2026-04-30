const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const projectRoot = __dirname;
const webRoot = path.resolve(projectRoot, '..', 'frontend');

const config = getDefaultConfig(projectRoot);

// Allow Metro to read files from the sibling web app — needed because
// /app/mobile/src/i18n/locales is a symlink into /app/frontend/src/i18n/locales.
config.watchFolders = [webRoot];

// Ensure node_modules of the mobile app are preferred when resolving deps from web locales.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];

// Follow symlinks (default in newer Metro, explicit for safety on Expo SDK 54).
config.resolver.unstable_enableSymlinks = true;

module.exports = withNativeWind(config, { input: './global.css' });

