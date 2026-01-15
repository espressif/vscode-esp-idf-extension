const fs = require("fs");
const path = require("path");

let outPath;

const possiblePaths = [
  path.resolve(__dirname, "../../out/ui-test-results.json"),
  path.resolve(__dirname, "../out/ui-test-results.json"),
  path.resolve(__dirname, "out/ui-test-results.json"),
];

for (const p of possiblePaths) {
  // Use the first path where the folder exists
  if (fs.existsSync(path.dirname(p))) {
    outPath = p;
    break;
  }
}

module.exports = {
  timeout: 99999999,
  reporter: "json",
  "reporter-option": ["output=" + outPath],
};