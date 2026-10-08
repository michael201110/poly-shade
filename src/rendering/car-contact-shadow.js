import { classifyMaterial, isReplayGhost } from "../materials.js";

const SHADOW_FRAGMENT = `
varying vec2 vUv;
uniform float opacity;
void main(){
  float r=length(vUv*2.0-1.0);
  float alpha=(1.0-smoothstep(0.12,1.0,r))*opacity;
  gl_FragColor=vec4(vec3(0.025,0.035,0.05),alpha);
}`;

const SHADOW_VERTEX = `
varying vec2 vUv;
void main(){
  vUv=uv;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
}`;

const FLOOR_KINDS = new Set(["road", "grass", "concrete"]);

function materialsOf(mesh) {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

function belongsTo(node, root) {
  for (; node; node = node.parent) if (node === root) return true;
  return false;
}

// A small, depth-tested contact shadow preserves the car's grounding when a
// roof already blocks the directional sun shadow map.
export class CarContactShadow {
  constructor(three, scene) {
    this.three = three;
    this.scene = scene;
    this.candidates = [];
    this.floorMeshes = [];
    this.cameraPosition = new three.Vector3();
    this.carPosition = new three.Vector3();
    this.rayOrigin = new three.Vector3();
    this.down = new three.Vector3(0, -1, 0);
    this.normal = new three.Vector3();
    this.planeNormal = new three.Vector3(0, 0, 1);
    this.raycaster = new three.Raycaster();
    this.geometry = new three.CircleGeometry(1, 32);
    this.material = new three.ShaderMaterial({
      name: "PolyShade car contact shadow",
      uniforms: { opacity: { value: 0.28 } },
      vertexShader: SHADOW_VERTEX,
      fragmentShader: SHADOW_FRAGMENT,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
    });
    this.mesh = new three.Mesh(this.geometry, this.material);
    this.mesh.name = "PolyShade car contact shadow";
    this.mesh.userData.polyShadeOwned = true;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    this.mesh.scale.set(1.15, 1.75, 1);
    this.mesh.visible = false;
    scene.add(this.mesh);
    this.lastRayAt = 0;
  }

  scan(camera, settings) {
    this.candidates.length = 0;
    this.floorMeshes.length = 0;
    if (!settings.carContactShadowEnabled) {
      this.mesh.visible = false;
      return;
    }
    this.scene.traverse((object) => {
      if (!object.isMesh || object.userData?.polyShadeOwned || !object.visible)
        return;
      const materials = materialsOf(object);
      if (
        materials.some(
          (material) =>
            isReplayGhost(object, material) ||
            material?.transparent ||
            material?.opacity < 0.98,
        )
      )
        return;
      if (materials.some((material) => material?.name === "BrakeLight"))
        this.candidates.push(object);
      if (
        materials.some((material) => FLOOR_KINDS.has(classifyMaterial(object, material)))
      )
        this.floorMeshes.push(object);
    });
    this.selectCar(camera);
  }

  selectCar(camera) {
    if (!this.candidates.length) {
      this.car = null;
      this.mesh.visible = false;
      return;
    }
    if (camera?.getWorldPosition) camera.getWorldPosition(this.cameraPosition);
    else this.cameraPosition.copy(camera?.position ?? this.cameraPosition);
    const cameraPosition = this.cameraPosition;
    let best = null,
      bestDistance = Infinity;
    for (const candidate of this.candidates) {
      candidate.getWorldPosition(this.carPosition);
      const distance = this.carPosition.distanceToSquared(cameraPosition);
      if (distance < bestDistance) {
        best = candidate;
        bestDistance = distance;
      }
    }
    this.car = best;
  }

  update(settings, now, camera) {
    if (!settings.carContactShadowEnabled || !this.car?.visible) {
      this.mesh.visible = false;
      return;
    }
    if (now - this.lastRayAt < 120) return;
    this.lastRayAt = now;
    this.car.getWorldPosition(this.carPosition);
    this.rayOrigin.copy(this.carPosition);
    this.rayOrigin.y += 0.15;
    this.raycaster.set(this.rayOrigin, this.down);
    this.raycaster.far = 10;
    const hits = this.raycaster.intersectObjects(this.floorMeshes, false);
    let hit = null;
    for (const entry of hits) {
      if (belongsTo(entry.object, this.car) || entry.object.userData?.polyShadeOwned || !entry.face?.normal)
        continue;
      this.normal.copy(entry.face.normal).transformDirection(entry.object.matrixWorld);
      if (this.normal.y < 0.45) continue;
      hit = entry;
      break;
    }
    if (!hit) {
      this.mesh.visible = false;
      return;
    }
    this.mesh.position.copy(hit.point);
    this.mesh.position.addScaledVector(this.normal, 0.018);
    this.mesh.quaternion.setFromUnitVectors(this.planeNormal, this.normal);
    this.mesh.visible = true;
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
    this.candidates.length = 0;
    this.floorMeshes.length = 0;
    this.car = null;
  }
}
