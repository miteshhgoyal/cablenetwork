module.exports = function (api) {
  api.cache(true);
  return {
    // Use expo preset, and load expo-router as a plugin (safe shape)
    presets: [
      'babel-preset-expo',
      'nativewind/babel'
    ],
    plugins: [
      ['expo-router/babel', { origin: false }]
    ],
  };
};

// module.exports = function (api) {
//   api.cache(true);
//   return {
//     presets: [
//       // expo preset must remain
//       "babel-preset-expo"
//     ],
//     plugins: [
//       // expo-router must be first
//       ["expo-router/babel", { "origin": false }],
//       // nativewind plugin
//       "nativewind/babel"
//     ],
//   };
// };


// module.exports = function (api) {
//   api.cache(true);
//   return {
//     presets: ["babel-preset-expo"],
//     plugins: [
//       "expo-router/babel",
//       "nativewind/babel",
//     ],
//   };
// };

