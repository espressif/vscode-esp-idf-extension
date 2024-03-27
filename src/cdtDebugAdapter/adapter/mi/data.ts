/*********************************************************************
 * Copyright (c) 2018 Ericsson and others
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *********************************************************************/

import { GDBBackend } from '../GDBBackend';
import { MIResponse, MIRegisterValueInfo } from './base';

interface MIDataReadMemoryBytesResponse {
    memory: Array<{
        begin: string;
        end: string;
        offset: string;
        contents: string;
    }>;
}
interface MIDataDisassembleAsmInsn {
    address: string;
    // func-name in MI
    'func-name': string;
    offset: string;
    opcodes: string;
    inst: string;
}

interface MIDataDisassembleSrcAndAsmLine {
    line: string;
    file: string;
    fullname: string;
    line_asm_insn: MIDataDisassembleAsmInsn[];
}
interface MIDataDisassembleResponse {
    asm_insns: MIDataDisassembleSrcAndAsmLine[];
}

export interface MIListRegisterNamesResponse extends MIResponse {
    'register-names': string[];
}

export interface MIListRegisterValuesResponse extends MIResponse {
    'register-values': MIRegisterValueInfo[];
}

export interface MIGDBDataEvaluateExpressionResponse extends MIResponse {
    value?: string;
}

export function sendDataReadMemoryBytes(
    gdb: GDBBackend,
    address: string,
    size: number,
    offset = 0
): Promise<MIDataReadMemoryBytesResponse> {
    return gdb.sendCommand(
        `-data-read-memory-bytes -o ${offset} "${address}" ${size}`
    );
}

export function sendDataWriteMemoryBytes(
    gdb: GDBBackend,
    memoryReference: string,
    data: string
): Promise<void> {
    return gdb.sendCommand(
        `-data-write-memory-bytes "${memoryReference}" "${data}"`
    );
}

export function sendDataEvaluateExpression(
    gdb: GDBBackend,
    expr: string
): Promise<MIGDBDataEvaluateExpressionResponse> {
    return gdb.sendCommand(`-data-evaluate-expression "${expr}"`);
}

// https://sourceware.org/gdb/onlinedocs/gdb/GDB_002fMI-Data-Manipulation.html#The-_002ddata_002ddisassemble-Command
export async function sendDataDisassemble(
    gdb: GDBBackend,
    startAddress: string,
    endAddress: string
): Promise<MIDataDisassembleResponse> {
    // -- 5 == mixed source and disassembly with raw opcodes
    // needs to be deprecated mode 3 for GDB < 7.11
    const mode = gdb.gdbVersionAtLeast('7.11') ? '5' : '3';
    const result: MIDataDisassembleResponse = await gdb.sendCommand(
        `-data-disassemble -s "${startAddress}" -e "${endAddress}" -- ${mode}`
    );

    // cleanup the result data
    if (result.asm_insns.length > 0) {
        if (
            !Object.prototype.hasOwnProperty.call(
                result.asm_insns[0],
                'line_asm_insn'
            )
        ) {
            // In this case there is no source info available for any instruction,
            // so GDB treats as if we had done -- 2 instead of -- 5
            // This bit of code remaps the data to look like it should
            const e: MIDataDisassembleSrcAndAsmLine = {
                line_asm_insn:
                    result.asm_insns as unknown as MIDataDisassembleAsmInsn[],
            } as MIDataDisassembleSrcAndAsmLine;
            result.asm_insns = [e];
        }
        for (const asmInsn of result.asm_insns) {
            if (
                !Object.prototype.hasOwnProperty.call(asmInsn, 'line_asm_insn')
            ) {
                asmInsn.line_asm_insn = [];
            }
        }
    }
    return Promise.resolve(result);
}

export function sendDataListRegisterNames(
    gdb: GDBBackend,
    params: {
        regno?: number[];
        frameId: number;
        threadId: number;
    }
): Promise<MIListRegisterNamesResponse> {
    let command = `-data-list-register-names --frame ${params.frameId} --thread ${params.threadId}`;

    if (params.regno) {
        command += params.regno.join(' ');
    }

    return gdb.sendCommand(command);
}

export function sendDataListRegisterValues(
    gdb: GDBBackend,
    params: {
        fmt: string;
        regno?: number[];
        frameId: number;
        threadId: number;
    }
): Promise<MIListRegisterValuesResponse> {
    let command = `-data-list-register-values --frame ${params.frameId} --thread ${params.threadId} ${params.fmt}`;

    if (params.regno) {
        command += params.regno.join(' ');
    }

    return gdb.sendCommand(command);
}
