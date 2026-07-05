import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { minify as minifyHtml } from "html-minifier-terser";
import CleanCSS from "clean-css";
import JavaScriptObfuscator from "javascript-obfuscator";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");
const siteUrl = (process.env.SITE_URL || "https://example.com").replace(/\/$/, "");

async function emptyDir(dir) {
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
}

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) await copyDir(from, to);
    else await fs.copyFile(from, to);
  }
}

const html = await fs.readFile(path.join(root, "index.html"), "utf8");
const htmlBuilt = html
  .replace('href="css/style.css"', 'href="css/style.min.css"')
  .replace('src="js/main.js"', 'src="js/main.min.js"');

const minifiedHtml = await minifyHtml(htmlBuilt, {
  collapseWhitespace: true,
  removeComments: true,
  removeRedundantAttributes: true,
  removeScriptTypeAttributes: true,
  removeStyleLinkTypeAttributes: true,
  minifyCSS: true,
  minifyJS: true,
  sortAttributes: true,
  sortClassName: true,
});

const css = await fs.readFile(path.join(root, "css", "style.css"), "utf8");
const minifiedCss = new CleanCSS({ level: 2 }).minify(css).styles;

const js = await fs.readFile(path.join(root, "js", "main.js"), "utf8");
const obfuscatedJs = JavaScriptObfuscator.obfuscate(js, {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.5,
  deadCodeInjection: false,
  identifierNamesGenerator: "hexadecimal",
  renameGlobals: false,
  selfDefending: true,
  stringArray: true,
  stringArrayEncoding: ["base64"],
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
  unicodeEscapeSequence: false,
  sourceMap: false,
  sourceMapMode: "separate",
}).getObfuscatedCode();

const robots = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;

await emptyDir(dist);
await fs.mkdir(path.join(dist, "css"), { recursive: true });
await fs.mkdir(path.join(dist, "js"), { recursive: true });
await fs.writeFile(path.join(dist, "index.html"), minifiedHtml);
await fs.writeFile(path.join(dist, "css", "style.min.css"), minifiedCss);
await fs.writeFile(path.join(dist, "js", "main.min.js"), obfuscatedJs);
await fs.writeFile(path.join(dist, "robots.txt"), robots);
await fs.writeFile(path.join(dist, "sitemap.xml"), sitemap);

if (await fs.stat(path.join(root, "assets")).catch(() => null)) {
  await copyDir(path.join(root, "assets"), path.join(dist, "assets"));
}

console.log("Build tamamlandı → dist/");
console.log(`SITE_URL: ${siteUrl}`);
