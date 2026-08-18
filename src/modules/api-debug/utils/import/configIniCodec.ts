const INI_ESCAPABLE = new Set(['\\', ',', ';', ':', '=', '[', ']']);

export function escapeIniText(value: string): string {
    let result = '';
    for (const char of value) {
        if (INI_ESCAPABLE.has(char)) {
            result += `\\${char}`;
        } else {
            result += char;
        }
    }
    return result;
}

export function unescapeIniText(value: string): string {
    let result = '';
    for (let index = 0; index < value.length; index += 1) {
        const char = value[index];
        if (char === '\\' && index + 1 < value.length && INI_ESCAPABLE.has(value[index + 1])) {
            result += value[index + 1];
            index += 1;
        } else {
            result += char;
        }
    }
    return result;
}

export function findUnescapedChar(value: string, target: string, start = 0): number {
    let escaped = false;
    for (let index = start; index < value.length; index += 1) {
        const char = value[index];
        if (escaped) {
            escaped = false;
            continue;
        }
        if (char === '\\') {
            escaped = true;
            continue;
        }
        if (char === target) {
            return index;
        }
    }
    return -1;
}

export function splitUnescaped(value: string, delimiter: string): string[] {
    const parts: string[] = [];
    let start = 0;

    while (true) {
        const index = findUnescapedChar(value, delimiter, start);
        if (index === -1) break;
        parts.push(value.slice(start, index));
        start = index + 1;
    }

    parts.push(value.slice(start));
    return parts;
}
