import * as vscode from "vscode";

/**
 * Shows an error notification with a button that opens a link when clicked.
 * @param {string} infoMessage - The waning message to display.
 * @param {string} [buttonLabel="Read Documentation"] - The label for the button (default: "Read Documentation")
 * @param {string} linkUrl - The URL to open when the button is clicked.
 * @returns {Promise<void>} - A promise that resolves when the notification is shown.
 */
export async function showInfoNotificationWithLink(
  infoMessage,
  linkUrl,
  buttonLabel = "Read documentation"
) {
  const selectedOption = await vscode.window.showInformationMessage(
    infoMessage,
    buttonLabel
  );
  if (selectedOption === buttonLabel) {
    vscode.env.openExternal(vscode.Uri.parse(linkUrl));
  }
}

/**
 * Shows a notification with one or two buttons that perform custom actions when clicked.
 * @param {string} message - The message to display.
 * @param {Array<{ label: string, action: () => void }>} buttons - An array of objects containing the label and action for each button.
 * @returns {Promise<void>} - A promise that resolves when the notification is shown.
 */
export async function showQuickPickWithCustomActions(
  message: string,
  buttons: { label: string; action: () => void }[]
): Promise<void> {
  const selectedOption = await vscode.window.showQuickPick(
    buttons.map((button) => button.label),
    {
      placeHolder: message,
      canPickMany: false,
      ignoreFocusOut: true,
    }
  );
  const selectedButton = buttons.find(
    (button) => button.label === selectedOption
  );
  if (selectedButton) {
    selectedButton.action();
  }
}
