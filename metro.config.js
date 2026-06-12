const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add 'sql' to the list of recognized source extensions
config.resolver.sourceExts.push('sql');

module.exports = config;
