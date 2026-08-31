// Regenera data/gallery.json a partir de las carpetas dentro de images/gallery/
// Uso:  node build-gallery.js
//
// Reglas:
//   - Cada SUBCARPETA de images/gallery/ = un proyecto.
//   - Nombre del proyecto = nombre de la carpeta. Se le saca un prefijo tipo
//     "01-" o "01_" (sirve para ordenar), y guiones/guiones bajos -> espacios.
//     Ej:  "01-marca-lucia"  ->  proyecto "marca lucia", va primero.
//   - Portada = la imagen llamada "cover.*" o "portada.*" si existe;
//     si no, la primera por orden alfabético/numérico.
//   - Formatos aceptados: .webp .jpg .jpeg .png .svg
//   - Carpetas sin imágenes se saltan.

const fs = require("fs");
const path = require("path");

const GALLERY_DIR = path.join(__dirname, "images", "gallery");
const OUT = path.join(__dirname, "data", "gallery.json");
const EXT = new Set([".webp", ".jpg", ".jpeg", ".png", ".svg"]);

const prettyName = (dir) =>
  dir.replace(/^\d+\s*[-_.]\s*/, "").replace(/[-_]+/g, " ").trim() || dir;

// Título exacto: si la carpeta tiene un nombre.txt / titulo.txt / name.txt,
// se usa su primera línea tal cual (permite "/", acentos, mayúsculas, etc.).
function readTitle(absDir, files, fallback) {
  const nameFile = files.find((f) => /^(nombre|titulo|título|name)\.txt$/i.test(f));
  if (!nameFile) return fallback;
  try {
    const line = fs
      .readFileSync(path.join(absDir, nameFile), "utf8")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .find(Boolean);
    return line || fallback;
  } catch (e) {
    return fallback;
  }
}
const orderKey = (dir) => {
  const m = dir.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : Infinity;
};
const seg = (s) => encodeURIComponent(s);

let dirs;
try {
  dirs = fs
    .readdirSync(GALLERY_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
} catch (e) {
  console.error("No encuentro images/gallery/. Creá una subcarpeta por proyecto ahí adentro.");
  process.exit(1);
}

dirs.sort((a, b) => orderKey(a) - orderKey(b) || a.localeCompare(b, "es", { numeric: true }));

const folders = [];
for (const dir of dirs) {
  const absDir = path.join(GALLERY_DIR, dir);
  const allFiles = fs.readdirSync(absDir);
  const files = allFiles
    .filter((f) => EXT.has(path.extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, "es", { numeric: true }));

  if (!files.length) {
    console.warn(`(!) "${dir}" no tiene imágenes — la salto.`);
    continue;
  }

  const title = readTitle(absDir, allFiles, prettyName(dir));

  const coverFile = files.find((f) => /^(cover|portada)\./i.test(f)) || files[0];
  const url = (f) => `images/gallery/${seg(dir)}/${seg(f)}`;

  // la portada va primera también dentro del proyecto, después el resto en orden
  const ordered = [coverFile, ...files.filter((f) => f !== coverFile)];

  folders.push({
    name: prettyName(dir),
    cover: url(coverFile),
    images: ordered.map((f) => ({ name: path.parse(f).name, file: url(f) })),
  });
}

fs.writeFileSync(OUT, JSON.stringify({ folders }, null, 2) + "\n");
console.log(`OK — ${folders.length} proyecto(s) en data/gallery.json:`);
folders.forEach((f) => console.log(`  · ${f.name}  (${f.images.length} img)`));
