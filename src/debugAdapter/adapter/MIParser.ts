/*********************************************************************
 * Copyright (c) 2018 QNX Software Systems and others
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *********************************************************************/
import { Readable } from 'stream';
import { logger } from '@vscode/debugadapter/lib/logger';
import { GDBBackend } from './GDBBackend';
import * as utf8 from 'utf8';

type CommandQueue = {
    [key: string]: (resultClass: string, resultData: any) => void;
};

export class MIParser {
    protected line = '';
    protected pos = 0;

    protected commandQueue: CommandQueue = {};
    protected waitReady?: (value?: void | PromiseLike<void>) => void;

    constructor(protected gdb: GDBBackend) {}

    public parse(stream: Readable): Promise<void> {
        return new Promise((resolve) => {
            this.waitReady = resolve;
            const lineBreakRegex = /\r?\n/;
            let buff = '';
            stream.on('data', (chunk) => {
                const newChunk = chunk.toString();
                let regexArray = lineBreakRegex.exec(newChunk);
                if (regexArray) {
                    regexArray.index += buff.length;
                }
                buff += newChunk;
                while (regexArray) {
                    const line = buff.slice(0, regexArray.index);
                    this.parseLine(line);
                    buff = buff.slice(regexArray.index + regexArray[0].length);
                    regexArray = lineBreakRegex.exec(buff);
                }
            });
        });
    }

    public parseLine(line: string) {
        this.line = line;
        this.pos = 0;
        this.handleLine();
    }

    public queueCommand(
        token: number,
        command: (resultClass: string, resultData: any) => void
    ) {
        this.commandQueue[token] = command;
    }

    protected peek() {
        if (this.pos < this.line.length) {
            return this.line[this.pos];
        } else {
            return null;
        }
    }

    protected next() {
        if (this.pos < this.line.length) {
            return this.line[this.pos++];
        } else {
            return null;
        }
    }

    protected back() {
        this.pos--;
    }

    protected restOfLine() {
        return this.line.substr(this.pos);
    }

    protected handleToken(firstChar: string) {
        let token = firstChar;
        let c = this.next();
        while (c && c >= '0' && c <= '9') {
            token += c;
            c = this.next();
        }
        this.back();
        return token;
    }

    protected handleCString() {
        let c = this.next();
        if (!c || c !== '"') {
            return null;
        }

        let cstring = '';
        let octal = '';
        mainloop: for (c = this.next(); c; c = this.next()) {
            if (octal) {
                octal += c;
                if (octal.length == 3) {
                    cstring += String.fromCodePoint(parseInt(octal, 8));
                    octal = '';
                }
                continue;
            }
            switch (c) {
                case '"':
                    break mainloop;
                case '\\':
                    c = this.next();
                    if (c) {
                        switch (c) {
                            case 'n':
                                cstring += '\n';
                                break;
                            case 't':
                                cstring += '\t';
                                break;
                            case 'r':
                                break;
                            case '0':
                            case '1':
                            case '2':
                            case '3':
                            case '4':
                            case '5':
                            case '6':
                            case '7':
                                octal = c;
                                break;
                            default:
                                cstring += c;
                        }
                    } else {
                        this.back();
                    }
                    break;
                default:
                    cstring += c;
            }
        }

        try {
            return utf8.decode(cstring);
        } catch (err) {
            logger.error(
                `Failed to decode cstring '${cstring}'. ${JSON.stringify(err)}`
            );
            return cstring;
        }
    }

    protected handleString() {
        let str = '';
        for (let c = this.next(); c; c = this.next()) {
            if (c === '=' || c === ',') {
                this.back();
                return str;
            } else {
                str += c;
            }
        }
        return str;
    }

    protected handleObject() {
        let c = this.next();
        const result: any = {};
        if (c === '{') {
            c = this.next();
            if (c !== '"') {
                // oject contains name-value pairs
                while (c !== '}') {
                    if (c !== ',') {
                        this.back();
                    }
                    const name = this.handleString();
                    if (this.next() === '=') {
                        result[name] = this.handleValue();
                    }
                    c = this.next();
                }
            } else {
                // "object" contains just values
                this.back();
                let key = 0;
                while (c !== '}') {
                    let value = this.handleCString();
                    if (value) result[key++] = value;
                    c = this.next();
                }
            }
        }

        if (c === '}') {
            return result;
        } else {
            return null;
        }
    }

    protected handleArray() {
        let c = this.next();
        const result: any[] = [];
        if (c === '[') {
            c = this.next();
            while (c !== ']') {
                if (c !== ',') {
                    this.back();
                }
                result.push(this.handleValue());
                c = this.next();
            }
        }

        if (c === ']') {
            return result;
        } else {
            return null;
        }
    }

    protected handleValue(): any {
        const c = this.next();
        this.back();
        switch (c) {
            case '"':
                return this.handleCString();
            case '{':
                return this.handleObject();
            case '[':
                return this.handleArray();
            default:
                // A weird array element with a name, ignore the name and return the value
                this.handleString();
                if (this.next() === '=') {
                    return this.handleValue();
                }
        }
        return null;
    }

    protected handleAsyncData() {
        const result: any = {};

        let c = this.next();
        let name = 'missing';
        while (c === ',') {
            if (this.peek() !== '{') {
                name = this.handleString();
                if (this.next() === '=') {
                    result[name] = this.handleValue();
                }
            } else {
                // In some cases, such as -break-insert with multiple results
                // GDB does not return an array, so we have to identify that
                // case and convert result to an array
                // An example is (many fields removed to make example readable):
                // 3-break-insert --function staticfunc1
                // 3^done,bkpt={number="1",addr="<MULTIPLE>"},{number="1.1",func="staticfunc1",file="functions.c"},{number="1.2",func="staticfunc1",file="functions_other.c"}
                if (!Array.isArray(result[name])) {
                    result[name] = [result[name]];
                }
                result[name].push(this.handleValue());
            }
            c = this.next();
        }

        return result;
    }

    protected handleConsoleStream() {
        const msg = this.handleCString();
        if (msg) {
            this.gdb.emit('consoleStreamOutput', msg, 'stdout');
        }
    }

    protected handleLogStream() {
        const msg = this.handleCString();
        if (msg) {
            this.gdb.emit('consoleStreamOutput', msg, 'log');
        }
    }

    protected handleLine() {
        let c = this.next();
        if (!c) {
            return;
        }

        let token = '';

        if (c >= '0' && c <= '9') {
            token = this.handleToken(c);
            c = this.next();
        }

        switch (c) {
            case '^': {
                const rest = this.restOfLine();
                for (let i = 0; i < rest.length; i += 1000) {
                    const msg = i === 0 ? 'result' : '-cont-';
                    logger.verbose(
                        `GDB ${msg}: ${token} ${rest.substr(i, 1000)}`
                    );
                }
                const command = this.commandQueue[token];
                if (command) {
                    const resultClass = this.handleString();
                    const resultData = this.handleAsyncData();
                    command(resultClass, resultData);
                    delete this.commandQueue[token];
                } else {
                    logger.error('GDB response with no command: ' + token);
                }
                break;
            }
            case '~':
            case '@':
                this.handleConsoleStream();
                break;
            case '&':
                this.handleLogStream();
                break;
            case '=': {
                logger.verbose('GDB notify async: ' + this.restOfLine());
                const notifyClass = this.handleString();
                this.gdb.emit(
                    'notifyAsync',
                    notifyClass,
                    this.handleAsyncData()
                );
                break;
            }
            case '*': {
                logger.verbose('GDB exec async: ' + this.restOfLine());
                const execClass = this.handleString();
                this.gdb.emit('execAsync', execClass, this.handleAsyncData());
                break;
            }
            case '+': {
                logger.verbose('GDB status async: ' + this.restOfLine());
                const statusClass = this.handleString();
                this.gdb.emit(
                    'statusAsync',
                    statusClass,
                    this.handleAsyncData()
                );
                break;
            }
            case '(':
                // this is the (gdb) prompt and used
                // to know that GDB has started and is ready
                // for commands
                if (this.waitReady) {
                    this.waitReady();
                    this.waitReady = undefined;
                }
                break;
            default:
                // treat as console output. happens on Windows.
                this.back();
                this.gdb.emit(
                    'consoleStreamOutput',
                    this.restOfLine() + '\n',
                    'stdout'
                );
        }
    }
}
