// Copyright 2019 Espressif Systems (Shanghai) CO LTD
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as del from "del";
import { pathExists } from "fs-extra";
import { EOL } from "os";
import * as path from "path";
import { OutputChannel } from "vscode";
import { Logger } from "./logger/logger";
import { PyReqLog } from "./onboarding/PyReqLog";
import * as utils from "./utils";

export async function getPythonBinToUse(espDir: string, idfToolsDir: string, pythonBinPath: string): Promise<string> {
    return getPythonEnvPath(espDir, idfToolsDir, pythonBinPath).then((pyEnvPath) => {
        const pythonInEnv = process.platform === "win32" ?
            path.join(pyEnvPath, "Scripts", "python.exe") : path.join(pyEnvPath, "bin", "python");
        return pathExists(pythonInEnv).then((haveVirtualPython) => {
            return haveVirtualPython ? pythonInEnv : pythonBinPath;
        });
    });
}

export async function installPythonEnv(espDir: string,
                                       idfToolsDir: string,
                                       pyTracker: PyReqLog,
                                       pythonBinPath: string,
                                       channel?: OutputChannel) {
    // Check if already in virtualenv and install
    const isInsideVirtualEnv = await utils.execChildProcess(
        `${pythonBinPath} -c "import sys; print(hasattr(sys, 'real_prefix'))"`, idfToolsDir, channel);
    if (isInsideVirtualEnv.replace(EOL, "") === "True") {
        const ignoreVirtualEnvPythonMsg =
            `Can't use virtualenv Python ${pythonBinPath}. Please use system wide Python executable.`;
        Logger.infoNotify(ignoreVirtualEnvPythonMsg);
        if (channel) {
            channel.appendLine(ignoreVirtualEnvPythonMsg);
        }
        return;
    }

    const pyEnvPath = await getPythonEnvPath(espDir, idfToolsDir, pythonBinPath);
    const pyDir = process.platform === "win32" ? ["Scripts", "python.exe"] : ["bin", "python"];
    const virtualEnvPython = path.join(pyEnvPath, ...pyDir);
    const requirements = path.join(espDir, "requirements.txt");
    const debugAdapterRequirements = path.join(utils.extensionContext.extensionPath, "esp_debug_adapter", "requirements.txt");

    const creatEnvMsg = `Creating a new Python environment in ${pyEnvPath} ...\n`;
    const installPyPkgsMsg = `Installing ESP-IDF python packages in ${pyEnvPath} ...\n`;
    const installDAPyPkgsMsg = `Installing ESP-IDF Debug Adapter python packages in ${pyEnvPath} ...\n`;

    if (pythonBinPath.indexOf(virtualEnvPython) < 0 && utils.fileExists(virtualEnvPython)) {
        await del(pyEnvPath, { force: true }).catch((err) => {
            Logger.errorNotify("Error deleting virtualenv files", err);
        });
    }

    pyTracker.Log = creatEnvMsg;
    if (channel) {
        channel.appendLine(creatEnvMsg);
    }

    const pythonVersion = (await utils.execChildProcess(
        `${pythonBinPath} -c "import sys; print('{}.{}'.format(sys.version_info.major, sys.version_info.minor))"`,
        espDir)).replace(/(\n|\r|\r\n)/gm, "");

    let envModule: string;
    if (pythonVersion.localeCompare("3.3") >= 0) {
        envModule = "venv";
    } else {
        envModule = "virtualenv";
        const virtualEnvInstallCmd = `${pythonBinPath} -m pip install virtualenv --user`;
        const virtualEnvInstallResult = await utils.execChildProcess(virtualEnvInstallCmd,
            idfToolsDir, channel);
        pyTracker.Log = virtualEnvInstallResult;
        pyTracker.Log = "\n";
        if (channel) {
            channel.appendLine(virtualEnvInstallResult + "\n");
        }
    }

    const createVirtualEnvResult = await utils.execChildProcess(
        `${pythonBinPath} -m ${envModule} "${pyEnvPath}"`,
        idfToolsDir,
        channel);
    pyTracker.Log = createVirtualEnvResult;
    pyTracker.Log = "\n";
    if (channel) {
        channel.appendLine(createVirtualEnvResult + "\n");
    }
    pyTracker.Log = installPyPkgsMsg;
    // ESP-IDF Python Requirements
    const espIdfReqInstallResult = await utils.execChildProcess(
        `${virtualEnvPython} -m pip install -r ${requirements}`,
        pyEnvPath, channel);
    pyTracker.Log = espIdfReqInstallResult;
    pyTracker.Log = "\n";
    if (channel) {
        channel.appendLine(espIdfReqInstallResult + "\n");
    }
    // Debug Adapter Python Requirements
    pyTracker.Log = installDAPyPkgsMsg;
    const pyDAReqInstallResult = await utils.execChildProcess(
        `${virtualEnvPython} -m pip install -r ${debugAdapterRequirements}`,
        pyEnvPath, channel);
    pyTracker.Log = pyDAReqInstallResult;
    pyTracker.Log = "\n";
    if (channel) {
        channel.appendLine(pyDAReqInstallResult + "\n");
    }
    // Debug Adapter Python Requirements
    pyTracker.Log = installDAPyPkgsMsg;
    const pyDAReqInstallResult = await utils.execChildProcess(
        `${virtualEnvPython} -m pip install -r ${debugAdapterRequirements}`,
        pyEnvPath, channel);
    pyTracker.Log = pyDAReqInstallResult;
    pyTracker.Log = "\n";
    if (channel) {
        channel.appendLine(pyDAReqInstallResult + "\n");
    }
    return virtualEnvPython;
}

export async function getPythonEnvPath(espIdfDir: string, idfToolsDir: string, pythonBin: string) {
    const pythonVersion = (await
        utils.execChildProcess(
            `${pythonBin} -c "import sys; print('{}.{}'.format(sys.version_info.major, sys.version_info.minor))"`,
        espIdfDir)).replace(/(\n|\r|\r\n)/gm, "");
    const espIdfVersion = await utils.getEspIdfVersion(espIdfDir);
    const resultVersion = `idf${espIdfVersion}_py${pythonVersion}_env`;
    const idfPyEnvPath = path.join(idfToolsDir, "python_env", resultVersion);

    return idfPyEnvPath;
}

export async function checkPythonExists(pythonBin: string, workingDir: string) {
    return await utils.execChildProcess(`${pythonBin} --version`, workingDir).then((result) => {
        if (result) {
            const match = result.match(/Python\s\d+(.\d+)?(.\d+)?/g);
            if (match && match.length > 0) {
                return true;
            } else {
                Logger.errorNotify("Python is not found in current environment", Error(""));
                return false;
            }
        }
    }).catch((err) => {
        if (err.message) {
            const match = err.message.match(/Python\s\d+.\d+.\d+/g);
            if (match && match.length > 0) {
                return true;
            } else {
                return false;
            }
        }
        Logger.errorNotify("Python is not found in current environment", err);
        return false;
    });
}

export async function checkPipExists(pythonBin: string, workingDir: string) {
    return await utils.execChildProcess(`${pythonBin} -m pip --version`, workingDir).then((result) => {
        if (result) {
            const match = result.match(/pip\s\d+(.\d+)?(.\d+)?/g);
            if (match && match.length > 0) {
                return true;
            } else {
                Logger.errorNotify("Python pip is not found in current environment", Error(""));
                return false;
            }
        }
    }).catch((err) => {
        Logger.errorNotify("Python pip is not found in current environment", err);
        return false;
    });
}

export async function getPythonBinList(workingDir: string) {
    if (process.platform === "win32") {
        return await getPythonBinListWindows(workingDir);
    } else {
        return await getUnixPythonList(workingDir);
    }
}

export async function getIdfToolsPythonList(idfToolsDir: string): Promise<string[]> {
    return utils.dirExistPromise(idfToolsDir).then(async (doesExist) => {
        if (doesExist) {
            const pyEnvDir = path.join(idfToolsDir, "python_env");
            return await utils.dirExistPromise(pyEnvDir).then((doesPyEnvExist) => {
                if (doesPyEnvExist) {
                    const results: string[] = [];
                    const pythonBinaries = utils.getDirectories(pyEnvDir);
                    if (!pythonBinaries || pythonBinaries.length  < 1) {
                        return [] as string[];
                    }
                    const pyDir = process.platform === "win32" ? ["Scripts", "python.exe"] : ["bin", "python"];
                    pythonBinaries.forEach((pythonEnv) => {
                        const pyBin = path.join(pyEnvDir, pythonEnv, ...pyDir);
                        if (utils.fileExists(pyBin)) {
                            results.push(pyBin);
                        }
                    });
                    return results;
                } else {
                    return  [] as string[];
                }
            });
        } else {
            return  [] as string[];
        }
    }).catch((err) => {
        Logger.errorNotify("Error while checking ESP-IDF Tools directory exists.", err);
        return  [] as string[];
    });
}

export async function getUnixPythonList(workingDir: string) {
    return await utils.execChildProcess("which -a python python3", workingDir).then((result) => {
        if (result) {
            const resultList = result.trim().split("\n");
            return resultList;
        }
    }).catch((err) => {
        Logger.errorNotify("Error looking for python in system", err);
        return ["Not found"];
    });
}

export async function getPythonBinListWindows(workingDir: string) {
    const paths: string[] = [];
    const registryRootLocations = [
        "HKEY_CURRENT_USER\\SOFTWARE\\PYTHON",
        "HKEY_LOCAL_MACHINE\\SOFTWARE\\PYTHON",
        "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432NODE\\PYTHON",
    ];
    for (const root of registryRootLocations) {
        await utils.execChildProcess("reg query " + root, workingDir).then(async (result) => {
            if (result.trim() === "") {
                return;
            }
            const companies = result.trim().split("\r\n");
            for (const company of companies) {
                await utils.execChildProcess("reg query " + company,
                    workingDir).then(async (companyTags) => {
                        if (companyTags.trim() === "") {
                            return;
                        }
                        if (company.indexOf("PyLauncher") !== -1) {
                            return;
                        }
                        const tags = (companyTags.trim()).split("\r\n");
                        utils.execChildProcess("reg query " + tags[tags.length - 1],
                            workingDir).then((keyValues) => {
                                const values = (keyValues.trim()).split("\r\n");
                                for (const val of values) {
                                    if (val.indexOf("InstallPath") !== -1) {
                                        utils.execChildProcess("reg query " + val,
                                            workingDir).then((installPaths) => {
                                                const binPaths = (installPaths.trim()).split("\r\n");
                                                for (const iPath of binPaths) {
                                                    const trimPath = (iPath.trim()).split(/\s+/);
                                                    if (trimPath[0] === "ExecutablePath") {
                                                        paths.push(trimPath[trimPath.length - 1]);
                                                    }
                                                }
                                            }).catch((err) => {
                                                Logger.error("Error looking for python in windows system", err);
                                            });
                                    }
                                }
                        }).catch((err) => {
                            Logger.error("Error looking for python in windows system", err);
                        });
                    }).catch((err) => {
                        Logger.error("Error looking for python in windows system", err);
                    });
            }
        }).catch((err) => {
            Logger.error("Error looking for python in windows", err);
        });
    }
    if (paths.length === 0) {
        Logger.error("Error looking for python in windows", new Error("Installed Python not found in registry"));
    }
    return paths;
}
