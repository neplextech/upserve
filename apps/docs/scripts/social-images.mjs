import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { brand, markPath } from "../lib/brand.mjs";

function escape(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function wrap(value, limit) {
  const lines = [""];

  for (const word of value.split(/\s+/)) {
    const index = lines.length - 1;

    if (lines[index] && (lines[index] + " " + word).length > limit) lines.push(word);
    else lines[index] += (lines[index] ? " " : "") + word;
  }

  return lines;
}

const directory = new URL("../public/og/", import.meta.url);

await mkdir(directory, { recursive: true });

const pages = [
  {
    slug: "home",
    title: "An extensible application update server.",
    description: "Serve desktop and mobile updates on your infrastructure.",
    route: "/",
    category: "Upserve",
  },
];

for (const file of (await readdir(new URL("../content/docs/", import.meta.url))).filter((name) =>
  name.endsWith(".mdx"),
)) {
  const content = await readFile(new URL("../content/docs/" + file, import.meta.url), "utf8");
  const title = content.match(/^title:\s*(.+)$/m)?.[1];
  const description = content.match(/^description:\s*(.+)$/m)?.[1];

  if (!title || !description) throw new Error("Missing social metadata: " + file);

  const slug = file.replace(".mdx", "");

  pages.push({
    slug,
    title,
    description,
    route: "/docs/" + (slug === "index" ? "" : slug + "/"),
    category: "Documentation",
  });
}

for (const page of pages) {
  const title = wrap(page.title, 29);
  const subtitleY = 222 + title.length * 65;
  const grid = Array.from(
    { length: 9 },
    (_, i) => `<path d="M${810 + i * 44} 30V600M810 ${100 + i * 55}H1170"/>`,
  ).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="${brand.background}"/>
    <rect x="24.5" y="24.5" width="1151" height="581" rx="8" stroke="#333941" fill="none"/>
    <g stroke="#242a31" fill="none">${grid}</g>
    <path d="M810 25V605" stroke="#333941"/>
    <g transform="translate(72 60) scale(1.1)" fill="${brand.accent}"><path d="${markPath}"/></g>
    <text x="121" y="89" fill="${brand.foreground}" font-family="sans-serif" font-size="31" font-weight="600">upserve</text>
    <text x="72" y="162" fill="${brand.accent}" font-family="monospace" font-size="17">${page.category}</text>
    <g fill="${brand.foreground}" font-family="sans-serif" font-weight="600" font-size="54">${title.map((line, index) => `<text x="69" y="${222 + index * 65}">${escape(line)}</text>`).join("")}</g>
    <g fill="#a1a9b4" font-family="sans-serif" font-size="20">${wrap(page.description, 57)
      .map((line, index) => `<text x="72" y="${subtitleY + index * 30}">${escape(line)}</text>`)
      .join("")}</g>
    <g fill="none" stroke="#626c77" stroke-width="2"><path d="M993 173V259M993 367V409H867V457M993 409V457M993 409H1117V457"/><path d="M993 197V236" stroke="${brand.accent}" stroke-dasharray="5 5"/></g>
    <rect x="906" y="123" width="174" height="50" rx="5" fill="#1c2026" stroke="#414852"/>
    <text x="993" y="154" fill="#d9dee5" font-family="monospace" font-size="17" text-anchor="middle">Releases</text>
    <rect x="867" y="259" width="250" height="108" rx="6" fill="#1c2026" stroke="${brand.accent}"/>
    <g transform="translate(892 281) scale(1.1)" fill="${brand.accent}"><path d="${markPath}"/></g>
    <text x="940" y="310" fill="${brand.foreground}" font-family="sans-serif" font-size="29" font-weight="600">upserve</text>
    <path d="M867 331H1117" stroke="#414852"/>
    <text x="993" y="353" fill="#a1a9b4" font-family="monospace" font-size="13" text-anchor="middle">resolve / cache / serve</text>
    <g fill="#1c2026" stroke="#626c77">${[867, 993, 1117].map((x) => `<rect x="${x - 17}" y="457" width="34" height="34" rx="4"/>`).join("")}</g>
    <g fill="${brand.accent}">${[867, 993, 1117].map((x) => `<circle cx="${x}" cy="474" r="4"/>`).join("")}</g>
    <path d="M25 535H1175" stroke="#333941"/>
    <text x="72" y="578" fill="#a1a9b4" font-family="monospace" font-size="16">${escape(page.route)}</text>
    <text x="1128" y="578" fill="#a1a9b4" font-family="sans-serif" font-size="16" text-anchor="end">Neplex Technologies</text>
  </svg>`;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(new URL(page.slug + ".png", directory).pathname);
}

await writeFile(
  new URL("../public/icon.svg", import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="${brand.background}"/><g transform="translate(8 5)" fill="${brand.accent}"><path d="${markPath}"/></g></svg>`,
);

console.log(`Generated ${pages.length} route-specific Open Graph images and favicon`);
