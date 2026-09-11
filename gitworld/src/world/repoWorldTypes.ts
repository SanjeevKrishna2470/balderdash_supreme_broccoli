import type { LanguageStyle } from './languageStyles';

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

export interface RepoDistrict {
  id: string;
  name: string;
  path: string;
  category: CodeCategory;
  center: { x: number; y: number };
  radius: number;
  fileCount: number;
  totalBytes: number;
  tint: string;
}

export interface RepoBuilding {
  id: string;
  name: string;
  path: string;
  category: CodeCategory;
  isDirectory: boolean;
  isEntryPoint: boolean;
  language?: string;
  bytes: number;
  fileCount?: number;
  x: number;
  y: number;
  footprint: number;
  heightPx: number;
  style: LanguageStyle;
  githubUrl: string;
}

export interface RepoPath {
  id: string;
  waypoints: Array<{ x: number; y: number }>;
  tier: 'main' | 'path';
}

export interface RepoWorldModel {
  repoId: string;
  repoName: string;
  repoFullName: string;
  owner: string;
  projectType: string;
  languages: Record<string, number>;
  districts: RepoDistrict[];
  buildings: RepoBuilding[];
  paths: RepoPath[];
  bounds: { width: number; height: number };
  spawnPoint: { x: number; y: number };
  centralPlaza: { x: number; y: number; label: string };
  totalFiles: number;
  totalBytes: number;
  truncated: boolean;
  htmlUrl: string;
}
