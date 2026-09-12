import type {
  TrendingRepositoryManifest,
  TrendingStorefrontBuilding,
  TrendingStreetWorld,
} from './trendingTypes';

export function buildTrendingStreetWorld(manifests: TrendingRepositoryManifest[]): TrendingStreetWorld {
  const storefronts: TrendingStorefrontBuilding[] = [];

  // Street Layout Geometry
  // Street extends from Entrance (X: 380, Y: 120) eastward to X: 1100
  const streetStartX = 460;
  const streetCenterY = 140;
  const westRowY = streetCenterY - 110; // North / Left boardwalk
  const eastRowY = streetCenterY + 110; // South / Right boardwalk

  // 1. Featured Landmark Pavilion (#1 Project)
  const featured = manifests[0] || {
    repositoryId: 'default-1',
    ownerLogin: 'astral-sh',
    name: 'uv',
    fullName: 'astral-sh/uv',
    description: 'Fast Python package manager written in Rust',
    htmlUrl: 'https://github.com/astral-sh/uv',
    primaryLanguage: 'Rust',
    languageMix: { Rust: 100 },
    stars: 42000,
    forks: 1400,
    activityState: 'active',
    rank: 1,
    trendReason: 'growth',
    trendReasonText: 'Top trending fast packaging system',
    category: 'Developer Tools',
    buildingStyleSeed: 101,
    storefrontType: 'saloon',
    neonColor: '#38bdf8',
    updatedAt: new Date().toISOString(),
  };

  // 2. Generate Storefronts along North and South Boardwalks
  const remaining = manifests.slice(1);
  remaining.forEach((m, idx) => {
    const isNorth = idx % 2 === 0;
    const colIndex = Math.floor(idx / 2);
    const posX = streetStartX + colIndex * 135;
    const posY = isNorth ? westRowY : eastRowY;

    storefronts.push({
      id: `sf-${m.repositoryId}`,
      manifest: m,
      x: posX,
      y: posY,
      width: 105,
      height: 75,
      side: isNorth ? 'west' : 'east',
      signText: m.name,
      hologramColor: m.neonColor,
      hasPorch: true,
      hasBalcony: m.rank <= 5,
      hasWantedPoster: m.category === 'Rising Repositories' || m.trendReason === 'growth',
    });
  });

  // 3. Side Alley Outposts (Wild Cards & Creative)
  storefronts.push({
    id: 'sf-alley-1',
    manifest: manifests[manifests.length - 1] || featured,
    x: streetStartX + 200,
    y: streetCenterY + 230,
    width: 95,
    height: 65,
    side: 'alley',
    signText: 'CANTINA SECRETS',
    hologramColor: '#e879f9',
    hasPorch: false,
    hasBalcony: false,
    hasWantedPoster: true,
  });

  // 4. Boardwalk paths
  const boardwalks = [
    // Main North Boardwalk
    { x: streetStartX - 20, y: westRowY + 36, width: 620, height: 28 },
    // Main South Boardwalk
    { x: streetStartX - 20, y: eastRowY - 36, width: 620, height: 28 },
    // Crosswalk connecting North and South
    { x: streetStartX + 240, y: streetCenterY - 90, width: 32, height: 180 },
    // Crosswalk near entrance
    { x: streetStartX + 40, y: streetCenterY - 90, width: 28, height: 180 },
    // Alley boardwalk
    { x: streetStartX + 180, y: streetCenterY + 120, width: 26, height: 120 },
  ];

  // 5. Hitching posts along the street
  const hitchingPosts = [
    { x: streetStartX + 30, y: streetCenterY - 45 },
    { x: streetStartX + 160, y: streetCenterY - 45 },
    { x: streetStartX + 310, y: streetCenterY - 45 },
    { x: streetStartX + 100, y: streetCenterY + 45 },
    { x: streetStartX + 230, y: streetCenterY + 45 },
    { x: streetStartX + 380, y: streetCenterY + 45 },
  ];

  // 6. Neon signs and billboards
  const neonSigns = [
    { x: 380, y: streetCenterY, text: 'TRENDING STREET', color: '#f43f5e' },
    { x: streetStartX + 120, y: streetCenterY - 75, text: 'RISING REPOS', color: '#38bdf8' },
    { x: streetStartX + 270, y: streetCenterY + 75, text: 'HOT REPOSITORIES', color: '#fde047' },
    { x: streetStartX + 420, y: streetCenterY - 75, text: 'AI & DATA SALOON', color: '#a855f7' },
    { x: streetStartX + 190, y: streetCenterY + 180, text: 'WILD CARDS ALLEY', color: '#e879f9' },
  ];

  return {
    id: 'trending-street-main',
    title: 'Trending Street — Frontier Boulevard',
    entrancePoint: { x: 380, y: streetCenterY },
    returnPoint: { x: 340, y: streetCenterY },
    bounds: { width: 1400, height: 900 },
    storefronts,
    waterTower: {
      x: streetStartX + 520,
      y: streetCenterY - 140,
      tickerText: 'LIVE CODE • 24/7 NETWORK TRENDS • OPEN SOURCE FRONTIER',
    },
    landmarkPavilion: {
      x: streetStartX + 520,
      y: streetCenterY + 30,
      featuredManifest: featured,
    },
    boardwalks,
    hitchingPosts,
    neonSigns,
    visitorsCount: 7,
  };
}
