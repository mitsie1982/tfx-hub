/**
 * metro.config.js - monorepo-aware Metro config
 */
const path = require('path');
const { getDefaultConfig } = require('metro-config');

module.exports = (async () => {
  const defaultConfig = await getDefaultConfig();
  const projectRoot = __dirname;
  const watchFolders = [
    path.resolve(projectRoot, 'packages'),
  ];
  const resolver = {
    ...defaultConfig.resolver,
    sourceExts: [...defaultConfig.resolver.sourceExts, 'cjs'],
  };
  return {
    ...defaultConfig,
    projectRoot,
    watchFolders,
    resolver,
  };
})();
