let timer = null;
let baseTitle = document.title;

export function flashTitle(text = "¡Nuevo mensaje!") {
  if (document.hasFocus()) return; // si está enfocada no molestamos
  clearInterval(timer);
  let toggle = false;
  timer = setInterval(() => {
    document.title = toggle ? text : baseTitle;
    toggle = !toggle;
  }, 750);
}

export function stopFlash() {
  clearInterval(timer);
  timer = null;
  document.title = baseTitle;
}

window.addEventListener("focus", stopFlash);
