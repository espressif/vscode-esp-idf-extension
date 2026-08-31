import { env, Uri, window } from "vscode";
import { Logger } from "./logger";

export type NotificationAction = () => Thenable<unknown> | Promise<void> | void;
export type NotificationButton = { label: string; execute: NotificationAction };

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
  const selectedOption = await window.showInformationMessage(
    infoMessage,
    buttonLabel
  );
  if (selectedOption === buttonLabel) {
    await Promise.resolve(action());
  }
}

/**
 * Severity determines how the error is presented to the user.
 */
export enum ErrorSeverity {
  /** Shown as information message */
  Info = "info",
  /** Shown as warning message */
  Warning = "warning",
  /** Shown as error message */
  Error = "error",
}

/**
 * Shows an information notification with multiple buttons that execute custom actions when clicked.
 * @param {string} message - The information message to display.
 * @param {Array<NotificationButton>} actions - An array of objects, each containing a button label and an action to perform when clicked.
 * @param {ErrorSeverity} [severity=ErrorSeverity.Info] - The severity of the notification (default: Info).
 * @returns {Promise<void>} - A promise that resolves when the notification is shown and handled.
 * @example
 * showInfoNotificationWithMultipleActions(
 *   "Solution available",
 *   [
 *     { label: "View Solution", action: () => openSolution(), severity: ErrorSeverity.Info },
 *     { label: "Mute for this session", action: () => disableNotifications(), severity: ErrorSeverity.Warning }
 *   ]
 * );
 */
export async function showNotificationWithMultipleActions(
  message: string,
  actions: NotificationButton[],
  severity: ErrorSeverity = ErrorSeverity.Info
): Promise<void> {
  let selectedOption: string | undefined;
  const labels = actions.map((action) => action.label);

  switch (severity) {
    case ErrorSeverity.Info:
      selectedOption = await window.showInformationMessage(message, ...labels);
      break;
    case ErrorSeverity.Warning:
      selectedOption = await window.showWarningMessage(message, ...labels);
      break;
    case ErrorSeverity.Error:
    default:
      selectedOption = await window.showErrorMessage(message, ...labels);
      break;
  }

  if (selectedOption) {
    const selectedAction = actions.find(
      (action) => action.label === selectedOption
    );
    if (selectedAction) {
      try {
        await Promise.resolve(selectedAction.execute());
      } catch (error) {
        Logger.error(
          `Error executing action for notification: ${error}`,
          error as Error,
          "showNotificationWithMultipleActions",
          undefined,
          false
        );
      }
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
  infoMessage: string,
  linkUrl: string,
  buttonLabel: string = "Read documentation"
): Promise<void> {
  const selectedOption = await window.showInformationMessage(
    infoMessage,
    buttonLabel
  );

  if (selectedOption === buttonLabel) {
    env.openExternal(Uri.parse(linkUrl));
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
  const selectedOption = await window.showQuickPick(
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
