import * as vscode from "vscode";

type NotificationAction = () => Thenable<unknown> | Promise<void> | void;

/**
 * Shows an information notification with a button that executes a custom action when clicked.
 * @param {string} infoMessage - The information message to display.
 * @param {string} buttonLabel - The label for the button.
 * @param {NotificationAction} action - The action to perform when the button is clicked.
 * @returns {Promise<void>} - A promise that resolves when the notification is shown and handled.
 */
export async function showInfoNotificationWithAction(
  infoMessage: string,
  buttonLabel: string,
  action: NotificationAction
): Promise<void> {
  const selectedOption = await vscode.window.showInformationMessage(
    infoMessage,
    buttonLabel
  );
  if (selectedOption === buttonLabel) {
    await Promise.resolve(action());
  }
}

/**
 * Shows an information notification with multiple buttons that execute custom actions when clicked.
 * @param {string} infoMessage - The information message to display.
 * @param {Array<{label: string, action: NotificationAction}>} actions - An array of objects, each containing a button label and an action to perform when clicked.
 * @returns {Promise<void>} - A promise that resolves when the notification is shown and handled.
 * @example
 * showInfoNotificationWithMultipleActions(
 *   "Solution available",
 *   [
 *     { label: "View Solution", action: () => openSolution() },
 *     { label: "Mute for this session", action: () => disableNotifications() }
 *   ]
 * );
 */
export async function showInfoNotificationWithMultipleActions(
  infoMessage: string,
  actions: { label: string; action: NotificationAction }[]
): Promise<void> {
  const selectedOption = await vscode.window.showInformationMessage(
    infoMessage,
    ...actions.map((action) => action.label)
  );

  if (selectedOption) {
    const selectedAction = actions.find(
      (action) => action.label === selectedOption
    );
    if (selectedAction) {
      await Promise.resolve(selectedAction.action());
    }
  }
}

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
