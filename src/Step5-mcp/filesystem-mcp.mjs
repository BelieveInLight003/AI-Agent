import 'dotenv/config';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const nvmRoot = '/Users/balala/.nvm/versions/node/v22.23.2';
const nvmBin = path.join(nvmRoot, 'bin');
const nodeBin = path.join(nvmBin, 'node');
const npxCli = path.join(nvmRoot, 'lib/node_modules/npm/bin/npx-cli.js');
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const allowed = (process.env.ALLOWED_PATHS ?? '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

if (allowed.length === 0) {
  process.stderr.write('ALLOWED_PATHS 未配置或为空\n');
  process.exit(1);
}

const child = spawn(
  nodeBin,
  [npxCli, '-y', '@modelcontextprotocol/server-filesystem', ...allowed],
  {
    stdio: 'inherit',
    cwd: projectRoot,
    env: {
      ...process.env,
      PATH: `${nvmBin}:${process.env.PATH ?? ''}`,
      npm_config_prefix: nvmRoot,
    },
  },
);

child.on('error', (error) => {
  process.stderr.write(`${error}\n`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  process.exit(signal ? 1 : (code ?? 1));
});
