const { glob, rm } = require("node:fs/promises");

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
    for (const pattern of pathsToDelete) {
      for await (const entry of glob(pattern)) {
        await rm(entry, { recursive: true, force: true });
      }
    }
    console.log("Build files and directories cleaned successfully.");
  } catch (error) {
    console.error("Error while cleaning files:", error);
  }
})();
