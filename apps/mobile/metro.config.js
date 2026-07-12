const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Monorepo support: let Metro see packages/shared and hoisted deps at the workspace root.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
// NOTE: deliberately NOT setting disableHierarchicalLookup -- that flag disables Metro's
// normal upward node_modules walk entirely, which also breaks resolution of a dependency's
// own *nested* node_modules (e.g. @maplibre/maplibre-react-native/node_modules/@turf/helpers,
// which isn't hoisted to the workspace root). The two extra nodeModulesPaths above are enough
// to additionally find hoisted workspace packages like @fetchlocation/shared.

module.exports = config;
