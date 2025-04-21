/*********************************************************************
 * Copyright (c) 2024 Renesas Electronics Corporation and others
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *********************************************************************/

import { isHexString } from "./isHexString";

/**
 * This method calculates the memory offset arithmetics on string hexadecimal address value
 *
 * @param address
 * 		Reference address to perform the operation for example '0x0000FF00', 'main', 'main+200'
 * @param offset
 * 		Offset (in bytes) to be applied to the reference location before disassembling. Can be negative.
 * @return
 * 		Returns the calculated address. Keeping the address length same.
 */
export const calculateMemoryOffset = (
  address: string,
  offset: string | number | bigint
): string => {
  if (isHexString(address)) {
    const addressLength = address.length - 2;
    const newAddress = BigInt(address) + BigInt(offset);
    if (newAddress < 0) {
      return `(0x${"0".padStart(addressLength, "0")})${newAddress}`;
    }
    return `0x${newAddress.toString(16).padStart(addressLength, "0")}`;
  } else {
    const addrParts = /^([^+-]*)([+-]\d+)?$/g.exec(address);
    const addrReference = addrParts?.[1];
    const addrOffset = BigInt(addrParts?.[2] ?? 0);
    const calcOffset = BigInt(offset) + addrOffset;
    return `${addrReference}${calcOffset < 0 ? "-" : "+"}${
      calcOffset < 0 ? -calcOffset : calcOffset
    }`;
  }
};
