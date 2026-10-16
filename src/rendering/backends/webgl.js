// The established fragment renderer stays behind the same render contract.
export class WebGLBackend {
  constructor(cinematic) {
    this.cinematic = cinematic;
  }
  render(scene, camera, settings, draw) {
    return this.cinematic.render(scene, camera, settings, draw);
  }
  report() {
    return { renderer: "WebGL2", ...this.cinematic.report() };
  }
}
