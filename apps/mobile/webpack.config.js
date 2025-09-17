const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync({ ...env }, argv);

  // Explicitly set the publicPath so Webpack doesn't attempt automatic detection
  // This prevents: "Automatic publicPath is not supported in this browser"
  if (!config.output) config.output = {};
  config.output.publicPath = '/';

  // Ensure history API fallback works for expo-router
  if (!config.devServer) config.devServer = {};
  config.devServer.historyApiFallback = true;

  return config;
};
