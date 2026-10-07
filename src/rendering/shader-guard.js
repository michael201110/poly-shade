export class ShaderGuard {
  constructor(renderer) {
    this.renderer = renderer;
    this.failures = new Map();
    this.pass = "scene";
    this.originalCheck = renderer.debug.checkShaderErrors;
    this.originalCallback = renderer.debug.onShaderError;
    this.callback = (gl, program, vertex, fragment) => {
      const source = gl.getShaderSource(fragment) ?? "";
      const owned = source.includes("PolyShade") || this.pass !== "scene";
      if (!owned) {
        if (this.originalCallback)
          this.originalCallback(gl, program, vertex, fragment);
        else
          console.error(
            "[PolyShade] Native shader compilation failed.",
            gl.getProgramInfoLog(program),
            gl.getShaderInfoLog(vertex),
            gl.getShaderInfoLog(fragment),
          );
        return;
      }
      const name = source.includes("PolyShade_sky")
        ? "sky"
        : source.includes("PolyShade_material")
          ? "material"
          : this.pass;
      const log = [
        gl.getProgramInfoLog(program),
        gl.getShaderInfoLog(vertex),
        gl.getShaderInfoLog(fragment),
      ]
        .filter(Boolean)
        .join("\n");
      this.failures.set(name, log);
      console.error(
        `[PolyShade] Shader ${name} failed; disabling that effect.`,
        log,
      );
    };
    renderer.debug.checkShaderErrors = true;
    renderer.debug.onShaderError = this.callback;
  }
  dispose() {
    this.renderer.debug.checkShaderErrors = this.originalCheck;
    if (this.renderer.debug.onShaderError === this.callback)
      this.renderer.debug.onShaderError = this.originalCallback;
  }
}
