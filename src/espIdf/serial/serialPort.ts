import * as vscode from "vscode";
import * as idfConf from "../../idfConfiguration";
import { LocDictionary } from "../../localizationDictionary";
import { PreCheck, spawn } from "../../utils";
import { SerialPortDetails } from "./serialPortDetails";

export class SerialPort {
    public static shared(): SerialPort {
        if (!SerialPort.instance) {
            SerialPort.instance = new SerialPort();
        }
        return SerialPort.instance;
    }

    private static instance: SerialPort;
    private locDic: LocDictionary;

    private constructor() {
        this.locDic = new LocDictionary("SerialPort");
    }
    public promptUserToSelect(): any {
        SerialPort.shared().displayList();
    }
    private async displayList() {
        const msgDefault = "Select the available serial port where your device is connected.";
        const msg = this.locDic.localize("serial.selectSerialPortMessage", msgDefault);

        try {
            const portList = await this.list();
            const chosen = await vscode.window.showQuickPick(portList.map((l: SerialPortDetails) => {
                return {
                    description: l.manufacturer,
                    label: l.comName,
                };
            }), { placeHolder: msg });
            if (chosen && chosen.label) {
                this.updatePortListStatus(chosen.label);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Something went wrong while getting the serial port list`);
            console.error(`Something went wrong while getting the serial port list.\n${error}`);
        }
    }

    private updatePortListStatus(l: string) {
        PreCheck.perform(PreCheck.isWorkspaceFolderOpen, "Open a workspace before select the Serial Port", () => {
            const workspaceRoot = vscode.workspace.workspaceFolders[0].uri;
            idfConf.writeParameter("idf.port", l, workspaceRoot);
            const portHasBeenSelectedMsg = this.locDic.localize("serial.portHasBeenSelectedMessage",
                "Port has been updated to ");
            vscode.window.showInformationMessage(portHasBeenSelectedMsg + l);
        });
    }

    private list(): Thenable<SerialPortDetails[]> {
        return new Promise(async (resolve, reject) => {
            try {
                const buff = await spawn("python", ["get_serial_list.py"]);
                const regexp = /\'(.*?)\'/g;
                const arrayPrint = buff.toString().match(regexp);
                const choices: SerialPortDetails[] = Array<SerialPortDetails>();

                if (arrayPrint) {
                    arrayPrint.forEach((portStr) => {
                        const portChoice = portStr.replace(/'/g, "").trim();
                        choices.push(new SerialPortDetails(portChoice));
                    });
                    resolve(choices);
                } else {
                    reject(new Error("No serial ports found"));
                }
            } catch (error) {
                reject(error);
            }
        });
    }
}
