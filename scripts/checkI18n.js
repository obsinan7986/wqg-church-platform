import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve root and frontend paths whether run from root or frontend/
const projectRoot = fs.existsSync(path.resolve(__dirname, '../frontend'))
  ? path.resolve(__dirname, '..')
  : path.resolve(__dirname, '../..');

const frontendDir = path.resolve(projectRoot, 'frontend');
const localesDir = path.resolve(frontendDir, 'src/locales');
const srcDir = path.resolve(frontendDir, 'src');

console.log('🔍 [checkI18n] Checking translation files and source code usages...');
console.log(`📁 Locales directory: ${localesDir}`);
console.log(`📁 Source directory: ${srcDir}\n`);

// Load locale files
const languages = ['en', 'om', 'am'];
const localeData = {};
const flatLocaleKeys = {};

function flattenObject(obj, prefix = '') {
  const result = {};
  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(result, flattenObject(val, fullKey));
    } else if (Array.isArray(val)) {
      val.forEach((item, index) => {
        if (item && typeof item === 'object') {
          Object.assign(result, flattenObject(item, `${fullKey}.${index}`));
        } else {
          result[`${fullKey}.${index}`] = item;
        }
      });
      result[fullKey] = val; // Also keep the array key itself
    } else {
      result[fullKey] = val;
    }
  }
  return result;
}

for (const lng of languages) {
  const filePath = path.join(localesDir, `${lng}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Locale file not found: ${filePath}`);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  localeData[lng] = raw;
  flatLocaleKeys[lng] = flattenObject(raw);
}

// 1. Scan source code for t('...') and i18n.t('...')
function scanFiles(dir, extensions = ['.js', '.jsx']) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== 'locales' && file !== 'node_modules' && file !== 'dist') {
        results = results.concat(scanFiles(fullPath, extensions));
      }
    } else if (extensions.includes(path.extname(file))) {
      results.push(fullPath);
    }
  });
  return results;
}

const sourceFiles = scanFiles(srcDir);
const usedKeysInCode = new Map(); // key -> Set of file paths

// Matches t('some.key') or t("some.key") or i18n.t('some.key')
const tRegex = /(?:\bt|i18n\.t)\(\s*['"]([a-zA-Z0-9_.-]+)['"]/g;

sourceFiles.forEach((filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  let match;
  while ((match = tRegex.exec(content)) !== null) {
    const key = match[1];
    // Ignore dynamic interpolations like t('category.' + id) or purely non-key calls
    if (key && !key.endsWith('.')) {
      if (!usedKeysInCode.has(key)) {
        usedKeysInCode.set(key, new Set());
      }
      usedKeysInCode.get(key).add(path.relative(projectRoot, filePath));
    }
  }
});

console.log(`📊 Scanned ${sourceFiles.length} source files.`);
console.log(`🔑 Found ${usedKeysInCode.size} unique keys referenced via t('...').`);
console.log(`📖 Base keys in en.json: ${Object.keys(flatLocaleKeys['en']).length}`);
console.log(`📖 Base keys in om.json: ${Object.keys(flatLocaleKeys['om']).length}`);
console.log(`📖 Base keys in am.json: ${Object.keys(flatLocaleKeys['am']).length}\n`);

// 2. Check keys used in code that are missing in ANY language file
let hasErrors = false;
const missingInCode = { en: [], om: [], am: [] };

for (const [key, files] of usedKeysInCode.entries()) {
  for (const lng of languages) {
    if (flatLocaleKeys[lng][key] === undefined) {
      missingInCode[lng].push({ key, files: Array.from(files) });
      hasErrors = true;
    }
  }
}

// 3. Check keys that differ between om / am / en
const allKnownKeys = new Set([
  ...Object.keys(flatLocaleKeys['en']),
  ...Object.keys(flatLocaleKeys['om']),
  ...Object.keys(flatLocaleKeys['am'])
]);

const discrepancies = {
  missingInEn: [],
  missingInOm: [],
  missingInAm: []
};

for (const key of allKnownKeys) {
  if (flatLocaleKeys['en'][key] === undefined) discrepancies.missingInEn.push(key);
  if (flatLocaleKeys['om'][key] === undefined) discrepancies.missingInOm.push(key);
  if (flatLocaleKeys['am'][key] === undefined) discrepancies.missingInAm.push(key);
}

if (
  discrepancies.missingInEn.length > 0 ||
  discrepancies.missingInOm.length > 0 ||
  discrepancies.missingInAm.length > 0
) {
  hasErrors = true;
}

// Output detailed report
console.log('════════════════════════════════════════════════════════════');
console.log('                 I18N AUDIT RESULTS                         ');
console.log('════════════════════════════════════════════════════════════');

if (missingInCode.en.length || missingInCode.om.length || missingInCode.am.length) {
  console.log('\n❌ [CODE USAGE] Keys used in code via t(...) missing in language files:');
  for (const lng of languages) {
    if (missingInCode[lng].length) {
      console.log(`\n  Language [${lng.toUpperCase()}] missing (${missingInCode[lng].length} keys):`);
      missingInCode[lng].forEach(({ key, files }) => {
        console.log(`    - "${key}" (used in: ${files.join(', ')})`);
      });
    }
  }
} else {
  console.log('\n✅ [CODE USAGE] All keys referenced in code exist in en, om, and am!');
}

if (
  discrepancies.missingInEn.length ||
  discrepancies.missingInOm.length ||
  discrepancies.missingInAm.length
) {
  console.log('\n❌ [DISCREPANCIES] Keys differing across language files:');
  if (discrepancies.missingInEn.length) {
    console.log(`  Missing in EN (${discrepancies.missingInEn.length}):`, discrepancies.missingInEn.slice(0, 10));
    if (discrepancies.missingInEn.length > 10) console.log(`    ... and ${discrepancies.missingInEn.length - 10} more`);
  }
  if (discrepancies.missingInOm.length) {
    console.log(`  Missing in OM (${discrepancies.missingInOm.length}):`, discrepancies.missingInOm.slice(0, 10));
    if (discrepancies.missingInOm.length > 10) console.log(`    ... and ${discrepancies.missingInOm.length - 10} more`);
  }
  if (discrepancies.missingInAm.length) {
    console.log(`  Missing in AM (${discrepancies.missingInAm.length}):`, discrepancies.missingInAm.slice(0, 10));
    if (discrepancies.missingInAm.length > 10) console.log(`    ... and ${discrepancies.missingInAm.length - 10} more`);
  }
} else {
  console.log('\n✅ [PARITY] All keys are 100% matched across en, om, and am!');
}

console.log('\n════════════════════════════════════════════════════════════\n');

if (hasErrors) {
  console.error('❌ i18n check failed. Please resolve missing keys.');
  process.exit(1);
} else {
  console.log('✅ i18n check passed with zero missing keys!');
  process.exit(0);
}
