import * as THREE from 'three';
import { DOORS, COUNTERTOPS } from '../catalogs/materials.js';
import { getCountertopTexture, getBacksplashTexture, getWoodTexture } from './textures.js';

/* =========================================================================
 * EXACT IKEA METOD U-KITCHEN BUILDER (PLACED IN SÉJOUR + CUISINE)
 * Matches the 6 IKEA drawings (20/05/2026) & TMA #5, #6, #7:
 * - North wall (Z=3.12): Fridge (60) + 3x60 Sink Run (180) + Tall Oven (60) + Recessed Corner (52)
 * - East wall (X=5.49): 20 pull-out + 60 Induction Cooktop + 75 corner return
 * - South Peninsula (Z=5.42): 250 x 120 cm half-wall (TMA #5) + 2x60 drawer bases + corner
 *   + Optional Claustra above the 120 cm half-wall!
 * ========================================================================= */

const NORTH_Z = 3.13;
const EAST_X = 5.48;
const PLINTH_H = 0.08;
const BASE_H = 0.80;
const CAB_TOP = PLINTH_H + BASE_H; // 0.88 m
const WALL_BOT = 1.48;
const WALL_H = 0.92; // 100cm IKEA tall wall cabinets to 2.40m
const HALF_WALL_Z = 5.42;
const HALF_WALL_H = 1.20;
const HALF_WALL_LEN = 2.50;
const CEIL_Y = 2.50;

export class KitchenBuilder {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.root.name = 'ikea-metod-kitchen';
    scene.add(this.root);

    this.frontSpecs = [];
    this.frontsGroup = new THREE.Group();
    this.countertopGroup = new THREE.Group();
    this.claustraGroup = new THREE.Group();
    this.root.add(this.frontsGroup, this.countertopGroup, this.claustraGroup);

    // Dynamic materials updated live on door / countertop / hardware / backsplash switch
    this.doorMat = new THREE.MeshPhysicalMaterial({ color: '#B2A593', roughness: 0.82, metalness: 0.0, envMapIntensity: 0.28 });
    this.doorAccentMat = new THREE.MeshPhysicalMaterial({ color: '#948878', roughness: 0.86, metalness: 0.0 });
    this.doorGripMat = new THREE.MeshStandardMaterial({ color: '#7D7366', roughness: 0.44, metalness: 0.46 });
    this.plinthMat = new THREE.MeshStandardMaterial({ color: '#A19584', roughness: 0.86 });
    this.hardwareMat = new THREE.MeshStandardMaterial({ color: '#1E1F22', roughness: 0.34, metalness: 0.65 });
    this.faucetMat = new THREE.MeshStandardMaterial({ color: '#1E1F22', roughness: 0.34, metalness: 0.65 });
    this.countertopMat = new THREE.MeshStandardMaterial({ color: '#F6F6F4', roughness: 0.44, metalness: 0.01 });
    this.backsplashMat = new THREE.MeshStandardMaterial({ color: '#F7F7F5', roughness: 0.82 });
    this.underCabLedMat = new THREE.MeshStandardMaterial({
      color: '#FFF6E6',
      emissive: '#FFD08E',
      emissiveIntensity: 0.85,
      roughness: 0.2
    });

    this.currentState = {
      doorId: 'havstorp-beige',
      countertopId: 'ekbacken-blanc',
      backsplash: 'white',
      hardware: 'black',
      claustraHeight: 'half',
      claustraFinish: 'oak'
    };

    this._buildStaticStructure();
    this.applyAll(this.currentState);
  }

  _regFront(spec) {
    this.frontSpecs.push(spec);
  }

  _buildStaticStructure() {
    const revealDark = new THREE.MeshStandardMaterial({ color: '#38332E', roughness: 0.94 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: '#F6F6F3', roughness: 0.90 });
    const glassBlack = new THREE.MeshStandardMaterial({ color: '#141517', roughness: 0.14, metalness: 0.35 });
    const steelMat = new THREE.MeshStandardMaterial({ color: '#C5C9CE', roughness: 0.28, metalness: 0.82 });

    const baseY = PLINTH_H + BASE_H / 2; // 0.48 m
    const wallY = WALL_BOT + WALL_H / 2; // 1.94 m

    /* ---- 1. NORTH WALL RUN (Z = 3.13, facing South +Z) ---- */
    // Freestanding / Sleek Fridge (60 x 60 x 186 cm) at X = 1.95..2.55
    const fridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.59, 1.86, 0.60),
      new THREE.MeshStandardMaterial({ color: '#D4D6D8', roughness: 0.32, metalness: 0.55 })
    );
    fridge.position.set(2.25, 0.93, NORTH_Z + 0.31);
    fridge.castShadow = true; fridge.receiveShadow = true;
    const fridgeSeam = new THREE.Mesh(new THREE.BoxGeometry(0.595, 0.008, 0.01), revealDark);
    fridgeSeam.position.set(2.25, 0.68, NORTH_Z + 0.61);
    this.root.add(fridge, fridgeSeam);

    // Base Carcass (3 x 60 cm = 180 cm: X = 2.57..4.37)
    const northBase = new THREE.Mesh(new THREE.BoxGeometry(1.80, BASE_H, 0.58), revealDark);
    northBase.position.set(3.47, baseY, NORTH_Z + 0.29);
    northBase.castShadow = true; northBase.receiveShadow = true;
    const northPlinth = new THREE.Mesh(new THREE.BoxGeometry(2.40, PLINTH_H, 0.02), this.plinthMat);
    northPlinth.position.set(3.77, PLINTH_H / 2, NORTH_Z + 0.54);
    this.root.add(northBase, northPlinth);

    // 3x60 cm Base fronts (Drawers left, Sink drawers center, Drawers right)
    [2.87, 3.47, 4.07].forEach((cx, idx) => {
      if (idx === 1) {
        this._regFront({ w: 0.594, h: 0.394, x: cx, y: PLINTH_H + 0.60, z: NORTH_Z + 0.59, rotY: 0, kind: 'drawer', gripEdge: 'top', handle: { dir: 'h', oy: 0.13 } });
        this._regFront({ w: 0.594, h: 0.394, x: cx, y: PLINTH_H + 0.20, z: NORTH_Z + 0.59, rotY: 0, kind: 'drawer', gripEdge: 'top', handle: { dir: 'h', oy: 0.13 } });
      } else {
        this._regFront({ w: 0.594, h: 0.194, x: cx, y: PLINTH_H + 0.70, z: NORTH_Z + 0.59, rotY: 0, kind: 'drawer', gripEdge: 'top', handle: { dir: 'h', oy: 0.04 } });
        this._regFront({ w: 0.594, h: 0.194, x: cx, y: PLINTH_H + 0.50, z: NORTH_Z + 0.59, rotY: 0, kind: 'drawer', gripEdge: 'top', handle: { dir: 'h', oy: 0.04 } });
        this._regFront({ w: 0.594, h: 0.394, x: cx, y: PLINTH_H + 0.20, z: NORTH_Z + 0.59, rotY: 0, kind: 'drawer', gripEdge: 'top', handle: { dir: 'h', oy: 0.13 } });
      }
    });

    // Upper Wall Cabinets (3 x 60 cm = 180 cm, 92 cm tall)
    const northUpper = new THREE.Mesh(new THREE.BoxGeometry(1.80, WALL_H, 0.36), revealDark);
    northUpper.position.set(3.47, wallY, NORTH_Z + 0.18);
    northUpper.castShadow = true; northUpper.receiveShadow = true;
    this.root.add(northUpper);
    [2.87, 3.47, 4.07].forEach((cx, i) => {
      this._regFront({
        w: 0.594, h: WALL_H - 0.006, x: cx, y: wallY, z: NORTH_Z + 0.37, rotY: 0, kind: 'wallDoor', gripEdge: 'bottom',
        handle: { dir: 'v', len: 0.14, ox: (i % 2 === 0 ? 1 : -1) * 0.24, oy: -0.32 }
      });
    });

    // Tall Built-In Oven Column (60 cm wide x 240 cm high at X = 4.37..4.97)
    const ovenCol = new THREE.Mesh(new THREE.BoxGeometry(0.60, 2.32, 0.58), revealDark);
    ovenCol.position.set(4.67, PLINTH_H + 1.16, NORTH_Z + 0.29);
    ovenCol.castShadow = true; ovenCol.receiveShadow = true;
    this.root.add(ovenCol);

    // Oven drawers below (y = 0.08..0.88)
    this._regFront({ w: 0.594, h: 0.194, x: 4.67, y: PLINTH_H + 0.70, z: NORTH_Z + 0.59, rotY: 0, kind: 'drawer', gripEdge: 'top', handle: { dir: 'h', oy: 0.04 } });
    this._regFront({ w: 0.594, h: 0.194, x: 4.67, y: PLINTH_H + 0.50, z: NORTH_Z + 0.59, rotY: 0, kind: 'drawer', gripEdge: 'top', handle: { dir: 'h', oy: 0.04 } });
    this._regFront({ w: 0.594, h: 0.394, x: 4.67, y: PLINTH_H + 0.20, z: NORTH_Z + 0.59, rotY: 0, kind: 'drawer', gripEdge: 'top', handle: { dir: 'h', oy: 0.13 } });
    // Built-in Oven (y = 0.90..1.48)
    const ovenFace = new THREE.Mesh(new THREE.BoxGeometry(0.585, 0.57, 0.025), glassBlack);
    ovenFace.position.set(4.67, 1.19, NORTH_Z + 0.595);
    const ovenHandle = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.018, 0.032), steelMat);
    ovenHandle.position.set(4.67, 1.38, NORTH_Z + 0.625);
    this.root.add(ovenFace, ovenHandle);
    // Upper cabinet above oven (y = 1.48..2.40)
    this._regFront({ w: 0.594, h: WALL_H - 0.006, x: 4.67, y: wallY, z: NORTH_Z + 0.59, rotY: 0, kind: 'wallDoor', gripEdge: 'bottom', handle: { dir: 'v', len: 0.14, ox: -0.24, oy: -0.32 } });

    // Recessed Corner Tall Pantry (TMA #7: former placard integrated at X = 4.97..5.48!)
    const cornerTall = new THREE.Mesh(new THREE.BoxGeometry(0.50, 2.32, 0.64), revealDark);
    cornerTall.position.set(5.22, PLINTH_H + 1.16, NORTH_Z + 0.32);
    this.root.add(cornerTall);
    this._regFront({ w: 0.494, h: 2.31, x: 5.22, y: PLINTH_H + 1.16, z: NORTH_Z + 0.65, rotY: 0, kind: 'door', gripEdge: 'none', handle: { dir: 'v', len: 0.16, ox: -0.19, oy: 0.0 } });

    /* ---- 2. EAST WALL RUN (X = 5.48, facing West -X, Z = 3.80..5.37) ---- */
    const eastBase = new THREE.Mesh(new THREE.BoxGeometry(0.58, BASE_H, 1.57), revealDark);
    eastBase.position.set(EAST_X - 0.29, baseY, 3.80 + 1.57 / 2);
    eastBase.castShadow = true; eastBase.receiveShadow = true;
    const eastPlinth = new THREE.Mesh(new THREE.BoxGeometry(0.02, PLINTH_H, 0.96), this.plinthMat);
    eastPlinth.position.set(EAST_X - 0.54, PLINTH_H / 2, 4.28);
    this.root.add(eastBase, eastPlinth);

    // 20cm pull-out (Z=3.80..4.00) + 60cm induction drawers (Z=4.00..4.60)
    this._regFront({ w: 0.194, h: 0.794, x: EAST_X - 0.59, y: baseY, z: 3.90, rotY: -Math.PI / 2, kind: 'door', gripEdge: 'top', handle: { dir: 'h', oy: 0.32 } });
    this._regFront({ w: 0.594, h: 0.194, x: EAST_X - 0.59, y: PLINTH_H + 0.70, z: 4.30, rotY: -Math.PI / 2, kind: 'drawer', gripEdge: 'top', handle: { dir: 'h', oy: 0.04 } });
    this._regFront({ w: 0.594, h: 0.194, x: EAST_X - 0.59, y: PLINTH_H + 0.50, z: 4.30, rotY: -Math.PI / 2, kind: 'drawer', gripEdge: 'top', handle: { dir: 'h', oy: 0.04 } });
    this._regFront({ w: 0.594, h: 0.394, x: EAST_X - 0.59, y: PLINTH_H + 0.20, z: 4.30, rotY: -Math.PI / 2, kind: 'drawer', gripEdge: 'top', handle: { dir: 'h', oy: 0.13 } });

    // East Upper Wall Cabinets (2 x 60 cm = 120 cm: Z = 4.00..5.20) + Integrated Hood
    const eastUpper = new THREE.Mesh(new THREE.BoxGeometry(0.36, WALL_H, 1.36), revealDark);
    eastUpper.position.set(EAST_X - 0.18, wallY, 4.68);
    eastUpper.castShadow = true; eastUpper.receiveShadow = true;
    this.root.add(eastUpper);
    this._regFront({ w: 0.594, h: WALL_H - 0.006, x: EAST_X - 0.37, y: wallY, z: 4.30, rotY: -Math.PI / 2, kind: 'wallDoor', gripEdge: 'bottom', handle: { dir: 'v', len: 0.14, ox: 0.24, oy: -0.32 } });
    this._regFront({ w: 0.594, h: WALL_H - 0.006, x: EAST_X - 0.37, y: wallY, z: 4.90, rotY: -Math.PI / 2, kind: 'wallDoor', gripEdge: 'bottom', handle: { dir: 'v', len: 0.14, ox: 0.24, oy: -0.32 } });

    // Under-cabinet warm LED strips (North & East runs)
    const ledNorth = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.01, 0.018), this.underCabLedMat);
    ledNorth.position.set(3.47, WALL_BOT - 0.006, NORTH_Z + 0.16);
    const ledEast = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.01, 1.24), this.underCabLedMat);
    ledEast.position.set(EAST_X - 0.16, WALL_BOT - 0.006, 4.62);
    this.root.add(ledNorth, ledEast);

    /* ---- 3. SOUTH PENINSULA + TMA #5 HALF-WALL (L250 x 120H cm!) ---- */
    // Half-wall separating Kitchen & Séjour (X = 2.98..5.48, Z = 5.42, H = 1.20 m)
    const halfWall = new THREE.Mesh(new THREE.BoxGeometry(HALF_WALL_LEN, HALF_WALL_H, 0.08), whiteMat);
    halfWall.position.set(EAST_X - HALF_WALL_LEN / 2, HALF_WALL_H / 2, HALF_WALL_Z);
    halfWall.castShadow = true; halfWall.receiveShadow = true;
    this.root.add(halfWall);

    // Peninsula Base Carcass (facing North -Z into the kitchen, X = 2.99..4.88, Z = 4.78..5.37)
    const penBase = new THREE.Mesh(new THREE.BoxGeometry(1.90, BASE_H, 0.58), revealDark);
    penBase.position.set(3.94, baseY, 5.08);
    penBase.castShadow = true; penBase.receiveShadow = true;
    const penPlinth = new THREE.Mesh(new THREE.BoxGeometry(1.88, PLINTH_H, 0.02), this.plinthMat);
    penPlinth.position.set(3.94, PLINTH_H / 2, 4.84);
    this.root.add(penBase, penPlinth);

    // Peninsula fronts facing into kitchen (rotY = Math.PI): corner door (64) + 60 drawers + 60 drawers
    this._regFront({ w: 0.62, h: 0.794, x: 4.55, y: baseY, z: 4.78, rotY: Math.PI, kind: 'door', gripEdge: 'top', handle: { dir: 'v', len: 0.14, ox: 0.24, oy: 0.24 } });
    [3.92, 3.31].forEach((cx) => {
      this._regFront({ w: 0.594, h: 0.194, x: cx, y: PLINTH_H + 0.70, z: 4.78, rotY: Math.PI, kind: 'drawer', gripEdge: 'top', handle: { dir: 'h', oy: 0.04 } });
      this._regFront({ w: 0.594, h: 0.194, x: cx, y: PLINTH_H + 0.50, z: 4.78, rotY: Math.PI, kind: 'drawer', gripEdge: 'top', handle: { dir: 'h', oy: 0.04 } });
      this._regFront({ w: 0.594, h: 0.394, x: cx, y: PLINTH_H + 0.20, z: 4.78, rotY: Math.PI, kind: 'drawer', gripEdge: 'top', handle: { dir: 'h', oy: 0.13 } });
    });
    // Left exposed cover panel of peninsula (facing West -X)
    this._regFront({ w: 0.60, h: 0.875, x: 2.985, y: 0.44, z: 5.08, rotY: -Math.PI / 2, kind: 'cover', gripEdge: 'none', handle: null });

    /* ---- 4. BACKSPLASH PANELS (CRÉDENCE) ---- */
    const bsNorth = new THREE.Mesh(new THREE.PlaneGeometry(1.82, 0.58), this.backsplashMat);
    bsNorth.position.set(3.47, 1.19, NORTH_Z + 0.012);
    const bsEast = new THREE.Mesh(new THREE.PlaneGeometry(1.56, 0.58), this.backsplashMat);
    bsEast.rotation.y = -Math.PI / 2;
    bsEast.position.set(EAST_X - 0.012, 1.19, 4.60);
    this.root.add(bsNorth, bsEast);

    /* ---- 5. RECESSED UNDERMOUNT SINK + GOOSENECK FAUCET & INDUCTION COOKTOP ---- */
    // True recessed stainless steel sink basin (opening cut cleanly into North worktop at X = 3.12..3.82, Z = 3.24..3.64!)
    const sinkMat = new THREE.MeshStandardMaterial({ color: '#AEB4BA', roughness: 0.24, metalness: 0.88 });
    const sinkDarkMat = new THREE.MeshStandardMaterial({ color: '#7D848B', roughness: 0.30, metalness: 0.85 });
    const sW = 0.70, sD = 0.40, sDepth = 0.18, sWall = 0.012;
    const sCx = 3.47, sCz = NORTH_Z + 0.31;
    const sTopY = CAB_TOP + 0.012;

    const sinkGroup = new THREE.Group();
    // Thin brushed rim flange flush with worktop
    const rimBack  = new THREE.Mesh(new THREE.BoxGeometry(sW + 0.04, 0.008, 0.02), steelMat);
    rimBack.position.set(sCx, CAB_TOP + 0.031, sCz - sD / 2 - 0.01);
    const rimFront = new THREE.Mesh(new THREE.BoxGeometry(sW + 0.04, 0.008, 0.02), steelMat);
    rimFront.position.set(sCx, CAB_TOP + 0.031, sCz + sD / 2 + 0.01);
    const rimL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.008, sD), steelMat);
    rimL.position.set(sCx - sW / 2 - 0.01, CAB_TOP + 0.031, sCz);
    const rimR = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.008, sD), steelMat);
    rimR.position.set(sCx + sW / 2 + 0.01, CAB_TOP + 0.031, sCz);

    // Recessed basin interior (bottom + 4 walls descending into sink base cabinet!)
    const sBottom = new THREE.Mesh(new THREE.BoxGeometry(sW, sWall, sD), sinkDarkMat);
    sBottom.position.set(sCx, sTopY - sDepth, sCz);
    const sDrain = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.008, 16), steelMat);
    sDrain.position.set(sCx, sTopY - sDepth + 0.008, sCz);
    const sWallN = new THREE.Mesh(new THREE.BoxGeometry(sW, sDepth, sWall), sinkMat);
    sWallN.position.set(sCx, sTopY - sDepth / 2, sCz - sD / 2);
    const sWallS = new THREE.Mesh(new THREE.BoxGeometry(sW, sDepth, sWall), sinkMat);
    sWallS.position.set(sCx, sTopY - sDepth / 2, sCz + sD / 2);
    const sWallW = new THREE.Mesh(new THREE.BoxGeometry(sWall, sDepth, sD), sinkMat);
    sWallW.position.set(sCx - sW / 2, sTopY - sDepth / 2, sCz);
    const sWallE = new THREE.Mesh(new THREE.BoxGeometry(sWall, sDepth, sD), sinkMat);
    sWallE.position.set(sCx + sW / 2, sTopY - sDepth / 2, sCz);
    sinkGroup.add(rimBack, rimFront, rimL, rimR, sBottom, sDrain, sWallN, sWallS, sWallW, sWallE);
    this.root.add(sinkGroup);

    // Gooseneck faucet
    const faucetBase = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.04, 14), this.faucetMat);
    faucetBase.position.set(3.47, CAB_TOP + 0.05, NORTH_Z + 0.065);
    const faucetStem = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.012, 0.26, 12), this.faucetMat);
    faucetStem.position.set(3.47, CAB_TOP + 0.18, NORTH_Z + 0.065);
    const faucetArch = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.011, 10, 20, Math.PI), this.faucetMat);
    faucetArch.rotation.y = Math.PI / 2;
    faucetArch.position.set(3.47, CAB_TOP + 0.31, NORTH_Z + 0.153);
    this.root.add(faucetBase, faucetStem, faucetArch);

    // 4-Zone Black Induction Cooktop on East Worktop (X = 5.16, Z = 4.30)
    const cooktop = new THREE.Mesh(new RoundedBoxGeometry(0.50, 0.010, 0.58, 2, 0.003), glassBlack);
    cooktop.position.set(EAST_X - 0.31, CAB_TOP + 0.034, 4.30);
    this.root.add(cooktop);
    const ringMat = new THREE.MeshBasicMaterial({ color: '#6E7278' });
    [[-0.12, -0.14], [0.11, -0.14], [-0.12, 0.14], [0.11, 0.14]].forEach(([dx, dz]) => {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.068, 0.074, 24), ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(EAST_X - 0.31 + dx, CAB_TOP + 0.040, 4.30 + dz);
      this.root.add(ring);
    });

    // Tag kitchen meshes for 3D point-and-edit navigation
    this.root.traverse(obj => {
      if (obj.isMesh) obj.userData.clickableKitchen = true;
    });
  }

  _rebuildFronts(doorDef) {
    clearGroupAndDispose(this.frontsGroup);
    const thick = (doorDef.thicknessMm || 16) / 1000;
    const p = doorDef.profile;

    for (const s of this.frontSpecs) {
      const g = new THREE.Group();
      g.position.set(s.x, s.y, s.z);
      g.rotation.y = s.rotY;

      // Beveled RoundedBoxGeometry door slab (catches realistic micro-highlights on edges!)
      const slabGeo = new RoundedBoxGeometry(s.w, s.h, thick, 2, 0.0025);
      const slab = new THREE.Mesh(slabGeo, this.doorMat);
      slab.castShadow = true;
      slab.receiveShadow = true;
      slab.userData.clickableKitchen = true;
      g.add(slab);

      // Authentic IKEA profile moldings
      if ((p === 'bodbyn' || p === 'stensund') && s.kind !== 'cover') {
        const rail = Math.min(0.055, s.h * 0.22);
        const stile = Math.min(0.055, s.w * 0.20);
        const insetW = s.w - stile * 2;
        const insetH = s.h - rail * 2;
        if (insetW > 0.06 && insetH > 0.05) {
          const recess = new THREE.Mesh(new THREE.BoxGeometry(insetW, insetH, 0.004), this.doorAccentMat);
          recess.position.z = thick / 2 + 0.001;
          recess.userData.clickableKitchen = true;
          g.add(recess);
          if (p === 'stensund') {
            const grooves = Math.max(2, Math.floor(insetW / 0.055));
            for (let i = 1; i < grooves; i++) {
              const gx = -insetW / 2 + (insetW * i) / grooves;
              const groove = new THREE.Mesh(new THREE.BoxGeometry(0.003, insetH - 0.008, 0.003), this.doorMat);
              groove.position.set(gx, 0, thick / 2 + 0.0025);
              g.add(groove);
            }
          }
        }
      } else if (p === 'upplov' && s.gripEdge !== 'none') {
        const gy = s.gripEdge === 'top' ? s.h / 2 - 0.008 : -s.h / 2 + 0.008;
        const grip = new THREE.Mesh(new THREE.BoxGeometry(s.w - 0.004, 0.014, thick + 0.004), this.doorGripMat);
        grip.position.set(0, gy, 0.002);
        g.add(grip);
      } else if (p === 'voxtorp' && s.gripEdge !== 'none') {
        const gy = s.gripEdge === 'top' ? s.h / 2 - 0.018 : -s.h / 2 + 0.018;
        const jPull = new THREE.Mesh(new THREE.BoxGeometry(s.w - 0.01, 0.022, 0.005), this.doorAccentMat);
        jPull.position.set(0, gy, thick / 2 + 0.001);
        g.add(jPull);
      }

      // External handles (automatically hidden for integrated handle doors like UPPLÖV / VOXTORP)
      if (s.handle && !doorDef.integratedHandle) {
        const hLen = s.handle.len || 0.15;
        const bar = s.handle.dir === 'h'
          ? new THREE.Mesh(new RoundedBoxGeometry(hLen, 0.011, 0.024, 2, 0.003), this.hardwareMat)
          : new THREE.Mesh(new RoundedBoxGeometry(0.011, hLen, 0.024, 2, 0.003), this.hardwareMat);
        bar.position.set(s.handle.ox || 0, s.handle.oy || 0, thick / 2 + 0.014);
        g.add(bar);
      }

      this.frontsGroup.add(g);
    }
  }

  _rebuildCountertops(ctDef) {
    clearGroupAndDispose(this.countertopGroup);
    const t = (ctDef.thicknessCm || 2.8) / 100;
    const cy = CAB_TOP + t / 2;
    const bevel = 0.003;

    const addSlab = (w, d, cx, cz) => {
      const m = new THREE.Mesh(new RoundedBoxGeometry(w, t, d, 2, bevel), this.countertopMat);
      m.position.set(cx, cy, cz);
      m.castShadow = true;
      m.receiveShadow = true;
      m.userData.clickableKitchen = true;
      this.countertopGroup.add(m);
    };

    // Worktop 1: North Sink Run (183 x 63.5 cm) split cleanly around the recessed 70 x 40 cm sink cutout!
    // Run X: 2.558..4.382, Z: 3.13..3.765 | Sink opening X: 3.12..3.82, Z: 3.24..3.64
    addSlab(0.562, 0.635, 2.839, NORTH_Z + 0.318); // Left of sink
    addSlab(0.562, 0.635, 4.101, NORTH_Z + 0.318); // Right of sink
    addSlab(0.704, 0.112, 3.470, NORTH_Z + 0.056); // Behind sink (faucet deck)
    addSlab(0.704, 0.125, 3.470, NORTH_Z + 0.573); // Front rail of sink

    // Worktop 2: East Cooktop Run + South Peninsula
    addSlab(0.635, 0.94, EAST_X - 0.318, 3.80 + 0.47);
    addSlab(2.50, 0.635, EAST_X - 1.25, 5.06);
  }

  _rebuildClaustra(heightMode, finishKey) {
    clearGroupAndDispose(this.claustraGroup);
    if (heightMode === 'off') return;

    const woodTex = (finishKey === 'oak' || finishKey === 'walnut') ? getWoodPbrTextures(finishKey, 1, 2) : null;
    const finMap = {
      oak:    { map: woodTex?.map, normalMap: woodTex?.normalMap, roughnessMap: woodTex?.roughnessMap, color: '#FFFFFF', roughness: 1.0 },
      walnut: { map: woodTex?.map, normalMap: woodTex?.normalMap, roughnessMap: woodTex?.roughnessMap, color: '#FFFFFF', roughness: 1.0 },
      black:  { map: null, normalMap: null, roughnessMap: null, color: '#222326', roughness: 0.52 },
      white:  { map: null, normalMap: null, roughnessMap: null, color: '#F6F6F3', roughness: 0.78 }
    };
    const f = finMap[finishKey] || finMap.oak;
    const mat = new THREE.MeshStandardMaterial({
      map: f.map,
      normalMap: f.normalMap,
      roughnessMap: f.roughnessMap,
      color: f.color,
      roughness: f.roughness
    });

    const cH = heightMode === 'full' ? (CEIL_Y - HALF_WALL_H) : 0.72;
    const startX = EAST_X - HALF_WALL_LEN + 0.08;
    const endX = EAST_X - 0.42;
    const span = endX - startX;
    const slatCount = Math.floor(span / 0.085);

    const botRail = new THREE.Mesh(new RoundedBoxGeometry(span, 0.032, 0.065, 2, 0.003), mat);
    botRail.position.set((startX + endX) / 2, HALF_WALL_H + 0.016, HALF_WALL_Z);
    const topRail = new THREE.Mesh(new RoundedBoxGeometry(span, 0.032, 0.065, 2, 0.003), mat);
    topRail.position.set((startX + endX) / 2, HALF_WALL_H + cH - 0.016, HALF_WALL_Z);
    this.claustraGroup.add(botRail, topRail);

    // Instanced vertical architectural slats (1 draw call instead of ~25!)
    const slatGeo = new RoundedBoxGeometry(0.032, cH - 0.03, 0.062, 2, 0.003);
    const inst = new THREE.InstancedMesh(slatGeo, mat, slatCount + 1);
    inst.castShadow = true;
    inst.receiveShadow = true;
    inst.userData.clickableKitchen = true;
    const dummy = new THREE.Object3D();
    for (let i = 0; i <= slatCount; i++) {
      const sx = startX + (span * i) / slatCount;
      dummy.position.set(sx, HALF_WALL_H + cH / 2, HALF_WALL_Z);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
    this.claustraGroup.add(inst);
  }

  applyDoor(doorId) {
    const def = DOORS.find(d => d.id === doorId) || DOORS[2];
    this.currentState.doorId = def.id;
    this.doorMat.color.set(def.hex);
    this.doorMat.roughness = def.materialParams.roughness;
    this.doorMat.clearcoat = def.materialParams.clearcoat;
    this.doorMat.clearcoatRoughness = def.materialParams.clearcoatRoughness;
    this.doorMat.envMapIntensity = def.materialParams.envMapIntensity;
    this.doorMat.needsUpdate = true;

    const c = new THREE.Color(def.hex).multiplyScalar(0.84);
    this.doorAccentMat.color.copy(c);
    this.plinthMat.color.set(def.plinthHex || def.hex);
    if (def.gripHex) this.doorGripMat.color.set(def.gripHex);

    this._rebuildFronts(def);
  }

  applyCountertop(ctId) {
    const def = COUNTERTOPS.find(c => c.id === ctId) || COUNTERTOPS[4];
    this.currentState.countertopId = def.id;
    const pbr = getCountertopPbrTextures(def);
    this.countertopMat.map = pbr.map;
    this.countertopMat.normalMap = pbr.normalMap || null;
    this.countertopMat.normalScale = new THREE.Vector2(0.32, 0.32);
    this.countertopMat.roughnessMap = pbr.roughnessMap || null;
    this.countertopMat.color.set('#FFFFFF');
    this.countertopMat.roughness = pbr.roughnessMap ? 1.0 : def.roughness;
    this.countertopMat.metalness = def.metalness;
    this.countertopMat.needsUpdate = true;
    this._rebuildCountertops(def);
    if (this.currentState.backsplash === 'matching') this.applyBacksplash('matching');
  }

  applyBacksplash(mode) {
    this.currentState.backsplash = mode;
    if (mode === 'matching') {
      const ctDef = COUNTERTOPS.find(c => c.id === this.currentState.countertopId) || COUNTERTOPS[4];
      const pbr = getCountertopPbrTextures(ctDef);
      this.backsplashMat.map = pbr.map;
      this.backsplashMat.normalMap = pbr.normalMap || null;
      this.backsplashMat.roughness = ctDef.roughness;
    } else {
      const pbr = getBacksplashPbrTextures(mode);
      this.backsplashMat.map = pbr.map;
      this.backsplashMat.normalMap = pbr.normalMap || null;
      this.backsplashMat.normalScale = new THREE.Vector2(0.5, 0.5);
      this.backsplashMat.roughness = mode === 'subway' ? 0.32 : 0.85;
    }
    this.backsplashMat.color.set('#FFFFFF');
    this.backsplashMat.needsUpdate = true;
  }

  applyHardware(mode) {
    this.currentState.hardware = mode;
    const cfg = {
      black: { color: '#1E1F22', roughness: 0.34, metalness: 0.65 },
      brass: { color: '#C8A156', roughness: 0.24, metalness: 0.90 },
      steel: { color: '#CFD4D9', roughness: 0.18, metalness: 0.92 }
    }[mode] || { color: '#1E1F22', roughness: 0.34, metalness: 0.65 };
    this.hardwareMat.color.set(cfg.color);
    this.hardwareMat.roughness = cfg.roughness;
    this.hardwareMat.metalness = cfg.metalness;
    this.faucetMat.color.set(cfg.color);
    this.faucetMat.roughness = cfg.roughness;
    this.faucetMat.metalness = cfg.metalness;
  }

  applyClaustra(heightMode, finishKey) {
    this.currentState.claustraHeight = heightMode;
    this.currentState.claustraFinish = finishKey;
    this._rebuildClaustra(heightMode, finishKey);
  }

  applyAll(st) {
    this.applyDoor(st.doorId);
    this.applyCountertop(st.countertopId);
    this.applyBacksplash(st.backsplash);
    this.applyHardware(st.hardware);
    this.applyClaustra(st.claustraHeight, st.claustraFinish);
  }
}
