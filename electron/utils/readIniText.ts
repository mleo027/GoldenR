import iconv from 'iconv-lite';

const UTF8_BOM = [0xef, 0xbb, 0xbf];
const UTF16_LE_BOM = [0xff, 0xfe];

function hasUtf8Bom(buffer: Uint8Array): boolean {
    return (
        buffer.length >= 3 &&
        buffer[0] === UTF8_BOM[0] &&
        buffer[1] === UTF8_BOM[1] &&
        buffer[2] === UTF8_BOM[2]
    );
}

function hasUtf16LeBom(buffer: Uint8Array): boolean {
    return buffer.length >= 2 && buffer[0] === UTF16_LE_BOM[0] && buffer[1] === UTF16_LE_BOM[1];
}

function decodeStrictUtf8(buffer: Uint8Array): string | null {
    try {
        return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    } catch {
        return null;
    }
}

/** 识别 INI 文本编码：优先 UTF-8（含 BOM），无效时按 GBK 解码 */
export function decodeIniBuffer(buffer: Uint8Array): string {
    if (buffer.length === 0) return '';

    if (hasUtf8Bom(buffer)) {
        return iconv.decode(Buffer.from(buffer.subarray(3)), 'utf-8');
    }

    if (hasUtf16LeBom(buffer)) {
        return iconv.decode(Buffer.from(buffer.subarray(2)), 'utf16-le');
    }

    const asUtf8 = decodeStrictUtf8(buffer);
    if (asUtf8 != null) {
        return asUtf8;
    }

    return iconv.decode(Buffer.from(buffer), 'gbk');
}
