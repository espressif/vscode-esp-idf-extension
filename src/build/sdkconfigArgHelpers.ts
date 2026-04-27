/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

export function appendSdkconfigDefineArgs(
  args: string[],
  sdkconfigFile?: string,
  sdkconfigDefaults?: string[]
): void {
  const hasSdkconfigArg = args.some((a) => a.startsWith("-DSDKCONFIG="));
  if (sdkconfigFile && !hasSdkconfigArg) {
    args.push(`-DSDKCONFIG=${sdkconfigFile}`);
  }

  const hasSdkconfigDefaultsArg = args.some((a) =>
    a.startsWith("-DSDKCONFIG_DEFAULTS=")
  );
  if (
    !hasSdkconfigDefaultsArg &&
    sdkconfigDefaults &&
    sdkconfigDefaults.length > 0
  ) {
    args.push(`-DSDKCONFIG_DEFAULTS=${sdkconfigDefaults.join(";")}`);
  }
}
