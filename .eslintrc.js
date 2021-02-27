module.exports = {
  parser: "@babel/eslint-parser", // Specifies the ESLint parser
  root: true,
  extends: [
    "plugin:prettier/recommended", // Enables eslint-plugin-prettier and displays prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
  ],
  plugins: [],
  parserOptions: {
    requireConfigFile: false,
    ecmaVersion: 2018, // Allows for the parsing of modern ECMAScript features
    sourceType: "module", // Allows for the use of imports
    ecmaFeatures: {},
  },
  env: {
    es6: true,
    node: true,
  },
  overrides: [
    {
      files: ["./example/**/*.js"],
      rules: {
        // Allow require statement for all JS files
        "@typescript-eslint/no-var-requires": "off",
      },
    },
  ],
};
