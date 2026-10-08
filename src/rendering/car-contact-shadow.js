import { ReceiverIndex } from "./receiver-index.js";
import { classifyMaterial, isReplayGhost } from "../materials.js";

const SHADOW_FRAGMENT = `
varying vec2 vUv;
uniform float opacity;
void main(){
  float r=length(vUv*2.0-1.0);
  float alpha=(1.0-smoothstep(0.12,1.0,r))*opacity;
  if(alpha<0.002) discard;
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
    this.raycaster = new three.Raycaster();
    this.geometry = new three.PlaneGeometry(2, 2);
    this.instanceMatrix = new three.Matrix4();
    this.carUp = new three.Vector3();
    this.carQuaternion = new three.Quaternion();
    this.groundPoint = new three.Vector3();
    this.groundNormal = new three.Vector3();
    this.hits = [];
    this.hasGround = false;
    this.receiver = null;
    this.rayQueries = 0;
    this.narrowQueries = 0;
    this.receiverIndex = new ReceiverIndex(three);
    this.material = new three.ShaderMaterial({
      name: "PolyShade car contact shadow",
      uniforms: { opacity: { value: 0 } },
      vertexShader: SHADOW_VERTEX,
      fragmentShader: SHADOW_FRAGMENT,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
    });
    this.proxy = new three.Mesh(this.geometry, this.material);
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
    this.lastRayAt = -Infinity;
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
        !materials.some((material) => material?.name === "BrakeLight") &&
        (object.isInstancedMesh || materials.some((material) => FLOOR_KINDS.has(classifyMaterial(object, material))))
      )
        this.floorMeshes.push(object);
    });
    this.receiverIndex.scan(this.floorMeshes);
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
    if (this.car !== best) { this.receiver = null; this.hasGround = false; this.lastRayAt = -Infinity; }
    this.car = best;
  }

  update(settings, now, camera) {
    if (!settings.carContactShadowEnabled || !this.car?.visible) {
      this.mesh.visible = false;
      return;
    }
    this.receiverIndex.build();
    this.car.getWorldPosition(this.carPosition);
    this.car.getWorldQuaternion(this.carQuaternion);
    this.carUp.set(0, 1, 0).applyQuaternion(this.carQuaternion);
    this.down.copy(this.carUp).negate();
    this.rayOrigin.copy(this.carPosition).addScaledVector(this.carUp, 0.3);
    this.raycaster.set(this.rayOrigin, this.down);
    this.raycaster.far = 3;
    // Raycast the previously contacted instance first. This avoids testing the
    // entire track on every moving frame and follows ramps without stale blobs.
    this.hits.length = 0;
    if (this.receiver?.parent) {
      const { receiver, instanceId } = this;
      if (receiver.isInstancedMesh && instanceId !== undefined) {
        receiver.getMatrixAt(instanceId, this.instanceMatrix);
        this.proxy.geometry = receiver.geometry;
        this.proxy.material = receiver.material;
        this.proxy.matrixWorld.multiplyMatrices(receiver.matrixWorld, this.instanceMatrix);
        this.raycaster.intersectObject(this.proxy, false, this.hits);
      } else this.raycaster.intersectObject(receiver, false, this.hits);
    }
    if (!this.hits.length && now - this.lastRayAt >= 60) {
      this.lastRayAt = now;
      this.rayQueries++;
      const nearby = this.receiverIndex.query(this.raycaster.ray, this.raycaster.far);
      const start = performance.now();
      // Resume a crowded cell across queries. Bound narrow-phase work so even
      // overlapping custom-track instances cannot monopolize a moving frame.
      if (!this.previousNearby || nearby.length !== this.previousNearby.length ||
          nearby.some((value, i) => value.entry !== this.previousNearby[i])) this.searchCursor = 0;
      this.previousNearby = nearby.map(value => value.entry);
      for (let tested = 0; tested < Math.min(32, nearby.length); tested++) {
        if (tested && performance.now() - start >= 2) break;
        const { mesh, instanceId } = nearby[this.searchCursor % nearby.length].entry;
        this.searchCursor = (this.searchCursor + 1) % nearby.length;
        this.narrowQueries++;
        const begin = this.hits.length;
        if (mesh.isInstancedMesh) {
          mesh.getMatrixAt(instanceId, this.instanceMatrix);
          this.proxy.geometry = mesh.geometry; this.proxy.material = mesh.material;
          this.proxy.matrixWorld.multiplyMatrices(mesh.matrixWorld, this.instanceMatrix);
          this.raycaster.intersectObject(this.proxy, false, this.hits);
          for (let i = begin; i < this.hits.length; i++) {
            this.hits[i].object = mesh; this.hits[i].instanceId = instanceId;
          }
        } else this.raycaster.intersectObject(mesh, false, this.hits);
      }
      this.hits.sort((a,b) => a.distance-b.distance);
    }
    let hit = null;
    for (const entry of this.hits) {
      if (belongsTo(entry.object, this.car) || entry.object.userData?.polyShadeOwned || !entry.face?.normal)
        continue;
      this.normal.copy(entry.face.normal);
      if (entry.object.isInstancedMesh && entry.instanceId !== undefined) {
        entry.object.getMatrixAt(entry.instanceId, this.instanceMatrix);
        this.normal.transformDirection(this.instanceMatrix);
      }
      this.normal.transformDirection(entry.object.matrixWorld);
      if (this.normal.dot(this.carUp) < 0.45) continue;
      hit = entry;
      break;
    }
    if (hit) {
      this.groundPoint.copy(hit.point);
      this.groundNormal.copy(this.normal);
      this.hasGround = true;
      if (hit.object !== this.proxy) {
        this.receiver = hit.object;
        this.instanceId = hit.instanceId;
      }
    } else {
      // No extrapolated shadow through gaps or while jumping.
      this.hasGround = false;
      this.mesh.visible = false;
      return;
    }
    const height = this.rayOrigin.copy(this.carPosition).sub(this.groundPoint).dot(this.groundNormal);
    // The native sun shadow can look strong while airborne, then disappear at
    // contact because of shadow-map bias. Keep the grounding shadow strongest
    // at the road and fade it smoothly as the car lifts away.
    const proximity = Math.max(0, Math.min(1, (2.8 - height) / 2.2));
    this.material.uniforms.opacity.value = 0.72 * proximity * proximity;
    this.mesh.position.copy(this.groundPoint).addScaledVector(this.groundNormal, 0.018);
    // Align the elliptical footprint with the car, including banked tracks.
    const forward = (this.forward ??= new this.three.Vector3());
    forward.set(1, 0, 0).applyQuaternion(this.carQuaternion);
    forward.addScaledVector(this.groundNormal, -forward.dot(this.groundNormal)).normalize();
    const basis = (this.basis ??= new this.three.Matrix4());
    const right = (this.right ??= new this.three.Vector3());
    right.crossVectors(forward, this.groundNormal).normalize();
    basis.makeBasis(right, forward, this.groundNormal);
    this.mesh.quaternion.setFromRotationMatrix(basis);
    this.mesh.visible = this.material.uniforms.opacity.value > 0;
  }

  report() {
    return { available: true, visible: this.mesh.visible, cars: this.candidates.length,
      receivers: this.floorMeshes.length, broadQueries: this.rayQueries,
      narrowQueries: this.narrowQueries, indexedInstances: this.receiverIndex.built };
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
    this.candidates.length = 0;
    this.floorMeshes.length = 0;
    this.car = null;
    this.receiverIndex.dispose();
  }
}
