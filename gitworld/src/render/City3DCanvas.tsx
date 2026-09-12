import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import type { CityWorldModel, CameraPerspective } from '../world/cityTypes';
import { createBuilding3D, type Building3DObject } from './three/buildingGeometry';
import { createVegetationSystem, type VegetationSystem } from './three/vegetationSystem';
import { createRoadNetwork3D, type RoadNetwork3D } from './three/roadsAndDependencies';
import { createContributorAgents, type ContributorAgentsSystem } from './three/contributorAgents';
import { createPlayerAvatar3D, type PlayerAvatar3D } from './three/playerAvatar3D';
import {
  type PlayerState,
  createInitialPlayerState,
  stepPlayerController,
} from '../world/playerController';
import { useWorldStore } from '../state/useWorldStore';

export interface City3DCanvasHandle {
  flyToBuilding: (id: string) => void;
  nudgePlayer: (dx: number, dy: number) => void;
  resetOverview: () => void;
  recenterOnPlayer: () => void;
  triggerInteraction: () => void;
  togglePerspective: () => void;
  getPerspective: () => CameraPerspective;
}

interface Props {
  world: CityWorldModel;
  selectedBuildingId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onEnter?: (id: string) => void;
  onOpenCreateRepo?: () => void;
  onOpenPublicWorld?: () => void;
  onInteractionChange?: (label: string | null) => void;
  onPerspectiveChange?: (perspective: CameraPerspective) => void;
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
    onOpenCreateRepo,
    onOpenPublicWorld,
    onInteractionChange,
    onPerspectiveChange,
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

  // Three.js object references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const buildingObjectsRef = useRef<Map<string, Building3DObject>>(new Map());
  const roadNetworkRef = useRef<RoadNetwork3D | null>(null);
  const vegetationRef = useRef<VegetationSystem | null>(null);
  const agentsRef = useRef<ContributorAgentsSystem | null>(null);
  const avatarRef = useRef<PlayerAvatar3D | null>(null);

  // Ground-based Player State
  const initialSpawn = useWorldStore.getState().playerPosition ?? world.spawnPoint;
  const playerStateRef = useRef<PlayerState>(createInitialPlayerState(initialSpawn));
  const keysRef = useRef<Set<string>>(new Set());
  const nudgeRef = useRef({ x: 0, y: 0 });
  const followPlayerRef = useRef<boolean>(true);
  const lastInteractionLabelRef = useRef<string | null>(null);
  const lastSyncTimeRef = useRef<number>(0);

  // First-Person POV and Pointer Lock State
  const perspectiveRef = useRef<CameraPerspective>('orbit');
  const fpYawRef = useRef<number>(0);
  const fpPitchRef = useRef<number>(0);
  const isPointerLockedRef = useRef<boolean>(false);

  // Camera Orbit & Pan State
  const camStateRef = useRef({
    target: new THREE.Vector3(0, 0, 0),
    spherical: new THREE.Spherical(75, Math.PI * 0.35, Math.PI * 0.25),
    targetSpherical: new THREE.Spherical(75, Math.PI * 0.35, Math.PI * 0.25),
    lookTarget: new THREE.Vector3(initialSpawn.x * SCALE, 1.2, initialSpawn.y * SCALE),
    targetLookTarget: new THREE.Vector3(initialSpawn.x * SCALE, 1.2, initialSpawn.y * SCALE),
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
    followPlayerRef.current = false; // flying to building detaches player follow temporarily

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
      nudgeRef.current.x += dx;
      nudgeRef.current.y += dy;
      followPlayerRef.current = true;
    },
    resetOverview: () => {
      followPlayerRef.current = false;
      const cam = camStateRef.current;
      cam.targetLookTarget.set(0, 0, 0);
      cam.targetSpherical.radius = 240;
      cam.targetSpherical.phi = Math.PI * 0.32;
      cam.targetSpherical.theta = Math.PI * 0.25;
      cam.isAnimatingTo = true;
    },
    recenterOnPlayer: () => {
      followPlayerRef.current = true;
      const p = playerStateRef.current.position;
      camStateRef.current.targetLookTarget.set(p.x * SCALE, 1.2, p.y * SCALE);
      camStateRef.current.targetSpherical.radius = 70;
      camStateRef.current.targetSpherical.phi = Math.PI * 0.35;
      camStateRef.current.isAnimatingTo = true;
    },
    triggerInteraction: () => {
      const interaction = playerStateRef.current.activeInteraction;
      if (interaction) {
        if (interaction.type === 'building' && onEnter) {
          onEnter(interaction.actionId);
        } else if (interaction.type === 'desk' && onOpenCreateRepo) {
          onOpenCreateRepo();
        } else if (interaction.type === 'gate' && onOpenPublicWorld) {
          onOpenPublicWorld();
        }
      }
    },
    togglePerspective: () => {
      const next: CameraPerspective = perspectiveRef.current === 'orbit' ? 'first_person' : 'orbit';
      perspectiveRef.current = next;
      if (next === 'first_person') {
        fpYawRef.current = -playerStateRef.current.facing;
        fpPitchRef.current = 0;
        canvasRef.current?.requestPointerLock?.();
      } else {
        if (document.pointerLockElement) {
          document.exitPointerLock?.();
        }
      }
      onPerspectiveChange?.(next);
    },
    getPerspective: () => perspectiveRef.current,
  }));

  // Keyboard and Proximity Interaction Handling
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!active) return;
      const target = e.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;

      const key = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
        e.preventDefault();
      }

      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        keysRef.current.add(key);
        playerStateRef.current.destination = null; // Keyboard cancels click-to-move
        followPlayerRef.current = true; // Moving re-engages camera follow
      }

      // Proximity interaction on 'E' or 'Enter'
      if (key === 'e' || key === 'enter') {
        const interaction = playerStateRef.current.activeInteraction;
        if (interaction) {
          e.preventDefault();
          if (interaction.type === 'building' && onEnter) {
            onEnter(interaction.actionId);
          } else if (interaction.type === 'desk' && onOpenCreateRepo) {
            onOpenCreateRepo();
          } else if (interaction.type === 'gate' && onOpenPublicWorld) {
            onOpenPublicWorld();
          }
        }
      }

      // 'V': Toggle between Orbit and First-Person POV (Minecraft-style)
      if (key === 'v') {
        e.preventDefault();
        const next: CameraPerspective = perspectiveRef.current === 'orbit' ? 'first_person' : 'orbit';
        perspectiveRef.current = next;
        if (next === 'first_person') {
          // Initialize yaw from character facing
          fpYawRef.current = -playerStateRef.current.facing + Math.PI / 2;
          fpPitchRef.current = 0;
          canvasRef.current?.requestPointerLock?.();
        } else {
          if (document.pointerLockElement) {
            document.exitPointerLock?.();
          }
        }
        onPerspectiveChange?.(next);
      }

      // Space or R: Recenter camera on player
      if (key === ' ' || key === 'r') {
        e.preventDefault();
        followPlayerRef.current = true;
        const p = playerStateRef.current.position;
        camStateRef.current.targetLookTarget.set(p.x * SCALE, 1.2, p.y * SCALE);
        camStateRef.current.targetSpherical.radius = 70;
        camStateRef.current.targetSpherical.phi = Math.PI * 0.35;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    const onClear = () => {
      keysRef.current.clear();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onClear);
    document.addEventListener('visibilitychange', onClear);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onClear);
      document.removeEventListener('visibilitychange', onClear);
    };
  }, [active, onEnter, onOpenCreateRepo, onOpenPublicWorld]);

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

    // Build Roads and Ground
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

    // Build Ground-Based Player Character
    const avatar = createPlayerAvatar3D(world.user.profileColorSeed ?? 42, quality);
    scene.add(avatar.group);
    scene.add(avatar.destinationMarker);
    avatarRef.current = avatar;

    // Raycaster for Hover, Selection, and Click-to-Move
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerLockChange = () => {
      const isLocked = document.pointerLockElement === canvas;
      isPointerLockedRef.current = isLocked;
      if (!isLocked && perspectiveRef.current === 'first_person') {
        // Pointer was unlocked (e.g. user pressed Esc)
      }
    };
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    const onPointerMove = (e: MouseEvent) => {
      // First-person mouse look when pointer is locked
      if (perspectiveRef.current === 'first_person' && document.pointerLockElement === canvas) {
        const mouseSensitivity = 0.0024;
        fpYawRef.current -= e.movementX * mouseSensitivity;
        fpPitchRef.current -= e.movementY * mouseSensitivity;
        // Clamp pitch between -85 deg and +85 deg (Minecraft style)
        fpPitchRef.current = Math.max(-Math.PI * 0.46, Math.min(Math.PI * 0.46, fpPitchRef.current));
        return;
      }

      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(raycastMeshes, false);

      if (intersects.length > 0) {
        const hitBuildingId = intersects[0].object.userData.buildingId as string;
        canvas.style.cursor = 'pointer';
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
        canvas.style.cursor = 'grab';
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

      // Click: Building selection or Click-to-Move on ground
      if (movedDist < 5 && e.button === 0) {
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(raycastMeshes, false);
        if (intersects.length > 0) {
          const hitBuildingId = intersects[0].object.userData.buildingId as string;
          onSelect(hitBuildingId);
        } else {
          // Raycast ground for click-to-move destination navigation
          const groundHits = raycaster.intersectObject(roads.groundMesh, false);
          if (groundHits.length > 0) {
            const hitPt = groundHits[0].point;
            const targetX = hitPt.x / SCALE;
            const targetY = hitPt.z / SCALE;
            playerStateRef.current.destination = { x: targetX, y: targetY };
            followPlayerRef.current = true;
          }
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
        // Pan manually (user takes control of camera focus)
        followPlayerRef.current = false;
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
      const dtSec = Math.min(0.064, delta);

      // 1. Gather Player Movement Input
      const keys = keysRef.current;
      let rawDx = 0;
      let rawDy = 0;

      if (keys.has('w') || keys.has('arrowup')) rawDy -= 1;
      if (keys.has('s') || keys.has('arrowdown')) rawDy += 1;
      if (keys.has('a') || keys.has('arrowleft')) rawDx -= 1;
      if (keys.has('d') || keys.has('arrowright')) rawDx += 1;

      let moveDx = 0;
      let moveDy = 0;

      if (perspectiveRef.current === 'first_person') {
        // Minecraft-style First Person Movement:
        // W/S moves forward/back along gaze yaw
        // A/D strafes left/right perpendicular to gaze yaw
        const yaw = fpYawRef.current;
        // In 2D coords: +X is right, +Y is down. In 3D: X is right, Z is down (y * SCALE).
        // Forward vector in 2D: dx = sin(yaw), dy = -cos(yaw)
        // Right strafe vector in 2D: dx = cos(yaw), dy = sin(yaw)
        const fwdX = Math.sin(yaw);
        const fwdY = -Math.cos(yaw);
        const rightX = Math.cos(yaw);
        const rightY = Math.sin(yaw);

        // rawDy is negative for W (-1), positive for S (+1)
        const forwardInput = -rawDy; // +1 when pressing W
        const strafeInput = rawDx;   // +1 when pressing D, -1 when pressing A

        moveDx = fwdX * forwardInput + rightX * strafeInput;
        moveDy = fwdY * forwardInput + rightY * strafeInput;
      } else {
        moveDx = rawDx;
        moveDy = rawDy;
      }

      moveDx += nudgeRef.current.x;
      moveDy += nudgeRef.current.y;
      nudgeRef.current.x = 0;
      nudgeRef.current.y = 0;

      // 2. Step Kinematic Player Controller (Acceleration, Collision Sliding, Proximity)
      const nextPlayerState = stepPlayerController(
        playerStateRef.current,
        { dx: moveDx, dy: moveDy },
        dtSec,
        world
      );
      playerStateRef.current = nextPlayerState;

      // 3. Update 3D Character Presentation
      avatar.update(nextPlayerState, time);

      // Hide character avatar mesh when in first-person mode
      if (perspectiveRef.current === 'first_person') {
        avatar.group.visible = false;
        avatar.destinationMarker.visible = false;
      } else {
        avatar.group.visible = true;
      }

      // 4. Proximity Interaction Feedback
      const currentInteractionLabel = nextPlayerState.activeInteraction?.label ?? null;
      if (currentInteractionLabel !== lastInteractionLabelRef.current) {
        lastInteractionLabelRef.current = currentInteractionLabel;
        onInteractionChange?.(currentInteractionLabel);
      }

      // 5. Throttled Position Synchronization to World Store
      if (time - lastSyncTimeRef.current > 0.12) {
        lastSyncTimeRef.current = time;
        useWorldStore.getState().setPlayerPosition(nextPlayerState.position, nextPlayerState.facing);
      }

      // 6. Camera Damping, Orbit & First-Person / Third-Person Follow
      const pX = nextPlayerState.position.x * SCALE;
      const pZ = nextPlayerState.position.y * SCALE;

      if (perspectiveRef.current === 'first_person') {
        // Minecraft-style First Person Camera:
        // Position at eye level (1.65m) with subtle walking head bobbing
        const isMoving = nextPlayerState.isMoving;
        const bobFrequency = 9.0;
        const bobAmountY = isMoving ? Math.sin(time * bobFrequency) * 0.045 : 0;
        const bobAmountX = isMoving ? Math.cos(time * bobFrequency * 0.5) * 0.025 : 0;

        const eyeHeight = 1.65 + bobAmountY;
        const camPosX = pX + bobAmountX;
        const camPosZ = pZ;

        camera.position.set(camPosX, eyeHeight, camPosZ);

        // Direction from fpYaw and fpPitch
        const yaw = fpYawRef.current;
        const pitch = fpPitchRef.current;

        const dirX = Math.sin(yaw) * Math.cos(pitch);
        const dirY = Math.sin(pitch);
        const dirZ = -Math.cos(yaw) * Math.cos(pitch);

        const lookAtTarget = new THREE.Vector3(camPosX + dirX, eyeHeight + dirY, camPosZ + dirZ);
        camera.lookAt(lookAtTarget);
      } else {
        // Orbit / Third-Person Follow Mode
        const cam = camStateRef.current;

        if (followPlayerRef.current) {
          // Comfortable velocity look-ahead
          const lookAheadX = (nextPlayerState.velocity.x / 230) * 1.5;
          const lookAheadZ = (nextPlayerState.velocity.y / 230) * 1.5;
          cam.targetLookTarget.set(pX + lookAheadX, 1.2, pZ + lookAheadZ);
        }

        const lerpFactor = reducedMotion ? 1 : Math.min(1, delta * 7);

        cam.spherical.radius += (cam.targetSpherical.radius - cam.spherical.radius) * lerpFactor;
        cam.spherical.theta += (cam.targetSpherical.theta - cam.spherical.theta) * lerpFactor;
        cam.spherical.phi += (cam.targetSpherical.phi - cam.spherical.phi) * lerpFactor;

        cam.lookTarget.lerp(cam.targetLookTarget, lerpFactor);

        // Compute camera position from spherical coordinates relative to lookTarget
        camera.position.setFromSpherical(cam.spherical).add(cam.lookTarget);
        camera.lookAt(cam.lookTarget);
      }

      // 7. Update World Subsystems
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
      avatar.dispose();
      bMap.forEach((obj) => {
        obj.hitBox.geometry.dispose();
        obj.highlightMesh.geometry.dispose();
      });

      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      renderer.dispose();
    };
  }, [world, active, quality, reducedMotion, cameraMode, onEnter, onHover, onSelect, onInteractionChange, onWebGLUnavailable]);

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
