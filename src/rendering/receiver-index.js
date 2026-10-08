const CELL = 16;
const BUILD_BATCH = 256;
const MAX_CELLS = 64;

// Static track instances are indexed once, in short batches. Contact queries
// visit nearby world-space boxes, never InstancedMesh.raycast's entire track.
export class ReceiverIndex {
  constructor(three) {
    this.three = three;
    this.rows = new Map();
    this.cells = new Map();
    this.large = new Set();
    this.matrix = new three.Matrix4();
    this.box = new three.Box3();
    this.queryBox = new three.Box3();
    this.end = new three.Vector3();
    this.hit = new three.Vector3();
    this.candidates = [];
    this.seen = new Set();
    this.built = 0;
  }
  scan(meshes) {
    const active = new Set(meshes);
    for (const [mesh, row] of this.rows) {
      if (active.has(mesh) && row.geometry === mesh.geometry && row.count === (mesh.isInstancedMesh ? mesh.count : 1) &&
          row.version === mesh.instanceMatrix?.version && row.positionVersion === mesh.geometry.attributes.position?.version &&
          row.matrix.equals(mesh.matrixWorld)) continue;
      for (const entry of row.entries) {
        this.large.delete(entry);
        for (const key of entry.keys) {
          const cell = this.cells.get(key); cell.delete(entry);
          if (!cell.size) this.cells.delete(key);
        }
      }
      this.built -= row.entries.length;
      this.rows.delete(mesh);
    }
    for (const mesh of meshes) {
      if (this.rows.has(mesh)) continue;
      mesh.geometry.computeBoundingBox();
      this.rows.set(mesh, { geometry: mesh.geometry, count: mesh.isInstancedMesh ? mesh.count : 1,
        version: mesh.instanceMatrix?.version, positionVersion: mesh.geometry.attributes.position?.version,
        matrix: mesh.matrixWorld.clone(), next: 0, entries: [] });
    }
  }
  build() {
    const start = performance.now();
    let count = 0;
    for (const [mesh, row] of this.rows) {
      while (row.next < row.count) {
        if (count >= BUILD_BATCH || performance.now() - start >= 2) return;
        const id = row.next++;
        if (mesh.isInstancedMesh) {
          mesh.getMatrixAt(id, this.matrix);
          this.matrix.premultiply(row.matrix);
        } else this.matrix.copy(row.matrix);
        const box = row.geometry.boundingBox.clone().applyMatrix4(this.matrix);
        const entry = { mesh, instanceId: mesh.isInstancedMesh ? id : undefined, box, keys: [] };
        row.entries.push(entry);
        const x0 = Math.floor(box.min.x / CELL), x1 = Math.floor(box.max.x / CELL);
        const y0 = Math.floor(box.min.y / CELL), y1 = Math.floor(box.max.y / CELL);
        const z0 = Math.floor(box.min.z / CELL), z1 = Math.floor(box.max.z / CELL);
        if ((x1-x0+1)*(y1-y0+1)*(z1-z0+1) > MAX_CELLS) this.large.add(entry);
        else for(let x=x0;x<=x1;x++) for(let y=y0;y<=y1;y++) for(let z=z0;z<=z1;z++) {
          const key = `${x},${y},${z}`;
          let cell = this.cells.get(key);
          if (!cell) this.cells.set(key, cell = new Set());
          cell.add(entry); entry.keys.push(key);
        }
        count++; this.built++;
      }
    }
  }
  query(ray, distance) {
    this.end.copy(ray.direction).multiplyScalar(distance).add(ray.origin);
    this.queryBox.setFromPoints([ray.origin, this.end]);
    this.seen.clear(); this.candidates.length = 0;
    const add = entry => {
      if (this.seen.has(entry)) return;
      this.seen.add(entry);
      if (!entry.mesh.parent || !entry.mesh.visible || !entry.box.intersectsBox(this.queryBox)) return;
      if (!ray.intersectBox(entry.box, this.hit)) return;
      const d = this.hit.distanceToSquared(ray.origin);
      if (d <= distance*distance) this.candidates.push({ entry, distance: d });
    };
    const b = this.queryBox;
    for(let x=Math.floor(b.min.x/CELL);x<=Math.floor(b.max.x/CELL);x++)
      for(let y=Math.floor(b.min.y/CELL);y<=Math.floor(b.max.y/CELL);y++)
        for(let z=Math.floor(b.min.z/CELL);z<=Math.floor(b.max.z/CELL);z++)
          for(const entry of this.cells.get(`${x},${y},${z}`) ?? []) add(entry);
    for(const entry of this.large) add(entry);
    this.candidates.sort((a,b) => a.distance-b.distance);
    return this.candidates;
  }
  dispose() { this.built = 0; this.rows.clear(); this.cells.clear(); this.large.clear(); this.candidates.length = 0; this.seen.clear(); }
}
