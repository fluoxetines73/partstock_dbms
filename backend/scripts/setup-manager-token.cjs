const { randomBytes } = require('node:crypto');
const { readFileSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { parseEnv } = require('node:util');

const envPath = resolve(__dirname, '../../.env.docker');
const key = 'APP_MANAGER_TOKEN';

try {
  const contents = readFileSync(envPath, 'utf8');
  if (parseEnv(contents)[key]?.trim()) {
    console.log('APP_MANAGER_TOKEN is already set in .env.docker.');
  } else {
    const tokenLine = `${key}=${randomBytes(32).toString('hex')}`;
    const assignments = [...contents.matchAll(/^[\t ]*(?:export[\t ]+)?APP_MANAGER_TOKEN[\t ]*=[^\r\n]*/gm)];
    const newline = contents.includes('\r\n') ? '\r\n' : '\n';
    if (assignments.length > 1) {
      throw new Error('Keep only one APP_MANAGER_TOKEN assignment in .env.docker.');
    }
    const assignment = assignments[0];
    if (assignment && !/=[\t ]*(?:"[\t ]*"|'[\t ]*')?[\t ]*(?:#.*)?$/.test(assignment[0])) {
      throw new Error('Set APP_MANAGER_TOKEN on one line or remove its empty assignment before retrying.');
    }
    const updated = assignment
      ? contents.slice(0, assignment.index) + tokenLine + contents.slice(assignment.index + assignment[0].length)
      : contents + (contents && !contents.endsWith('\n') ? newline : '') + tokenLine + newline;
    writeFileSync(envPath, updated, 'utf8');
    console.log('Saved APP_MANAGER_TOKEN to .env.docker.');
  }
} catch (error) {
  console.error(error.code === 'ENOENT'
    ? 'Prepare .env.docker first with database/local/prepare.ps1.'
    : error.message);
  process.exitCode = 1;
}
