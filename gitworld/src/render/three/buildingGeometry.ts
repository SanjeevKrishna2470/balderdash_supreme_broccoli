import * as THREE from 'three';
import type { CityBuilding } from '../../world/cityTypes';
import { seededRandom } from '../../world/rng';

export interface Building3DObject {
  group: THREE.Group;
  building: CityBuilding;
  hitBox: THREE.Mesh;
  highlightMesh: THREE.Mesh;
  pulseMaterials: THREE.MeshStandardMaterial[];
  update: (time: number) => void;
}

// Coordinate mapping: 2D (x, y) -> 3D (x, 0, z) where z = y * 0.2, x = x * 0.2
const SCALE = 0.22;

export function createBuilding3D(
  building: CityBuilding,
  quality: 'high' | 'balanced' | 'performance'
): Building3DObject {
  const profile = building.visualProfile;
  const rng = seededRandom(profile?.stableSeed || building.id);
  const group = new THREE.Group();
  group.name = `building-${building.id}`;
  group.position.set(building.x * SCALE, 0, building.y * SCALE);

  const style = building.style;
  const isActive = building.activity === 'active';
  const isQuiet = building.activity === 'quiet';
  const isDormant = building.activity === 'dormant';
  const ecoLevel = profile?.overgrowthLevel || 0;
  const weathering = profile?.weatheringFactor || 0;

  // Base building colors modulated by weathering
  const baseColor = new THREE.Color(style.primary);
  if (weathering > 0.3) {
    const desat = weathering * 0.45;
    baseColor.offsetHSL(0, -desat, -weathering * 0.15);
  }
  const secondaryColor = new THREE.Color(style.secondary);
  if (weathering > 0.3) {
    secondaryColor.offsetHSL(0, -weathering * 0.4, -weathering * 0.1);
  }

  // Windows emission
  let windowEmissive = new THREE.Color('#000000');
  let windowEmissiveIntensity = 0;
  let windowColor = new THREE.Color('#202235');

  if (isActive) {
    windowEmissive = new THREE.Color(style.glow).multiplyScalar(1.2);
    windowEmissiveIntensity = 1.0;
    windowColor = new THREE.Color(style.glow);
  } else if (isQuiet) {
    windowEmissive = new THREE.Color(style.glow).multiplyScalar(0.35);
    windowEmissiveIntensity = 0.35;
    windowColor = new THREE.Color('#4a5568');
  } else {
    windowColor = new THREE.Color(weathering > 0.7 ? '#1a1e24' : '#2d3748');
  }

  const facadeMat = new THREE.MeshStandardMaterial({
    color: baseColor,
    roughness: 0.5 + weathering * 0.4,
    metalness: 0.15 - weathering * 0.1,
  });

  const secondaryMat = new THREE.MeshStandardMaterial({
    color: secondaryColor,
    roughness: 0.6 + weathering * 0.3,
    metalness: 0.1,
  });

  const windowMat = new THREE.MeshStandardMaterial({
    color: windowColor,
    emissive: windowEmissive,
    emissiveIntensity: windowEmissiveIntensity,
    roughness: 0.2,
    metalness: 0.7,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#f0ece1').lerp(new THREE.Color('#646e7a'), weathering),
    roughness: 0.4,
    metalness: 0.2,
  });

  const pulseMaterials: THREE.MeshStandardMaterial[] = [windowMat];

  // Foundation / Plot
  const footprint = (building.footprint || 50) * SCALE;
  const height = Math.max(8, (building.heightPx || 60) * SCALE * 0.85);

  const plotGeo = new THREE.BoxGeometry(footprint * 1.35, 0.4, footprint * 1.35);
  const plotColor = isDormant
    ? new THREE.Color('#283329').lerp(new THREE.Color('#222030'), 1 - ecoLevel)
    : new THREE.Color('#1c1e2e');
  const plotMat = new THREE.MeshStandardMaterial({
    color: plotColor,
    roughness: 0.9,
  });
  const plotMesh = new THREE.Mesh(plotGeo, plotMat);
  plotMesh.position.y = 0.2;
  plotMesh.receiveShadow = quality !== 'performance';
  group.add(plotMesh);

  // Curb / trim around plot
  const curbGeo = new THREE.BoxGeometry(footprint * 1.38, 0.2, footprint * 1.38);
  const curbMat = new THREE.MeshStandardMaterial({ color: '#2f3448', roughness: 0.8 });
  const curbMesh = new THREE.Mesh(curbGeo, curbMat);
  curbMesh.position.y = 0.1;
  group.add(curbMesh);

  // Architectural Massing
  const grammar = profile?.massingGrammar || 'central_tower';
  const mainWidth = footprint * 0.78;
  const mainDepth = footprint * 0.78;

  if (grammar === 'stepped_setback') {
    // 3 tiers stepping up
    const t1H = height * 0.45;
    const t1 = new THREE.Mesh(new THREE.BoxGeometry(mainWidth, t1H, mainDepth), facadeMat);
    t1.position.y = 0.4 + t1H / 2;
    t1.castShadow = quality !== 'performance';
    t1.receiveShadow = quality !== 'performance';
    group.add(t1);

    const t2H = height * 0.35;
    const t2 = new THREE.Mesh(new THREE.BoxGeometry(mainWidth * 0.75, t2H, mainDepth * 0.75), secondaryMat);
    t2.position.y = 0.4 + t1H + t2H / 2;
    t2.castShadow = quality !== 'performance';
    group.add(t2);

    const t3H = height * 0.2;
    const t3 = new THREE.Mesh(new THREE.BoxGeometry(mainWidth * 0.5, t3H, mainDepth * 0.5), facadeMat);
    t3.position.y = 0.4 + t1H + t2H + t3H / 2;
    t3.castShadow = quality !== 'performance';
    group.add(t3);
  } else if (grammar === 'l_shaped') {
    const bH = height * 0.85;
    const wing1 = new THREE.Mesh(new THREE.BoxGeometry(mainWidth, bH, mainDepth * 0.45), facadeMat);
    wing1.position.set(0, 0.4 + bH / 2, -mainDepth * 0.25);
    wing1.castShadow = quality !== 'performance';
    group.add(wing1);

    const wing2 = new THREE.Mesh(new THREE.BoxGeometry(mainWidth * 0.45, bH * 0.75, mainDepth * 0.55), secondaryMat);
    wing2.position.set(-mainWidth * 0.275, 0.4 + (bH * 0.75) / 2, mainDepth * 0.2);
    wing2.castShadow = quality !== 'performance';
    group.add(wing2);
  } else if (grammar === 'terraced_pavilion') {
    const levels = 3;
    for (let i = 0; i < levels; i++) {
      const lH = (height / levels) * 0.9;
      const factor = 1 - i * 0.22;
      const tier = new THREE.Mesh(
        new THREE.BoxGeometry(mainWidth * factor, lH, mainDepth * factor),
        i % 2 === 0 ? facadeMat : secondaryMat
      );
      tier.position.y = 0.4 + i * lH + lH / 2;
      tier.castShadow = quality !== 'performance';
      group.add(tier);

      // Overhanging terrace ledge
      const ledge = new THREE.Mesh(new THREE.BoxGeometry(mainWidth * factor * 1.08, 0.2, mainDepth * factor * 1.08), trimMat);
      ledge.position.y = 0.4 + (i + 1) * lH;
      group.add(ledge);
    }
  } else if (grammar === 'modular_compound') {
    // Asymmetrical paired towers
    const t1H = height;
    const t1 = new THREE.Mesh(new THREE.BoxGeometry(mainWidth * 0.6, t1H, mainDepth * 0.6), facadeMat);
    t1.position.set(-mainWidth * 0.18, 0.4 + t1H / 2, -mainDepth * 0.15);
    t1.castShadow = quality !== 'performance';
    group.add(t1);

    const t2H = height * 0.65;
    const t2 = new THREE.Mesh(new THREE.BoxGeometry(mainWidth * 0.5, t2H, mainDepth * 0.5), secondaryMat);
    t2.position.set(mainWidth * 0.22, 0.4 + t2H / 2, mainDepth * 0.18);
    t2.castShadow = quality !== 'performance';
    group.add(t2);

    // Connecting skybridge
    const bridgeH = height * 0.18;
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(mainWidth * 0.4, bridgeH, mainDepth * 0.25), trimMat);
    bridge.position.set(0, 0.4 + height * 0.45, 0);
    group.add(bridge);
  } else {
    // central_tower (default & landmark)
    const mainBody = new THREE.Mesh(new THREE.BoxGeometry(mainWidth, height * 0.9, mainDepth), facadeMat);
    mainBody.position.y = 0.4 + (height * 0.9) / 2;
    mainBody.castShadow = quality !== 'performance';
    mainBody.receiveShadow = quality !== 'performance';
    group.add(mainBody);

    // Flanking low wings
    const wingW = mainWidth * 0.35;
    const wingH = height * 0.35;
    const wingL = new THREE.Mesh(new THREE.BoxGeometry(wingW, wingH, mainDepth * 0.8), secondaryMat);
    wingL.position.set(-mainWidth * 0.62, 0.4 + wingH / 2, 0);
    group.add(wingL);

    const wingR = new THREE.Mesh(new THREE.BoxGeometry(wingW, wingH, mainDepth * 0.8), secondaryMat);
    wingR.position.set(mainWidth * 0.62, 0.4 + wingH / 2, 0);
    group.add(wingR);
  }

  // Windows grid ribbons
  const windowRibbonsCount = Math.max(1, Math.floor(height / 3.5));
  for (let w = 0; w < windowRibbonsCount; w++) {
    const wY = 0.4 + 1.2 + w * (height / (windowRibbonsCount + 1));
    const winGeo = new THREE.BoxGeometry(mainWidth * 0.72, 0.7, mainDepth * 1.02);
    const winMesh = new THREE.Mesh(winGeo, windowMat);
    winMesh.position.y = wY;
    group.add(winMesh);
  }

  // Roof & Language Motif
  const roofTopY = 0.4 + height;
  const motif = profile?.architecturalMotif || style.motif || 'block';

  if (motif === 'spire') {
    // TypeScript vertical pinnacle
    const coneGeo = new THREE.ConeGeometry(mainWidth * 0.28, height * 0.45, 8);
    const spireMesh = new THREE.Mesh(coneGeo, secondaryMat);
    spireMesh.position.y = roofTopY + (height * 0.45) / 2;
    spireMesh.castShadow = quality !== 'performance';
    group.add(spireMesh);

    const pinGeo = new THREE.CylinderGeometry(0.1, 0.1, height * 0.3, 6);
    const pinMesh = new THREE.Mesh(pinGeo, trimMat);
    pinMesh.position.y = roofTopY + height * 0.45 + (height * 0.3) / 2;
    group.add(pinMesh);
  } else if (motif === 'dome') {
    // Python / Ruby hemispherical dome
    const domeGeo = new THREE.SphereGeometry(mainWidth * 0.36, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const domeMesh = new THREE.Mesh(domeGeo, secondaryMat);
    domeMesh.position.y = roofTopY;
    domeMesh.castShadow = quality !== 'performance';
    group.add(domeMesh);
  } else if (motif === 'peak') {
    // Rust angular pitched roof
    const peakGeo = new THREE.ConeGeometry(mainWidth * 0.42, height * 0.35, 4);
    const peakMesh = new THREE.Mesh(peakGeo, secondaryMat);
    peakMesh.rotation.y = Math.PI * 0.25;
    peakMesh.position.y = roofTopY + (height * 0.35) / 2;
    peakMesh.castShadow = quality !== 'performance';
    group.add(peakMesh);
  } else if (motif === 'silo') {
    // Go cylindrical storage tower
    const siloGeo = new THREE.CylinderGeometry(mainWidth * 0.32, mainWidth * 0.32, height * 0.3, 16);
    const siloMesh = new THREE.Mesh(siloGeo, secondaryMat);
    siloMesh.position.y = roofTopY + (height * 0.3) / 2;
    siloMesh.castShadow = quality !== 'performance';
    group.add(siloMesh);

    const capGeo = new THREE.SphereGeometry(mainWidth * 0.32, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const capMesh = new THREE.Mesh(capGeo, trimMat);
    capMesh.position.y = roofTopY + height * 0.3;
    group.add(capMesh);
  } else if (motif === 'lattice') {
    // C++ industrial exoskeleton structure
    const latticeGeo = new THREE.BoxGeometry(mainWidth * 0.7, height * 0.25, mainDepth * 0.7);
    const latticeMat = new THREE.MeshStandardMaterial({
      color: '#524b6e',
      wireframe: true,
      roughness: 0.3,
    });
    const latticeMesh = new THREE.Mesh(latticeGeo, latticeMat);
    latticeMesh.position.y = roofTopY + (height * 0.25) / 2;
    group.add(latticeMesh);
  } else if (motif === 'terrace') {
    // HTML/CSS/Swift rooftop garden terrace
    const terraceGeo = new THREE.BoxGeometry(mainWidth * 0.85, 0.4, mainDepth * 0.85);
    const terraceMesh = new THREE.Mesh(terraceGeo, trimMat);
    terraceMesh.position.y = roofTopY + 0.2;
    group.add(terraceMesh);

    // Green garden patch on roof
    const gardenGeo = new THREE.BoxGeometry(mainWidth * 0.65, 0.2, mainDepth * 0.65);
    const gardenMat = new THREE.MeshStandardMaterial({ color: '#3b6e4e', roughness: 0.9 });
    const gardenMesh = new THREE.Mesh(gardenGeo, gardenMat);
    gardenMesh.position.y = roofTopY + 0.4;
    group.add(gardenMesh);
  } else {
    // Block / modern cornice
    const corniceGeo = new THREE.BoxGeometry(mainWidth * 1.06, 0.5, mainDepth * 1.06);
    const corniceMesh = new THREE.Mesh(corniceGeo, trimMat);
    corniceMesh.position.y = roofTopY + 0.25;
    group.add(corniceMesh);
  }

  // Entrance Portal
  const doorW = mainWidth * 0.24;
  const doorH = 1.4;
  const doorGeo = new THREE.BoxGeometry(doorW, doorH, 0.3);
  const doorColor = isActive ? new THREE.Color('#f5deb3') : new THREE.Color('#1f232b');
  const doorMat = new THREE.MeshStandardMaterial({
    color: doorColor,
    emissive: isActive ? new THREE.Color(style.glow).multiplyScalar(0.4) : new THREE.Color('#000000'),
    emissiveIntensity: isActive ? 0.8 : 0,
    roughness: 0.4,
  });
  const doorMesh = new THREE.Mesh(doorGeo, doorMat);
  doorMesh.position.set(0, 0.4 + doorH / 2, mainDepth * 0.5 + 0.1);
  group.add(doorMesh);

  // Entrance Canopy / arch
  const canopyGeo = new THREE.BoxGeometry(doorW * 1.4, 0.2, 0.8);
  const canopyMesh = new THREE.Mesh(canopyGeo, trimMat);
  canopyMesh.position.set(0, 0.4 + doorH + 0.1, mainDepth * 0.5 + 0.4);
  group.add(canopyMesh);

  // Open Issues Warning Marker
  if (building.issuesShown > 0) {
    const hazardGroup = new THREE.Group();
    hazardGroup.position.set(mainWidth * 0.42, 0.4, mainDepth * 0.52);

    // Striped cone
    const coneGeo = new THREE.ConeGeometry(0.35, 1.0, 8);
    const coneMat = new THREE.MeshStandardMaterial({
      color: '#e67e22',
      emissive: '#d35400',
      emissiveIntensity: 0.6,
      roughness: 0.3,
    });
    const coneMesh = new THREE.Mesh(coneGeo, coneMat);
    coneMesh.position.y = 0.5;
    hazardGroup.add(coneMesh);

    // Hazard beacon on roof
    const beaconGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const beaconMat = new THREE.MeshStandardMaterial({
      color: '#e74c3c',
      emissive: '#e74c3c',
      emissiveIntensity: 1.2,
      roughness: 0.2,
    });
    const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    beaconMesh.position.set(mainWidth * 0.3, roofTopY + 0.5, mainDepth * 0.3);
    group.add(beaconMesh);
    pulseMaterials.push(beaconMat);

    group.add(hazardGroup);
  }

  // Pull Requests Construction (Scaffolding & Crane)
  if (building.hasConstruction) {
    const scaffoldGroup = new THREE.Group();
    scaffoldGroup.position.set(-mainWidth * 0.45, 0.4, mainDepth * 0.45);

    const frameH = height * 0.7;
    const scaffoldMat = new THREE.MeshStandardMaterial({
      color: '#d4ac0d',
      wireframe: true,
      roughness: 0.4,
    });
    const scaffoldMesh = new THREE.Mesh(new THREE.BoxGeometry(mainWidth * 0.3, frameH, mainDepth * 0.3), scaffoldMat);
    scaffoldMesh.position.y = frameH / 2;
    scaffoldGroup.add(scaffoldMesh);
    group.add(scaffoldGroup);

    // Roof construction crane
    const craneGroup = new THREE.Group();
    craneGroup.position.set(0, roofTopY, 0);

    const mastGeo = new THREE.CylinderGeometry(0.12, 0.12, height * 0.35, 6);
    const craneMat = new THREE.MeshStandardMaterial({ color: '#f39c12', roughness: 0.5 });
    const mastMesh = new THREE.Mesh(mastGeo, craneMat);
    mastMesh.position.y = (height * 0.35) / 2;
    craneGroup.add(mastMesh);

    const jibGeo = new THREE.BoxGeometry(mainWidth * 0.9, 0.18, 0.18);
    const jibMesh = new THREE.Mesh(jibGeo, craneMat);
    jibMesh.position.set(mainWidth * 0.2, height * 0.35, 0);
    craneGroup.add(jibMesh);

    group.add(craneGroup);
  }

  // Satellites for forks
  if (building.satellites && building.satellites.length > 0) {
    building.satellites.forEach((sat) => {
      const satRelX = (sat.x - building.x) * SCALE;
      const satRelZ = (sat.y - building.y) * SCALE;
      const satH = height * 0.32;
      const satW = footprint * 0.28;

      const satMesh = new THREE.Mesh(
        new THREE.BoxGeometry(satW, satH, satW),
        secondaryMat
      );
      satMesh.position.set(satRelX, 0.4 + satH / 2, satRelZ);
      satMesh.castShadow = quality !== 'performance';
      group.add(satMesh);

      // Mini roof
      const satRoof = new THREE.Mesh(
        new THREE.ConeGeometry(satW * 0.65, satH * 0.35, 4),
        facadeMat
      );
      satRoof.position.set(satRelX, 0.4 + satH + (satH * 0.35) / 2, satRelZ);
      group.add(satRoof);
    });
  }

  // Selection Highlight Mesh (an invisible or emissive contour around building)
  const highlightGeo = new THREE.BoxGeometry(mainWidth * 1.15, height * 1.05 + 1, mainDepth * 1.15);
  const highlightMat = new THREE.MeshBasicMaterial({
    color: '#60a5fa',
    wireframe: true,
    transparent: true,
    opacity: 0,
  });
  const highlightMesh = new THREE.Mesh(highlightGeo, highlightMat);
  highlightMesh.position.y = 0.4 + (height * 1.05) / 2;
  group.add(highlightMesh);

  // Raycasting Hitbox
  const hitBoxGeo = new THREE.BoxGeometry(footprint * 1.25, height + 2, footprint * 1.25);
  const hitBoxMat = new THREE.MeshBasicMaterial({ visible: false });
  const hitBox = new THREE.Mesh(hitBoxGeo, hitBoxMat);
  hitBox.position.y = (height + 2) / 2;
  hitBox.userData = { buildingId: building.id, building };
  group.add(hitBox);

  // Update loop for subtle animated pulses (active lights, hazard beacons)
  const update = (time: number) => {
    if (isActive) {
      const pulse = Math.sin(time * 2.5 + rng() * 6) * 0.15 + 1.0;
      windowMat.emissiveIntensity = windowEmissiveIntensity * pulse;
    }
  };

  return {
    group,
    building,
    hitBox,
    highlightMesh,
    pulseMaterials,
    update,
  };
}
