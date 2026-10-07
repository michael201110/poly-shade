import { isReplayGhost } from "../materials.js";
import { linearColor } from "./sky.js";

// Read only the existing lamp material's emissive state; never read or change controls.
export class BrakeLights {
  constructor(three, scene) {
    this.three = three;
    this.scene = scene;
    this.cars = new Map();
    this.position = new three.Vector3();
    this.sphere = three.Sphere ? new three.Sphere() : null;
    this.frustum = three.Frustum ? new three.Frustum() : null;
    this.projection = three.Matrix4 ? new three.Matrix4() : null;
  }
  scan(settings, camera) {
    this.camera = camera;
    if (!settings.brakeLightsEnabled || !this.three.SpotLight) {
      if (
        settings.brakeLightsEnabled &&
        !this.three.SpotLight &&
        !this.warned
      ) {
        console.warn(
          "[PolyShade] SpotLight is unavailable in this game bundle; keeping native emissive brake lamps without omnidirectional spill.",
        );
        this.warned = true;
      }
      this.dispose();
      return;
    }
    const candidates = [];
    this.scene.traverse((mesh) => {
      if (
        !mesh.isMesh ||
        mesh.userData?.polyShadeOwned ||
        mesh.visible === false
      )
        return;
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      const index = materials.findIndex(
        (m) => m?.name === "BrakeLight" && m.emissive,
      );
      if (
        index < 0 ||
        materials.some(
          (m) => isReplayGhost(mesh, m) || m?.transparent || m?.opacity < 0.98,
        )
      )
        return;
      candidates.push({ mesh, material: materials[index], index });
    });
    const position = new this.three.Vector3();
    candidates.sort(
      (a, b) =>
        a.mesh.getWorldPosition(position).distanceToSquared(camera.position) -
        b.mesh.getWorldPosition(position).distanceToSquared(camera.position),
    );
    const keep = new Set();
    // At most six unshadowed cones: the three nearest opaque cars.
    for (const candidate of candidates.slice(0, 3)) {
      const { mesh, material, index } = candidate;
      keep.add(mesh);
      if (this.cars.has(mesh)) {
        this.cars.get(mesh).material = material;
        continue;
      }
      const geometry = mesh.geometry,
        attribute = geometry.attributes.position,
        normals = geometry.attributes.normal;
      const box = new this.three.Box3().makeEmpty(),
        normal = new this.three.Vector3(),
        vertex = new this.three.Vector3();
      const groups = Array.isArray(mesh.material)
        ? geometry.groups.filter((g) => g.materialIndex === index)
        : [{ start: 0, count: geometry.index?.count ?? attribute.count }];
      for (const group of groups)
        for (
          let offset = group.start;
          offset < Math.min(group.start + group.count, group.start + 10000);
          offset++
        ) {
          const id = geometry.index ? geometry.index.getX(offset) : offset;
          vertex.fromBufferAttribute(attribute, id);
          box.expandByPoint(vertex);
          if (normals) {
            vertex.fromBufferAttribute(normals, id);
            normal.add(vertex);
          }
        }
      if (box.isEmpty()) continue;
      const centre = box.getCenter(new this.three.Vector3()),
        size = box.getSize(new this.three.Vector3());
      normal.normalize();
      if (normal.lengthSq() < 0.01) continue; // Do not guess a world-space rear axis.
      const direction = normal.clone();
      direction.y = Math.min(-0.25, direction.y - 0.25);
      direction.normalize();
      centre.addScaledVector(
        normal,
        Math.max(size.x, size.y, size.z) * 0.03 + 0.01,
      );
      const offsets = size.x > 0.1 ? [-size.x * 0.25, size.x * 0.25] : [0];
      const lights = offsets.map((offset) => {
        const light = new this.three.SpotLight(
          0xff3020,
          0,
          settings.brakeLightDistance,
          Math.PI / 4,
          0.7,
          2,
        );
        light.color.copy(linearColor(this.three, "#ff3020"));
        light.name = "PolyShade brake spill";
        light.userData.polyShadeOwned = true;
        light.castShadow = false;
        light.visible = false;
        light.position.copy(centre);
        light.position.x += offset;
        mesh.add(light);
        light.target.name = "PolyShade brake target";
        light.target.userData.polyShadeOwned = true;
        // Both source and target are in the lamp mesh's coordinates. Banking,
        // inversion and rotation therefore rotate the entire cone with the car.
        light.target.position.copy(light.position).add(direction);
        mesh.add(light.target);
        return light;
      });
      this.cars.set(mesh, { material, lights });
    }
    for (const [mesh, car] of this.cars)
      if (!keep.has(mesh)) {
        for (const light of car.lights) {
          light.target.parent?.remove(light.target);
          light.parent?.remove(light);
          light.dispose?.();
        }
        this.cars.delete(mesh);
      }
  }
  update(settings) {
    const camera = this.camera;
    if (this.frustum && camera?.projectionMatrix && camera?.matrixWorldInverse)
      this.frustum.setFromProjectionMatrix(
        this.projection.multiplyMatrices(
          camera.projectionMatrix,
          camera.matrixWorldInverse,
        ),
      );
    for (const [mesh, { material, lights }] of this.cars) {
      mesh.getWorldPosition(this.position);
      if (this.sphere) {
        this.sphere.center.copy(this.position);
        this.sphere.radius = settings.brakeLightDistance + 1;
      }
      const relevant =
        !camera ||
        (this.position.distanceToSquared(camera.position) < 1600 &&
          (!this.frustum || this.frustum.intersectsSphere(this.sphere)));
      const enabled =
        relevant &&
        settings.brakeLightsEnabled &&
        Math.max(
          material.emissive.r,
          material.emissive.g,
          material.emissive.b,
        ) > 0.05;
      for (const light of lights) {
        light.visible = enabled;
        light.intensity = enabled
          ? settings.brakeLightIntensity * (material.emissiveIntensity ?? 1)
          : 0;
        light.distance = settings.brakeLightDistance;
      }
    }
  }
  report() {
    return {
      cars: this.cars.size,
      lights: [...this.cars.values()].reduce((n, c) => n + c.lights.length, 0),
      active: [...this.cars.values()].some((c) =>
        c.lights.some((l) => l.intensity > 0),
      ),
      type: this.three.SpotLight ? "SpotLight" : "native-emissive-only",
      targets: [...this.cars.values()].reduce((n, c) => n + c.lights.length, 0),
    };
  }
  dispose() {
    for (const { lights } of this.cars.values())
      for (const light of lights) {
        light.target.parent?.remove(light.target);
        light.parent?.remove(light);
        light.dispose?.();
      }
    this.cars.clear();
  }
}
