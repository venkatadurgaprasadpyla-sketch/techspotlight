#!/usr/bin/env node
// Generates the placeholder images used by sample content (src/assets/samples/).
// They are committed, so this only needs re-running to change them: node scripts/make-sample-images.mjs
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const out = 'src/assets/samples';
mkdirSync(out, { recursive: true });

const escape = (text) =>
  text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Simple device silhouettes so each sample is recognisable at card size. */
const shapes = {
  laptop: `<rect x="520" y="230" width="560" height="350" rx="18" fill="#0f172a" opacity=".85"/>
    <rect x="545" y="255" width="510" height="300" rx="6" fill="#e2e8f0" opacity=".9"/>
    <path d="M440 600h720l-40 50H480z" fill="#0f172a" opacity=".85"/>`,
  phone: `<rect x="660" y="150" width="280" height="560" rx="44" fill="#0f172a" opacity=".85"/>
    <rect x="680" y="175" width="240" height="505" rx="28" fill="#e2e8f0" opacity=".9"/>
    <circle cx="800" cy="200" r="9" fill="#0f172a"/>`,
  person: `<circle cx="400" cy="320" r="150" fill="#0f172a" opacity=".8"/>
    <path d="M150 800c0-150 110-250 250-250s250 100 250 250z" fill="#0f172a" opacity=".8"/>`,
  tools: `<rect x="560" y="300" width="480" height="300" rx="20" fill="#0f172a" opacity=".85"/>
    <path d="M610 360h380M610 420h300M610 480h340M610 540h220" stroke="#e2e8f0" stroke-width="22" stroke-linecap="round"/>`,
};

const images = [
  {
    file: 'laptop-aero',
    label: 'Northwind Aero 14',
    shape: 'laptop',
    from: '#c7d7fe',
    to: '#6d8ff5',
  },
  {
    file: 'laptop-blaze',
    label: 'Northwind Blaze 16',
    shape: 'laptop',
    from: '#fecaca',
    to: '#f97362',
  },
  { file: 'phone-nova', label: 'Kestrel Nova 5G', shape: 'phone', from: '#bbf7d0', to: '#34b37a' },
  { file: 'phone-orbit', label: 'Orbit X2', shape: 'phone', from: '#fde68a', to: '#e0a526' },
  {
    file: 'computing-desk',
    label: 'Computing sample',
    shape: 'tools',
    from: '#e0e7ff',
    to: '#94a3b8',
  },
  { file: 'phones-desk', label: 'Phones sample', shape: 'tools', from: '#dcfce7', to: '#94a3b8' },
  {
    file: 'TODO-replace',
    label: 'Replace this image',
    shape: 'tools',
    from: '#f1f5f9',
    to: '#cbd5e1',
  },
  {
    file: 'author-asha',
    label: 'Sample author',
    shape: 'person',
    from: '#e9d5ff',
    to: '#a78bfa',
    square: true,
  },
  {
    file: 'author-rohan',
    label: 'Sample author',
    shape: 'person',
    from: '#bae6fd',
    to: '#38bdf8',
    square: true,
  },
];

for (const img of images) {
  const [w, h] = img.square ? [800, 800] : [1600, 900];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${img.from}"/><stop offset="1" stop-color="${img.to}"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    ${shapes[img.shape]}
    <rect x="40" y="40" width="${img.square ? 330 : 360}" height="64" rx="32" fill="#0f172a"/>
    <text x="${img.square ? 205 : 220}" y="82" font-family="DejaVu Sans, sans-serif" font-size="26" font-weight="700" fill="#fff" text-anchor="middle" letter-spacing="3">SAMPLE IMAGE</text>
    ${img.square ? '' : `<text x="${w / 2}" y="${h - 70}" font-family="DejaVu Sans, sans-serif" font-size="44" font-weight="700" fill="#0f172a" text-anchor="middle">${escape(img.label)}</text>`}
  </svg>`;
  await sharp(Buffer.from(svg))
    .jpeg({ quality: 78, mozjpeg: true })
    .toFile(`${out}/${img.file}.jpg`);
  console.log(`${out}/${img.file}.jpg`);
}
