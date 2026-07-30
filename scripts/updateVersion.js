import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const PKG_PATH = resolve(ROOT, 'package.json');
const GRADLE_PATH = resolve(ROOT, 'android', 'app', 'build.gradle');

const BUMP_TYPE = process.argv[2];

if (!['patch', 'minor', 'major'].includes(BUMP_TYPE)) {
  console.error('用法: node scripts/release.js <patch|minor|major>');
  process.exit(1);
}

// ── 1. 读取 package.json ──
const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf8'));
const parts = pkg.version.split('.').map(Number);
const major = parts[0] || 0;
const minor = parts[1] || 0;
const patch = parts[2] || 0;

let next;
switch (BUMP_TYPE) {
  case 'major': next = `${major + 1}.0.0`; break;
  case 'minor': next = `${major}.${minor + 1}.0`; break;
  case 'patch': next = `${major}.${minor}.${patch + 1}`; break;
}

console.log(`package.json:  ${pkg.version} → ${next}`);

// ── 2. 更新 package.json ──
pkg.version = next;
writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n');

// ── 3. 读取 & 更新 android/app/build.gradle ──
let gradle = readFileSync(GRADLE_PATH, 'utf8');
const vcMatch = gradle.match(/versionCode\s+(\d+)/);
const vnMatch = gradle.match(/versionName\s+"([^"]+)"/);

if (!vcMatch || !vnMatch) {
  console.error('无法在 build.gradle 中找到 versionCode 或 versionName');
  process.exit(1);
}

const oldVc = parseInt(vcMatch[1], 10);
const oldVn = vnMatch[1];
const nextVc = oldVc + 1;

gradle = gradle
  .replace(/versionCode\s+\d+/, `versionCode ${nextVc}`)
  .replace(/versionName\s+"[^"]+"/, `versionName "${next}"`);

writeFileSync(GRADLE_PATH, gradle);

console.log(`build.gradle:  versionName "${oldVn}" → "${next}"  |  versionCode ${oldVc} → ${nextVc}`);
console.log(`\n发布版本: ${next}  (versionCode ${nextVc})`);
