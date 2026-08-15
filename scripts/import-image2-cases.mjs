import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const sourceFile = process.argv[2] || '/Users/castor/Documents/work hub/awesome-gpt-image-2/data/cases.json';
const outputFile = resolve(process.cwd(), 'backend/image2-cases.json');
const sourceRoot = dirname(sourceFile);
const assetDir = resolve(process.cwd(), 'backend/data/image2-assets');
const source = JSON.parse(readFileSync(sourceFile, 'utf8'));

const sceneMap = [
  { keys: ['Products & E-commerce', 'Commerce'], scene: 'ecommerce', ratio: '1:1' },
  { keys: ['Posters & Typography', 'Social'], scene: 'marketing', ratio: '4:5' },
  { keys: ['Brand & Logos'], scene: 'brand', ratio: '1:1' },
  { keys: ['UI & Interfaces', 'Documents & Publishing'], scene: 'content', ratio: '3:4' },
];

function mapScene(item) {
  const text = [item.category, ...(item.scenes || [])].join(' ');
  return sceneMap.find((entry) => entry.keys.some((key) => text.includes(key))) || {
    scene: 'image',
    ratio: '1:1',
  };
}

mkdirSync(assetDir, { recursive: true });

const cases = (source.cases || []).map((item) => {
  const mapping = mapScene(item);
  const relativeImage = item.image ? item.image.replace(/^\//, '') : '';
  const sourceImage = relativeImage ? resolve(sourceRoot, relativeImage) : '';
  const localImageName = relativeImage ? relativeImage.split('/').pop() : '';
  if (sourceImage && localImageName) {
    copyFileSync(sourceImage, resolve(assetDir, localImageName));
  }
  return {
    id: `image2-case-${item.id}`,
    title: item.title,
    content: item.prompt,
    images: localImageName ? [`/api/ggoo/prompt-gallery/image2/assets/${encodeURIComponent(localImageName)}`] : [],
    tags: [...new Set([...(item.styles || []), ...(item.scenes || [])])],
    contributor: '',
    notes: '',
    category: item.category,
    styles: item.styles || [],
    scenes: item.scenes || [],
    recommendedScene: mapping.scene,
    recommendedRatio: mapping.ratio,
    referenceRoles: [],
    caseType: 'featured',
    reviewStatus: 'published',
  };
});

mkdirSync(dirname(outputFile), { recursive: true });
writeFileSync(outputFile, `${JSON.stringify(cases, null, 2)}\n`);
console.log(`Imported ${cases.length} image2 cases and copied images into ${assetDir}`);
