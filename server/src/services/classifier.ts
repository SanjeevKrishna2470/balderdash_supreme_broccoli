export type CodeCategory =
  | 'application'
  | 'ui'
  | 'backend'
  | 'data'
  | 'tests'
  | 'docs'
  | 'config'
  | 'build'
  | 'scripts'
  | 'assets'
  | 'infra'
  | 'generated'
  | 'unknown';

export interface ClassifiedItem {
  path: string;
  name: string;
  type: 'file' | 'dir';
  category: CodeCategory;
  bytes: number;
  extension?: string;
  language?: string;
  isEntryPoint: boolean;
  isSensitive: boolean;
}

const SENSITIVE_PATTERNS = [
  /^\.env(\..+)?$/i,
  /\.pem$/i,
  /\.key$/i,
  /id_rsa/i,
  /credentials(\.json|\.yml|\.yaml)?$/i,
  /secrets?(\.json|\.yml|\.yaml)?$/i,
  /\.pfx$/i,
  /\.p12$/i,
  /service-account.*\.json$/i,
];

const ENTRY_POINT_NAMES = new Set([
  'index.ts', 'index.tsx', 'index.js', 'index.jsx',
  'main.ts', 'main.tsx', 'main.js', 'main.jsx',
  'app.ts', 'app.tsx', 'app.js', 'app.jsx',
  'server.ts', 'server.js', 'main.py', 'app.py',
  'main.go', 'main.rs', 'lib.rs', 'cli.ts', 'cli.js',
]);

const EXT_LANG_MAP: Record<string, string> = {
  ts: 'TypeScript',
  tsx: 'TypeScript',
  js: 'JavaScript',
  jsx: 'JavaScript',
  py: 'Python',
  rs: 'Rust',
  go: 'Go',
  java: 'Java',
  cpp: 'C++',
  c: 'C',
  rb: 'Ruby',
  php: 'PHP',
  swift: 'Swift',
  kt: 'Kotlin',
  html: 'HTML',
  css: 'CSS',
  scss: 'CSS',
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  md: 'Markdown',
  sh: 'Shell',
  sql: 'SQL',
};

export class CodeClassifier {
  public static isSensitive(path: string, name: string): boolean {
    return SENSITIVE_PATTERNS.some((re) => re.test(name) || re.test(path));
  }

  public static isIgnored(path: string): boolean {
    const lower = path.toLowerCase();
    return (
      lower.includes('node_modules/') ||
      lower.includes('.git/') ||
      lower.includes('.next/') ||
      lower.includes('dist/') ||
      lower.includes('build/') ||
      lower.includes('target/') ||
      lower.includes('__pycache__/') ||
      lower.includes('.turbo/') ||
      lower.endsWith('.lock') ||
      lower.endsWith('-lock.json') ||
      lower.endsWith('.map')
    );
  }

  public static classify(path: string, type: 'file' | 'dir', size = 0): ClassifiedItem {
    const parts = path.split('/');
    const name = parts[parts.length - 1];
    const lowerPath = path.toLowerCase();
    const lowerName = name.toLowerCase();
    const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
    const isSensitive = this.isSensitive(path, name);
    const isEntryPoint = ENTRY_POINT_NAMES.has(lowerName) || (parts.length <= 2 && /^(main|index|app|server)\.[a-z]+$/i.test(name));

    let category: CodeCategory = 'application';

    // 1. Tests
    if (
      lowerPath.includes('test') ||
      lowerPath.includes('__tests__') ||
      lowerPath.includes('spec') ||
      /\.(test|spec)\.[a-z]+$/i.test(name)
    ) {
      category = 'tests';
    }
    // 2. Documentation
    else if (
      lowerPath.startsWith('docs') ||
      lowerPath.includes('/docs') ||
      lowerName === 'readme.md' ||
      lowerName === 'changelog.md' ||
      lowerName === 'license' ||
      lowerName === 'license.md' ||
      ext === 'md'
    ) {
      category = 'docs';
    }
    // 3. UI / Components / Frontend
    else if (
      lowerPath.includes('component') ||
      lowerPath.includes('view') ||
      lowerPath.includes('page') ||
      lowerPath.includes('ui') ||
      ['tsx', 'jsx', 'vue', 'svelte', 'css', 'scss', 'html'].includes(ext)
    ) {
      category = 'ui';
    }
    // 4. Backend / API / Server
    else if (
      lowerPath.includes('api') ||
      lowerPath.includes('server') ||
      lowerPath.includes('route') ||
      lowerPath.includes('controller') ||
      lowerPath.includes('middleware') ||
      lowerPath.includes('service')
    ) {
      category = 'backend';
    }
    // 5. Data / Store / Database
    else if (
      lowerPath.includes('db') ||
      lowerPath.includes('database') ||
      lowerPath.includes('model') ||
      lowerPath.includes('schema') ||
      lowerPath.includes('migration') ||
      lowerPath.includes('entity') ||
      lowerPath.includes('store') ||
      ext === 'sql'
    ) {
      category = 'data';
    }
    // 6. Build / Infra / CI/CD
    else if (
      lowerPath.startsWith('.github') ||
      lowerPath.includes('docker') ||
      lowerName.startsWith('dockerfile') ||
      lowerName.includes('compose') ||
      lowerPath.includes('k8s') ||
      lowerPath.includes('terraform')
    ) {
      category = 'infra';
    }
    // 7. Configuration
    else if (
      lowerName.startsWith('.') ||
      lowerName.includes('config') ||
      lowerName === 'package.json' ||
      lowerName === 'cargo.toml' ||
      lowerName === 'go.mod' ||
      lowerName === 'requirements.txt' ||
      ['toml', 'ini', 'env', 'cfg'].includes(ext)
    ) {
      category = 'config';
    }
    // 8. Scripts / Automation
    else if (
      lowerPath.includes('script') ||
      lowerPath.includes('tool') ||
      ext === 'sh' ||
      ext === 'bash' ||
      ext === 'zsh'
    ) {
      category = 'scripts';
    }
    // 9. Assets & Media
    else if (
      lowerPath.includes('asset') ||
      lowerPath.includes('public') ||
      lowerPath.includes('static') ||
      lowerPath.includes('icon') ||
      ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'mp3', 'mp4', 'woff', 'woff2', 'ttf'].includes(ext)
    ) {
      category = 'assets';
    }
    // 10. Generated / Vendor
    else if (
      lowerPath.includes('vendor') ||
      lowerPath.includes('generated') ||
      lowerPath.includes('dist')
    ) {
      category = 'generated';
    }

    return {
      path,
      name,
      type,
      category,
      bytes: size,
      extension: ext || undefined,
      language: EXT_LANG_MAP[ext],
      isEntryPoint,
      isSensitive,
    };
  }

  /**
   * Detect project type from top-level files & directories
   */
  public static detectProjectType(files: Array<{ path: string }>): string {
    const paths = files.map((f) => f.path.toLowerCase());

    const hasPackages = paths.some((p) => p.startsWith('packages/') || p.startsWith('apps/'));
    if (hasPackages) return 'Monorepo Workspace';

    const hasReact = paths.some((p) => p.includes('react') || p.endsWith('.tsx') || p.endsWith('.jsx'));
    const hasVue = paths.some((p) => p.endsWith('.vue'));
    const hasNext = paths.some((p) => p.includes('next.config') || p.startsWith('app/') || p.startsWith('pages/'));
    if (hasNext || hasReact || hasVue) return 'Web Application';

    const hasServer = paths.some((p) => p.includes('server') || p.includes('routes') || p.includes('api/'));
    if (hasServer) return 'API Service / Server';

    const hasCli = paths.some((p) => p.includes('cli') || p.includes('bin/'));
    if (hasCli) return 'CLI Tool';

    const hasDocsOnly = paths.every((p) => p.endsWith('.md') || p.startsWith('docs/'));
    if (hasDocsOnly) return 'Documentation Library';

    const hasCargo = paths.some((p) => p === 'cargo.toml');
    if (hasCargo) return 'Rust Crate';

    const hasGo = paths.some((p) => p === 'go.mod');
    if (hasGo) return 'Go Module';

    return 'Software Project';
  }
}
