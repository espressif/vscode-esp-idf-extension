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

export function sendTargetAttachRequest(
    gdb: GDBBackend,
    params: {
        pid: string;
    }
): Promise<MIResponse> {
    return gdb.sendCommand(`-target-attach ${params.pid}`);
}

export function sendTargetSelectRequest(
    gdb: GDBBackend,
    params: {
        type: string;
        parameters: string[];
    }
): Promise<MIResponse> {
    return gdb.sendCommand(
        `-target-select ${params.type} ${params.parameters.join(' ')}`
    );
}
