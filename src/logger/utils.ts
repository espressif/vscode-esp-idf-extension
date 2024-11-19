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
