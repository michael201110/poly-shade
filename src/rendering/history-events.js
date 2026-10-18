// Conservative run/UI boundaries. Transform/projection/scene checks cover
// programmatic camera cuts too. Never intercept or change gameplay input.
export function installHistoryEvents(document, invalidate) {
  const editable = event => event.target?.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(event.target?.tagName);
  const key = event => {
    if (!event.repeat && !editable(event) && ["KeyT", "KeyR", "Enter", "Backspace", "Escape"].includes(event.code))
      invalidate("run or menu key");
  };
  const click = event => {
    if (editable(event)) return;
    const label = event.target?.textContent?.trim();
    if (label && /^(restart|reset|retry|play|drive|watch|switch car)$/i.test(label)) invalidate("run or camera action");
  };
  const visibility = () => invalidate("page visibility changed");
  document.addEventListener("keydown", key, true);
  document.addEventListener("click", click, true);
  document.addEventListener("visibilitychange", visibility);
  return () => {
    document.removeEventListener("keydown", key, true);
    document.removeEventListener("click", click, true);
    document.removeEventListener("visibilitychange", visibility);
  };
}
