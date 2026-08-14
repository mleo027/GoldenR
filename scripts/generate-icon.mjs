import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Resvg } from '@resvg/resvg-js';
import pngToIco from 'png-to-ico';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const svgPath = path.join(rootDir, 'public', 'goldenapi.svg');
const buildDir = path.join(rootDir, 'build');

// NSIS only accepts ICO entries up to 256x256; png-to-ico mis-encodes 512px images.
const pngSizes = [16, 32, 48, 64, 128, 256, 512];
const icoSizes = [16, 32, 48, 64, 128, 256];

function renderPng(size) {
    const svg = fs.readFileSync(svgPath, 'utf-8');
    const resvg = new Resvg(svg, {
        fitTo: { mode: 'width', value: size },
    });
    return resvg.render().asPng();
}

async function main() {
    fs.mkdirSync(buildDir, { recursive: true });

    const pngBySize = new Map(pngSizes.map((size) => [size, renderPng(size)]));
    fs.writeFileSync(path.join(buildDir, 'icon.png'), pngBySize.get(512));

    for (const size of pngSizes) {
        fs.writeFileSync(path.join(buildDir, `icon-${size}.png`), pngBySize.get(size));
    }

    const ico = await pngToIco(icoSizes.map((size) => pngBySize.get(size)));
    fs.writeFileSync(path.join(buildDir, 'icon.ico'), ico);

    console.log('Generated build/icon.png and build/icon.ico');
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
