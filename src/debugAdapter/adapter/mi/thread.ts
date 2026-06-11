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
import { MIFrameInfo, MIResponse } from './base';

export interface MIThreadInfo {
    id: string;
    targetId: string;
    details?: string;
    name?: string;
    state: string;
    frame?: MIFrameInfo;
    core?: string;
}

export interface MIThreadInfoResponse extends MIResponse {
    threads: MIThreadInfo[];
    'current-thread-id': string;
}

export function sendThreadInfoRequest(
    gdb: GDBBackend,
    params: {
        threadId?: string;
    }
): Promise<MIThreadInfoResponse> {
    let command = '-thread-info';
    if (params.threadId) {
        command += ` ${params.threadId}`;
    }
    return gdb.sendCommand(command);
}

export interface MIThreadSelectResponse extends MIResponse {
    'new-thread-id': string;
    frame: MIFrameInfo;
}

export function sendThreadSelectRequest(
    gdb: GDBBackend,
    params: {
        threadId: number;
    }
): Promise<MIThreadSelectResponse> {
    return gdb.sendCommand(`-thread-select ${params.threadId}`);
}
