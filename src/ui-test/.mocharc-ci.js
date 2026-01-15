const path = require("path");

module.exports = {
  timeout: 99999999,
  reporter: "mocha-json-output-reporter",
  reporterOptions: {
    output: path.resolve(__dirname, "../out/ui-test-results.json"),
  },
};