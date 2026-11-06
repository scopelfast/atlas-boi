import fs from "fs";

const path = process.argv[2];
if (!path) {
  console.error("Usage: node fix-encoding.mjs <file>");
  process.exit(1);
}

let buf = fs.readFileSync(path);
if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
  buf = buf.slice(3);
}

let s = buf.toString("utf8");

const replacements = [
  ["\u00e2\u20ac\u00a6", "\u2026"],
  ["\u00e2\u20ac\u201d", "\u2014"],
  ["\u00e2\u20ac\u201c", "\u2014"],
  ["\u00e2\u2020\u2019", "\u2192"],
  ["\u00c2\u00b7", "\u00b7"],
  ["ser\u00c3\u00a3o", "ser\u00e3o"],
  ["j\u00c3\u00a1", "j\u00e1"],
  ["bot\u00c3\u00a3o", "bot\u00e3o"],
  ["altera\u00c3\u00a7\u00c3\u00a3o", "altera\u00e7\u00e3o"],
  ["ser\u00c3\u00a1", "ser\u00e1"],
  ["a\u00c3\u00a7\u00c3\u00a3o", "a\u00e7\u00e3o"],
  ["Avan\u00c3\u00a7ar", "Avan\u00e7ar"],
  ["avan\u00c3\u00a7ou", "avan\u00e7ou"],
  ["conclu\u00c3\u00addo", "conclu\u00eddo"],
  ["opera\u00c3\u00a7\u00c3\u00a3o", "opera\u00e7\u00e3o"],
  ["c\u00c3\u00b3digo", "c\u00f3digo"],
  ["C\u00c3\u00b3digo", "C\u00f3digo"],
  ["Programa\u00c3\u00a7\u00c3\u00a3o", "Programa\u00e7\u00e3o"],
  ["A\u00c3\u00a7\u00c3\u00b5es", "A\u00e7\u00f5es"],
];

for (const [from, to] of replacements) {
  s = s.split(from).join(to);
}

fs.writeFileSync(path, s, "utf8");

const bad = s.match(/[\u00c3\u00e2][\u0080-\u00bf]|\u00c2[\u0080-\u00bf]/g) ?? [];
console.log(`Fixed ${path}. Remaining suspicious sequences: ${bad.length}`);
