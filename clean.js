const del = require("del");

(async () => {
  const pathsToDelete = [
    "dist/**",
    "out/**",
    "*.vsix",
    "report.json",
    "report.txt",
    "testing.results.log",
    "esp_idf_vsc_ext.log",
    "esp_idf_docs_*.json",
  ];

  try {
    await del(pathsToDelete);
    console.log("Build files and directories cleaned successfully.");
  } catch (error) {
    console.error("Error while cleaning files:", error);
  }
})();
