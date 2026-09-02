export interface ZipTextFile {
  path: string;
  content: string;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) !== 0
      ? 0xedb88320 ^ (value >>> 1)
      : value >>> 1;
  }

  return value >>> 0;
});

const getCrc32 = (bytes: Uint8Array) => {
  let crc = 0xffffffff;

  bytes.forEach((byte) => {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  });

  return (crc ^ 0xffffffff) >>> 0;
};

const getDosTimestamp = (date: Date) => ({
  time:
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2),
  date:
    ((Math.max(date.getFullYear(), 1980) - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate(),
});

const createBuffer = (size: number) => {
  const buffer = new ArrayBuffer(size);
  return { bytes: new Uint8Array(buffer), view: new DataView(buffer) };
};

export function createZipBlob(files: ZipTextFile[], createdAt = new Date()) {
  const encoder = new TextEncoder();
  const timestamp = getDosTimestamp(createdAt);
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;

  files.forEach((file) => {
    const name = encoder.encode(file.path.replace(/^\/+/, ''));
    const content = encoder.encode(file.content);
    const crc = getCrc32(content);
    const local = createBuffer(30 + name.length);

    local.view.setUint32(0, 0x04034b50, true);
    local.view.setUint16(4, 20, true);
    local.view.setUint16(6, 0x0800, true);
    local.view.setUint16(8, 0, true);
    local.view.setUint16(10, timestamp.time, true);
    local.view.setUint16(12, timestamp.date, true);
    local.view.setUint32(14, crc, true);
    local.view.setUint32(18, content.length, true);
    local.view.setUint32(22, content.length, true);
    local.view.setUint16(26, name.length, true);
    local.view.setUint16(28, 0, true);
    local.bytes.set(name, 30);
    localParts.push(local.bytes, content);

    const central = createBuffer(46 + name.length);

    central.view.setUint32(0, 0x02014b50, true);
    central.view.setUint16(4, 20, true);
    central.view.setUint16(6, 20, true);
    central.view.setUint16(8, 0x0800, true);
    central.view.setUint16(10, 0, true);
    central.view.setUint16(12, timestamp.time, true);
    central.view.setUint16(14, timestamp.date, true);
    central.view.setUint32(16, crc, true);
    central.view.setUint32(20, content.length, true);
    central.view.setUint32(24, content.length, true);
    central.view.setUint16(28, name.length, true);
    central.view.setUint16(30, 0, true);
    central.view.setUint16(32, 0, true);
    central.view.setUint16(34, 0, true);
    central.view.setUint16(36, 0, true);
    central.view.setUint32(38, 0, true);
    central.view.setUint32(42, localOffset, true);
    central.bytes.set(name, 46);
    centralParts.push(central.bytes);

    localOffset += local.bytes.length + content.length;
  });

  const centralSize = centralParts.reduce((size, part) => size + part.length, 0);
  const end = createBuffer(22);

  end.view.setUint32(0, 0x06054b50, true);
  end.view.setUint16(4, 0, true);
  end.view.setUint16(6, 0, true);
  end.view.setUint16(8, files.length, true);
  end.view.setUint16(10, files.length, true);
  end.view.setUint32(12, centralSize, true);
  end.view.setUint32(16, localOffset, true);
  end.view.setUint16(20, 0, true);

  return new Blob([...localParts, ...centralParts, end.bytes], {
    type: 'application/zip',
  });
}
