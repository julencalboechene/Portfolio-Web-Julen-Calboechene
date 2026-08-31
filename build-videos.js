// Regenera la sección "Reel" de index.html a partir de la carpeta videos/
// Uso:  node build-videos.js
//
// Reglas:
//   - Cada archivo .mp4 / .webm / .mov de videos/ = un video.
//   - Orden: por el prefijo numérico del nombre (01-, 02-, 03-...).
//   - Título mostrado = nombre del archivo sin el prefijo, guiones -> espacios.
//     Para un título exacto, poné un .txt con el mismo nombre base
//     (ej. "01-Reel-Las-Camelias.txt") y su primera línea se usa como texto.
//     Poné el .txt vacío para que no aparezca texto.
//   - Orientación: se detecta del propio video (ancho vs alto). Si no se puede,
//     un nombre que contenga "reel" se asume vertical (9:16), el resto 16:9.
//   - Escribe el HTML entre los marcadores <!-- VIDEOS:START --> y <!-- VIDEOS:END -->.

const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "videos");
const INDEX = path.join(__dirname, "index.html");
const VIDEO_EXT = new Set([".mp4", ".webm", ".mov"]);

const orderKey = (name) => {
  const m = name.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : Infinity;
};
const prettyName = (name) =>
  name.replace(/\.[^.]+$/, "").replace(/^\d+\s*[-_.]\s*/, "").replace(/[-_]+/g, " ").trim();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// best-effort: leer ancho/alto del primer 'tkhd' con dimensiones > 0
function videoDims(file) {
  try {
    const buf = fs.readFileSync(file);
    let best = null;
    for (let i = 0; i < buf.length - 8; i++) {
      if (buf[i] === 0x74 && buf[i + 1] === 0x6b && buf[i + 2] === 0x68 && buf[i + 3] === 0x64) { // "tkhd"
        const version = buf[i + 4];
        const wOff = i + 8 + (version === 1 ? 92 : 72);
        if (wOff + 8 > buf.length) continue;
        const w = buf.readUInt32BE(wOff) >>> 16;
        const h = buf.readUInt32BE(wOff + 4) >>> 16;
        if (w > 0 && h > 0 && (!best || w * h > best.w * best.h)) best = { w, h };
      }
    }
    return best;
  } catch (e) {
    return null;
  }
}

let files;
try {
  files = fs.readdirSync(DIR).filter((f) => VIDEO_EXT.has(path.extname(f).toLowerCase()));
} catch (e) {
  console.error("No encuentro la carpeta videos/. Creala y poné los .mp4 adentro.");
  process.exit(1);
}
if (!files.length) {
  console.error("No hay videos en videos/.");
  process.exit(1);
}

files.sort((a, b) => orderKey(a) - orderKey(b) || a.localeCompare(b, "es", { numeric: true }));

const blocks = files.map((file) => {
  const base = file.replace(/\.[^.]+$/, "");
  const txtPath = path.join(DIR, base + ".txt");
  let caption = prettyName(file);
  if (fs.existsSync(txtPath)) {
    const line = fs.readFileSync(txtPath, "utf8").split(/\r?\n/).map((s) => s.trim()).find(Boolean);
    caption = line || ""; // .txt vacío = sin texto
  }

  const dims = videoDims(path.join(DIR, file));
  const vertical = dims ? dims.h > dims.w : /reel/i.test(file);
  const cls = vertical ? "reel-item reel-v" : "reel-item reel-h";
  const src = "videos/" + encodeURI(file);
  const ratio = dims ? ` (${dims.w}x${dims.h})` : "";
  console.log(`  ${vertical ? "9:16" : "16:9"}  ${file}${ratio}`);

  return (
    `      <figure class="${cls}">\n` +
    `        <div class="reel-frame"><video src="${src}" preload="metadata" muted></video></div>\n` +
    (caption ? `        <figcaption class="reel-caption">${esc(caption)}</figcaption>\n` : "") +
    `      </figure>`
  );
});

let html = fs.readFileSync(INDEX, "utf8");
const re = /(<!-- VIDEOS:START -->)[\s\S]*?(<!-- VIDEOS:END -->)/;
if (!re.test(html)) {
  console.error("No encuentro los marcadores <!-- VIDEOS:START --> / <!-- VIDEOS:END --> en index.html");
  process.exit(1);
}
html = html.replace(re, "$1\n" + blocks.join("\n") + "\n      $2");
fs.writeFileSync(INDEX, html);
console.log(`OK — ${files.length} video(s) escritos en index.html`);
