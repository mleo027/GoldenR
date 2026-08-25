import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const bridgePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'kcbpBridge.cjs');

describe('kcbpBridge persistent protocol', () => {
    it('loads the adapter once and decodes binary fields for every request', async () => {
        const dir = await mkdtemp(path.join(os.tmpdir(), 'golden-bridge-'));
        const adapterPath = path.join(dir, 'adapter.cjs');
        await writeFile(
            adapterPath,
            `let loads = 0; loads += 1; module.exports = { callKCBP(payload) { return { code: 0, msg: 'ok', data: [{ loads, value: payload.param.fields.text, binary: payload.param.fields.bin.toString('hex') }] }; } };`,
            'utf8',
        );
        const child = spawn(process.execPath, [bridgePath], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
        const messages: Array<{ callId?: number; ok?: boolean; raw?: { data?: Array<{ loads?: number; value?: string; binary?: string }> } }> = [];
        let buffer = '';
        child.stdout.setEncoding('utf8');
        child.stdout.on('data', (chunk: string) => {
            buffer += chunk;
            let newline = buffer.indexOf('\n');
            while (newline >= 0) {
                const line = buffer.slice(0, newline).trim();
                buffer = buffer.slice(newline + 1);
                newline = buffer.indexOf('\n');
                if (line) messages.push(JSON.parse(line));
            }
        });
        const request = (callId: number) => JSON.stringify({
            callId,
            adapterCandidates: [adapterPath],
            payload: { param: { fields: { text: 'value', bin: { __kcbpBinaryBase64: Buffer.from('abc').toString('base64') } } } },
        });
        child.stdin.write(`${request(1)}\n${request(2)}\n`);
        child.stdin.end();
        await new Promise<void>((resolve, reject) => { child.once('error', reject); child.once('close', () => resolve()); });
        await rm(dir, { recursive: true, force: true });
        expect(messages).toHaveLength(2);
        expect(messages[0]).toMatchObject({ callId: 1, ok: true, raw: { data: [{ loads: 1, value: 'value', binary: '616263' }] } });
        expect(messages[1]).toMatchObject({ callId: 2, ok: true, raw: { data: [{ loads: 1, value: 'value', binary: '616263' }] } });
    });

    it('processes multiple newline-delimited requests in one bridge process', async () => {
        const child = spawn(process.execPath, [bridgePath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            windowsHide: true,
        });
        const messages: Array<{ callId?: number; ok?: boolean; error?: string }> = [];
        let stderr = '';
        let stdoutBuffer = '';

        child.stdout.setEncoding('utf8');
        child.stderr.setEncoding('utf8');
        child.stdout.on('data', (chunk: string) => {
            stdoutBuffer += chunk;
            let newline = stdoutBuffer.indexOf('\n');
            while (newline >= 0) {
                const line = stdoutBuffer.slice(0, newline);
                stdoutBuffer = stdoutBuffer.slice(newline + 1);
                newline = stdoutBuffer.indexOf('\n');
                if (line.trim()) messages.push(JSON.parse(line));
            }
        });
        child.stderr.on('data', (chunk: string) => {
            stderr += chunk;
        });

        child.stdin.write(`${JSON.stringify({ callId: 1, payload: {}, adapterCandidates: [] })}\n`);
        child.stdin.write(`${JSON.stringify({ callId: 2, payload: {}, adapterCandidates: [] })}\n`);
        child.stdin.end();

        const exitCode = await new Promise<number | null>((resolve, reject) => {
            child.once('error', reject);
            child.once('close', resolve);
        });

        expect(stderr).toBe('');
        expect(exitCode).toBe(0);
        expect(messages).toEqual([
            { callId: 1, ok: false, error: 'Native KCBP adapter not loaded' },
            { callId: 2, ok: false, error: 'Native KCBP adapter not loaded' },
        ]);
    });

    it('routes payloads by type field: KGBP goes to callKGBP, default stays on callKCBP', async () => {
        const dir = await mkdtemp(path.join(os.tmpdir(), 'golden-bridge-'));
        const adapterPath = path.join(dir, 'adapter.cjs');
        await writeFile(
            adapterPath,
            `const calls = []; module.exports = {
                callKCBP(payload) { calls.push(['KCBP', payload.type]); return { code: 0, msg: 'kcbp' }; },
                callKGBP(payload) { calls.push(['KGBP', payload.type]); return { code: 0, msg: 'kgbp' }; },
                __calls: calls,
            };`,
            'utf8',
        );
        const child = spawn(process.execPath, [bridgePath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            windowsHide: true,
        });
        const messages: Array<{ callId?: number; ok?: boolean; raw?: { msg?: string } }> = [];
        let buffer = '';
        child.stdout.setEncoding('utf8');
        child.stdout.on('data', (chunk: string) => {
            buffer += chunk;
            let newline = buffer.indexOf('\n');
            while (newline >= 0) {
                const line = buffer.slice(0, newline).trim();
                buffer = buffer.slice(newline + 1);
                newline = buffer.indexOf('\n');
                if (line) messages.push(JSON.parse(line));
            }
        });
        const request = (callId: number, type?: string) =>
            JSON.stringify({
                callId,
                adapterCandidates: [adapterPath],
                payload: type ? { type, param: { fields: {} } } : { param: { fields: {} } },
            });
        child.stdin.write(`${request(1, 'KGBP')}\n${request(2)}\n`);
        child.stdin.end();
        await new Promise<void>((resolve, reject) => {
            child.once('error', reject);
            child.once('close', () => resolve());
        });
        await rm(dir, { recursive: true, force: true });
        expect(messages).toHaveLength(2);
        expect(messages[0]).toMatchObject({ callId: 1, ok: true, raw: { msg: 'kgbp' } });
        expect(messages[1]).toMatchObject({ callId: 2, ok: true, raw: { msg: 'kcbp' } });
    });
});
