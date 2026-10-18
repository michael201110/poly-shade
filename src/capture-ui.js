// Shared optional recording UI contract v1. Keep identical in PolyBot,
// PolyCam and PolyShade; standalone installs need no other plugin.
export function attachPolyCaptureUI(host = globalThis, onChange = () => {}) {
  const document = host.document;
  let api = host.polyCaptureUI;
  if (!api || api.apiVersion !== 1) {
    const subscribers = new Set();
    let hidden = false, active = true;
    const attribute = 'data-poly-capture-ui';
    const onKey = event => {
      if ((event.code || event.key) !== 'F2' || event.repeat || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
      event.preventDefault();
      event.stopImmediatePropagation?.();
      api.setHidden(!hidden);
    };
    api = {
      apiVersion: 1,
      get hidden() { return hidden; },
      setHidden(value) {
        if (!active) return;
        hidden = value === true;
        if (hidden) {
          document.documentElement?.setAttribute(attribute, 'hidden');
          const focused = document.activeElement;
          if (focused?.closest?.('#poly-cam-panel,#polyshade-panel,.polybot-ai-hud-toggle,.polybot-ai-hud-mode,.polybot-ai-hud-grip,.polybot-ai-hud-resize')) focused.blur?.();
        } else document.documentElement?.removeAttribute(attribute);
        for (const listener of subscribers) listener(hidden);
      },
      subscribe(listener) {
        subscribers.add(listener); listener(hidden);
        return () => {
          subscribers.delete(listener);
          if (!subscribers.size && active) {
            active = false;
            document.removeEventListener('keydown', onKey, true);
            if (host.polyCaptureUI === api) {
              document.documentElement?.removeAttribute(attribute);
              delete host.polyCaptureUI;
            }
          }
        };
      },
    };
    host.polyCaptureUI = api;
    document.addEventListener('keydown', onKey, true);
  }
  const dispose = api.subscribe(onChange);
  return { get hidden() { return api.hidden; }, setHidden: value => api.setHidden(value), dispose };
}
