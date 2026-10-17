// Native Object3D topology events invalidate discovery. Visibility and live
// values are still read every frame; no physics or game state is owned here.
export class SourceIndex {
  constructor(supported = false) {
    this.supported = supported;
    this.nodes = []; this.meshes = []; this.fills = [];
    this.directionals = []; this.spills = [];
    this.records = new WeakMap(); this.dirty = true;
    this.invalidate = () => { this.dirty = true; };
  }
  get(source) {
    if (this.source !== source || this.events !== this.supported) {
      this.clear(); this.source = source;
      this.events = this.supported;
    }
    if (this.dirty || !this.events) this.rebuild();
    let ancestorVisible = true;
    for(let parent=source.parent;parent;parent=parent.parent)
      if(parent.visible===false)ancestorVisible=false;
    for (const record of this.nodes)
      record.visible = record.object.visible !== false &&
        (record.parent ? record.parent.visible : ancestorVisible);
    return this;
  }
  rebuild() {
    this.detach(); this.nodes.length = this.meshes.length = this.fills.length =
      this.directionals.length = this.spills.length = 0;
    this.records = new WeakMap();
    this.source.traverse(object => {
      const record = {object, parent: this.records.get(object.parent), visible: true};
      this.nodes.push(record); this.records.set(object, record);
      if (object.isMesh) this.meshes.push(record);
      if (object.isAmbientLight || object.isHemisphereLight) this.fills.push(object);
      if (object.isDirectionalLight) this.directionals.push(object);
      if (object.isSpotLight || object.isPointLight) this.spills.push(object);
      if (this.events) {
        object.addEventListener('childadded', this.invalidate);
        object.addEventListener('childremoved', this.invalidate);
      }
    });
    this.dirty = false;
  }
  eachMesh(callback) { for (const record of this.meshes) callback(record.object); }
  visible(object) { return this.records.get(object).visible; }
  detach() {
    if (this.events) for (const {object} of this.nodes) {
      object.removeEventListener('childadded', this.invalidate);
      object.removeEventListener('childremoved', this.invalidate);
    }
  }
  clear() {
    this.detach(); this.nodes.length = this.meshes.length = this.fills.length =
      this.directionals.length = this.spills.length = 0;
    this.source = null; this.records = new WeakMap(); this.dirty = true;
  }
}
