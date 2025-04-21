/*********************************************************************
 * Copyright (c) 2025 Renesas Electronics Corporation and others
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *********************************************************************/

/**
 * Checks if the given value is an hex string starting with 0x
 *
 * @param value
 * 		Reference value to check. For example '0x0000FF00', 'main', 'main+200'
 * @return
 * 		Returns true if value is an hex string, otherwise returns false.
 */

export const isHexString = (value: string) => /^0x[\da-f]+$/i.test(value);