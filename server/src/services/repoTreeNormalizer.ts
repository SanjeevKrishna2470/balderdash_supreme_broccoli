import { CodeClassifier, type CodeCategory, type ClassifiedItem } from './classifier';

export interface RepoFileNode {
  id: string;
  name: string;
  path: string;
  extension?: string;
  bytes: number;
  category: CodeCategory;
  language?: string;
  isEntryPoint?: boolean;
}

export interface RepoDirectoryNode {
  id: string;
  name: string;
  path: string;
  category: CodeCategory;
  fileCount: number;
  totalBytes: number;
  children: Array<RepoDirectoryNode | RepoFileNode>;
}

export interface NormalizedRepoTree {
  repoId: string;
  repoName: string;
  repoFullName: string;
  projectType: string;
  root: RepoDirectoryNode;
  totalFiles: number;
  totalBytes: number;
  truncated: boolean;
  languages: Record<string, number>;
  entryPoints: string[];
  inspectedAt: string;
}

export class RepoTreeNormalizer {
  public static normalize(
    repoFullName: string,
    rawTree: Array<{ path: string; type: 'file' | 'dir' | 'blob' | 'tree'; size?: number }>,
    truncated = false,
    externalLanguages?: Record<string, number>
  ): NormalizedRepoTree {
    const parts = repoFullName.split('/');
    const repoName = parts[parts.length - 1];

    // Filter ignored directories and sensitive files
    const validItems: ClassifiedItem[] = [];
    for (const item of rawTree) {
      if (CodeClassifier.isIgnored(item.path)) continue;
      const type = item.type === 'tree' || item.type === 'dir' ? 'dir' : 'file';
      const classified = CodeClassifier.classify(item.path, type, item.size || 0);
      if (classified.isSensitive) {
        // Redact completely for security
        continue;
      }
      validItems.push(classified);
    }

    const projectType = CodeClassifier.detectProjectType(validItems);

    // Build directory tree
    const rootDir: RepoDirectoryNode = {
      id: 'root',
      name: repoName,
      path: '',
      category: 'application',
      fileCount: 0,
      totalBytes: 0,
      children: [],
    };

    const dirMap = new Map<string, RepoDirectoryNode>();
    dirMap.set('', rootDir);

    const languages: Record<string, number> = { ...(externalLanguages || {}) };
    const entryPoints: string[] = [];
    let totalFiles = 0;
    let totalBytes = 0;

    // First ensure all directories exist in map
    for (const item of validItems) {
      if (item.type === 'dir') {
        const segments = item.path.split('/');
        let currentPath = '';
        for (let i = 0; i < segments.length; i++) {
          const seg = segments[i];
          const parentPath = currentPath;
          currentPath = currentPath ? `${currentPath}/${seg}` : seg;
          if (!dirMap.has(currentPath)) {
            const dirNode: RepoDirectoryNode = {
              id: `dir-${currentPath}`,
              name: seg,
              path: currentPath,
              category: item.category,
              fileCount: 0,
              totalBytes: 0,
              children: [],
            };
            dirMap.set(currentPath, dirNode);
            const parent = dirMap.get(parentPath);
            if (parent && !parent.children.some((c) => 'children' in c && c.path === currentPath)) {
              parent.children.push(dirNode);
            }
          }
        }
      }
    }

    // Now place files into their parent directory
    for (const item of validItems) {
      if (item.type === 'file') {
        totalFiles++;
        totalBytes += item.bytes;

        if (item.isEntryPoint) {
          entryPoints.push(item.path);
        }

        if (item.language) {
          languages[item.language] = (languages[item.language] || 0) + (item.bytes || 1);
        }

        const segments = item.path.split('/');
        const parentPath = segments.slice(0, -1).join('/');

        // Ensure parent exists
        if (!dirMap.has(parentPath)) {
          const dirNode: RepoDirectoryNode = {
            id: `dir-${parentPath}`,
            name: segments[segments.length - 2] || 'src',
            path: parentPath,
            category: item.category,
            fileCount: 0,
            totalBytes: 0,
            children: [],
          };
          dirMap.set(parentPath, dirNode);
          rootDir.children.push(dirNode);
        }

        const parent = dirMap.get(parentPath)!;
        const fileNode: RepoFileNode = {
          id: `file-${item.path}`,
          name: item.name,
          path: item.path,
          extension: item.extension,
          bytes: item.bytes,
          category: item.category,
          language: item.language,
          isEntryPoint: item.isEntryPoint,
        };

        parent.children.push(fileNode);
        parent.fileCount++;
        parent.totalBytes += item.bytes;
      }
    }

    // Roll up recursive file counts and byte counts for all directories
    function rollup(node: RepoDirectoryNode): { files: number; bytes: number } {
      let count = 0;
      let bytes = 0;
      for (const child of node.children) {
        if ('children' in child) {
          const res = rollup(child);
          count += res.files;
          bytes += res.bytes;
        } else {
          count += 1;
          bytes += child.bytes;
        }
      }
      node.fileCount = count;
      node.totalBytes = bytes;
      return { files: count, bytes };
    }

    rollup(rootDir);

    return {
      repoId: repoFullName.replace('/', '-'),
      repoName,
      repoFullName,
      projectType,
      root: rootDir,
      totalFiles,
      totalBytes,
      truncated,
      languages,
      entryPoints,
      inspectedAt: new Date().toISOString(),
    };
  }
}
