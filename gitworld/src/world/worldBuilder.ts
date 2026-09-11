import type { RepositoryModel } from '../types';
import { seededRandom, randRange, randInt, hashSeed } from './rng';
import { getLanguageStyle } from './languageStyles';
import { computeImportance } from './importance';
import type {
  CityWorldModel,
  District,
  CityBuilding,
  Road,
  ContributorAvatar,
  ActivityState,
  EnvironmentProp,
  NavNode,
  NavEdge,
  RiverFeature,
  BridgeFeature,
  BoatFeature,
  ConstructionDistrict,
  PublicRoadFeature,
} from './cityTypes';

const DISTRICT_TINTS = ['#232144', '#2b2450', '#202e4c', '#312347', '#222d4a'];

function ownerOf(repo: RepositoryModel): string {
  const idx = repo.fullName.indexOf('/');
  return idx === -1 ? repo.fullName : repo.fullName.slice(0, idx);
}

function activityOf(lastPushedAt: string): ActivityState {
  const days = (Date.now() - new Date(lastPushedAt).getTime()) / 86_400_000;
  if (days <= 30) return 'active';
  if (days <= 180) return 'quiet';
  return 'dormant';
}

export function buildCity(
  repos: RepositoryModel[],
  user: CityWorldModel['user']
): CityWorldModel {
  const seed = `${user.username}:${repos.length}`;
  const profileColorSeed = user.profileColorSeed ?? hashSeed(user.username);
  const userWithSeed = { ...user, profileColorSeed };
  const sparse = repos.length > 0 && repos.length <= 4;

  // 1. Group into districts by organization (personal repos grouped together)
  const groups = new Map<string, RepositoryModel[]>();
  for (const repo of repos) {
    const owner = ownerOf(repo);
    const key = owner.toLowerCase() === user.username.toLowerCase() ? '__personal__' : owner;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(repo);
  }

  // Stable ordering: personal first, then largest group desc, then alphabetical
  const groupKeys = Array.from(groups.keys()).sort((a, b) => {
    if (a === '__personal__') return -1;
    if (b === '__personal__') return 1;
    return groups.get(b)!.length - groups.get(a)!.length || a.localeCompare(b);
  });

  const districts: District[] = [];
  const buildings: CityBuilding[] = [];
  const roads: Road[] = [];
  const avatars: ContributorAvatar[] = [];
  const environmentProps: EnvironmentProp[] = [];
  const navNodes: NavNode[] = [];
  const navEdges: NavEdge[] = [];

  // 2. Define Arrival Plaza
  const arrivalPlaza = { x: 0, y: 160 };
  const spawnPoint = { x: 0, y: 180 };

  navNodes.push({
    id: 'node-arrival',
    x: arrivalPlaza.x,
    y: arrivalPlaza.y,
    type: 'arrival',
  });

  // Add arrival plaza fountain and benches
  environmentProps.push({
    id: 'prop-plaza-fountain',
    type: 'plaza_fountain',
    x: arrivalPlaza.x,
    y: arrivalPlaza.y,
    label: `${user.displayName || user.username}'s Realm Arrival`,
  });

  environmentProps.push(
    { id: 'prop-plaza-bench-l', type: 'bench', x: arrivalPlaza.x - 38, y: arrivalPlaza.y + 8 },
    { id: 'prop-plaza-bench-r', type: 'bench', x: arrivalPlaza.x + 38, y: arrivalPlaza.y + 8 },
    { id: 'prop-plaza-lamp-l', type: 'lamp', x: arrivalPlaza.x - 55, y: arrivalPlaza.y - 12 },
    { id: 'prop-plaza-lamp-r', type: 'lamp', x: arrivalPlaza.x + 55, y: arrivalPlaza.y - 12 }
  );

  // 3. Layout districts in a spacious northern arc
  const districtCount = Math.max(groupKeys.length, 1);
  const districtArcRadius = districtCount === 1 ? 280 : 340 + districtCount * 55;

  const maxStars = Math.max(1, ...repos.map((r) => r.stars || 0));
  const maxSizeKb = Math.max(1000, ...repos.map((r) => r.sizeKb || 0));

  groupKeys.forEach((key, gi) => {
    const groupRepos = groups
      .get(key)!
      .slice()
      .sort((a, b) => (b.stars || 0) - (a.stars || 0) || a.id - b.id);

    // Calculate district center in fan layout
    let dAngle = -Math.PI / 2; // Default straight north
    if (districtCount > 1) {
      // Fan between -145 degrees and -35 degrees
      const startAngle = -Math.PI * 0.82;
      const endAngle = -Math.PI * 0.18;
      dAngle = startAngle + (gi / (districtCount - 1)) * (endAngle - startAngle);
    }

    const dCenter =
      districtCount === 1
        ? { x: 0, y: -80 }
        : {
            x: Math.round(Math.cos(dAngle) * districtArcRadius),
            y: Math.round(Math.sin(dAngle) * districtArcRadius * 0.75),
          };

    const dRadius = Math.max(120, 56 * Math.sqrt(groupRepos.length) + 80);

    // District entrance faces toward arrival plaza
    const toPlazaAngle = Math.atan2(arrivalPlaza.y - dCenter.y, arrivalPlaza.x - dCenter.x);
    const entranceOffset = dRadius * 0.78;
    const dEntrance = {
      x: Math.round(dCenter.x + Math.cos(toPlazaAngle) * entranceOffset),
      y: Math.round(dCenter.y + Math.sin(toPlazaAngle) * entranceOffset),
    };

    const district: District = {
      id: key,
      name: key === '__personal__' ? 'Personal Domain' : `${key} Quarter`,
      isPersonal: key === '__personal__',
      center: dCenter,
      radius: dRadius,
      tint: DISTRICT_TINTS[gi % DISTRICT_TINTS.length],
      entrance: dEntrance,
    };
    districts.push(district);

    // District Nav Node
    const districtNodeId = `node-dist-${district.id}`;
    navNodes.push({
      id: districtNodeId,
      x: dEntrance.x,
      y: dEntrance.y,
      type: 'district',
      targetId: district.id,
    });

    // Main Road from Arrival Plaza to District Entrance
    const midX = Math.round((arrivalPlaza.x + dEntrance.x) / 2);
    const midY = Math.round((arrivalPlaza.y + dEntrance.y) / 2 - 15);
    roads.push({
      id: `road-main-${district.id}`,
      fromId: 'node-arrival',
      toId: districtNodeId,
      tier: 'main',
      waypoints: [
        { x: arrivalPlaza.x, y: arrivalPlaza.y },
        { x: midX, y: midY },
        { x: dEntrance.x, y: dEntrance.y },
      ],
    });

    // District Sign & Entrance Lamps
    environmentProps.push(
      {
        id: `prop-sign-${district.id}`,
        type: 'sign',
        x: dEntrance.x - 24,
        y: dEntrance.y,
        label: district.name,
        districtId: district.id,
      },
      {
        id: `prop-lamp-${district.id}-a`,
        type: 'lamp',
        x: dEntrance.x + 20,
        y: dEntrance.y,
        districtId: district.id,
      }
    );

    // 4. Place buildings within the district with comfortable setbacks
    // We sort repositories by importance so the primary project sits in the heart of the district
    const placedBoxes: Array<{ x: number; y: number; r: number }> = [];

    groupRepos.forEach((repo, ri) => {
      const bRand = seededRandom(`${seed}:repo:${repo.id}`);
      const importance = computeImportance(repo, maxStars, maxSizeKb);
      const activity = activityOf(repo.lastPushedAt);
      const style = getLanguageStyle(repo.primaryLanguage);

      // Spacious radial layout around district center
      let bx = dCenter.x;
      let by = dCenter.y;
      if (ri > 0) {
        const ring = Math.floor((ri - 1) / 4) + 1;
        const ringPos = (ri - 1) % 4;
        const baseRadius = 75 * ring + (ri * 12);
        const theta = (ringPos / 4) * Math.PI * 2 + randRange(bRand, -0.22, 0.22);
        bx = Math.round(dCenter.x + Math.cos(theta) * baseRadius);
        by = Math.round(dCenter.y + Math.sin(theta) * (baseRadius * 0.72));
      } else {
        // Landmark at center
        bx = dCenter.x;
        by = dCenter.y - 15;
      }

      // Soft push to prevent any building collisions
      for (const p of placedBoxes) {
        const dist = Math.hypot(bx - p.x, by - p.y);
        const minDist = importance.plotRadius * 0.75 + p.r;
        if (dist < minDist) {
          const angle = Math.atan2(by - p.y, bx - p.x) || 0.8;
          bx = Math.round(p.x + Math.cos(angle) * minDist);
          by = Math.round(p.y + Math.sin(angle) * minDist);
        }
      }

      placedBoxes.push({ x: bx, y: by, r: importance.plotRadius * 0.75 });

      const plotEntrance = {
        x: bx,
        y: Math.round(by + importance.footprint * 0.52 + 16),
      };

      const contributorCount =
        activity === 'dormant' ? 0 : Math.min(4, 1 + randInt(bRand, 0, activity === 'active' ? 2 : 1));

      // Satellites for heavily-forked repos
      const satellites =
        (repo.forks || 0) >= 30
          ? Array.from({ length: Math.min(3, Math.floor(Math.log2(repo.forks || 1))) }, (_, si) => {
              const a = randRange(bRand, 0, Math.PI * 2);
              const dist = importance.footprint * 0.95 + si * 16;
              return {
                x: bx + Math.cos(a) * dist,
                y: by + Math.sin(a) * dist,
                r: 10 + randRange(bRand, 0, 6),
              };
            })
          : [];

      const building: CityBuilding = {
        id: String(repo.id),
        repo,
        districtId: district.id,
        x: bx,
        y: by,
        footprint: importance.footprint,
        heightTier: importance.tier,
        heightPx: importance.heightPx,
        activity,
        style,
        issuesShown: Math.min(6, repo.openIssues || 0),
        hasConstruction:
          repo.openPullRequests !== undefined
            ? repo.openPullRequests > 0
            : activity !== 'dormant' && bRand() < 0.22,
        satellites,
        contributorCount,
        plotEntrance,
        importanceScore: importance.score,
      };
      buildings.push(building);

      // Building Nav Node
      const bldgNodeId = `node-bldg-${building.id}`;
      navNodes.push({
        id: bldgNodeId,
        x: plotEntrance.x,
        y: plotEntrance.y,
        type: 'building',
        targetId: building.id,
      });

      // Connect building plot entrance to district entrance
      roads.push({
        id: `road-plot-${building.id}`,
        fromId: districtNodeId,
        toId: bldgNodeId,
        tier: importance.tier === 'landmark' ? 'district' : 'path',
        waypoints: [
          { x: dEntrance.x, y: dEntrance.y },
          { x: Math.round((dEntrance.x + plotEntrance.x) / 2), y: Math.round((dEntrance.y + plotEntrance.y) / 2) },
          { x: plotEntrance.x, y: plotEntrance.y },
        ],
      });

      // Add local environmental detail near landmark or busy buildings
      if (importance.tier === 'landmark') {
        environmentProps.push(
          { id: `prop-tree-${building.id}-1`, type: 'tree', x: bx - importance.footprint * 0.85, y: by + 10, districtId: district.id },
          { id: `prop-tree-${building.id}-2`, type: 'tree', x: bx + importance.footprint * 0.85, y: by + 10, districtId: district.id },
          { id: `prop-lamp-${building.id}`, type: 'lamp', x: plotEntrance.x - 22, y: plotEntrance.y, districtId: district.id }
        );
      } else if (activity === 'active' && bRand() < 0.5) {
        environmentProps.push({
          id: `prop-lamp-${building.id}`,
          type: 'lamp',
          x: plotEntrance.x + 18,
          y: plotEntrance.y,
          districtId: district.id,
        });
      }

      // Contributor avatars wandering peacefully near their building
      for (let a = 0; a < contributorCount; a++) {
        avatars.push({
          id: `${repo.id}-${a}`,
          buildingId: building.id,
          homeX: bx + randRange(bRand, -importance.footprint * 0.8, importance.footprint * 0.8),
          homeY: plotEntrance.y + randRange(bRand, -4, 20),
          phase: randRange(bRand, 0, Math.PI * 2),
          hue: ['#e7b569', '#59ada2', '#d9805f', '#948bd0', '#6cc0b4'][randInt(bRand, 0, 4)],
        });
      }
    });

    // Cross-district connecting roads between personal and org landmarks
    if (!district.isPersonal && groupRepos.length) {
      const landmark = buildings.find((b) => b.districtId === district.id);
      const personalLandmark = buildings.find((b) => b.districtId === '__personal__');
      if (landmark && personalLandmark) {
        roads.push({
          id: `${personalLandmark.id}->${landmark.id}`,
          fromId: personalLandmark.id,
          toId: landmark.id,
          tier: 'path',
          waypoints: [
            { x: personalLandmark.x, y: personalLandmark.y },
            { x: (personalLandmark.x + landmark.x) / 2, y: (personalLandmark.y + landmark.y) / 2 - 20 },
            { x: landmark.x, y: landmark.y },
          ],
        });
      }
    }
  });

  // Trees in buffer spaces between districts
  for (let i = 0; i < districts.length; i++) {
    const d = districts[i];
    const treeCount = Math.min(6, Math.max(2, Math.floor(d.radius / 40)));
    const tRand = seededRandom(`${seed}:trees:${d.id}`);
    for (let t = 0; t < treeCount; t++) {
      const angle = randRange(tRand, 0, Math.PI * 2);
      const dist = randRange(tRand, d.radius * 0.85, d.radius * 1.15);
      environmentProps.push({
        id: `prop-buffer-tree-${d.id}-${t}`,
        type: 'tree',
        x: Math.round(d.center.x + Math.cos(angle) * dist),
        y: Math.round(d.center.y + Math.sin(angle) * dist),
        districtId: d.id,
      });
    }
  }

  // 5. River Boundary, Bridge, Boat, and Construction District (AGENT.md Sections 8 & 9)
  const riverY = 490;
  const riverWidth = 140;
  const bankNorth = riverY - riverWidth / 2; // 420
  const bankSouth = riverY + riverWidth / 2; // 560

  const river: RiverFeature = {
    y: riverY,
    width: riverWidth,
    bankNorth,
    bankSouth,
    flowDirection: 'east',
  };

  const bridgeWidth = 64;
  const bridgeLength = riverWidth + 36;
  const bridge: BridgeFeature = {
    id: 'bridge-construction',
    x: -140,
    y: riverY,
    width: bridgeWidth,
    length: bridgeLength,
    bounds: {
      left: -140 - bridgeWidth / 2,
      right: -140 + bridgeWidth / 2,
      top: bankNorth - 18,
      bottom: bankSouth + 18,
    },
  };

  const boat: BoatFeature = {
    id: 'boat-ferry',
    dockTown: { x: 140, y: bankNorth },
    dockConstruction: { x: 140, y: bankSouth },
    x: 140,
    y: bankNorth + 14,
    state: 'docked_town',
    targetDock: 'town',
    progress: 0,
  };

  const safeShorePoint = { x: -140, y: bankNorth - 32 };

  const constructionDistrict: ConstructionDistrict = {
    id: 'district-construction',
    name: 'Foundry & Construction Works',
    center: { x: 0, y: 720 },
    radius: 175,
    blueprintTable: { x: 0, y: 650, label: 'Blueprint Drafting Table' },
    crane: { x: 140, y: 700 },
    foundationPlots: [
      {
        id: 'plot-alpha',
        x: -95,
        y: 725,
        width: 105,
        height: 75,
        status: 'empty',
        repoName: 'Open Foundation Plot',
      },
      {
        id: 'plot-beta',
        x: 85,
        y: 735,
        width: 95,
        height: 70,
        status: 'breaking_ground',
        repoName: 'Ground Broken — Awaiting Code',
      },
    ],
  };

  const publicRoad: PublicRoadFeature = {
    id: 'road-public-realm',
    gatePoint: { x: 380, y: arrivalPlaza.y },
    label: 'Open Source Road → Public Realm',
  };

  // Connect Arrival Plaza to River Bridge (Southbound Main Road)
  roads.push({
    id: 'road-to-bridge',
    fromId: 'node-arrival',
    toId: 'node-bridge-north',
    tier: 'main',
    waypoints: [
      { x: arrivalPlaza.x, y: arrivalPlaza.y },
      { x: arrivalPlaza.x, y: 290 },
      { x: bridge.x, y: 340 },
      { x: bridge.x, y: bankNorth },
    ],
  });

  // Road across bridge
  roads.push({
    id: 'road-bridge-span',
    fromId: 'node-bridge-north',
    toId: 'node-bridge-south',
    tier: 'main',
    waypoints: [
      { x: bridge.x, y: bankNorth },
      { x: bridge.x, y: bankSouth },
    ],
  });

  // Road from bridge south to Blueprint Table & Construction Plaza
  roads.push({
    id: 'road-bridge-to-construction',
    fromId: 'node-bridge-south',
    toId: 'node-blueprint-desk',
    tier: 'main',
    waypoints: [
      { x: bridge.x, y: bankSouth },
      { x: bridge.x, y: 620 },
      { x: constructionDistrict.blueprintTable.x, y: constructionDistrict.blueprintTable.y },
    ],
  });

  // Road from Arrival Plaza East to Public Road Gate
  roads.push({
    id: 'road-to-public-gate',
    fromId: 'node-arrival',
    toId: 'node-public-gate',
    tier: 'main',
    waypoints: [
      { x: arrivalPlaza.x, y: arrivalPlaza.y },
      { x: 200, y: arrivalPlaza.y },
      { x: publicRoad.gatePoint.x, y: publicRoad.gatePoint.y },
    ],
  });

  // Add Nav Nodes for the new infrastructure
  navNodes.push(
    { id: 'node-bridge-north', x: bridge.x, y: bankNorth, type: 'bridge' },
    { id: 'node-bridge-south', x: bridge.x, y: bankSouth, type: 'bridge' },
    { id: 'node-dock-town', x: boat.dockTown.x, y: boat.dockTown.y, type: 'boat_dock' },
    { id: 'node-dock-const', x: boat.dockConstruction.x, y: boat.dockConstruction.y, type: 'boat_dock' },
    { id: 'node-blueprint-desk', x: constructionDistrict.blueprintTable.x, y: constructionDistrict.blueprintTable.y, type: 'construction' },
    { id: 'node-public-gate', x: publicRoad.gatePoint.x, y: publicRoad.gatePoint.y, type: 'public_gate' }
  );

  // Add Construction & Environmental Props
  environmentProps.push(
    {
      id: 'prop-blueprint-desk',
      type: 'blueprint_desk',
      x: constructionDistrict.blueprintTable.x,
      y: constructionDistrict.blueprintTable.y,
      label: 'Drafting Table (Break Ground)',
    },
    {
      id: 'prop-crane',
      type: 'crane',
      x: constructionDistrict.crane.x,
      y: constructionDistrict.crane.y,
      label: 'Gantry Tower Crane',
    },
    {
      id: 'prop-scaffolding-alpha',
      type: 'scaffolding',
      x: -95,
      y: 705,
    },
    {
      id: 'prop-materials-alpha',
      type: 'materials',
      x: -35,
      y: 695,
    },
    {
      id: 'prop-lamp-construction-1',
      type: 'lamp',
      x: -30,
      y: 640,
    },
    {
      id: 'prop-lamp-construction-2',
      type: 'lamp',
      x: 30,
      y: 640,
    },
    {
      id: 'prop-gatepost-public',
      type: 'gatepost',
      x: publicRoad.gatePoint.x,
      y: publicRoad.gatePoint.y,
      label: publicRoad.label,
    }
  );

  // Sparse account breathing room: pull everything out gently
  if (sparse) {
    buildings.forEach((b) => {
      b.x = Math.round(b.x * 1.35);
      b.y = Math.round(b.y * 1.35);
      if (b.plotEntrance) {
        b.plotEntrance.x = Math.round(b.plotEntrance.x * 1.35);
        b.plotEntrance.y = Math.round(b.plotEntrance.y * 1.35);
      }
    });
  }

  // Calculate world bounds with generous town margins including southern construction
  const maxReachX = buildings.reduce(
    (m, b) => Math.max(m, Math.abs(b.x) + b.footprint * 1.5),
    460
  );
  const maxReachY = buildings.reduce(
    (m, b) => Math.max(m, Math.abs(b.y) + b.footprint * 1.5),
    460
  );
  const totalReachY = Math.max(maxReachY, 860);
  const bounds = {
    width: Math.max(1100, maxReachX * 2 + 360),
    height: Math.max(1300, totalReachY * 2 + 320),
  };

  // Calculate NavEdges
  for (const r of roads) {
    const fromNode = navNodes.find((n) => n.id === r.fromId);
    const toNode = navNodes.find((n) => n.id === r.toId);
    if (fromNode && toNode) {
      const weight = Math.hypot(fromNode.x - toNode.x, fromNode.y - toNode.y);
      navEdges.push({ fromId: fromNode.id, toId: toNode.id, weight });
      navEdges.push({ fromId: toNode.id, toId: fromNode.id, weight });
    }
  }

  return {
    seed,
    user: userWithSeed,
    districts,
    buildings,
    roads,
    avatars,
    environmentProps,
    navGraph: { nodes: navNodes, edges: navEdges },
    bounds,
    spawnPoint,
    sparse,
    river,
    bridge,
    boat,
    constructionDistrict,
    publicRoad,
    safeShorePoint,
  };
}
