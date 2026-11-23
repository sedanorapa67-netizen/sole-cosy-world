import * as THREE from 'three';

export const BLOCK_TYPES = [
  {
    id: 'grass_mound',
    name: 'Zolla Erba',
    icon: '🌱',
    color: 0x7ed957,
    shape: 'rounded_box',
    light: false
  },
  {
    id: 'wood_log',
    name: 'Legno Caldo',
    icon: '🪵',
    color: 0xc68b59,
    shape: 'rounded_box',
    light: false
  },
  {
    id: 'cobble_soft',
    name: 'Pietra Liscia',
    icon: '🪨',
    color: 0xb8c0c8,
    shape: 'rounded_box',
    light: false
  },
  {
    id: 'pastel_wall',
    name: 'Muro Crema',
    icon: '🧱',
    color: 0xfff1d0,
    shape: 'rounded_box',
    light: false
  },
  {
    id: 'cozy_roof',
    name: 'Tetto Corallo',
    icon: '🏠',
    color: 0xff758f,
    shape: 'roof',
    light: false
  },
  {
    id: 'crystal_glass',
    name: 'Vetro Cielo',
    icon: '🪟',
    color: 0xa0e7e5,
    shape: 'glass',
    light: false
  },
  {
    id: 'fence_post',
    name: 'Staccionata',
    icon: '🚧',
    color: 0xe6ccb2,
    shape: 'fence',
    light: false
  },
  {
    id: 'lantern',
    name: 'Lanterna',
    icon: '🏮',
    color: 0xffd166,
    shape: 'lantern',
    light: true
  },
  {
    id: 'flower_patch',
    name: 'Fiori Rosa',
    icon: '🌸',
    color: 0xffafcc,
    shape: 'flowers',
    light: false
  }
];

function createSmoothCubeGeometry(size = 1.4, radius = 0.24) {
  const shape = new THREE.Shape();
  const half = size / 2 - radius;
  shape.moveTo(-half, -half - radius);
  shape.lineTo(half, -half - radius);
  shape.quadraticCurveTo(half + radius, -half - radius, half + radius, -half);
  shape.lineTo(half + radius, half);
  shape.quadraticCurveTo(half + radius, half + radius, half, half + radius);
  shape.lineTo(-half, half + radius);
  shape.quadraticCurveTo(-half - radius, half + radius, -half - radius, half);
  shape.lineTo(-half - radius, -half);
  shape.quadraticCurveTo(-half - radius, -half - radius, -half, -half - radius);

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: size - radius * 2,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: radius,
    bevelThickness: radius
  });
  geom.center();
  geom.computeVertexNormals();
  return geom;
}

const sharedRoundedGeom = createSmoothCubeGeometry(1.45, 0.25);

export function createBuildableMesh(typeId) {
  const def = BLOCK_TYPES.find((b) => b.id === typeId) || BLOCK_TYPES[0];
  const group = new THREE.Group();

  if (def.shape === 'rounded_box') {
    const mat = new THREE.MeshStandardMaterial({
      color: def.color,
      roughness: 0.72,
      metalness: 0.05
    });
    const mesh = new THREE.Mesh(sharedRoundedGeom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  } else if (def.shape === 'glass') {
    const mat = new THREE.MeshStandardMaterial({
      color: def.color,
      roughness: 0.2,
      transparent: true,
      opacity: 0.62
    });
    const mesh = new THREE.Mesh(sharedRoundedGeom, mat);
    group.add(mesh);
  } else if (def.shape === 'roof') {
    const mat = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.65 });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.15, 1.35, 6), mat);
    cone.rotation.y = Math.PI / 6;
    cone.castShadow = true;
    cone.receiveShadow = true;
    group.add(cone);
  } else if (def.shape === 'fence') {
    const mat = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.75 });
    const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 1.3, 10), mat);
    post1.position.x = -0.45;
    const post2 = post1.clone();
    post2.position.x = 0.45;
    const bar1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 8), mat);
    bar1.rotation.z = Math.PI / 2;
    bar1.position.y = 0.25;
    const bar2 = bar1.clone();
    bar2.position.y = -0.2;
    group.add(post1, post2, bar1, bar2);
  } else if (def.shape === 'lantern') {
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x6d597a, roughness: 0.6 });
    const glowMat = new THREE.MeshStandardMaterial({
      color: def.color,
      emissive: 0xffb703,
      emissiveIntensity: 0.85,
      roughness: 0.3
    });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 1.1, 10), baseMat);
    pole.position.y = -0.2;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 14), glowMat);
    bulb.position.y = 0.42;
    group.add(pole, bulb);
  } else if (def.shape === 'flowers') {
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x52b788 });
    const petalColors = [0xffafcc, 0xffd166, 0xbde0fe, 0xffffff];
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const dist = i === 0 ? 0 : 0.38;
      const fx = Math.cos(angle) * dist;
      const fz = Math.sin(angle) * dist;

      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.45, 6), stemMat);
      stem.position.set(fx, -0.45, fz);

      const petalMat = new THREE.MeshStandardMaterial({
        color: petalColors[i % petalColors.length],
        roughness: 0.5
      });
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), petalMat);
      head.scale.y = 0.55;
      head.position.set(fx, -0.2, fz);
      group.add(stem, head);
    }
  }

  group.userData = { isBuildable: true, typeId: def.id, name: def.name };
  return group;
}
