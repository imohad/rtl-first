/**
 * Direction Injector
 * Modifies the root HTML/layout file to add dir="rtl" and lang attribute.
 * Handles JSX (<html>), HTML (<html>), and Nuxt config approaches.
 * Zero dependencies.
 */

const fs = require('fs');
const path = require('path');

/**
 * Check if dir/lang attributes already exist on an html tag
 */
function checkExistingAttributes(content, type) {
  const htmlTagRegex = type === 'jsx'
    ? /<(?:html|Html)\b[^>]*>/i
    : /<html\b[^>]*>/i;

  const match = content.match(htmlTagRegex);
  if (!match) return { hasDir: false, hasLang: false, tagFound: false };

  const tag = match[0];
  return {
    hasDir: /\bdir\s*=/.test(tag),
    hasLang: /\blang\s*=/.test(tag),
    tagFound: true,
    tag,
    index: match.index
  };
}

/**
 * Inject dir and lang into an HTML file (plain HTML)
 */
function injectHTML(content, lang, options = {}) {
  const changes = [];
  const existing = checkExistingAttributes(content, 'html');

  if (!existing.tagFound) {
    return { content, changes: [], error: 'No <html> tag found in file' };
  }

  if (existing.hasDir && existing.hasLang) {
    return { content, changes: [], alreadyDone: true };
  }

  let newTag = existing.tag;

  if (!existing.hasDir) {
    // Add dir="rtl" right after <html
    newTag = newTag.replace(/^<html/i, '<html dir="rtl"');
    changes.push('Added dir="rtl" to <html> element');
  }

  if (!existing.hasLang) {
    newTag = newTag.replace(/^<html/i, `<html lang="${lang}"`);
    changes.push(`Added lang="${lang}" to <html> element`);
  }

  // If both were missing, we have double <html, fix it
  if (!existing.hasDir && !existing.hasLang) {
    newTag = existing.tag.replace(
      /^<html/i,
      `<html dir="rtl" lang="${lang}"`
    );
  }

  const newContent = content.slice(0, existing.index) + newTag + content.slice(existing.index + existing.tag.length);

  return { content: newContent, changes };
}

/**
 * Inject dir and lang into a JSX file (Next.js, Remix, etc.)
 */
function injectJSX(content, lang, options = {}) {
  const changes = [];

  // Match <html ...> or <Html ...> in JSX
  const htmlTagRegex = /<(html|Html)\b([^>]*)>/;
  const match = content.match(htmlTagRegex);

  if (!match) {
    return { content, changes: [], error: 'No <html> or <Html> tag found in file' };
  }

  const [fullTag, tagName, attrs] = match;
  const hasDir = /\bdir\s*=/.test(attrs);
  const hasLang = /\blang\s*=/.test(attrs);

  if (hasDir && hasLang) {
    return { content, changes: [], alreadyDone: true };
  }

  let newAttrs = attrs;

  if (!hasDir) {
    newAttrs = ` dir="rtl"${newAttrs}`;
    changes.push(`Added dir="rtl" to <${tagName}> element`);
  }

  if (!hasLang) {
    newAttrs = ` lang="${lang}"${newAttrs}`;
    changes.push(`Added lang="${lang}" to <${tagName}> element`);
  }

  const newTag = `<${tagName}${newAttrs}>`;
  const newContent = content.slice(0, match.index) + newTag + content.slice(match.index + fullTag.length);

  return { content: newContent, changes };
}

/**
 * Inject dir into Nuxt config
 */
function injectNuxtConfig(content, lang, options = {}) {
  const changes = [];

  // Check if htmlAttrs already has dir
  if (/dir:\s*['"]rtl['"]/.test(content)) {
    return { content, changes: [], alreadyDone: true };
  }

  // Check if there's an app.head section
  if (/app\s*:\s*\{/.test(content)) {
    // Check if head exists inside app
    if (/head\s*:\s*\{/.test(content)) {
      // Check if htmlAttrs exists
      if (/htmlAttrs\s*:\s*\{/.test(content)) {
        // Add dir to existing htmlAttrs
        content = content.replace(
          /htmlAttrs\s*:\s*\{/,
          `htmlAttrs: {\n      dir: 'rtl',\n      lang: '${lang}',`
        );
        changes.push('Added dir and lang to existing htmlAttrs in nuxt.config');
      } else {
        // Add htmlAttrs to head
        content = content.replace(
          /head\s*:\s*\{/,
          `head: {\n      htmlAttrs: { dir: 'rtl', lang: '${lang}' },`
        );
        changes.push('Added htmlAttrs with dir and lang to head in nuxt.config');
      }
    } else {
      // Add head with htmlAttrs to app
      content = content.replace(
        /app\s*:\s*\{/,
        `app: {\n    head: {\n      htmlAttrs: { dir: 'rtl', lang: '${lang}' }\n    },`
      );
      changes.push('Added head.htmlAttrs with dir and lang to app in nuxt.config');
    }
  } else {
    // Add app.head.htmlAttrs to defineNuxtConfig
    content = content.replace(
      /defineNuxtConfig\s*\(\s*\{/,
      `defineNuxtConfig({\n  app: {\n    head: {\n      htmlAttrs: { dir: 'rtl', lang: '${lang}' }\n    }\n  },`
    );
    changes.push('Added app.head.htmlAttrs to nuxt.config');
  }

  return { content, changes };
}

/**
 * Main injection function
 */
function inject(filePath, type, lang = 'ar', options = {}) {
  const absPath = path.resolve(filePath);

  if (!fs.existsSync(absPath)) {
    return { error: `File not found: ${absPath}`, changes: [] };
  }

  const originalContent = fs.readFileSync(absPath, 'utf8');
  let result;

  switch (type) {
    case 'html':
      result = injectHTML(originalContent, lang, options);
      break;
    case 'jsx':
      result = injectJSX(originalContent, lang, options);
      break;
    case 'nuxt-config':
      result = injectNuxtConfig(originalContent, lang, options);
      break;
    default:
      return { error: `Unknown file type: ${type}`, changes: [] };
  }

  if (result.error) return result;
  if (result.alreadyDone) return { changes: [], alreadyDone: true };

  // Write if not dry-run
  if (!options.dryRun) {
    fs.writeFileSync(absPath, result.content, 'utf8');
  }

  return {
    changes: result.changes,
    filePath: absPath,
    dryRun: !!options.dryRun
  };
}

module.exports = { inject, injectHTML, injectJSX, injectNuxtConfig, checkExistingAttributes };
