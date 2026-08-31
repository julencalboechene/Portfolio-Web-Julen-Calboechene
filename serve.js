// Mini servidor local para previsualizar el portfolio.
// Uso:  node serve.js      -> abre http://localhost:8000
// (Hace falta porque la galería usa fetch y no funciona con file://)

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = Number(process.argv[2] || 8000);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

http
  .createServer((req, res) => {
    let urlPath;
    try {
      urlPath = decodeURIComponent(req.url.split("?")[0]);
    } catch (e) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      return res.end("400 bad request");
    }
    const rel = urlPath.endsWith("/") ? urlPath + "index.html" : urlPath;
    const filePath = path.join(ROOT, rel);
    if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
      res.writeHead(403);
      return res.end("forbidden");
    }

    fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        return res.end("404 " + rel);
      }

      const type = TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
      const range = req.headers.range;

      // Range requests — needed so video can seek / stream instead of full download
      if (range) {
        const m = /bytes=(\d*)-(\d*)/.exec(range);
        let start = m && m[1] ? parseInt(m[1], 10) : 0;
        let end = m && m[2] ? parseInt(m[2], 10) : stat.size - 1;
        if (isNaN(start) || isNaN(end) || start > end || end >= stat.size) {
          res.writeHead(416, { "Content-Range": `bytes */${stat.size}` });
          return res.end();
        }
        res.writeHead(206, {
          "Content-Type": type,
          "Content-Range": `bytes ${start}-${end}/${stat.size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": end - start + 1,
          "Cache-Control": "no-store",
        });
        return fs.createReadStream(filePath, { start, end }).on("error", () => res.end()).pipe(res);
      }

      res.writeHead(200, {
        "Content-Type": type,
        "Content-Length": stat.size,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
      });
      fs.createReadStream(filePath).on("error", () => res.end()).pipe(res);
    });
  })
  .listen(PORT, () => console.log("Portfolio en  http://localhost:" + PORT + "  (Ctrl+C para cortar)"));

// un request roto (URL rara, cliente que corta la descarga) no debe tumbar el server
process.on("uncaughtException", (e) => console.error("[serve] ignorado:", e.message));
