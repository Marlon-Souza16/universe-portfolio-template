import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import {optimizeImages} from './optimize-images.mjs';

test('image pipeline bounds dimensions, preserves originals, avoids upscaling and is repeatable', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'portfolio-images-'));
  try {
    const assets = path.join(root, 'public/assets');
    await mkdir(assets, {recursive: true});
    const large = await sharp({create: {width: 4000, height: 2250, channels: 3, background: '#224466'}}).png().toBuffer();
    await sharp(large).toFile(path.join(assets, 'large.png'));
    await sharp({create: {width: 120, height: 240, channels: 3, background: '#446688'}}).jpeg({quality: 65}).toFile(path.join(assets, 'small.jpg'));
    const result = await optimizeImages(root);
    assert.deepEqual(await readFile(path.join(assets, 'large.png')), large);
    assert.equal(result['/assets/large.png'].thumbnail.width, 960);
    assert.equal(result['/assets/large.png'].thumbnail.height, 540);
    assert.equal(result['/assets/large.png'].full.width, 1920);
    assert.equal(result['/assets/large.png'].full.height, 1080);
    assert.equal(result['/assets/small.jpg'].full.width, 120);
    assert.equal(result['/assets/small.jpg'].full.height, 240);
    assert.ok(result['/assets/small.jpg'].full.bytes <= (await readFile(path.join(assets, 'small.jpg'))).length);
    for (const variants of Object.values(result)) for (const variant of [variants.thumbnail, variants.full]) {
      const data = await readFile(path.join(root, 'public', variant.src));
      const metadata = await sharp(data).metadata();
      assert.equal(data.length, variant.bytes);
      assert.equal(metadata.width, variant.width);
      assert.equal(metadata.height, variant.height);
    }
    assert.deepEqual(await optimizeImages(root), result);
  } finally {await rm(root, {recursive: true, force: true});}
});

test('efficient originals and vectors are kept; EXIF rotation and transparency survive resizing', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'portfolio-formats-'));
  try {
    const assets = path.join(root, 'public/assets');
    await mkdir(assets, {recursive: true});
    const pixels = Buffer.alloc(240 * 120 * 3);
    let seed = 7;
    for (let i = 0; i < pixels.length; i++) {seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; pixels[i] = seed >>> 24;}
    await sharp(pixels, {raw: {width: 240, height: 120, channels: 3}}).jpeg({quality: 10}).toFile(path.join(assets, 'efficient.jpg'));
    await sharp(pixels, {raw: {width: 240, height: 120, channels: 3}}).jpeg().withMetadata({orientation: 6}).toFile(path.join(assets, 'rotated.jpg'));
    await sharp({create: {width: 1200, height: 600, channels: 4, background: '#11223366'}}).png().toFile(path.join(assets, 'alpha.png'));
    const {writeFile} = await import('node:fs/promises');
    await writeFile(path.join(assets, 'vector.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540"/>');
    const result = await optimizeImages(root);
    assert.equal(result['/assets/vector.svg'], undefined);
    assert.equal(result['/assets/efficient.jpg'].full.src, '/assets/efficient.jpg');
    assert.equal(result['/assets/rotated.jpg'].full.width, 120);
    assert.equal(result['/assets/rotated.jpg'].full.height, 240);
    const alpha = await sharp(path.join(root, 'public', result['/assets/alpha.png'].thumbnail.src)).metadata();
    assert.equal(alpha.hasAlpha, true);
  } finally {await rm(root, {recursive: true, force: true});}
});
