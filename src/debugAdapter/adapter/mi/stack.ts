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
import { MIFrameInfo, MIResponse, MIVariableInfo } from './base';

export interface MIStackInfoDepthResponse extends MIResponse {
    depth: string;
}

export interface MIStackListVariablesResponse extends MIResponse {
    variables: MIVariableInfo[];
}

export function sendStackInfoDepth(
    gdb: GDBBackend,
    params: {
        maxDepth: number;
        threadId?: number;
    }
): Promise<MIStackInfoDepthResponse> {
    let command = '-stack-info-depth';
    if (params.threadId !== undefined) {
        command += ` --thread ${params.threadId}`;
    }
    if (params.maxDepth) {
        command += ` ${params.maxDepth}`;
    }
    return gdb.sendCommand(command);
}

export function sendStackListFramesRequest(
    gdb: GDBBackend,
    params: {
        noFrameFilters?: boolean;
        lowFrame?: number;
        highFrame?: number;
        threadId?: number;
    }
): Promise<{
    stack: MIFrameInfo[];
}> {
    let command = '-stack-list-frames';
    if (params.threadId !== undefined) {
        command += ` --thread ${params.threadId}`;
    }
    if (params.noFrameFilters) {
        command += ' -no-frame-filters';
    }
    if (params.lowFrame !== undefined) {
        command += ` ${params.lowFrame}`;
    }
    if (params.highFrame !== undefined) {
        command += ` ${params.highFrame}`;
    }
    return gdb.sendCommand(command);
}

export function sendStackSelectFrame(
    gdb: GDBBackend,
    params: {
        framenum: number;
    }
): Promise<MIResponse> {
    return gdb.sendCommand(`-stack-select-frame ${params.framenum}`);
}

export function sendStackListVariables(
    gdb: GDBBackend,
    params: {
        thread?: number;
        frame?: number;
        printValues: 'no-values' | 'all-values' | 'simple-values';
        noFrameFilters?: boolean;
        skipUnavailable?: boolean;
    }
): Promise<MIStackListVariablesResponse> {
    let command = '-stack-list-variables';
    if (params.noFrameFilters) {
        command += ' --no-frame-filters';
    }
    if (params.skipUnavailable) {
        command += ' --skip-unavailable';
    }
    if (params.thread !== undefined) {
        command += ` --thread ${params.thread}`;
    }
    if (params.frame !== undefined) {
        command += ` --frame ${params.frame}`;
    }
    command += ` --${params.printValues}`;

    return gdb.sendCommand(command);
}
