/*********************************************************************
 * Copyright (c) 2024 Renesas Electronics Corporation and others
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *********************************************************************/
import { DebugProtocol } from "@vscode/debugprotocol";
import { sendDataDisassemble } from "../mi";
import { GDBBackend } from "../GDBBackend";
import { calculateMemoryOffset } from "./calculateMemoryOffset";
import { isHexString } from "./isHexString";

/**
 * Global cache to track which functions have already been inserted
 * This prevents duplicate function declarations across multiple disassembly calls
 */
const globalInsertedFunctions = new Set<string>();

/**
 * Clears the global inserted functions cache
 * This can be useful when the program state changes
 */
export const clearInsertedFunctionsCache = (): void => {
  globalInsertedFunctions.clear();
};

/**
 * Returns a sequence of empty instructions to fill the gap in DisassembleRequest
 *
 * @param startAddress
 * 		The starting address of the sequence
 * @param count
 * 		The number of the instructions to return back
 * @param step
 * 		Memory step to calculate the next instructions address. It can be negative.
 * @return
 * 		Returns sequence of empty instructions
 */
export const getEmptyInstructions = (
  startAddress: string,
  count: number,
  step: number
) => {
  const badDisInsn = (
    address: string
  ): DebugProtocol.DisassembledInstruction => ({
    address,
    instruction: "failed to retrieve instruction",
    presentationHint: "invalid",
  });

  const list: DebugProtocol.DisassembledInstruction[] = [];
  let address = startAddress;
  for (let ix = 0; ix < count; ix++) {
    if (step < 0) {
      address = calculateMemoryOffset(address, step);
      list.unshift(badDisInsn(address));
    } else {
      list.push(badDisInsn(address));
      address = calculateMemoryOffset(address, step);
    }
  }
  return list;
};

/**
 * Gets the instructions from the memory according to the given reference values.
 *
 * For example:
 * If you like to return 100 instructions starting from the 0x00001F00 address,
 * you can use the method like below:
 *
 * const instructions = await memoryReference('0x00001F00', 100);
 *
 * To return lower memory areas, (handling the negative offset),
 * you can use negative length value:
 *
 * const instructions = await memoryReference('0x00001F00', -100);
 *
 * Method returns the expected length of the instructions, if cannot read expected
 * length (can be due to memory bounds), empty instructions will be filled.
 *
 * @param gdb
 * 		GDB Backend instance
 * @param memoryReference
 * 		Starting memory address for the operation
 * @param length
 * 		The count of the instructions to fetch, can be negative if wanted to return negative offset
 * @return
 * 		Returns the given amount of instructions
 */
export const getInstructions = async (
  gdb: GDBBackend,
  memoryReference: string,
  length: number
) => {
  const list: DebugProtocol.DisassembledInstruction[] = [];
  const meanSizeOfInstruction = 4;
  const isReverseFetch = length < 0;
  const absLength = Math.abs(length);

  const formatMemoryAddress = (offset: number) => {
    return `(${memoryReference})${offset < 0 ? "-" : "+"}${Math.abs(offset)}`;
  };

  const sendDataDisassembleWrapper = async (lower: number, upper: number) => {
    if (lower === upper) {
      return [];
    }
    const list: DebugProtocol.DisassembledInstruction[] = [];
    
    const result = await sendDataDisassemble(
      gdb,
      formatMemoryAddress(lower),
      formatMemoryAddress(upper)
    );
    for (const asmInsn of result.asm_insns) {
      const line: number | undefined = asmInsn.line
        ? parseInt(asmInsn.line, 10)
        : undefined;
      const location = {
        name: asmInsn.file,
        path: asmInsn.fullname,
      } as DebugProtocol.Source;
      for (const asmLine of asmInsn.line_asm_insn) {
        if (
          asmLine["func-name"] &&
          !globalInsertedFunctions.has(asmLine["func-name"])
        ) {
          try {
              // Get the actual function start address using MI command
              const funcAddrResult = await gdb.sendCommand(`-data-evaluate-expression &${asmLine["func-name"]}`) as any;
              const addrMatch = funcAddrResult.value?.match(/^([0-9a-fx]+)\s*</);
              const funcAddress = addrMatch ? addrMatch[1] : asmLine.address;

              // Create a function declaration instruction
              const funcDeclInstruction: DebugProtocol.DisassembledInstruction = {
                address: funcAddress,
                instruction: `${asmLine["func-name"]}:`,
                location,
                line: line ? line - 1 : undefined, // Show it before the current line
              } as DebugProtocol.DisassembledInstruction;
            list.push(funcDeclInstruction);
            globalInsertedFunctions.add(asmLine["func-name"]);
          } catch (error) {
            // If function declaration lookup fails, continue without it
          }
        }

        // Create the instruction
        let instruction: DebugProtocol.DisassembledInstruction = {
          address: asmLine.address,
          instructionBytes: asmLine.opcodes,
          instruction: asmLine["func-name"]
            ? `${asmLine.inst}  ; ${asmLine["func-name"]}`
            : asmLine.inst,
          symbol: asmLine["func-name"] ? asmLine["func-name"] : undefined,
        } as DebugProtocol.DisassembledInstruction;

        list.push({
          ...instruction,
          location,
          line,
        });
      }
    }

    return list;
  };

  const target = { lower: 0, higher: 0 };
  const recalculateTargetBounds = (length: number) => {
    if (isReverseFetch) {
      target.higher = target.lower;
      target.lower += length * meanSizeOfInstruction;

      // Limit the lower bound to not to cross negative memory address area
      if (
        isHexString(memoryReference) &&
        BigInt(memoryReference) + BigInt(target.lower) < 0
      ) {
        // Lower and Upper bounds are in number type
        target.lower = Number(memoryReference) * -1;
      }
    } else {
      target.lower = target.higher;
      target.higher += length * meanSizeOfInstruction;
    }
  };
  const remainingLength = () =>
    Math.sign(length) * Math.max(absLength - list.length, 0);
  const pushToList = (
    instructions: DebugProtocol.DisassembledInstruction[]
  ) => {
    if (isReverseFetch) {
      list.unshift(...instructions);
    } else {
      list.push(...instructions);
    }
  };
  try {
    while (absLength > list.length) {
      recalculateTargetBounds(remainingLength());
      const result = await sendDataDisassembleWrapper(
        target.lower,
        target.higher
      );
      if (result.length === 0) {
        // If cannot retrieve more instructions, break the loop, go to catch
        // and fill the remaining instructions with empty instruction information
        break;
      }
      pushToList(result);
    }
  } catch (e) {
    // If error occured in the first iteration and no items can be read
    // throw the original error, otherwise continue and fill the empty instructions.
    if (list.length === 0) {
      throw e;
    }
  }

  if (absLength < list.length) {
    if (length < 0) {
      // Remove the heading, if necessary
      list.splice(0, list.length - absLength);
    } else {
      // Remove the tail, if necessary
      list.splice(absLength, list.length - absLength);
    }
  }

  // Fill with empty instructions in case couldn't read desired length
  if (absLength > list.length) {
    if (list.length === 0) {
      // In case of memory read error, where no instructions read before you cannot be sure about the memory offsets
      // Avoid sending empty instructions, which is overriding the previous disassembled instructions in the VSCode
      // Instead, send error message and fail the request.
      throw new Error(`Cannot retrieve instructions!`);
    }
    const lastMemoryAddress =
      list[isReverseFetch ? 0 : list.length - 1].address;
    const emptyInstuctions = getEmptyInstructions(
      lastMemoryAddress,
      absLength - list.length,
      Math.sign(length) * 2
    );
    pushToList(emptyInstuctions);
  }

  return list;
};
