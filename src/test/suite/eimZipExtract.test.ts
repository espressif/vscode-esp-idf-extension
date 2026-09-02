import * as assert from "assert";
import {
  mkdtemp,
  pathExists,
  readFile,
  readlink,
  remove,
  writeFile,
} from "fs-extra";
import { tmpdir } from "os";
import { join } from "path";
import { installZipFile, ZipFileError } from "../../eim/downloadInstall";
import { OutputChannel } from "../../logger/outputChannel";

const S_IFREG = 0o100000;
const S_IFLNK = 0o120000;

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value: number): Buffer {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function u32(value: number): Buffer {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value);
  return buffer;
}

type StoredUnixZipEntry = {
  name: string;
  data: Buffer;
  unixMode: number;
};

function buildStoredUnixZip(entries: StoredUnixZipEntry[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, "utf8");
    const crc = crc32(entry.data);
    const local = Buffer.concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(entry.data.length),
      u32(entry.data.length),
      u16(nameBuf.length),
      u16(0),
      nameBuf,
      entry.data,
    ]);
    const central = Buffer.concat([
      u32(0x02014b50),
      u16((3 << 8) | 20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(entry.data.length),
      u32(entry.data.length),
      u16(nameBuf.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32((entry.unixMode << 16) >>> 0),
      u32(offset),
      nameBuf,
    ]);
    localParts.push(local);
    centralParts.push(central);
    offset += local.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const eocd = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(centralDir.length),
    u32(offset),
    u16(0),
  ]);
  return Buffer.concat([...localParts, centralDir, eocd]);
}

suite("EIM zip extraction", () => {
  OutputChannel.init();

  test("preserves Unix eim symlink entries", async function () {
    if (process.platform === "win32") {
      this.skip();
    }

    const destDir = await mkdtemp(join(tmpdir(), "eim-zip-"));
    const zipPath = join(destDir, "eim.zip");
    try {
      await writeFile(
        zipPath,
        buildStoredUnixZip([
          {
            name: "eim_v0.18.0",
            data: Buffer.from("eim-binary"),
            unixMode: S_IFREG | 0o755,
          },
          {
            name: "eim",
            data: Buffer.from("eim_v0.18.0"),
            unixMode: S_IFLNK | 0o777,
          },
        ])
      );

      await installZipFile(zipPath, destDir);

      assert.strictEqual(await readlink(join(destDir, "eim")), "eim_v0.18.0");
      assert.strictEqual(
        await readFile(join(destDir, "eim_v0.18.0"), "utf8"),
        "eim-binary"
      );
    } finally {
      await remove(destDir);
    }
  });

  test("rejects zip entries that escape the destination", async () => {
    const destDir = await mkdtemp(join(tmpdir(), "eim-zip-"));
    const zipPath = join(destDir, "escape.zip");
    try {
      await writeFile(
        zipPath,
        buildStoredUnixZip([
          {
            name: "../escaped",
            data: Buffer.from("payload"),
            unixMode: S_IFREG | 0o644,
          },
        ])
      );

      await assert.rejects(
        () => installZipFile(zipPath, destDir),
        (error: Error) => error instanceof ZipFileError
      );
      assert.strictEqual(
        await pathExists(join(destDir, "..", "escaped")),
        false
      );
    } finally {
      await remove(destDir);
    }
  });
});
