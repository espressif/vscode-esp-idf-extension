import { GDBBackend } from './GDBBackend';
import { MIVarCreateResponse } from './mi/var';
import { sendVarCreate, sendVarDelete, sendVarUpdate } from './mi/var';

export interface VarObjType {
    varname: string;
    expression: string;
    numchild: string;
    children: VarObjType[];
    value: string;
    type: string;
    isVar: boolean;
    isChild: boolean;
    varType: string;
}

export class VarManager {
    protected readonly variableMap: Map<string, VarObjType[]> = new Map<
        string,
        VarObjType[]
    >();

    constructor(protected gdb: GDBBackend) {
        this.gdb = gdb;
    }

    public getKey(frameId: number, threadId: number, depth: number): string {
        return `frame${frameId}_thread${threadId}_depth${depth}`;
    }

    public getVars(
        frameId: number,
        threadId: number,
        depth: number
    ): VarObjType[] | undefined {
        return this.variableMap.get(this.getKey(frameId, threadId, depth));
    }

    public getVar(
        frameId: number,
        threadId: number,
        depth: number,
        expression: string,
        type?: string
    ): VarObjType | undefined {
        const vars = this.getVars(frameId, threadId, depth);
        if (vars) {
            for (const varobj of vars) {
                if (varobj.expression === expression) {
                    if (type !== 'registers') {
                        type = 'local';
                    }
                    if (type === varobj.varType) {
                        return varobj;
                    }
                }
            }
        }
        return;
    }

    public getVarByName(
        frameId: number,
        threadId: number,
        depth: number,
        varname: string
    ): VarObjType | undefined {
        const vars = this.getVars(frameId, threadId, depth);
        if (vars) {
            for (const varobj of vars) {
                if (varobj.varname === varname) {
                    return varobj;
                }
            }
        }
        return;
    }

    public addVar(
        frameId: number,
        threadId: number,
        depth: number,
        expression: string,
        isVar: boolean,
        isChild: boolean,
        varCreateResponse: MIVarCreateResponse,
        type?: string
    ): VarObjType {
        let vars = this.variableMap.get(this.getKey(frameId, threadId, depth));
        if (!vars) {
            vars = [];
            this.variableMap.set(this.getKey(frameId, threadId, depth), vars);
        }
        const varobj: VarObjType = {
            varname: varCreateResponse.name,
            expression,
            numchild: varCreateResponse.numchild,
            children: [],
            value: varCreateResponse.value,
            type: varCreateResponse.type,
            isVar,
            isChild,
            varType: type ? type : 'local',
        };
        vars.push(varobj);
        return varobj;
    }

    public async removeVar(
        frameId: number,
        threadId: number,
        depth: number,
        varname: string
    ): Promise<void> {
        let deleteme: VarObjType | undefined;
        const vars = this.variableMap.get(
            this.getKey(frameId, threadId, depth)
        );
        if (vars) {
            for (const varobj of vars) {
                if (varobj.varname === varname) {
                    deleteme = varobj;
                    break;
                }
            }
            if (deleteme) {
                await sendVarDelete(this.gdb, { varname: deleteme.varname });
                vars.splice(vars.indexOf(deleteme), 1);
                for (const child of deleteme.children) {
                    await this.removeVar(
                        frameId,
                        threadId,
                        depth,
                        child.varname
                    );
                }
            }
        }
    }

    public async updateVar(
        frameId: number,
        threadId: number,
        depth: number,
        varobj: VarObjType
    ): Promise<VarObjType> {
        let returnVar = varobj;
        const vup = await sendVarUpdate(this.gdb, { name: varobj.varname });
        const update = vup.changelist[0];
        if (update) {
            if (update.in_scope === 'true') {
                if (update.name === varobj.varname) {
                    // don't update the parent value to a child's value
                    varobj.value = update.value;
                }
            } else {
                this.removeVar(frameId, threadId, depth, varobj.varname);
                await sendVarDelete(this.gdb, { varname: varobj.varname });
                const createResponse = await sendVarCreate(this.gdb, {
                    frame: 'current',
                    expression: varobj.expression,
                    frameId: frameId,
                    threadId: threadId,
                });
                returnVar = this.addVar(
                    frameId,
                    threadId,
                    depth,
                    varobj.expression,
                    varobj.isVar,
                    varobj.isChild,
                    createResponse
                );
            }
        }
        return Promise.resolve(returnVar);
    }
}
