/**
 * Locale Scaffolder
 * Creates new locale files and wires them into the i18n system.
 * Zero dependencies.
 */

const fs = require('fs');
const path = require('path');
const { countKeys } = require('./detect');

/**
 * Copy source locale files to target locale
 */
function scaffoldLocaleFiles(dir, localeInfo, targetLang, options = {}) {
  const absDir = path.resolve(dir);
  const changes = [];
  const errors = [];

  if (!localeInfo.sourceLocale || localeInfo.sourceFiles.length === 0) {
    return { changes: [], errors: ['No source locale files found to copy'] };
  }

  if (localeInfo.hasArabic && targetLang === 'ar' && !options.force) {
    return { changes: [], errors: [], alreadyExists: true };
  }

  const targetLocale = targetLang === 'ar' ? 'ar' :
                       targetLang === 'he' ? 'he' :
                       targetLang === 'fa' ? 'fa' :
                       targetLang === 'ur' ? 'ur' : targetLang;

  if (localeInfo.structure === 'nested-dirs') {
    // Create target directory: i18n/ar/
    const sourceDir = path.join(absDir, localeInfo.localeDir, localeInfo.sourceLocale);
    const targetDir = path.join(absDir, localeInfo.localeDir, targetLocale);

    if (!options.dryRun) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    changes.push(`Created directory: ${path.relative(absDir, targetDir)}/`);

    // Copy each JSON file
    for (const sourceFile of localeInfo.sourceFiles) {
      const sourcePath = path.join(sourceDir, sourceFile.name);
      const targetPath = path.join(targetDir, sourceFile.name);

      try {
        const content = fs.readFileSync(sourcePath, 'utf8');
        const parsed = JSON.parse(content);
        const stubbed = createStubTranslations(parsed, options.stubMode || 'copy');

        if (!options.dryRun) {
          fs.writeFileSync(targetPath, JSON.stringify(stubbed, null, 2) + '\n', 'utf8');
        }

        const keyCount = countKeys(sourcePath);
        changes.push(`Created ${localeInfo.localeDir}/${targetLocale}/${sourceFile.name} (${keyCount} keys)`);
      } catch (e) {
        errors.push(`Failed to copy ${sourceFile.name}: ${e.message}`);
      }
    }
  } else if (localeInfo.structure === 'flat') {
    // Copy en.json → ar.json
    for (const sourceFile of localeInfo.sourceFiles) {
      const sourcePath = path.join(absDir, sourceFile.path);
      const targetFileName = sourceFile.name.replace(
        localeInfo.sourceLocale,
        targetLocale
      );
      const targetPath = path.join(absDir, localeInfo.localeDir, targetFileName);

      try {
        const content = fs.readFileSync(sourcePath, 'utf8');
        const parsed = JSON.parse(content);
        const stubbed = createStubTranslations(parsed, options.stubMode || 'copy');

        if (!options.dryRun) {
          fs.writeFileSync(targetPath, JSON.stringify(stubbed, null, 2) + '\n', 'utf8');
        }

        const keyCount = countKeys(sourcePath);
        changes.push(`Created ${localeInfo.localeDir}/${targetFileName} (${keyCount} keys — untranslated)`);
      } catch (e) {
        errors.push(`Failed to copy ${sourceFile.name}: ${e.message}`);
      }
    }
  } else if (localeInfo.structure === 'nested-files') {
    // Copy en.ts → ar.ts (just copy as-is, user needs to translate)
    for (const sourceFile of localeInfo.sourceFiles) {
      const sourcePath = path.join(absDir, sourceFile.path);
      const ext = path.extname(sourceFile.name);
      const targetFileName = sourceFile.name.replace(localeInfo.sourceLocale, targetLocale);
      const targetPath = path.join(absDir, localeInfo.localeDir, targetFileName);

      try {
        const content = fs.readFileSync(sourcePath, 'utf8');
        if (!options.dryRun) {
          fs.writeFileSync(targetPath, content, 'utf8');
        }
        changes.push(`Created ${localeInfo.localeDir}/${targetFileName} (needs translation)`);
      } catch (e) {
        errors.push(`Failed to copy ${sourceFile.name}: ${e.message}`);
      }
    }
  }

  return { changes, errors };
}

/**
 * Create stub translations (copy English values as placeholders)
 */
function createStubTranslations(obj, mode = 'copy') {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(item => createStubTranslations(item, mode));

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = createStubTranslations(value, mode);
    } else if (typeof value === 'string') {
      switch (mode) {
        case 'empty':
          result[key] = '';
          break;
        case 'prefix':
          result[key] = `[AR] ${value}`;
          break;
        case 'copy':
        default:
          result[key] = value; // Keep English as placeholder
          break;
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Update i18n config to register the new locale
 */
function updateI18nConfig(configFiles, targetLang, i18nLib, options = {}) {
  const changes = [];
  const errors = [];
  const warnings = [];

  if (configFiles.length === 0) {
    warnings.push('No i18n config files found — you may need to register the locale manually');
    return { changes, errors, warnings };
  }

  for (const config of configFiles) {
    if (config.containsArabic && targetLang === 'ar') {
      changes.push(`${config.path} — Arabic already registered`);
      continue;
    }

    // Try to add locale to config
    let content = config.content;
    let modified = false;

    // Pattern: value: 'en-US' style arrays (Dify-style language.ts)
    const valueArrayMatch = content.match(/(\{\s*value:\s*['"][^'"]+['"],\s*name:\s*['"][^'"]+['"].*?\})\s*,?\s*\]/s);
    if (valueArrayMatch && !modified) {
      const lastEntry = valueArrayMatch[1];
      const arabicEntry = generateLocaleEntry(targetLang, i18nLib, 'value-object');
      content = content.replace(
        lastEntry + valueArrayMatch[0].slice(valueArrayMatch[1].length),
        lastEntry + ',\n  ' + arabicEntry + '\n]'
      );
      modified = true;
      changes.push(`Updated ${config.path} — added ${targetLang} locale entry`);
    }

    // Pattern: ['en', 'zh', 'ja'] style arrays
    if (!modified) {
      const simpleArrayMatch = content.match(/\[\s*(['"][a-z]{2}(-[A-Z]{2})?['"],?\s*)+\]/);
      if (simpleArrayMatch) {
        const arr = simpleArrayMatch[0];
        if (!arr.includes(`'${targetLang}'`) && !arr.includes(`"${targetLang}"`)) {
          const newArr = arr.replace(/\]/, `, '${targetLang}']`);
          content = content.replace(arr, newArr);
          modified = true;
          changes.push(`Updated ${config.path} — added '${targetLang}' to locale array`);
        }
      }
    }

    // Pattern: import statements for locales
    if (!modified) {
      const importMatch = content.match(/import\s+\w+\s+from\s+['"]\.\/[a-z]{2}(-[A-Z]{2})?['"]/);
      if (importMatch) {
        const newImport = importMatch[0].replace(
          /\/[a-z]{2}(-[A-Z]{2})?/,
          `/${targetLang}`
        );
        if (!content.includes(newImport)) {
          content = importMatch[0] + '\n' + newImport + '\n' + content.slice(importMatch.index + importMatch[0].length);
          // This is fragile — just warn
          warnings.push(`${config.path} — may need manual import for ${targetLang} locale`);
        }
      }
    }

    if (modified && !options.dryRun) {
      fs.writeFileSync(config.fullPath, content, 'utf8');
    }

    if (!modified) {
      warnings.push(`${config.path} — could not auto-register locale, please add manually`);
    }
  }

  return { changes, errors, warnings };
}

/**
 * Generate a locale entry string based on the config style
 */
function generateLocaleEntry(lang, i18nLib, style) {
  const localeNames = {
    ar: { name: 'العربية', example: 'مرحبًا!' },
    he: { name: 'עברית', example: '!שלום' },
    fa: { name: 'فارسی', example: '!سلام' },
    ur: { name: 'اردو', example: '!ہیلو' }
  };

  const info = localeNames[lang] || { name: lang, example: 'Hello!' };

  if (style === 'value-object') {
    return `{\n    value: '${lang}',\n    name: '${info.name}',\n    example: '${info.example}',\n    supported: true,\n  }`;
  }

  return `'${lang}'`;
}

/**
 * Generate a LocaleSwitcher component
 */
function generateLocaleSwitcher(i18nLib, targetLang, options = {}) {
  if (i18nLib?.name === 'i18next' || i18nLib?.name === 'next-intl') {
    return {
      fileName: 'LocaleSwitcher.tsx',
      content: `import { useTranslation } from '${i18nLib.name === 'next-intl' ? 'next-intl' : 'react-i18next'}';

const LANGUAGES = [
  { code: 'en', name: 'English', dir: 'ltr' },
  { code: '${targetLang}', name: '${targetLang === 'ar' ? 'العربية' : targetLang === 'he' ? 'עברית' : targetLang}', dir: 'rtl' },
];

export function LocaleSwitcher() {
  const { i18n } = useTranslation();

  const handleChange = (locale: string) => {
    const lang = LANGUAGES.find(l => l.code === locale);
    if (lang) {
      i18n.changeLanguage(locale);
      document.documentElement.dir = lang.dir;
      document.documentElement.lang = locale;
    }
  };

  return (
    <select
      value={i18n.language}
      onChange={(e) => handleChange(e.target.value)}
      style={{ direction: 'ltr' }}
    >
      {LANGUAGES.map(lang => (
        <option key={lang.code} value={lang.code}>
          {lang.name}
        </option>
      ))}
    </select>
  );
}
`
    };
  }

  if (i18nLib?.name === 'vue-i18n') {
    return {
      fileName: 'LocaleSwitcher.vue',
      content: `<template>
  <select :value="$i18n.locale" @change="changeLocale($event.target.value)" style="direction: ltr">
    <option v-for="lang in languages" :key="lang.code" :value="lang.code">
      {{ lang.name }}
    </option>
  </select>
</template>

<script setup>
import { useI18n } from 'vue-i18n';

const { locale } = useI18n();

const languages = [
  { code: 'en', name: 'English', dir: 'ltr' },
  { code: '${targetLang}', name: '${targetLang === 'ar' ? 'العربية' : targetLang}', dir: 'rtl' },
];

function changeLocale(code) {
  const lang = languages.find(l => l.code === code);
  if (lang) {
    locale.value = code;
    document.documentElement.dir = lang.dir;
    document.documentElement.lang = code;
  }
}
</script>
`
    };
  }

  // Generic HTML/JS fallback
  return {
    fileName: 'locale-switcher.js',
    content: `const LANGUAGES = [
  { code: 'en', name: 'English', dir: 'ltr' },
  { code: '${targetLang}', name: '${targetLang === 'ar' ? 'العربية' : targetLang === 'he' ? 'עברית' : targetLang}', dir: 'rtl' },
];

function createLocaleSwitcher(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const select = document.createElement('select');
  select.style.direction = 'ltr';

  LANGUAGES.forEach(lang => {
    const option = document.createElement('option');
    option.value = lang.code;
    option.textContent = lang.name;
    select.appendChild(option);
  });

  select.addEventListener('change', (e) => {
    const lang = LANGUAGES.find(l => l.code === e.target.value);
    if (lang) {
      document.documentElement.dir = lang.dir;
      document.documentElement.lang = lang.code;
      localStorage.setItem('locale', lang.code);
    }
  });

  // Restore saved locale
  const saved = localStorage.getItem('locale');
  if (saved) {
    select.value = saved;
    const lang = LANGUAGES.find(l => l.code === saved);
    if (lang) {
      document.documentElement.dir = lang.dir;
      document.documentElement.lang = lang.code;
    }
  }

  container.appendChild(select);
}
`
  };
}

module.exports = {
  scaffoldLocaleFiles,
  updateI18nConfig,
  generateLocaleSwitcher,
  createStubTranslations,
  generateLocaleEntry
};
