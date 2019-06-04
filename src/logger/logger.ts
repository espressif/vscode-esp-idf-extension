import * as vscode from "vscode";
import * as winston from "winston";

export class Logger {

    public static init(context: vscode.ExtensionContext): Logger {
        Logger.instance = new Logger(context);
        return Logger.instance;
    }

    public static info(message: string, metadata?: any) {
        Logger.checkInitialized();
        winston.info(message, metadata);
    }

    public static warn(message: string, metadata?: any) {
        Logger.checkInitialized();
        winston.warn(message, metadata);
    }

    public static error(message: string, error: Error, metadata?: any) {
        Logger.checkInitialized();
        winston.log("error", message, { ...metadata, message: error.message, stack: error.stack });
    }

    private static instance: Logger;

    private static checkInitialized() {
        if (!Logger.instance) {
            throw new Error("need to initialize the logger first use:: Logger.init()");
        }
    }

    private LOG_FILE_NAME = "esp_idf_vsc_ext.log";

    private constructor(context: vscode.ExtensionContext) {
        winston.configure({
            transports: [
                new (winston.transports.File)({
                    filename: context.asAbsolutePath(this.LOG_FILE_NAME),
                    level: "warn",
                }),
            ],
        });
    }
}
