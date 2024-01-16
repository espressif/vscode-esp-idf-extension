import * as vscode from "vscode";
/**
 * Shows an error notification with a button that opens a link when clicked.
 * @param {string} errorMessage - The error message to display.
 * @param {string} [buttonLabel="Read Documentation"] - The label for the button (default: "Read Documentation")
 * @param {string} linkUrl - The URL to open when the button is clicked.
 * @returns {Promise<void>} - A promise that resolves when the notification is shown.
 */
export async function showErrorNotificationWithLink(
  errorMessage,
  linkUrl,
  buttonLabel = "Read documentation"
) {
  const selectedOption = await vscode.window.showErrorMessage(
    errorMessage,
    buttonLabel
  );
  if (selectedOption === buttonLabel) {
    vscode.env.openExternal(vscode.Uri.parse(linkUrl));
  }
}
