/*********************************************************************
 * Copyright (c) 2022 Kichwa Coders Canada, Inc. and others
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *********************************************************************/
import { execFile } from 'child_process';
import { platform } from 'os';
import { promisify } from 'util';
import { dirname } from 'path';
import { existsSync } from 'fs';
import { DebugProtocol } from '@vscode/debugprotocol';
import { MIDataDisassembleAsmInsn } from '../adapter/mi/data';

/**
 * This method actually launches 'gdb --version' to determine the version of
 * the GDB that is being used.
 *
 * @param gdbPath the path to the GDB executable to be called
 * @return the detected version of GDB at gdbPath
 */
export async function getGdbVersion(
    gdbPath: string,
    gdbCwd?: string,
    environment?: Record<string, string | null>
): Promise<string> {
    const gdbEnvironment = environment
        ? createEnvValues(process.env, environment)
        : process.env;
    const { stdout, stderr } = await promisify(execFile)(
        gdbPath,
        ['--version'],
        { cwd: gdbCwd, env: gdbEnvironment }
    );

    const gdbVersion = parseGdbVersionOutput(stdout);
    if (!gdbVersion) {
        throw new Error(
            `Failed to get version number from GDB. GDB returned:\nstdout:\n${stdout}\nstderr:\n${stderr}`
        );
    }
    return gdbVersion;
}

/**
 * Converts the MIDataDisassembleAsmInsn object to DebugProtocol.DisassembledInstruction
 *
 * @param asmInstruction
 * 		MI instruction object
 * @return
 * 		Returns the DebugProtocol.DisassembledInstruction object
 */
export const getDisassembledInstruction = (
    asmInstruction: MIDataDisassembleAsmInsn
): DebugProtocol.DisassembledInstruction => {
    let symbol: string | undefined;
    if (asmInstruction['func-name'] && asmInstruction.offset) {
        symbol = `${asmInstruction['func-name']}+${asmInstruction.offset}`;
    } else if (asmInstruction['func-name']) {
        symbol = asmInstruction['func-name'];
    } else {
        symbol = undefined;
    }
    return {
        address: asmInstruction.address,
        instructionBytes: asmInstruction.opcodes,
        instruction: asmInstruction.inst,
        ...(symbol ? { symbol } : {}),
    } as DebugProtocol.DisassembledInstruction;
};

/**
 * Find gdb version info from a string object which is supposed to
 * contain output text of "gdb --version" command.
 *
 * @param stdout
 * 		output text from "gdb --version" command .
 * @return
 * 		String representation of version of gdb such as "10.1" on success
 */
export function parseGdbVersionOutput(stdout: string): string | undefined {
    return stdout.split(/ gdb( \(.*?\))? (\D* )*\(?(\d*(\.\d*)*)/g)[3];
}

/**
 * Compares two version numbers.
 * Returns -1, 0, or 1 if v1 is less than, equal to, or greater than v2, respectively.
 * @param v1 The first version
 * @param v2 The second version
 * @return -1, 0, or 1 if v1 is less than, equal to, or greater than v2, respectively.
 */
export function compareVersions(v1: string, v2: string): number {
    const v1Parts = v1.split(/\./);
    const v2Parts = v2.split(/\./);
    for (let i = 0; i < v1Parts.length && i < v2Parts.length; i++) {
        const v1PartValue = parseInt(v1Parts[i], 10);
        const v2PartValue = parseInt(v2Parts[i], 10);

        if (isNaN(v1PartValue) || isNaN(v2PartValue)) {
            // Non-integer part, ignore it
            continue;
        }
        if (v1PartValue > v2PartValue) {
            return 1;
        } else if (v1PartValue < v2PartValue) {
            return -1;
        }
    }

    // If we get here is means the versions are still equal
    // but there could be extra parts to examine

    if (v1Parts.length < v2Parts.length) {
        // v2 has extra parts, which implies v1 is a lower version (e.g., v1 = 7.9 v2 = 7.9.1)
        // unless each extra part is 0, in which case the two versions are equal (e.g., v1 = 7.9 v2 = 7.9.0)
        for (let i = v1Parts.length; i < v2Parts.length; i++) {
            const v2PartValue = parseInt(v2Parts[i], 10);

            if (isNaN(v2PartValue)) {
                // Non-integer part, ignore it
                continue;
            }
            if (v2PartValue != 0) {
                return -1;
            }
        }
    }
    if (v1Parts.length > v2Parts.length) {
        // v1 has extra parts, which implies v1 is a higher version (e.g., v1 = 7.9.1 v2 = 7.9)
        // unless each extra part is 0, in which case the two versions are equal (e.g., v1 = 7.9.0 v2 = 7.9)
        for (let i = v2Parts.length; i < v1Parts.length; i++) {
            const v1PartValue = parseInt(v1Parts[i], 10);

            if (isNaN(v1PartValue)) {
                // Non-integer part, ignore it
                continue;
            }
            if (v1PartValue != 0) {
                return 1;
            }
        }
    }

    return 0;
}

/**
 * This method is providing an automatic operation to including new variables to process.env.
 * Method is not injecting the new variables to current thread, rather it is returning a new
 * object with included parameters.
 *
 * @param source
 * 		Source environment variables to include.
 * @param valuesToMerge
 * 		Key-Value dictionary to include.
 * @return
 * 		New environment variables dictionary.
 */
export function createEnvValues(
    source: NodeJS.ProcessEnv,
    valuesToMerge: Record<string, string | null>
): NodeJS.ProcessEnv {
    const findTarget = (obj: any, key: string) => {
        if (platform() === 'win32') {
            return (
                Object.keys(obj).find(
                    (i) =>
                        i.localeCompare(key, undefined, {
                            sensitivity: 'accent',
                        }) === 0
                ) || key
            );
        }
        return key;
    };
    const result = { ...source };
    for (const [key, value] of Object.entries(valuesToMerge)) {
        const target = findTarget(result, key);
        if (value === null) {
            delete result[target];
        } else {
            result[target] = value;
        }
    }
    return result;
}

/**
 * Calculate the CWD that should be used to launch gdb based on the program
 * being debugged or the explicitly set cwd in the launch arguments.
 *
 * Note that launchArgs.program is optional here in preparation for
 * debugging where no program is specified. See #262
 *
 * @param launchArgs Launch Arguments to compute GDB cwd from
 * @returns effective cwd to use
 */
export function getGdbCwd(launchArgs: {
    program?: string;
    cwd?: string;
}): string {
    const cwd =
        launchArgs.cwd ||
        (launchArgs.program && existsSync(launchArgs.program)
            ? dirname(launchArgs.program)
            : process.cwd());
    return existsSync(cwd) ? cwd : process.cwd();
}
