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

export enum MIVarPrintValues {
    no = '0',
    all = '1',
    simple = '2',
}

export interface MIVarCreateResponse extends MIResponse {
    name: string;
    numchild: string;
    value: string;
    type: string;
    'thread-id'?: string;
    has_more?: string;
    dynamic?: string;
    displayhint?: string;
}

export interface MIVarListChildrenResponse {
    numchild: string;
    children: MIVarChild[];
}

export interface MIVarChild {
    name: string;
    exp: string;
    numchild: string;
    type: string;
    value?: string;
    'thread-id'?: string;
    frozen?: string;
    displayhint?: string;
    dynamic?: string;
}

export interface MIVarUpdateResponse {
    changelist: Array<{
        name: string;
        value: string;
        in_scope: string;
        type_changed: string;
        has_more: string;
    }>;
}

export interface MIVarEvalResponse {
    value: string;
}

export interface MIVarAssignResponse {
    value: string;
}

export interface MIVarPathInfoResponse {
    path_expr: string;
}

function quote(expression: string) {
    return `"${expression}"`;
}

export function sendVarCreate(
    gdb: GDBBackend,
    params: {
        name?: string;
        frameAddr?: string;
        frame?: 'current' | 'floating';
        expression: string;
        threadId?: number;
        frameId?: number;
    }
): Promise<MIVarCreateResponse> {
    let command = '-var-create';
    if (params.threadId !== undefined) {
        command += ` --thread ${params.threadId}`;
    }
    if (params.frameId !== undefined) {
        command += ` --frame ${params.frameId}`;
    }

    command += ` ${params.name ? params.name : '-'}`;
    if (params.frameAddr) {
        command += ` ${params.frameAddr}`;
    } else if (params.frame) {
        switch (params.frame) {
            default:
            case 'current':
                command += ' *';
                break;
            case 'floating':
                command += ' @';
                break;
        }
    } else {
        command += ' *';
    }
    command += ` ${quote(params.expression)}`;

    return gdb.sendCommand(command);
}

export function sendVarListChildren(
    gdb: GDBBackend,
    params: {
        printValues?:
            | MIVarPrintValues.no
            | MIVarPrintValues.all
            | MIVarPrintValues.simple;
        name: string;
        from?: number;
        to?: number;
    }
): Promise<MIVarListChildrenResponse> {
    let command = '-var-list-children';
    if (params.printValues) {
        command += ` ${params.printValues}`;
    }
    command += ` ${params.name}`;
    if (params.from && params.to) {
        command += ` ${params.from} ${params.to}`;
    }

    return gdb.sendCommand(command);
}

export function sendVarUpdate(
    gdb: GDBBackend,
    params: {
        name?: string;
        printValues?:
            | MIVarPrintValues.no
            | MIVarPrintValues.all
            | MIVarPrintValues.simple;
    }
): Promise<MIVarUpdateResponse> {
    let command = '-var-update';
    if (params.printValues) {
        command += ` ${params.printValues}`;
    } else {
        command += ` ${MIVarPrintValues.all}`;
    }
    if (params.name) {
        command += ` ${params.name}`;
    } else {
        command += ' *';
    }
    return gdb.sendCommand(command);
}

export function sendVarDelete(
    gdb: GDBBackend,
    params: {
        varname: string;
    }
): Promise<void> {
    const command = `-var-delete ${params.varname}`;
    return gdb.sendCommand(command);
}

export function sendVarAssign(
    gdb: GDBBackend,
    params: {
        varname: string;
        expression: string;
    }
): Promise<MIVarAssignResponse> {
    const command = `-var-assign ${params.varname} ${params.expression}`;
    return gdb.sendCommand(command);
}

export function sendVarEvaluateExpression(
    gdb: GDBBackend,
    params: {
        varname: string;
    }
): Promise<MIVarEvalResponse> {
    const command = `-var-evaluate-expression ${params.varname}`;
    return gdb.sendCommand(command);
}

export function sendVarInfoPathExpression(
    gdb: GDBBackend,
    name: string
): Promise<MIVarPathInfoResponse> {
    const command = `-var-info-path-expression ${name}`;
    return gdb.sendCommand(command);
}

export function sendVarSetFormatToHex(
    gdb: GDBBackend,
    name: string
): Promise<void> {
    const command = `-var-set-format ${name} hexadecimal`;
    return gdb.sendCommand(command);
}
