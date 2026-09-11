import type { NormalizedRepoTree, RepoWorldModel, RepoDistrict, RepoBuilding, RepoPath, RepoDirectoryNode, RepoFileNode, CodeCategory } from './repoWorldTypes';
import { getLanguageStyle } from './languageStyles';

export const CATEGORY_TINTS: Record<CodeCategory, string> = {
  application: '#27234d',
  ui: '#1d2f47',
  backend: '#2e2142',
  data: '#1f343a',
  tests: '#203932',
  docs: '#382b20',
  config: '#2b233a',
  build: '#302920',
  scripts: '#263326',
  assets: '#35213b',
  infra: '#28253d',
  generated: '#1e1c28',
  unknown: '#23213b',
};

export const CATEGORY_NAMES: Record<CodeCategory, string> = {
  application: 'Application Heart',
  ui: 'UI & Storefront District',
  backend: 'Service Citadel',
  data: 'Data Vaults & Archives',
  tests: 'Verification Laboratories',
  docs: 'Grand Library & Records',
  config: 'Infrastructure & Utilities',
  build: 'Assembly Works',
  scripts: 'Workshops & Automation',
  assets: 'Creative Studios',
  infra: 'Deployment Operations',
  generated: 'Restricted Vendor Zone',
  unknown: 'Outskirts',
};

export function buildRepoWorld(tree: NormalizedRepoTree): RepoWorldModel {
  const districts: RepoDistrict[] = [];
  const buildings: RepoBuilding[] = [];
  const paths: RepoPath[] = [];

  const centralPlaza = {
    x: 0,
    y: 20,
    label: `${tree.repoName} Town Hall`,
  };
  const spawnPoint = { x: 0, y: 110 };

  // Find top-level directories in root
  const topDirs: RepoDirectoryNode[] = [];
  const rootFiles: RepoFileNode[] = [];

  for (const child of tree.root.children) {
    if ('children' in child) {
      topDirs.push(child);
    } else {
      rootFiles.push(child);
    }
  }

  // Semicircle layout for top-level directories / neighborhoods
  const dirCount = Math.max(1, topDirs.length);
  const neighborhoodRadius = dirCount <= 2 ? 260 : 340 + dirCount * 30;

  topDirs.forEach((dir, i) => {
    let angle = -Math.PI / 2;
    if (dirCount > 1) {
      const startAngle = -Math.PI * 0.85;
      const endAngle = -Math.PI * 0.15;
      angle = startAngle + (i / (dirCount - 1)) * (endAngle - startAngle);
    }

    const cx = Math.round(Math.cos(angle) * neighborhoodRadius);
    const cy = Math.round(Math.sin(angle) * neighborhoodRadius * 0.72);
    const radius = Math.max(95, 36 * Math.sqrt(Math.max(3, dir.fileCount)) + 40);

    const cleanDirName = dir.name.endsWith('/') ? dir.name : `${dir.name}/`;
    const district: RepoDistrict = {
      id: dir.id,
      name: cleanDirName,
      path: dir.path,
      category: dir.category,
      center: { x: cx, y: cy },
      radius,
      fileCount: dir.fileCount,
      totalBytes: dir.totalBytes,
      tint: CATEGORY_TINTS[dir.category] || '#23213b',
    };
    districts.push(district);

    // Path from Central Plaza to this neighborhood
    paths.push({
      id: `path-plaza-${district.id}`,
      tier: 'main',
      waypoints: [
        { x: centralPlaza.x, y: centralPlaza.y },
        { x: Math.round((centralPlaza.x + cx) / 2), y: Math.round((centralPlaza.y + cy) / 2 - 12) },
        { x: cx, y: cy },
      ],
    });

    // Populate buildings for files inside this directory (up to 8 most important files)
    const filesInDir: RepoFileNode[] = [];
    function collectFiles(node: RepoDirectoryNode) {
      for (const c of node.children) {
        if ('children' in c) {
          // Flatten first subdirectory or treat as compound
          collectFiles(c);
        } else {
          filesInDir.push(c);
        }
      }
    }
    collectFiles(dir);

    // Sort files by bytes / entry point prominence
    const prominentFiles = filesInDir
      .sort((a, b) => (b.isEntryPoint ? 1 : 0) - (a.isEntryPoint ? 1 : 0) || b.bytes - a.bytes)
      .slice(0, 8);

    prominentFiles.forEach((file, fi) => {
      const fileCountInDir = prominentFiles.length;
      let fx = cx;
      let fy = cy;

      if (fi > 0) {
        // Distribute files in a graceful downward-facing arc / semicircle
        // angles from 0.08*PI to 0.92*PI (downwards from neighborhood center),
        // leaving the upper apex completely clean and open for the district header badge.
        const totalOther = Math.max(1, fileCountInDir - 1);
        const fTheta = 0.08 * Math.PI + (fi / totalOther) * 0.84 * Math.PI;
        const fDist = 52 + (fi % 2) * 20;
        fx = Math.round(cx + Math.cos(fTheta) * fDist * 1.15);
        fy = Math.round(cy + Math.sin(fTheta) * fDist * 0.85);
      } else {
        // Main file at neighborhood core, placed cleanly below center
        fx = cx;
        fy = cy + 10;
      }


      const isLarge = file.bytes > 15000;
      const footprint = file.isEntryPoint ? 68 : isLarge ? 54 : 42;
      const heightPx = file.isEntryPoint ? 130 : isLarge ? 96 : 68;

      const building: RepoBuilding = {
        id: file.id,
        name: file.name,
        path: file.path,
        category: file.category,
        isDirectory: false,
        isEntryPoint: Boolean(file.isEntryPoint),
        language: file.language || 'TypeScript',
        bytes: file.bytes,
        x: fx,
        y: fy,
        footprint,
        heightPx,
        style: getLanguageStyle(file.language),
        githubUrl: `https://github.com/${tree.repoFullName}/blob/main/${file.path}`,
      };
      buildings.push(building);

      // Connecting path from neighborhood center to file building
      if (fi > 0) {
        paths.push({
          id: `path-file-${building.id}`,
          tier: 'path',
          waypoints: [
            { x: cx, y: cy },
            { x: fx, y: fy },
          ],
        });
      }
    });
  });

  // Central Entry Point Town Hall in Central Plaza
  const primaryEntry = tree.entryPoints[0] || 'Entry Point';
  const townHall: RepoBuilding = {
    id: 'bldg-town-hall',
    name: `${tree.repoName} (Entry Core)`,
    path: primaryEntry,
    category: 'application',
    isDirectory: false,
    isEntryPoint: true,
    language: Object.keys(tree.languages)[0] || 'TypeScript',
    bytes: 25000,
    x: centralPlaza.x,
    y: centralPlaza.y,
    footprint: 84,
    heightPx: 160,
    style: getLanguageStyle(Object.keys(tree.languages)[0] || 'TypeScript'),
    githubUrl: `https://github.com/${tree.repoFullName}`,
  };
  buildings.push(townHall);

  // Root configuration files placed around the central plaza
  rootFiles.slice(0, 5).forEach((rf, rfi) => {
    const rx = centralPlaza.x + (rfi % 2 === 0 ? -1 : 1) * (95 + Math.floor(rfi / 2) * 36);
    const ry = centralPlaza.y + 60 + (rfi % 2) * 32;

    const b: RepoBuilding = {
      id: rf.id,
      name: rf.name,
      path: rf.path,
      category: rf.category,
      isDirectory: false,
      isEntryPoint: false,
      language: rf.language || 'Config',
      bytes: rf.bytes,
      x: rx,
      y: ry,
      footprint: 40,
      heightPx: 56,
      style: getLanguageStyle(rf.language || 'JSON'),
      githubUrl: `https://github.com/${tree.repoFullName}/blob/main/${rf.path}`,
    };
    buildings.push(b);

    paths.push({
      id: `path-rootfile-${b.id}`,
      tier: 'path',
      waypoints: [
        { x: centralPlaza.x, y: centralPlaza.y + 20 },
        { x: rx, y: ry },
      ],
    });
  });

  // Bounds
  const maxDist = Math.max(
    500,
    ...districts.map((d) => Math.hypot(d.center.x, d.center.y) + d.radius + 150)
  );

  return {
    repoId: tree.repoId,
    repoName: tree.repoName,
    repoFullName: tree.repoFullName,
    owner: tree.repoFullName.split('/')[0],
    projectType: tree.projectType,
    languages: tree.languages,
    districts,
    buildings,
    paths,
    bounds: { width: maxDist * 2, height: maxDist * 2 },
    spawnPoint,
    centralPlaza,
    totalFiles: tree.totalFiles,
    totalBytes: tree.totalBytes,
    truncated: tree.truncated,
    htmlUrl: `https://github.com/${tree.repoFullName}`,
  };
}
