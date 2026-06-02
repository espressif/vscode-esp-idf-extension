/*********************************************************************
 * Copyright (c) 2018 QNX Software Systems and others
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *********************************************************************/
import { GDBBackend } from '../GDBBackend';
import { MIResponse } from './base';

export function sendExecArguments(
    gdb: GDBBackend,
    params: {
        arguments: string;
    }
): Promise<MIResponse> {
    return gdb.sendCommand(`-exec-arguments ${params.arguments}`);
}

export function sendExecRun(gdb: GDBBackend) {
    return gdb.sendCommand('-exec-run');
}

export function sendExecContinue(gdb: GDBBackend, threadId?: number) {
    let command = '-exec-continue';
    if (threadId !== undefined) {
        command += ` --thread ${threadId}`;
    }
    return gdb.sendCommand(command);
}

export function sendExecNext(gdb: GDBBackend, threadId?: number) {
    let command = '-exec-next';
    if (threadId !== undefined) {
        command += ` --thread ${threadId}`;
    }
    return gdb.sendCommand(command);
}

export function sendExecNextInstruction(gdb: GDBBackend, threadId?: number) {
    let command = '-exec-next-instruction';
    if (threadId !== undefined) {
        command += ` --thread ${threadId}`;
    }
    return gdb.sendCommand(command);
}

export function sendExecStep(gdb: GDBBackend, threadId?: number) {
    let command = '-exec-step';
    if (threadId !== undefined) {
        command += ` --thread ${threadId}`;
    }
    return gdb.sendCommand(command);
}

export function sendExecStepInstruction(gdb: GDBBackend, threadId?: number) {
    let command = '-exec-step-instruction';
    if (threadId !== undefined) {
        command += ` --thread ${threadId}`;
    }
    return gdb.sendCommand(command);
}

export function sendExecFinish(gdb: GDBBackend, threadId?: number) {
    let command = '-exec-finish';
    if (threadId !== undefined) {
        command += ` --thread ${threadId}`;
    }
    return gdb.sendCommand(command);
}

export function sendExecInterrupt(gdb: GDBBackend, threadId?: number) {
    let command = '-exec-interrupt';

    if (threadId !== undefined) {
        command += ` --thread ${threadId}`;
    } else {
        command += ' --all';
    }

    return gdb.sendCommand(command);
}
