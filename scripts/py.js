/* Runs one of the Python helper scripts with whichever interpreter this
   machine actually has.

   On Windows, `python` on PATH is often the Microsoft Store stub, which
   prints an ad and exits instead of running anything. So we look for a
   real interpreter first, and only fall back to PATH.

   Set PYTHON=... in the environment to override.

   Usage:  node scripts/py.js process-images.py "goldy_handpoked" */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const [script, ...args] = process.argv.slice(2);

if (!script) {
  console.error('usage: node scripts/py.js <script.py> [args...]');
  process.exit(1);
}

function works(cmd) {
  try {
    const r = spawnSync(cmd, ['-c', 'import PIL'], { encoding: 'utf8' });
    return r.status === 0;
  } catch {
    return false;
  }
}

function find() {
  if (process.env.PYTHON) return process.env.PYTHON;

  const home = homedir();
  const guesses = [];

  // typical per-user Windows installs, newest first
  for (const v of ['313', '312', '311', '310']) {
    guesses.push(join(home, 'AppData', 'Local', 'Programs', 'Python', `Python${v}`, 'python.exe'));
    guesses.push(`C:\\Python${v}\\python.exe`);
  }
  for (const g of guesses) if (existsSync(g) && works(g)) return g;

  for (const c of ['py', 'python3', 'python']) if (works(c)) return c;

  return null;
}

const python = find();

if (!python) {
  console.error(
    '\n  No usable Python found.\n' +
    '  Install Python 3 from python.org, then:  pip install pillow fonttools brotli\n' +
    '  Or point at one directly:  set PYTHON=C:\\path\\to\\python.exe\n'
  );
  process.exit(1);
}

const res = spawnSync(python, [join('scripts', script), ...args], { stdio: 'inherit' });
process.exit(res.status ?? 1);
