import type { NormalizedRepoTree, RepoDirectoryNode, RepoFileNode, CodeCategory } from './repoWorldTypes';
import { getMockFileContent } from './mockCodeContent';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:5000';
const treeCache = new Map<string, NormalizedRepoTree>();
const fileCache = new Map<string, RepoFileContent>();

export interface RepoFileContent {
  name: string;
  path: string;
  size: number;
  content: string;
  language: string;
}

export async function fetchRepoFileContent(
  owner: string,
  repo: string,
  path: string
): Promise<RepoFileContent> {
  const cleanPath = path.replace(/^\//, '');
  const cacheKey = `${owner}/${repo}/${cleanPath}`.toLowerCase();
  if (fileCache.has(cacheKey)) {
    return fileCache.get(cacheKey)!;
  }

  const isDemo = ['rowan-fell', 'brightloop', 'lantern-collective'].includes(owner.toLowerCase());

  // If known demo repo, return synthetic realistic file directly
  if (isDemo) {
    const mock = getMockFileContent(`${owner}/${repo}`, cleanPath);
    const result: RepoFileContent = {
      name: cleanPath.split('/').pop() || cleanPath,
      path: cleanPath,
      size: mock.content.length,
      content: mock.content,
      language: mock.language,
    };
    fileCache.set(cacheKey, result);
    return result;
  }

  // 1. Try Backend API
  try {
    const res = await fetch(
      `${API_BASE}/api/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/file?path=${encodeURIComponent(cleanPath)}`,
      { credentials: 'include' }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.content === 'string') {
        fileCache.set(cacheKey, data);
        return data;
      }
    }
  } catch {
    // Backend fetch failed, continue to fallback
  }

  // 2. Direct fallback to raw.githubusercontent.com
  try {
    const rawRes = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${cleanPath}`);
    if (rawRes.ok) {
      const text = await rawRes.text();
      const ext = cleanPath.split('.').pop() || '';
      const result: RepoFileContent = {
        name: cleanPath.split('/').pop() || cleanPath,
        path: cleanPath,
        size: text.length,
        content: text,
        language: ext,
      };
      fileCache.set(cacheKey, result);
      return result;
    }
  } catch {
    // raw fallback failed
  }

  // 3. Fallback to mock generator if offline / rate-limited
  const fallback = getMockFileContent(`${owner}/${repo}`, cleanPath);
  const result: RepoFileContent = {
    name: cleanPath.split('/').pop() || cleanPath,
    path: cleanPath,
    size: fallback.content.length,
    content: fallback.content,
    language: fallback.language,
  };
  fileCache.set(cacheKey, result);
  return result;
}

export async function fetchRepoTree(owner: string, repo: string): Promise<NormalizedRepoTree> {
  const cacheKey = `${owner}/${repo}`.toLowerCase();
  if (treeCache.has(cacheKey)) {
    return treeCache.get(cacheKey)!;
  }

  // 1. Try Backend API
  try {
    const res = await fetch(`${API_BASE}/api/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/tree`, {
      credentials: 'include',
    });
    if (res.ok) {
      const data: NormalizedRepoTree = await res.json();
      treeCache.set(cacheKey, data);
      return data;
    }
  } catch {
    // Backend unavailable, continue to fallbacks
  }

  // 2. Try GitHub Public Git Trees API
  try {
    const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`);
    if (ghRes.ok) {
      const ghData = await ghRes.json();
      if (Array.isArray(ghData.tree)) {
        const tree = buildTreeFromGitItems(owner, repo, ghData.tree, ghData.truncated);
        treeCache.set(cacheKey, tree);
        return tree;
      }
    }
  } catch {
    // Public GitHub API failed or rate-limited
  }

  // 3. Realistic Synthetic Tree for demo repos / offline exploration
  const demoTree = generateDemoRepoTree(owner, repo);
  treeCache.set(cacheKey, demoTree);
  return demoTree;
}

function classifyPath(path: string, _type: 'file' | 'dir'): { category: CodeCategory; isEntryPoint: boolean } {
  const lower = path.toLowerCase();
  const name = path.split('/').pop() || '';
  const ext = name.split('.').pop() || '';

  const isEntryPoint = /^(index|main|app|server)\.[a-z]+$/i.test(name);

  if (lower.includes('test') || lower.includes('spec')) return { category: 'tests', isEntryPoint: false };
  if (lower.startsWith('docs') || lower.includes('/docs') || ext === 'md') return { category: 'docs', isEntryPoint: false };
  if (lower.includes('component') || lower.includes('view') || ['tsx', 'jsx', 'css', 'html'].includes(ext)) {
    return { category: 'ui', isEntryPoint };
  }
  if (lower.includes('api') || lower.includes('server') || lower.includes('service')) {
    return { category: 'backend', isEntryPoint };
  }
  if (lower.includes('db') || lower.includes('model') || lower.includes('store') || ext === 'sql') {
    return { category: 'data', isEntryPoint: false };
  }
  if (lower.includes('docker') || lower.startsWith('.github')) return { category: 'infra', isEntryPoint: false };
  if (name.includes('config') || name.startsWith('.') || name === 'package.json') return { category: 'config', isEntryPoint: false };
  if (lower.includes('script') || ext === 'sh') return { category: 'scripts', isEntryPoint: false };
  if (['png', 'svg', 'jpg', 'ico'].includes(ext)) return { category: 'assets', isEntryPoint: false };

  return { category: 'application', isEntryPoint };
}

function buildTreeFromGitItems(owner: string, repo: string, items: any[], truncated = false): NormalizedRepoTree {
  const root: RepoDirectoryNode = {
    id: 'root',
    name: repo,
    path: '',
    category: 'application',
    fileCount: 0,
    totalBytes: 0,
    children: [],
  };

  const dirMap = new Map<string, RepoDirectoryNode>();
  dirMap.set('', root);

  const entryPoints: string[] = [];

  let totalFiles = 0;
  let totalBytes = 0;

  for (const item of items) {
    if (item.type === 'tree') {
      const parts = item.path.split('/');
      let cur = '';
      for (const p of parts) {
        const parent = cur;
        cur = cur ? `${cur}/${p}` : p;
        if (!dirMap.has(cur)) {
          const { category } = classifyPath(cur, 'dir');
          const d: RepoDirectoryNode = {
            id: `dir-${cur}`,
            name: p,
            path: cur,
            category,
            fileCount: 0,
            totalBytes: 0,
            children: [],
          };
          dirMap.set(cur, d);
          dirMap.get(parent)?.children.push(d);
        }
      }
    } else if (item.type === 'blob') {
      totalFiles++;
      const size = item.size || 500;
      totalBytes += size;

      const { category, isEntryPoint } = classifyPath(item.path, 'file');
      if (isEntryPoint) entryPoints.push(item.path);

      const parts = item.path.split('/');
      const fileName = parts.pop()!;
      const parentPath = parts.join('/');

      if (!dirMap.has(parentPath)) {
        dirMap.set(parentPath, {
          id: `dir-${parentPath}`,
          name: parts[parts.length - 1] || 'src',
          path: parentPath,
          category,
          fileCount: 0,
          totalBytes: 0,
          children: [],
        });
        root.children.push(dirMap.get(parentPath)!);
      }

      const fileNode: RepoFileNode = {
        id: `file-${item.path}`,
        name: fileName,
        path: item.path,
        extension: fileName.includes('.') ? fileName.split('.').pop() : undefined,
        bytes: size,
        category,
        isEntryPoint,
      };

      dirMap.get(parentPath)!.children.push(fileNode);
    }
  }

  return {
    repoId: `${owner}-${repo}`,
    repoName: repo,
    repoFullName: `${owner}/${repo}`,
    projectType: entryPoints.some((e) => e.includes('server')) ? 'API Service' : 'Web Application',
    root,
    totalFiles,
    totalBytes,
    truncated,
    languages: { TypeScript: 60, JavaScript: 25, CSS: 15 },
    entryPoints,
    inspectedAt: new Date().toISOString(),
  };
}

function generateDemoRepoTree(owner: string, repo: string): NormalizedRepoTree {
  const isEngine = repo.includes('engine') || repo.includes('atlas');
  const isGateway = repo.includes('gateway') || repo.includes('api');
  const isRust = repo.includes('parchment');

  const root: RepoDirectoryNode = {
    id: 'root',
    name: repo,
    path: '',
    category: 'application',
    fileCount: 38,
    totalBytes: 2450000,
    children: [],
  };

  // 1. Core Source Directory
  const srcDir: RepoDirectoryNode = {
    id: 'dir-src',
    name: 'src',
    path: 'src',
    category: 'application',
    fileCount: 16,
    totalBytes: 1200000,
    children: [
      { id: 'f-index', name: isRust ? 'lib.rs' : 'index.ts', path: isRust ? 'src/lib.rs' : 'src/index.ts', category: 'application', bytes: 14200, isEntryPoint: true, language: isRust ? 'Rust' : 'TypeScript' },
      { id: 'f-engine', name: isEngine ? 'physics.ts' : isGateway ? 'router.go' : 'core.rs', path: 'src/core', category: 'application', bytes: 32000, language: isRust ? 'Rust' : 'TypeScript' },
      { id: 'f-pipeline', name: 'pipeline.ts', path: 'src/pipeline.ts', category: 'backend', bytes: 18400, language: 'TypeScript' },
      { id: 'f-store', name: 'state.ts', path: 'src/state.ts', category: 'data', bytes: 9800, language: 'TypeScript' },
    ],
  };

  // 2. Components / UI Directory
  const uiDir: RepoDirectoryNode = {
    id: 'dir-ui',
    name: 'components',
    path: 'src/components',
    category: 'ui',
    fileCount: 8,
    totalBytes: 420000,
    children: [
      { id: 'f-canvas', name: 'CanvasView.tsx', path: 'src/components/CanvasView.tsx', category: 'ui', bytes: 16200, language: 'TypeScript' },
      { id: 'f-panel', name: 'Inspector.tsx', path: 'src/components/Inspector.tsx', category: 'ui', bytes: 8900, language: 'TypeScript' },
      { id: 'f-hud', name: 'HUD.tsx', path: 'src/components/HUD.tsx', category: 'ui', bytes: 6400, language: 'TypeScript' },
    ],
  };

  // 3. Tests Directory
  const testDir: RepoDirectoryNode = {
    id: 'dir-tests',
    name: 'tests',
    path: 'tests',
    category: 'tests',
    fileCount: 6,
    totalBytes: 180000,
    children: [
      { id: 'f-test1', name: 'physics.test.ts', path: 'tests/physics.test.ts', category: 'tests', bytes: 8400, language: 'TypeScript' },
      { id: 'f-test2', name: 'integration.spec.ts', path: 'tests/integration.spec.ts', category: 'tests', bytes: 12100, language: 'TypeScript' },
      { id: 'f-benchmark', name: 'benchmark.ts', path: 'tests/benchmark.ts', category: 'tests', bytes: 5200, language: 'TypeScript' },
    ],
  };

  // 4. Docs Directory
  const docsDir: RepoDirectoryNode = {
    id: 'dir-docs',
    name: 'docs',
    path: 'docs',
    category: 'docs',
    fileCount: 4,
    totalBytes: 96000,
    children: [
      { id: 'f-readme', name: 'README.md', path: 'README.md', category: 'docs', bytes: 14500, language: 'Markdown' },
      { id: 'f-arch', name: 'ARCHITECTURE.md', path: 'docs/ARCHITECTURE.md', category: 'docs', bytes: 22000, language: 'Markdown' },
      { id: 'f-contrib', name: 'CONTRIBUTING.md', path: 'docs/CONTRIBUTING.md', category: 'docs', bytes: 7200, language: 'Markdown' },
    ],
  };

  // 5. Config / Infrastructure
  const configDir: RepoDirectoryNode = {
    id: 'dir-config',
    name: 'infrastructure',
    path: '.github',
    category: 'infra',
    fileCount: 4,
    totalBytes: 48000,
    children: [
      { id: 'f-pkg', name: isRust ? 'Cargo.toml' : 'package.json', path: isRust ? 'Cargo.toml' : 'package.json', category: 'config', bytes: 2400, language: 'JSON' },
      { id: 'f-ci', name: 'ci.yml', path: '.github/workflows/ci.yml', category: 'infra', bytes: 3100, language: 'YAML' },
      { id: 'f-docker', name: 'Dockerfile', path: 'Dockerfile', category: 'infra', bytes: 1800, language: 'Docker' },
    ],
  };

  root.children.push(srcDir, uiDir, testDir, docsDir, configDir);

  return {
    repoId: `${owner}-${repo}`,
    repoName: repo,
    repoFullName: `${owner}/${repo}`,
    projectType: isEngine ? 'Interactive 2D Game Engine' : isGateway ? 'API Gateway Microservice' : isRust ? 'Rust Systems Crate' : 'Web Application',
    root,
    totalFiles: 38,
    totalBytes: 2450000,
    truncated: false,
    languages: isRust
      ? { Rust: 75, WebAssembly: 15, Shell: 10 }
      : isGateway
      ? { Go: 82, Shell: 12, Dockerfile: 6 }
      : { TypeScript: 68, CSS: 18, HTML: 14 },
    entryPoints: [isRust ? 'src/lib.rs' : 'src/index.ts'],
    inspectedAt: new Date().toISOString(),
  };
}
