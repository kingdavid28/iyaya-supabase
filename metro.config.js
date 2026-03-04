const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix bundling issues
config.resolver.platforms = ['web', 'native', 'default'];
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

// Block problematic node externals
config.resolver.blockList = [
  /node:sea/,
  /node_modules\/.*\/node:sea/,
  /\.expo\/metro\/externals\/node:sea/
];

// Add crypto polyfills
config.resolver.alias = {
  ...config.resolver.alias,
  crypto: 'react-native-get-random-values',
};

// Web-specific fixes
if (process.env.EXPO_PLATFORM === 'web') {
  config.resolver.resolverMainFields = ['browser', 'main'];
  config.transformer.minifierConfig = {
    keep_fnames: true,
    mangle: { keep_fnames: true },
  };
}

module.exports = config;