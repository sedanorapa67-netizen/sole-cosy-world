import * as THREE from 'three';

export class SoleCharacter {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.animTime = 0;
    this.actionSwing = 0;

    this.buildModel();
    this.scene.add(this.root);
  }

  buildModel() {
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffd5c2, roughness: 0.55 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0xf3d27a, roughness: 0.5 });
    const denimMat = new THREE.MeshStandardMaterial({ color: 0x4a6fa5, roughness: 0.75 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x2b3a4a, roughness: 0.8 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const glassesMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.15,
      metalness: 0.4
    });

    this.bodyGroup = new THREE.Group();
    this.bodyGroup.position.y = 0.85;
    this.root.add(this.bodyGroup);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.36, 8, 14), denimMat);
    torso.castShadow = true;
    this.bodyGroup.add(torso);

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.055, 8, 16), denimMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.25;
    this.bodyGroup.add(collar);

    this.headGroup = new THREE.Group();
    this.headGroup.position.y = 0.58;
    this.bodyGroup.add(this.headGroup);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.31, 18, 16), skinMat);
    head.castShadow = true;
    this.headGroup.add(head);

    const blushMat = new THREE.MeshStandardMaterial({ color: 0xff9ebb, roughness: 0.7 });
    const blushL = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), blushMat);
    blushL.scale.z = 0.4;
    blushL.position.set(-0.16, -0.04, 0.27);
    const blushR = blushL.clone();
    blushR.position.x = 0.16;
    this.headGroup.add(blushL, blushR);

    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x3b2820, roughness: 0.2 });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 10), eyeMat);
    eyeL.position.set(-0.11, 0.02, 0.29);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.11;
    this.headGroup.add(eyeL, eyeR);

    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.325, 18, 16, 0, Math.PI * 2, 0, Math.PI * 0.62),
      hairMat
    );
    hairCap.rotation.x = -0.18;
    hairCap.castShadow = true;
    this.headGroup.add(hairCap);

    const bangs = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.11, 0.12), hairMat);
    bangs.position.set(0, 0.14, 0.27);
    bangs.rotation.x = 0.18;
    this.headGroup.add(bangs);

    const backHair = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.45, 8, 12), hairMat);
    backHair.position.set(0, -0.16, -0.14);
    backHair.castShadow = true;
    this.headGroup.add(backHair);

    const sideLockL = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.42, 6, 10), hairMat);
    sideLockL.position.set(-0.27, -0.15, 0.08);
    const sideLockR = sideLockL.clone();
    sideLockR.position.x = 0.27;
    this.headGroup.add(sideLockL, sideLockR);

    const glassesGroup = new THREE.Group();
    glassesGroup.position.set(0, 0.28, 0.13);
    glassesGroup.rotation.x = -0.45;

    const lensL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.04), glassesMat);
    lensL.position.x = -0.1;
    const lensR = lensL.clone();
    lensR.position.x = 0.1;
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.025, 0.04), glassesMat);
    glassesGroup.add(lensL, lensR, bridge);
    this.headGroup.add(glassesGroup);

    this.armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.34, 6, 10), denimMat);
    this.armL.position.set(-0.34, 0.04, 0);
    this.armL.castShadow = true;

    this.armR = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.34, 6, 10), denimMat);
    this.armR.position.set(0.34, 0.04, 0);
    this.armR.castShadow = true;
    this.bodyGroup.add(this.armL, this.armR);

    this.legL = new THREE.Group();
    this.legL.position.set(-0.13, 0.48, 0);
    const legMeshL = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.28, 6, 10), pantsMat);
    legMeshL.position.y = -0.15;
    const shoeL = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), shoeMat);
    shoeL.scale.set(0.9, 0.65, 1.35);
    shoeL.position.set(0, -0.36, 0.04);
    this.legL.add(legMeshL, shoeL);

    this.legR = this.legL.clone();
    this.legR.position.x = 0.13;
    this.root.add(this.legL, this.legR);
  }

  triggerAction() {
    this.actionSwing = 1.0;
  }

  update(dt, moveSpeed, isGrounded, isFlying) {
    this.animTime += dt * (moveSpeed > 0.1 ? 10 : 2.5);

    if (this.actionSwing > 0) {
      this.actionSwing = Math.max(0, this.actionSwing - dt * 4.5);
    }

    if (moveSpeed > 0.1 && isGrounded && !isFlying) {
      const swing = Math.sin(this.animTime) * 0.65;
      this.legL.rotation.x = swing;
      this.legR.rotation.x = -swing;
      this.armL.rotation.x = -swing * 0.75;
      this.armR.rotation.x = swing * 0.75 - Math.sin(this.actionSwing * Math.PI) * 1.4;
      this.bodyGroup.position.y = 0.85 + Math.abs(Math.cos(this.animTime)) * 0.06;
      this.bodyGroup.rotation.z = Math.sin(this.animTime) * 0.05;
    } else if (!isGrounded || isFlying) {
      this.legL.rotation.x = 0.35;
      this.legR.rotation.x = -0.25;
      this.armL.rotation.z = 0.45;
      this.armR.rotation.z = -0.45;
      this.armR.rotation.x = -Math.sin(this.actionSwing * Math.PI) * 1.4;
    } else {
      this.legL.rotation.x *= 0.85;
      this.legR.rotation.x *= 0.85;
      this.armL.rotation.x *= 0.85;
      this.armL.rotation.z = 0.12;
      this.armR.rotation.z = -0.12;
      this.armR.rotation.x = -Math.sin(this.actionSwing * Math.PI) * 1.4;
      this.bodyGroup.position.y = 0.85 + Math.sin(this.animTime) * 0.025;
      this.bodyGroup.rotation.z *= 0.85;
    }
  }
}
