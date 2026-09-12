import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import type { CityWorldModel } from '../world/cityTypes';
import { createBuilding3D, type Building3DObject } from './three/buildingGeometry';
import { createVegetationSystem, type VegetationSystem } from './three/vegetationSystem';
import { createRoadNetwork3D, type RoadNetwork3D } from './three/roadsAndDependencies';
import { createContributorAgents, type ContributorAgentsSystem } from './three/contributorAgents';

export interface City3DCanvasHandle {
  flyToBuilding: (id: string) => void;
  nudgePlayer: (dx: number, dy: number) => void;
  resetOverview: () => void;
}

interface Props {
  world: CityWorldModel;
  selectedBuildingId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onEnter?: (id: string) => void;
  active?: boolean;
  quality?: 'high' | 'balanced' | 'performance';
  reducedMotion?: boolean;
  cameraMode?: 'orbit' | 'walk';
  onWebGLUnavailable?: () => void;
}

const SCALE = 0.22;

export const City3DCanvas = forwardRef<City3DCanvasHandle, Props>(function City3DCanvas(
  {
    world,
    selectedBuildingId,
    onHover,
    onSelect,
    onEnter,
    active = true,
    quality = 'balanced',
    reducedMotion = false,
    cameraMode = 'orbit',
    onWebGLUnavailable,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // References to mutable three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const buildingObjectsRef = useRef<Map<string, Building3DObject>>(new Map());
  const roadNetworkRef = useRef<RoadNetwork3D | null>(null);
  const vegetationRef = useRef<VegetationSystem | null>(null);
  const agentsRef = useRef<ContributorAgentsSystem | null>(null);

  // Camera Orbit & Pan State
  const camStateRef = useRef({
    target: new THREE.Vector3(0, 0, 0),
    spherical: new THREE.Spherical(220, Math.PI * 0.32, Math.PI * 0.25),
    targetSpherical: new THREE.Spherical(220, Math.PI * 0.32, Math.PI * 0.25),
    lookTarget: new THREE.Vector3(0, 0, 0),
    targetLookTarget: new THREE.Vector3(0, 0, 0),
    isDragging: false,
    dragButton: 0, // 0 = left orbit, 2 = right pan
    lastMouseX: 0,
    lastMouseY: 0,
    isAnimatingTo: false,
  });

  const selectedBuildingIdRef = useRef<string | null>(selectedBuildingId);
  const hoveredBuildingIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedBuildingIdRef.current = selectedBuildingId;
  }, [selectedBuildingId]);

  const flyToCoords = useCallback((x: number, z: number, distance = 70) => {
    const cam = camStateRef.current;
    cam.targetLookTarget.set(x, 0, z);

    if (reducedMotion) {
      cam.lookTarget.copy(cam.targetLookTarget);
      cam.targetSpherical.radius = distance;
      cam.spherical.radius = distance;
    } else {
      cam.targetSpherical.radius = distance;
      cam.targetSpherical.phi = Math.PI * 0.34;
      cam.isAnimatingTo = true;
    }
  }, [reducedMotion]);

  useImperativeHandle(ref, () => ({
    flyToBuilding: (id: string) => {
      const b = world.buildings.find((item) => item.id === id);
      if (b) {
        flyToCoords(b.x * SCALE, b.y * SCALE, 65);
      }
    },
    nudgePlayer: (dx: number, dy: number) => {
      const cam = camStateRef.current;
      cam.targetLookTarget.x += dx * 1.5;
      cam.targetLookTarget.z += dy * 1.5;
    },
    resetOverview: () => {
      const cam = camStateRef.current;
      cam.targetLookTarget.set(0, 0, 0);
      cam.targetSpherical.radius = 240;
      cam.targetSpherical.phi = Math.PI * 0.32;
      cam.targetSpherical.theta = Math.PI * 0.25;
      cam.isAnimatingTo = true;
    },
  }));

  // Watch selectedBuildingId prop changes
  useEffect(() => {
    if (selectedBuildingId) {
      const b = world.buildings.find((item) => item.id === selectedBuildingId);
      if (b) {
        flyToCoords(b.x * SCALE, b.y * SCALE, 65);
      }
    }

    // Update highlights
    buildingObjectsRef.current.forEach((obj, id) => {
      const mat = obj.highlightMesh.material as THREE.MeshBasicMaterial;
      if (id === selectedBuildingId) {
        mat.opacity = 0.85;
        mat.color.set('#38bdf8');
      } else if (id === hoveredBuildingIdRef.current) {
        mat.opacity = 0.5;
        mat.color.set('#fde047');
      } else {
        mat.opacity = 0;
      }
    });

    roadNetworkRef.current?.updateSelection(selectedBuildingId, hoveredBuildingIdRef.current);
  }, [selectedBuildingId, world.buildings, flyToCoords]);

  // Main Three.js Scene Lifecycle
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: quality !== 'performance',
        powerPreference: 'high-performance',
      });
    } catch {
      onWebGLUnavailable?.();
      return;
    }

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = quality !== 'performance';
    renderer.shadowMap.type = quality === 'high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality === 'high' ? 2 : 1.5));
    rendererRef.current = renderer;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#141424');
    scene.fog = new THREE.FogExp2('#141424', 0.0032);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 3000);
    cameraRef.current = camera;

    // Lighting
    const ambientLight = new THREE.HemisphereLight('#cad5e2', '#141424', 0.65);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight('#fff8eb', 1.25);
    dirLight.position.set(150, 220, 120);
    if (quality !== 'performance') {
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.width = quality === 'high' ? 2048 : 1024;
      dirLight.shadow.mapSize.height = quality === 'high' ? 2048 : 1024;
      dirLight.shadow.camera.near = 10;
      dirLight.shadow.camera.far = 600;
      const d = 250;
      dirLight.shadow.camera.left = -d;
      dirLight.shadow.camera.right = d;
      dirLight.shadow.camera.top = d;
      dirLight.shadow.camera.bottom = -d;
      dirLight.shadow.bias = -0.0004;
    }
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight('#7e92b8', 0.4);
    fillLight.position.set(-150, 90, -120);
    scene.add(fillLight);

    // Build Roads and Districts
    const roads = createRoadNetwork3D(world, quality);
    scene.add(roads.group);
    roadNetworkRef.current = roads;

    // Build 3D Buildings
    const bMap = new Map<string, Building3DObject>();
    const raycastMeshes: THREE.Mesh[] = [];

    for (const b of world.buildings) {
      const bObj = createBuilding3D(b, quality);
      scene.add(bObj.group);
      bMap.set(b.id, bObj);
      raycastMeshes.push(bObj.hitBox);
    }
    buildingObjectsRef.current = bMap;

    // Build Ecological Vegetation
    const vegetation = createVegetationSystem(world.buildings, quality);
    scene.add(vegetation.group);
    vegetationRef.current = vegetation;

    // Build Contributor Agents
    const agents = createContributorAgents(world.buildings, quality);
    scene.add(agents.group);
    agentsRef.current = agents;

    // Raycaster for Hover & Selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(raycastMeshes, false);

      if (intersects.length > 0) {
        const hitBuildingId = intersects[0].object.userData.buildingId as string;
        if (hoveredBuildingIdRef.current !== hitBuildingId) {
          hoveredBuildingIdRef.current = hitBuildingId;
          onHover(hitBuildingId);

          // Update highlights
          bMap.forEach((obj, id) => {
            const mat = obj.highlightMesh.material as THREE.MeshBasicMaterial;
            if (id === selectedBuildingIdRef.current) {
              mat.opacity = 0.85;
              mat.color.set('#38bdf8');
            } else if (id === hitBuildingId) {
              mat.opacity = 0.55;
              mat.color.set('#fde047');
            } else {
              mat.opacity = 0;
            }
          });

          roads.updateSelection(selectedBuildingIdRef.current, hitBuildingId);
        }
      } else {
        if (hoveredBuildingIdRef.current !== null) {
          hoveredBuildingIdRef.current = null;
          onHover(null);

          bMap.forEach((obj, id) => {
            const mat = obj.highlightMesh.material as THREE.MeshBasicMaterial;
            if (id === selectedBuildingIdRef.current) {
              mat.opacity = 0.85;
              mat.color.set('#38bdf8');
            } else {
              mat.opacity = 0;
            }
          });

          roads.updateSelection(selectedBuildingIdRef.current, null);
        }
      }
    };

    const onPointerDown = (e: MouseEvent) => {
      const cam = camStateRef.current;
      cam.isDragging = true;
      cam.dragButton = e.button;
      cam.lastMouseX = e.clientX;
      cam.lastMouseY = e.clientY;
      cam.isAnimatingTo = false;
    };

    const onPointerUp = (e: MouseEvent) => {
      const cam = camStateRef.current;
      const movedDist = Math.hypot(e.clientX - cam.lastMouseX, e.clientY - cam.lastMouseY);
      cam.isDragging = false;

      // Click selection
      if (movedDist < 5 && e.button === 0) {
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(raycastMeshes, false);
        if (intersects.length > 0) {
          const hitBuildingId = intersects[0].object.userData.buildingId as string;
          onSelect(hitBuildingId);
        }
      }
    };

    const onPointerDrag = (e: MouseEvent) => {
      const cam = camStateRef.current;
      if (!cam.isDragging) return;

      const dx = e.clientX - cam.lastMouseX;
      const dy = e.clientY - cam.lastMouseY;
      cam.lastMouseX = e.clientX;
      cam.lastMouseY = e.clientY;

      if (cam.dragButton === 0) {
        // Orbit
        cam.targetSpherical.theta -= dx * 0.006;
        cam.targetSpherical.phi = Math.max(0.15, Math.min(Math.PI * 0.44, cam.targetSpherical.phi - dy * 0.006));
      } else {
        // Pan
        const panSpeed = (cam.spherical.radius / 600) * 0.8;
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

        cam.targetLookTarget.addScaledVector(right, -dx * panSpeed);
        cam.targetLookTarget.addScaledVector(forward, dy * panSpeed);
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const cam = camStateRef.current;
      const zoomFactor = 1 + Math.abs(e.deltaY) * 0.0012;
      if (e.deltaY > 0) {
        cam.targetSpherical.radius = Math.min(480, cam.targetSpherical.radius * zoomFactor);
      } else {
        cam.targetSpherical.radius = Math.max(25, cam.targetSpherical.radius / zoomFactor);
      }
      if (cameraMode === 'walk') {
        cam.targetSpherical.phi = Math.max(0.35, Math.min(Math.PI * 0.46, cam.targetSpherical.phi));
      }
    };

    const onDblClick = () => {
      if (selectedBuildingIdRef.current && onEnter) {
        onEnter(selectedBuildingIdRef.current);
      }
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    canvas.addEventListener('mousemove', onPointerMove);
    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('dblclick', onDblClick);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('mousemove', onPointerDrag);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', onContextMenu);

    // Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (!active) return;

      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Camera Damping & Lerp
      const cam = camStateRef.current;
      const lerpFactor = reducedMotion ? 1 : Math.min(1, delta * 8);

      cam.spherical.radius += (cam.targetSpherical.radius - cam.spherical.radius) * lerpFactor;
      cam.spherical.theta += (cam.targetSpherical.theta - cam.spherical.theta) * lerpFactor;
      cam.spherical.phi += (cam.targetSpherical.phi - cam.spherical.phi) * lerpFactor;

      cam.lookTarget.lerp(cam.targetLookTarget, lerpFactor);

      // Compute camera position from spherical coordinates relative to lookTarget
      camera.position.setFromSpherical(cam.spherical).add(cam.lookTarget);
      camera.lookAt(cam.lookTarget);

      // Update Subsystems
      bMap.forEach((obj) => obj.update(time));
      roads.update(time);
      agents.update(time);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();

      canvas.removeEventListener('mousemove', onPointerMove);
      canvas.removeEventListener('mousedown', onPointerDown);
      canvas.removeEventListener('dblclick', onDblClick);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('mousemove', onPointerDrag);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('contextmenu', onContextMenu);

      roads.dispose();
      vegetation.dispose();
      agents.dispose();
      bMap.forEach((obj) => {
        obj.hitBox.geometry.dispose();
        obj.highlightMesh.geometry.dispose();
      });

      renderer.dispose();
    };
  }, [world, active, quality, reducedMotion, cameraMode, onEnter, onHover, onSelect, onWebGLUnavailable]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          outline: 'none',
          cursor: 'grab',
        }}
      />
    </div>
  );
});
