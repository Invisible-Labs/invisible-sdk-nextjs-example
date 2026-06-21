import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

const root = resolve(process.argv[2] ?? "out");
const port = Number(process.argv[3] ?? 3000);

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".woff2", "font/woff2"],
]);

function resolveRequestPath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split("?")[0] ?? "/");
  const normalizedPath = normalize(decodedPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const absolutePath = resolve(join(root, normalizedPath));

  if (absolutePath !== root && !absolutePath.startsWith(`${root}${sep}`)) {
    return null;
  }

  if (existsSync(absolutePath) && statSync(absolutePath).isFile()) {
    return absolutePath;
  }

  const indexPath = join(absolutePath, "index.html");
  if (existsSync(indexPath) && statSync(indexPath).isFile()) {
    return indexPath;
  }

  return join(root, "404.html");
}

const server = createServer((request, response) => {
  const filePath = resolveRequestPath(request.url ?? "/");

  if (!filePath || !existsSync(filePath)) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const statusCode = filePath.endsWith("404.html") ? 404 : 200;
  const contentType = contentTypes.get(extname(filePath)) ?? "application/octet-stream";
  response.writeHead(statusCode, { "content-type": contentType });
  createReadStream(filePath).pipe(response);
});

server.listen(port, () => {
  console.log(`Serving ${root} at http://localhost:${port}`);
});
