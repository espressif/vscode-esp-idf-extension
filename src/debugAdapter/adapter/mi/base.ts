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

export interface MIResponse {
    _class: string;
}

export abstract class MIRequest<R> {
    public abstract send(backend: GDBBackend): Promise<R>;
}

// Shared types
/** See {@link https://sourceware.org/gdb/current/onlinedocs/gdb.html/GDB_002fMI-Breakpoint-Information.html this documentation} for additional details. */
export interface MIBreakpointInfo {
    disp: string;
    enabled: 'y' | 'n';
    number: string;
    type: string;
    addr?: string;
    addr_flags?: string;
    at?: string;
    'catch-type'?: string;
    cond?: string;
    enable?: string;
    'evaluated-by'?: 'host' | 'target';
    file?: string; // docs say filname, but that is wrong
    frame?: string;
    fullname?: string;
    func?: string;
    ignore?: string;
    inferior?: string;
    installed?: 'y' | 'n';
    line?: string;
    locations?: MILocation[];
    mask?: string;
    'original-location'?: string;
    pass?: string;
    pending?: string;
    script?: string;
    task?: string;
    thread?: string;
    'thread-groups'?: string[];
    times: string;
    what?: string;
    // TODO there are a few more fields here
}

/** See {@link https://sourceware.org/gdb/current/onlinedocs/gdb.html/GDB_002fMI-Breakpoint-Information.html this documentation} for additional details. */
export interface MILocation {
    number: string;
    enabled: 'y' | 'n' | 'N';
    addr: string;
    addr_flags?: string;
    func?: string;
    file?: string;
    fullname?: string;
    line?: string;
    'thread-groups': string[];
}

export interface MIFrameInfo {
    level: string;
    func?: string;
    addr?: string;
    file?: string;
    fullname?: string;
    line?: string;
    from?: string;
}

export interface MIVariableInfo {
    name: string;
    value?: string;
    type?: string;
}

export interface MIRegisterValueInfo {
    number: string;
    value: string;
}
