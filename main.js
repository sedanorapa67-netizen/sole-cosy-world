import * as THREE from 'three';
import { CozyWorld } from './world.js';
import { SoleCharacter } from './player.js';
import { createBuildableMesh } from './blocks.js';
import { UIManager } from './ui.js';
import { SoundManager } from './audio.js';

class SoleCozyGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.sound = new SoundManager();

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.2, 160);

    this.world = new CozyWorld(this.scene);
    this.player = new SoleCharacter(this.scene);

    this.playerPos = new THREE.Vector3(0, 2, 0);
    this.playerVel = new THREE.Vector3(0, 0, 0);
    this.playerYaw = 0;
    this.camYaw = 0;
    this.camPitch = 0.32;
    this.sensitivity = 1.0;
    this.isGrounded = false;
    this.isFlying = false;
    this.isPaused = true;

    this.health = 100;
    this.stamina = 100;
    this.highestFallY = 0;

    this.keys = {};
    this.joyVec = { x: 0, y: 0 };

    this.raycaster = new THREE.Raycaster();
    this.ghostMesh = this.createGhostIndicator();
    this.scene.add(this.ghostMesh);

    this.ui = new UIManager({
      onGameStart: () => {
        this.isPaused = false;
        this.sound.playClick();
      },
      onPauseChange: (paused) => {
        this.isPaused = paused;
      },
      onModeChange: (mode) => {
        if (mode === 'survival') {
          this.isFlying = false;
          this.health = 100;
          this.stamina = 100;
          this.ui.updateSurvivalStats(this.health, this.stamina);
        }
      },
      onToggleFly: () => {
        if (this.ui.mode === 'creative') {
          this.isFlying = !this.isFlying;
          this.playerVel.y = 0;
          this.sound.playJump();
        }
      },
      onRenderDistanceChange: (dist) => {
        this.world.renderDistance = dist;
        this.world.updateChunksAround(this.playerPos);
      },
      onQualityChange: (quality) => this.applyQualityPreset(quality),
      onSensitivityChange: (sens) => {
        this.sensitivity = sens;
      },
      onAudioToggle: (enabled) => {
        this.sound.enabled = enabled;
      },
      onNewWorld: () => {
        this.world.clearAll();
        this.world.seed = Math.random() * 1000;
        this.playerPos.set(0, 3, 0);
        this.world.updateChunksAround(this.playerPos);
      },
      onJoystickMove: (x, y) => {
        this.joyVec.x = x;
        this.joyVec.y = y;
      },
      onCameraLook: (dx, dy) => {
        this.camYaw -= dx * this.sensitivity;
        this.camPitch = Math.max(-0.2, Math.min(1.15, this.camPitch + dy * this.sensitivity));
      },
      onJump: () => this.jump(),
      onPlace: () => this.placeBlock(),
      onBreak: () => this.breakBlock()
    });

    this.setupDesktopInputs();
    this.world.updateChunksAround(this.playerPos);

    this.lastTime = performance.now();
    this.fpsCounter = { frames: 0, lastCheck: performance.now() };
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  createGhostIndicator() {
    const geo = new THREE.SphereGeometry(0.32, 12, 12);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff8fa3,
      transparent: true,
      opacity: 0.65,
      wireframe: true
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    return mesh;
  }

  applyQualityPreset(quality) {
    if (quality === 'low') {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
      this.world.sunLight.castShadow = false;
    } else if (quality === 'medium') {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      this.renderer.shadowMap.enabled = true;
      this.world.sunLight.castShadow = true;
    } else {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.world.sunLight.castShadow = true;
    }
  }

  setupDesktopInputs() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Space') this.jump();
      if (e.code === 'KeyF' && this.ui.mode === 'creative') {
        this.isFlying = !this.isFlying;
      }
      if (e.code.startsWith('Digit')) {
        const num = parseInt(e.code.replace('Digit', ''), 10) - 1;
        if (num >= 0 && num < 9) {
          this.ui.selectedIndex = num;
          this.ui.renderHotbar();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (this.isPaused) return;
      if (document.pointerLockElement !== this.canvas && e.pointerType !== 'touch') {
        this.canvas.requestPointerLock?.();
      }
      if (e.button === 0) this.breakBlock();
      if (e.button === 2) this.placeBlock();
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === this.canvas && !this.isPaused) {
        this.camYaw -= e.movementX * 0.003 * this.sensitivity;
        this.camPitch = Math.max(-0.2, Math.min(1.15, this.camPitch + e.movementY * 0.003 * this.sensitivity));
      }
    });
  }

  jump() {
    if (this.isPaused) return;
    if (this.isFlying) {
      this.playerVel.y = 6.5;
      return;
    }
    if (this.isGrounded) {
      this.playerVel.y = 7.8;
      this.isGrounded = false;
      this.sound.playJump();
    }
  }

  getAimTarget() {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    this.raycaster.far = 14;
    const hits = this.raycaster.intersectObjects(this.scene.children, true);

    for (const hit of hits) {
      let obj = hit.object;
      let isPlayer = false;
      while (obj) {
        if (obj === this.player.root || obj === this.ghostMesh) {
          isPlayer = true;
          break;
        }
        obj = obj.parent;
      }
      if (!isPlayer && hit.object !== this.world.water) {
        return hit;
      }
    }
    return null;
  }

  findRootTaggedObject(obj) {
    let curr = obj;
    while (curr) {
      if (curr.userData && (curr.userData.isBuildable || curr.userData.isResource || curr.userData.isTerrain)) {
        return curr;
      }
      curr = curr.parent;
    }
    return null;
  }

  placeBlock() {
    if (this.isPaused || !this.ui.canPlaceSelected()) return;
    const hit = this.getAimTarget();
    if (!hit) return;

    const normal = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : new THREE.Vector3(0, 1, 0);
    const placePoint = hit.point.clone().addScaledVector(normal, this.world.GRID_SIZE * 0.45);
    const snapped = this.world.snapToGrid(placePoint);

    if (snapped.distanceTo(this.playerPos) < 1.1) return;

    const key = `${snapped.x.toFixed(2)},${snapped.y.toFixed(2)},${snapped.z.toFixed(2)}`;
    if (this.world.placedBlocks.has(key)) return;

    const selected = this.ui.getSelectedBlock();
    const mesh = createBuildableMesh(selected.id);
    mesh.position.copy(snapped);
    this.scene.add(mesh);
    this.world.placedBlocks.set(key, mesh);

    this.ui.consumeSelected();
    this.player.triggerAction();
    this.sound.playPlace();
  }

  breakBlock() {
    if (this.isPaused) return;
    const hit = this.getAimTarget();
    if (!hit) return;

    const target = this.findRootTaggedObject(hit.object);
    if (!target) return;

    if (target.userData.isBuildable) {
      const p = target.position;
      const key = `${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)}`;
      this.scene.remove(target);
      this.world.placedBlocks.delete(key);
      this.ui.addItem(target.userData.typeId, 1);
      this.player.triggerAction();
      this.sound.playBreak();
    } else if (target.userData.isResource) {
      this.scene.remove(target);
      this.ui.addItem(target.userData.resourceType, 3);
      this.player.triggerAction();
      this.sound.playBreak();
    }
  }

  updatePhysics(dt) {
    let moveX = this.joyVec.x;
    let moveZ = this.joyVec.y;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveZ -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveZ += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;

    const inputLen = Math.hypot(moveX, moveZ);
    if (inputLen > 1) {
      moveX /= inputLen;
      moveZ /= inputLen;
    }

    const isSprinting = this.keys['ShiftLeft'] && this.stamina > 5;
    const speed = this.isFlying ? 11 : isSprinting ? 8.2 : 5.6;

    const forward = new THREE.Vector3(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw));
    const right = new THREE.Vector3(Math.cos(this.camYaw), 0, -Math.sin(this.camYaw));

    const wishDir = new THREE.Vector3()
      .addScaledVector(forward, -moveZ)
      .addScaledVector(right, moveX);

    const horizontalSpeed = wishDir.length() * speed;
    if (wishDir.lengthSq() > 0.001) {
      wishDir.normalize();
      const targetYaw = Math.atan2(wishDir.x, wishDir.z);
      let diff = targetYaw - this.playerYaw;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.playerYaw += diff * Math.min(1, dt * 12);
    }

    this.playerPos.x += wishDir.x * speed * dt;
    this.playerPos.z += wishDir.z * speed * dt;

    if (this.isFlying) {
      if (this.keys['KeyC'] || this.keys['ControlLeft']) this.playerVel.y = -6.5;
      else this.playerVel.y *= 0.85;
      this.playerPos.y += this.playerVel.y * dt;
    } else {
      this.playerVel.y -= 20 * dt;
      this.playerPos.y += this.playerVel.y * dt;
    }

    const terrainY = this.world.getTerrainHeight(this.playerPos.x, this.playerPos.z);
    let floorY = terrainY;

    for (const block of this.world.placedBlocks.values()) {
      const dx = Math.abs(this.playerPos.x - block.position.x);
      const dz = Math.abs(this.playerPos.z - block.position.z);
      const topY = block.position.y + 0.72;
      if (dx < 0.82 && dz < 0.82 && this.playerPos.y >= topY - 0.55) {
        floorY = Math.max(floorY, topY);
      }
    }

    if (!this.isFlying && this.playerPos.y <= floorY) {
      if (!this.isGrounded && this.ui.mode === 'survival') {
        const fallDist = this.highestFallY - floorY;
        if (fallDist > 7.5) {
          this.health = Math.max(0, this.health - Math.round((fallDist - 7) * 8));
          if (this.health === 0) {
            this.playerPos.set(0, 4, 0);
            this.health = 100;
          }
        }
      }
      this.playerPos.y = floorY;
      this.playerVel.y = 0;
      this.isGrounded = true;
      this.highestFallY = floorY;
    } else {
      this.isGrounded = false;
      this.highestFallY = Math.max(this.highestFallY, this.playerPos.y);
    }

    if (this.ui.mode === 'survival') {
      if (isSprinting && horizontalSpeed > 0.5) {
        this.stamina = Math.max(0, this.stamina - dt * 14);
      } else {
        this.stamina = Math.min(100, this.stamina + dt * 8);
      }
      this.ui.updateSurvivalStats(this.health, this.stamina);
    }

    this.player.root.position.copy(this.playerPos);
    this.player.root.rotation.y = this.playerYaw;
    this.player.update(dt, horizontalSpeed, this.isGrounded, this.isFlying);

    const camDist = 6.2;
    const targetCamPos = new THREE.Vector3(
      this.playerPos.x + Math.sin(this.camYaw) * Math.cos(this.camPitch) * camDist,
      this.playerPos.y + 1.6 + Math.sin(this.camPitch) * camDist,
      this.playerPos.z + Math.cos(this.camYaw) * Math.cos(this.camPitch) * camDist
    );
    const camGround = this.world.getTerrainHeight(targetCamPos.x, targetCamPos.z) + 0.6;
    targetCamPos.y = Math.max(targetCamPos.y, camGround);

    this.camera.position.lerp(targetCamPos, Math.min(1, dt * 14));
    this.camera.lookAt(this.playerPos.x, this.playerPos.y + 1.25, this.playerPos.z);

    this.world.sunLight.position.set(this.playerPos.x + 30, 55, this.playerPos.z + 25);
    this.world.sunLight.target.position.copy(this.playerPos);
    this.world.sunLight.target.updateMatrixWorld();

    const hit = this.getAimTarget();
    if (hit) {
      const rootObj = this.findRootTaggedObject(hit.object);
      this.ui.setTargetLabel(rootObj?.userData?.name || null);
      const normal = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : new THREE.Vector3(0, 1, 0);
      const snapPos = this.world.snapToGrid(hit.point.clone().addScaledVector(normal, this.world.GRID_SIZE * 0.45));
      this.ghostMesh.position.copy(snapPos);
      this.ghostMesh.visible = true;
    } else {
      this.ui.setTargetLabel(null);
      this.ghostMesh.visible = false;
    }
  }

  animate(now) {
    requestAnimationFrame(this.animate);
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    this.fpsCounter.frames++;
    if (now - this.fpsCounter.lastCheck >= 1000) {
      document.getElementById('hud-fps').textContent = `${this.fpsCounter.frames} FPS`;
      this.fpsCounter.frames = 0;
      this.fpsCounter.lastCheck = now;
    }

    if (!this.isPaused) {
      this.updatePhysics(dt);
      this.world.updateChunksAround(this.playerPos);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new SoleCozyGame();
});
