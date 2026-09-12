import * as THREE from 'three';
import type { CityBuilding } from '../../world/cityTypes';
import { seededRandom, randRange } from '../../world/rng';

const SCALE = 0.22;

export interface ContributorAgentsSystem {
  group: THREE.Group;
  update: (time: number) => void;
  dispose: () => void;
}

interface AgentData {
  centerX: number;
  centerZ: number;
  radius: number;
  speed: number;
  phase: number;
  baseY: number;
}

export function createContributorAgents(
  buildings: CityBuilding[],
  quality: 'high' | 'balanced' | 'performance'
): ContributorAgentsSystem {
  const group = new THREE.Group();
  group.name = 'contributor-agents';

  const activeBuildings = buildings.filter((b) => b.activity === 'active' && b.contributorCount > 0);
  const agentList: AgentData[] = [];

  for (const b of activeBuildings) {
    const bX = b.x * SCALE;
    const bZ = b.y * SCALE;
    const footprint = (b.footprint || 50) * SCALE;
    const rng = seededRandom(`agent:${b.id}`);

    const count = quality === 'performance' ? 1 : Math.min(b.contributorCount, quality === 'balanced' ? 2 : 4);

    for (let i = 0; i < count; i++) {
      agentList.push({
        centerX: bX,
        centerZ: bZ,
        radius: footprint * 0.65 + randRange(rng, 0.5, 2.5),
        speed: randRange(rng, 0.4, 0.9) * (rng() > 0.5 ? 1 : -1),
        phase: randRange(rng, 0, Math.PI * 2),
        baseY: 0.25,
      });
    }
  }

  const totalAgents = agentList.length;
  if (totalAgents === 0) {
    return {
      group,
      update: () => {},
      dispose: () => {},
    };
  }

  // Torso (cylinder) + Head (sphere)
  const dummy = new THREE.Object3D();

  const torsoGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.7, 6);
  torsoGeo.translate(0, 0.35, 0);
  const torsoMat = new THREE.MeshStandardMaterial({
    color: '#38bdf8',
    roughness: 0.5,
  });
  const torsoMesh = new THREE.InstancedMesh(torsoGeo, torsoMat, totalAgents);
  torsoMesh.castShadow = quality === 'high';
  group.add(torsoMesh);

  const headGeo = new THREE.SphereGeometry(0.2, 8, 6);
  headGeo.translate(0, 0.85, 0);
  const headMat = new THREE.MeshStandardMaterial({
    color: '#fde047',
    roughness: 0.4,
  });
  const headMesh = new THREE.InstancedMesh(headGeo, headMat, totalAgents);
  group.add(headMesh);

  const update = (time: number) => {
    for (let i = 0; i < totalAgents; i++) {
      const agent = agentList[i];
      const theta = agent.phase + time * agent.speed;
      const x = agent.centerX + Math.cos(theta) * agent.radius;
      const z = agent.centerZ + Math.sin(theta) * agent.radius;
      // Gentle bobbing walking motion
      const bob = Math.abs(Math.sin(time * 6 + agent.phase)) * 0.08;

      dummy.position.set(x, agent.baseY + bob, z);
      dummy.rotation.y = -theta + Math.PI / 2;
      dummy.updateMatrix();

      torsoMesh.setMatrixAt(i, dummy.matrix);
      headMesh.setMatrixAt(i, dummy.matrix);
    }
    torsoMesh.instanceMatrix.needsUpdate = true;
    headMesh.instanceMatrix.needsUpdate = true;
  };

  const dispose = () => {
    torsoGeo.dispose();
    torsoMat.dispose();
    torsoMesh.dispose();
    headGeo.dispose();
    headMat.dispose();
    headMesh.dispose();
  };

  return {
    group,
    update,
    dispose,
  };
}
