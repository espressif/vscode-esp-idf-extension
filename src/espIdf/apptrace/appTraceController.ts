import { EventEmitter } from "events";
import * as Telnet from "telnet-client";
import { OpenOCDController } from "./openOCDController";

export class AppTraceSession extends EventEmitter{
    private openOCDController: OpenOCDController;
    private telnetController: Telnet;

    constructor(openOCDController: OpenOCDController) {
        super();
        this.openOCDController = openOCDController;
        this.telnetController = new Telnet();
    }

    public async start() {
        await this.launchOpenOCDServer();
        await this.connectTelnetSession("localhost", 4444);
    }

    // public async stop() {

    // }
    private async launchOpenOCDServer() {
        this.openOCDController.on("data", (data: Buffer) => {
            this.emit("openOCD-data", data);
        });
        this.openOCDController.on("error", (data: Buffer, error: Error) => {
            let errorMsg: string = "OpenOCD server failed to start";
            if (error.message === "STDERR_CHAN_RECV") {
                const regex = /^Error:.*$/gmi;
                const errStr = data.toString();
                const matchArr = errStr.match(regex);
                errorMsg += ` ${matchArr.join(" ")}`;
            }
            this.emit("openOCD-error", errorMsg, error);
        });
        await this.openOCDController.startServer();
    }
    private async connectTelnetSession(host: string, port: number) {
        await this.telnetController.connect({
            host,
            port,
            timeout: 1500,
        });
    }
    private async sendCommandToTelnetSession(command: string) {
        return await this.telnetController.exec(command);
    }
}
