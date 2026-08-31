# Portfolio — Julen Calboechene

Sitio estático (HTML/CSS/JS puro, sin build, sin backend). Funciona abriendo
`index.html`, y se puede subir tal cual a cualquier hosting estático (tu propio
servidor, Netlify, Nginx, Apache/Hostinger, GitHub Pages, etc.).

## Estructura

```
index.html        → la página
styles.css        → estilos (tema oscuro cálido + tratamiento halftone/grano)
main.js           → menú móvil, header al scroll, scroll suave, animaciones de entrada
gallery.js        → carga los proyectos desde data/gallery.json y maneja el lightbox
.htaccess         → cabeceras de caché para Apache/Hostinger (inofensivo en otros servidores)
data/
  gallery.json    → el índice de proyectos de la sección "Trabajo"
images/
  hero.jpg, portrait.jpg   → tus fotos de la home
  gallery/                  → imágenes de los proyectos (placeholders .svg por ahora)
```

## Probarlo en tu compu

Hace falta un servidor local (no vale abrir el `index.html` con doble clic /
`file://`), porque `gallery.js` usa `fetch` para leer `data/gallery.json`.

**Opción A — VSCode (la más simple):** instalá la extensión **Live Server**,
botón derecho en `index.html` → *Open with Live Server*. Se abre solo en el
navegador y se recarga al guardar.

**Opción B — Node (ya lo tenés instalado):** abrí una terminal en esta carpeta y:
```bash
node serve.js
```
Después andá a `http://localhost:8000`. Para cortarlo, `Ctrl+C` en esa terminal.

Cerrar la terminal o VSCode apaga el servidor: no queda nada corriendo en
segundo plano.

## Cargar tus proyectos en la galería

No hace falta tocar el JSON a mano. El flujo es:

1. Dentro de `images/gallery/` creá **una carpeta por proyecto**. Podés numerarlas
   para ordenarlas: `01-marca-lucia`, `02-flyer-fiesta`, etc. El prefijo `01-` se
   usa solo para el orden; el nombre que se muestra es "marca lucia".
2. Meté las imágenes de ese proyecto adentro (`.webp`, `.jpg`, `.png`; sin límite
   de proporción, no se recortan). Nombres simples, sin espacios raros.
   - Si querés elegir la portada, nombrá esa imagen `cover.jpg` o `portada.jpg`.
     Si no, se usa la primera por orden alfabético.
3. Desde la carpeta del proyecto, corré:
   ```bash
   node build-gallery.js
   ```
   Eso regenera `data/gallery.json` solo. Recargá la página y ya están.

Repetí cada vez que agregues, saques o renombres proyectos o imágenes.

Las carpetas `01-ejemplo-uno` … `03-ejemplo-tres` con `.svg` son de muestra —
borralas cuando tengas las tuyas y volvé a correr el comando.

## Cargar videos en la sección "Reel"

1. Poné los `.mp4` en la carpeta **`videos/`**, con prefijo numérico para el
   orden: `01-Reel-Xxx.mp4`, `02-Video-Xxx.mp4`, …
2. Corré:
   ```bash
   node build-videos.js
   ```
   Detecta solo si cada video es vertical (9:16) u horizontal (16:9) y escribe la
   sección en `index.html`. El título mostrado sale del nombre del archivo.
   - Para un título propio: poné un `.txt` con el mismo nombre base
     (`01-Reel-Xxx.txt`) y su primera línea se usa. `.txt` vacío = sin título.
3. Recargá la página.

**Peso:** los videos se sirven desde tu sitio, así que conviene comprimirlos
antes de publicar. Con ffmpeg:
```bash
ffmpeg -i entrada.mp4 -vf scale=-2:1080 -c:v libx264 -crf 24 -preset slow -c:a aac -b:a 128k salida.mp4
```

## Qué falta que completes vos

- **Sección "Sobre mí"** (`index.html`): hay un párrafo marcado `<!-- EDITAR -->`
  dejado genérico a propósito. Reemplazalo por tu historia real.
- **Galería / Reel**: cargá tu contenido como se explica arriba.

## Publicar en tu servidor

Subí **todos** los archivos manteniendo las carpetas (`images/`, `data/`) a la
raíz del sitio. En Apache/Hostinger el `.htaccess` ya evita que se sirva código
viejo cacheado. Si cambiás `styles.css` / `main.js`, subí el `?v=YYYYMMDD` de los
`<link>` / `<script>` en `index.html` para forzar recarga.
