/*********************************************************************
 * Copyright (c) 2019 Arm Ltd. and others
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *********************************************************************/
import { Event } from '@vscode/debugadapter';
import { DebugProtocol } from '@vscode/debugprotocol';

export class StoppedEvent extends Event implements DebugProtocol.StoppedEvent {
    public body: {
        reason: string;
        threadId?: number;
        allThreadsStopped?: boolean;
    };

    constructor(reason: string, threadId: number, allThreadsStopped = false) {
        super('stopped');

        this.body = {
            reason,
            allThreadsStopped,
        };

        if (typeof threadId === 'number') {
            this.body.threadId = threadId;
        }
    }
}
