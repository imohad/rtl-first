/**
 * Framework Detector
 * Detects the framework used in a project and locates the root HTML/layout file.
 * Zero dependencies.
 */

const fs = require('fs');
const path = require('path');

const FRAMEWORKS = [
  {
    name: 'next-app-router',
    label: 'Next.js (App Router)',
    detect: (dir) => {
      const pkgPath = path.join(dir, 'package.json');
      if (!fs.existsSync(pkgPath)) return false;
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const hasNext = !!(pkg.dependencies?.next || pkg.devDependencies?.next);
      if (!hasNext) return false;
      // App Router: has app/ directory with layout
      const appLayouts = [
        'app/layout.tsx', 'app/layout.jsx', 'app/layout.js',
        'src/app/layout.tsx', 'src/app/layout.jsx', 'src/app/layout.js'
      ];
      return appLayouts.some(f => fs.existsSync(path.join(dir, f)));
    },
    rootFiles: [
      'src/app/layout.tsx', 'src/app/layout.jsx', 'src/app/layout.js',
      'app/layout.tsx', 'app/layout.jsx', 'app/layout.js'
    ],
    htmlTag: '<html',
    type: 'jsx'
  },
  {
    name: 'next-pages-router',
    label: 'Next.js (Pages Router)',
    detect: (dir) => {
      const pkgPath = path.join(dir, 'package.json');
      if (!fs.existsSync(pkgPath)) return false;
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const hasNext = !!(pkg.dependencies?.next || pkg.devDependencies?.next);
      if (!hasNext) return false;
      // Pages Router: has pages/_document or pages/_app
      const pageFiles = [
        'pages/_document.tsx', 'pages/_document.jsx', 'pages/_document.js',
        'src/pages/_document.tsx', 'src/pages/_document.jsx', 'src/pages/_document.js'
      ];
      return pageFiles.some(f => fs.existsSync(path.join(dir, f)));
    },
    rootFiles: [
      'src/pages/_document.tsx', 'src/pages/_document.jsx', 'src/pages/_document.js',
      'pages/_document.tsx', 'pages/_document.jsx', 'pages/_document.js'
    ],
    fallbackFiles: [
      'src/pages/_app.tsx', 'src/pages/_app.jsx', 'src/pages/_app.js',
      'pages/_app.tsx', 'pages/_app.jsx', 'pages/_app.js'
    ],
    htmlTag: '<Html',
    type: 'jsx'
  },
  {
    name: 'nuxt',
    label: 'Nuxt 3',
    detect: (dir) => {
      return fs.existsSync(path.join(dir, 'nuxt.config.ts')) ||
             fs.existsSync(path.join(dir, 'nuxt.config.js'));
    },
    rootFiles: ['app.vue'],
    configFiles: ['nuxt.config.ts', 'nuxt.config.js'],
    type: 'nuxt-config'
  },
  {
    name: 'remix',
    label: 'Remix',
    detect: (dir) => {
      const pkgPath = path.join(dir, 'package.json');
      if (!fs.existsSync(pkgPath)) return false;
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      return !!(pkg.dependencies?.['@remix-run/react'] || pkg.devDependencies?.['@remix-run/react']);
    },
    rootFiles: [
      'app/root.tsx', 'app/root.jsx', 'app/root.js'
    ],
    htmlTag: '<html',
    type: 'jsx'
  },
  {
    name: 'sveltekit',
    label: 'SvelteKit',
    detect: (dir) => {
      const pkgPath = path.join(dir, 'package.json');
      if (!fs.existsSync(pkgPath)) return false;
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      return !!(pkg.devDependencies?.['@sveltejs/kit']);
    },
    rootFiles: ['src/app.html'],
    htmlTag: '<html',
    type: 'html'
  },
  {
    name: 'angular',
    label: 'Angular',
    detect: (dir) => {
      return fs.existsSync(path.join(dir, 'angular.json')) ||
             fs.existsSync(path.join(dir, '.angular.json'));
    },
    rootFiles: ['src/index.html'],
    htmlTag: '<html',
    type: 'html'
  },
  {
    name: 'vite',
    label: 'Vite (React/Vue/Svelte)',
    detect: (dir) => {
      return fs.existsSync(path.join(dir, 'vite.config.ts')) ||
             fs.existsSync(path.join(dir, 'vite.config.js')) ||
             fs.existsSync(path.join(dir, 'vite.config.mts'));
    },
    rootFiles: ['index.html'],
    htmlTag: '<html',
    type: 'html'
  },
  {
    name: 'cra',
    label: 'Create React App',
    detect: (dir) => {
      const pkgPath = path.join(dir, 'package.json');
      if (!fs.existsSync(pkgPath)) return false;
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      return !!(pkg.dependencies?.['react-scripts'] || pkg.devDependencies?.['react-scripts']);
    },
    rootFiles: ['public/index.html'],
    htmlTag: '<html',
    type: 'html'
  }
];

/**
 * Detect which UI library is used (for DirectionProvider hints)
 */
function detectUILibrary(dir) {
  const pkgPath = path.join(dir, 'package.json');
  if (!fs.existsSync(pkgPath)) return [];

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  const found = [];

  if (allDeps['@radix-ui/react-direction'] || allDeps['@radix-ui/themes']) {
    found.push({
      name: 'radix-ui',
      label: 'Radix UI',
      hint: 'Wrap your app with <DirectionProvider dir={dir}> from @radix-ui/react-direction',
      provider: 'DirectionProvider',
      import: "import { DirectionProvider } from '@radix-ui/react-direction';"
    });
  }

  if (allDeps['@mui/material']) {
    found.push({
      name: 'mui',
      label: 'Material UI',
      hint: 'Use createTheme({ direction: "rtl" }) and wrap with <ThemeProvider>',
      provider: 'ThemeProvider',
      import: "import { createTheme, ThemeProvider } from '@mui/material/styles';"
    });
  }

  if (allDeps['@chakra-ui/react']) {
    found.push({
      name: 'chakra-ui',
      label: 'Chakra UI',
      hint: 'Set direction in ChakraProvider: <ChakraProvider theme={theme}> where theme has direction: "rtl"',
      provider: 'ChakraProvider',
      import: "import { ChakraProvider, extendTheme } from '@chakra-ui/react';"
    });
  }

  if (allDeps['antd']) {
    found.push({
      name: 'antd',
      label: 'Ant Design',
      hint: 'Use <ConfigProvider direction="rtl"> to wrap your app',
      provider: 'ConfigProvider',
      import: "import { ConfigProvider } from 'antd';"
    });
  }

  return found;
}

/**
 * Detect the i18n library used
 */
function detectI18n(dir) {
  const pkgPath = path.join(dir, 'package.json');
  if (!fs.existsSync(pkgPath)) return null;

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

  if (allDeps['next-intl']) return { name: 'next-intl', label: 'next-intl' };
  if (allDeps['i18next'] || allDeps['react-i18next']) return { name: 'i18next', label: 'i18next / react-i18next' };
  if (allDeps['vue-i18n']) return { name: 'vue-i18n', label: 'vue-i18n' };
  if (allDeps['@angular/localize']) return { name: 'angular-i18n', label: 'Angular i18n' };
  if (allDeps['svelte-i18n']) return { name: 'svelte-i18n', label: 'svelte-i18n' };
  if (allDeps['@formatjs/intl'] || allDeps['react-intl']) return { name: 'react-intl', label: 'react-intl / FormatJS' };

  return null;
}

/**
 * Detect the framework used in a project directory
 */
function detectFramework(dir) {
  const absDir = path.resolve(dir);

  if (!fs.existsSync(absDir)) {
    return { error: `Directory not found: ${absDir}` };
  }

  for (const fw of FRAMEWORKS) {
    if (fw.detect(absDir)) {
      // Find the actual root file
      let rootFile = null;
      for (const f of fw.rootFiles) {
        const fullPath = path.join(absDir, f);
        if (fs.existsSync(fullPath)) {
          rootFile = f;
          break;
        }
      }

      // Check fallback files
      if (!rootFile && fw.fallbackFiles) {
        for (const f of fw.fallbackFiles) {
          const fullPath = path.join(absDir, f);
          if (fs.existsSync(fullPath)) {
            rootFile = f;
            break;
          }
        }
      }

      return {
        framework: fw.name,
        label: fw.label,
        rootFile,
        htmlTag: fw.htmlTag || '<html',
        type: fw.type,
        configFiles: fw.configFiles || [],
        uiLibraries: detectUILibrary(absDir),
        i18n: detectI18n(absDir)
      };
    }
  }

  // Fallback: check for index.html
  if (fs.existsSync(path.join(absDir, 'index.html'))) {
    return {
      framework: 'static',
      label: 'Static HTML',
      rootFile: 'index.html',
      htmlTag: '<html',
      type: 'html',
      configFiles: [],
      uiLibraries: detectUILibrary(absDir),
      i18n: detectI18n(absDir)
    };
  }

  return {
    framework: null,
    label: 'Unknown',
    rootFile: null,
    type: null,
    configFiles: [],
    uiLibraries: detectUILibrary(absDir),
    i18n: detectI18n(absDir)
  };
}

module.exports = { detectFramework, detectUILibrary, detectI18n, FRAMEWORKS };
