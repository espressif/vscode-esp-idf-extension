export function isVersionLowerThan5(version) {
    if (version && version.name) {
      // Regular expression to match the version number in the format vX.X.X or release/vX.X
      const match = version.name.match(/v(\d+(\.\d+)?(\.\d+)?)/);
      
      // If a version number was found, parse it
      if (match) {
        const versionNumber = parseFloat(match[1]);
        // Return true if versionNumber is less than 5
        return versionNumber < 5;
      } else {
        // If no version number found, assume it's a development branch and return false
        return false;
      }
    }
    return false;
  }
  