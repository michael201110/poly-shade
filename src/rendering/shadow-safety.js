// Patch each receiver after the game's own CSM callback. Do not replace native
// material handles, shader uniforms, cascade selection or the shadow filter.
export function safeShadowChunk(source) {
  return source
    .replace(/(float getShadow\s*\([^)]*\)\s*\{)/, `$1
      // Reject invalid homogeneous coordinates before dividing or sampling.
      if (!(shadowCoord.w > 0.0)) return 1.0;
      vec3 polyShadeShadowPosition = shadowCoord.xyz / shadowCoord.w;
      if (!all(greaterThanEqual(polyShadeShadowPosition, vec3(0.0))) ||
          !all(lessThanEqual(polyShadeShadowPosition, vec3(1.0)))) return 1.0;
    `)
    .replace('inFrustum && shadowCoord.z <= 1.0',
      'inFrustum && shadowCoord.z >= 0.0 && shadowCoord.z <= 1.0');
}

export function applyShadowSafety(state, three) {
  const chunks = three.ShaderChunk;
  if (!chunks?.shadowmap_pars_fragment) return;
  const snapshots = (state.shadowShaderSnapshots ??= new Map());
  const active = new Set();
  state.scene.traverse(mesh => {
    if (!mesh.isMesh || mesh.userData?.polyShadeOwned) return;
    for (const material of [].concat(mesh.material ?? [])) {
      if (!material || material.isShaderMaterial || material.isMeshBasicMaterial) continue;
      active.add(material);
      const existing = snapshots.get(material);
      if (existing && material.onBeforeCompile === existing.wrapper) continue;
      const callback = material.onBeforeCompile;
      const key = material.customProgramCacheKey;
      // Three's default key reads this.onBeforeCompile. Preserve the native
      // callback's identity in that context while allowing live material fields.
      const keyContext = Object.create(material);
      keyContext.onBeforeCompile = callback;
      const wrapper = function(shader, renderer) {
        callback.call(this, shader, renderer);
        shader.fragmentShader = '// PolyShade_material shadow safety\n' + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <shadowmap_pars_fragment>', safeShadowChunk(chunks.shadowmap_pars_fragment));
        // The first cascade can have a zero-width fade at its near boundary.
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <lights_fragment_begin>', chunks.lights_fragment_begin.replace(
            /dist\s*\/\s*margin/g, 'dist / max(margin, 0.000001)'));
      };
      const cacheKey = () => `${key.call(keyContext)}|PolyShade shadow bounds v1`;
      snapshots.set(material, { callback, key, wrapper, cacheKey });
      material.onBeforeCompile = wrapper;
      material.customProgramCacheKey = cacheKey;
      material.needsUpdate = true;
    }
  });
  for (const [material, snapshot] of snapshots) {
    if (active.has(material)) continue;
    restore(material, snapshot);
    snapshots.delete(material);
  }
}

function restore(material, snapshot) {
  if (material.onBeforeCompile === snapshot.wrapper) material.onBeforeCompile = snapshot.callback;
  if (material.customProgramCacheKey === snapshot.cacheKey) material.customProgramCacheKey = snapshot.key;
  material.needsUpdate = true;
}

export function restoreShadowSafety(state) {
  for (const [material, snapshot] of state.shadowShaderSnapshots ?? []) restore(material, snapshot);
  state.shadowShaderSnapshots?.clear();
}
