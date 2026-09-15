import {createHash} from 'node:crypto';
import {mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import sharp from 'sharp';

const outputDirectory = 'assets/optimized';
const targets = {thumbnail: 960, full: 1920};
const quality = 86;

async function* sources(directory) {
  for (const entry of (await readdir(directory, {withFileTypes: true})).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory() && entry.name !== 'optimized') yield* sources(file);
    else if (entry.isFile() && /\.(png|jpe?g|webp|avif|tiff?)$/i.test(entry.name)) yield file;
  }
}

/** Generates variants without modifying content or originals. SVG/animated assets stay intact. */
export async function optimizeImages(root = process.cwd()) {
  const publicRoot = path.join(root, 'public');
  const output = path.join(publicRoot, outputDirectory);
  await mkdir(output, {recursive: true});
  const manifest = {};
  for await (const file of sources(path.join(publicRoot, 'assets'))) {
    const source = await readFile(file);
    const metadata = await sharp(source).metadata();
    if (!metadata.width || !metadata.height || (metadata.pages ?? 1) > 1) continue;
    const src = '/' + path.relative(publicRoot, file).split(path.sep).map(encodeURIComponent).join('/');
    const hash = createHash('sha256').update(src).update(source).update(JSON.stringify({targets, quality})).digest('hex').slice(0, 16);
    const variants = {};
    for (const [name, dimension] of Object.entries(targets)) {
      const pipeline = () => sharp(source).autoOrient().resize({width: dimension, height: dimension, fit: 'inside', withoutEnlargement: true});
      const webp = await pipeline().webp({quality, effort: 5}).toBuffer({resolveWithObject: true});
      let chosen = webp;
      // Compare at the SAME dimensions; file size must not defeat the texture pixel budget.
      if (['jpeg', 'png', 'avif'].includes(metadata.format)) {
        const native = await pipeline().toFormat(metadata.format, metadata.format === 'png' ? {compressionLevel: 9} : {quality}).toBuffer({resolveWithObject: true});
        if (native.data.length < chosen.data.length) chosen = native;
      }
      const fits = Math.max(metadata.width, metadata.height) <= dimension;
      if (fits && (!metadata.orientation || metadata.orientation === 1) && source.length <= chosen.data.length) {
        variants[name] = {src, width: metadata.width, height: metadata.height, bytes: source.length};
      } else {
        const extension = chosen.info.format === 'jpeg' ? 'jpg' : chosen.info.format;
        const filename = `${hash}-${name === 'thumbnail' ? 'thumb' : 'cover'}.${extension}`;
        await writeFile(path.join(output, filename), chosen.data);
        variants[name] = {src: `/${outputDirectory}/${filename}`, width: chosen.info.width, height: chosen.info.height, bytes: chosen.data.length};
      }
    }
    // Small sources may generate identical variants. Reuse one URL and GPU texture.
    if (variants.thumbnail.width === variants.full.width && variants.thumbnail.height === variants.full.height) variants.thumbnail = variants.full;
    manifest[src] = {source: {width: metadata.width, height: metadata.height, bytes: source.length}, ...variants};
  }
  const generated = path.join(root, 'src/content/generated');
  await mkdir(generated, {recursive: true});
  await writeFile(path.join(generated, 'image-variants.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const manifest = await optimizeImages();
  for (const [src, {source, thumbnail, full}] of Object.entries(manifest)) {
    console.log(`${src}: ${source.width}×${source.height} / ${source.bytes} B → thumb ${thumbnail.width}×${thumbnail.height} / ${thumbnail.bytes} B, cover ${full.width}×${full.height} / ${full.bytes} B`);
  }
  console.log(`Inspected ${Object.keys(manifest).length} raster images. Originals preserved. SVG and animated images are unchanged.`);
}
