import * as THREE from 'three';

export class CozyWorld {
  constructor(scene, seed = Math.random() * 1000) {
    this.scene = scene;
    this.seed = seed;
    this.chunkSize = 28;
    this.chunkSegments = 22;
    this.renderDistance = 3;
    this.chunks = new Map();
    this.decorations = new Map();
    this.placedBlocks = new Map();
    this.GRID_SIZE = 1.5;

    this.setupAtmosphere();
    this.setupWater();
  }

  setupAtmosphere() {
    this.scene.background = new THREE.Color(0x9be3ff);
    this.scene.fog = new THREE.FogExp2(0xb8ecff, 0.011);

    const hemiLight = new THREE.HemisphereLight(0xfffbe6, 0x74c69d, 1.05);
    hemiLight.position.set(0, 50, 0);
    this.scene.add(hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff4d2, 1.35);
    this.sunLight.position.set(35, 60, 25);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 140;
    const d = 42;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);
  }

  setupWater() {
    const waterGeo = new THREE.PlaneGeometry(500, 500);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x4cc9f0,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.82
    });
    this.water = new THREE.Mesh(waterGeo, waterMat);
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.y = -1.35;
    this.scene.add(this.water);
  }

  getTerrainHeight(x, z) {
    const s = this.seed;
    const h1 = Math.sin((x + s) * 0.045) * Math.cos((z + s) * 0.045) * 3.8;
    const h2 = Math.sin((x - s * 0.5) * 0.11) * Math.sin((z + s * 0.3) * 0.11) * 1.1;
    const h3 = Math.cos((x + z) * 0.025) * 1.5;
    const distFromOrigin = Math.hypot(x, z);
    const spawnFlatten = Math.min(1, distFromOrigin / 14);
    return (h1 + h2 + h3) * spawnFlatten;
  }

  hash2D(x, z) {
    const n = Math.sin(x * 127.1 + z * 311.7 + this.seed) * 43758.5453123;
    return n - Math.floor(n);
  }

  createTree(x, y, z, scale = 1) {
    const tree = new THREE.Group();

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0xa47148, roughness: 0.85 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.36, 1.8, 10), trunkMat);
    trunk.position.y = 0.9;
    trunk.castShadow = true;
    tree.add(trunk);

    const leafColors = [0x70e000, 0x9ef01a, 0x52b788];
    const leafColor = leafColors[Math.floor(this.hash2D(x, z) * leafColors.length)];
    const leafMat = new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.65 });

    const puffs = [
      [0, 2.3, 0, 1.25],
      [-0.65, 1.9, 0.4, 0.85],
      [0.65, 1.95, -0.35, 0.9],
      [0.1, 2.85, 0.1, 0.8]
    ];

    for (const [px, py, pz, r] of puffs) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 12), leafMat);
      puff.position.set(px, py, pz);
      puff.castShadow = true;
      puff.receiveShadow = true;
      tree.add(puff);
    }

    tree.position.set(x, y - 0.15, z);
    tree.scale.setScalar(scale);
    tree.userData = { isResource: true, resourceType: 'wood_log', name: 'Albero Morbido' };
    return tree;
  }

  createSmoothRock(x, y, z) {
    const rockMat = new THREE.MeshStandardMaterial({ color: 0xcad2c5, roughness: 0.8 });
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75, 1), rockMat);
    rock.scale.set(1.2, 0.75, 1.0);
    rock.position.set(x, y + 0.25, z);
    rock.castShadow = true;
    rock.receiveShadow = true;
    rock.userData = { isResource: true, resourceType: 'cobble_soft', name: 'Masso Levigato' };
    return rock;
  }

  generateChunk(cx, cz) {
    const key = `${cx},${cz}`;
    if (this.chunks.has(key)) return;

    const size = this.chunkSize;
    const segs = this.chunkSegments;
    const geom = new THREE.PlaneGeometry(size, size, segs, segs);
    geom.rotateX(-Math.PI / 2);

    const pos = geom.attributes.position;
    const colors = [];
    const cGrass = new THREE.Color(0x80ed99);
    const cHill = new THREE.Color(0x57cc99);
    const cSand = new THREE.Color(0xffe599);

    const worldOffsetX = cx * size;
    const worldOffsetZ = cz * size;

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i) + worldOffsetX;
      const vz = pos.getZ(i) + worldOffsetZ;
      const vy = this.getTerrainHeight(vx, vz);
      pos.setY(i, vy);

      const col = new THREE.Color();
      if (vy < -0.75) {
        col.copy(cSand);
      } else if (vy < 1.8) {
        col.copy(cGrass).lerp(cHill, Math.max(0, vy / 3));
      } else {
        col.copy(cHill);
      }
      colors.push(col.r, col.g, col.b);
    }

    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geom.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.02
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(worldOffsetX, 0, worldOffsetZ);
    mesh.receiveShadow = true;
    mesh.userData = { isTerrain: true, name: 'Prato Morbido' };

    this.scene.add(mesh);
    this.chunks.set(key, mesh);

    const chunkDecos = [];
    for (let step = 0; step < 6; step++) {
      const rx = worldOffsetX + (this.hash2D(cx * 13 + step, cz * 7) - 0.5) * (size - 4);
      const rz = worldOffsetZ + (this.hash2D(cx * 5, cz * 19 + step) - 0.5) * (size - 4);
      const ry = this.getTerrainHeight(rx, rz);

      if (ry > -0.3 && Math.hypot(rx, rz) > 4.5) {
        if (step % 3 === 0) {
          const rock = this.createSmoothRock(rx, ry, rz);
          this.scene.add(rock);
          chunkDecos.push(rock);
        } else {
          const scale = 0.85 + this.hash2D(rx, rz) * 0.45;
          const tree = this.createTree(rx, ry, rz, scale);
          this.scene.add(tree);
          chunkDecos.push(tree);
        }
      }
    }
    this.decorations.set(key, chunkDecos);
  }

  updateChunksAround(playerPos) {
    const cx = Math.round(playerPos.x / this.chunkSize);
    const cz = Math.round(playerPos.z / this.chunkSize);

    const activeKeys = new Set();
    for (let x = cx - this.renderDistance; x <= cx + this.renderDistance; x++) {
      for (let z = cz - this.renderDistance; z <= cz + this.renderDistance; z++) {
        const key = `${x},${z}`;
        activeKeys.add(key);
        this.generateChunk(x, z);
      }
    }

    for (const [key, mesh] of this.chunks.entries()) {
      if (!activeKeys.has(key)) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
        this.chunks.delete(key);

        const decos = this.decorations.get(key) || [];
        for (const d of decos) this.scene.remove(d);
        this.decorations.delete(key);
      }
    }
  }

  snapToGrid(point) {
    const g = this.GRID_SIZE;
    return new THREE.Vector3(
      Math.round(point.x / g) * g,
      Math.round(point.y / g) * g,
      Math.round(point.z / g) * g
    );
  }

  clearAll() {
    for (const mesh of this.chunks.values()) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
    this.chunks.clear();

    for (const decos of this.decorations.values()) {
      for (const d of decos) this.scene.remove(d);
    }
    this.decorations.clear();

    for (const block of this.placedBlocks.values()) {
      this.scene.remove(block);
    }
    this.placedBlocks.clear();
  }
}
