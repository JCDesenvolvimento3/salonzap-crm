const fs = require('node:fs');
const path = require('node:path');
const { ZipArchive } = require('archiver');

const rootDir = path.resolve(__dirname, '..');
const sourceDir = path.join(rootDir, 'apps', 'extension', 'dist');
const artifactsDir = path.join(rootDir, 'artifacts');
const outputPath = path.join(artifactsDir, 'salonzap-extension.zip');

if (!fs.existsSync(sourceDir)) {
  throw new Error(
    'apps/extension/dist nao existe. Rode "npm run build -w @salonzap/extension" antes de empacotar.',
  );
}

fs.mkdirSync(artifactsDir, { recursive: true });
if (fs.existsSync(outputPath)) {
  fs.rmSync(outputPath, { force: true });
}

const output = fs.createWriteStream(outputPath);
const archive = new ZipArchive({ zlib: { level: 9 } });

output.on('close', () => {
  console.log(`Extensao empacotada em ${outputPath}`);
  console.log(`Tamanho final: ${archive.pointer()} bytes`);
});

archive.on('error', (error) => {
  throw error;
});

archive.pipe(output);
archive.directory(sourceDir, false);
archive.finalize();
