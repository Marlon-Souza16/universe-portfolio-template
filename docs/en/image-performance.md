# Images and 3D performance

## Generate image variants

After adding or changing raster assets under `public/assets/`, run:

```sh
npm run optimize:images
npm run validate:content
npm run build
```

Keep the originals. Commit the generated `public/assets/optimized/` files and
`src/content/generated/image-variants.json` together with your content. Existing
`src` paths do not change: WebGL and DOM consumers look up those paths in the
manifest. Unprocessed assets and remote URLs continue to use their originals.
No filename guessing, speculative 404 requests, remote downloading or personal
project names are involved.

The Sharp tool generates:

| Variant | Maximum dimension | Naming |
| --- | --- | --- |
| Scene thumbnail | 960 px | `<content-hash>-thumb.webp` |
| Focused cover | 1920 px | `<content-hash>-cover.webp` |

Aspect ratio, EXIF orientation and transparency are preserved; smaller images
are never enlarged. WebP quality is 86. JPEG, PNG and AVIF candidates are compared
at the same dimensions, and the smaller output wins (its extension can therefore
differ from `.webp`). Already-small originals win if they are smaller still.
Dimension limits take precedence for oversized sources, even if resizing happens
to increase file size. SVGs and animated images are left intact. Output names
include source content and settings, so a changed image gets a fresh URL. Unused
older generated files are not automatically deleted; remove them only after
checking that no deployed manifest references them.

The example portfolio uses tiny SVGs, so a normal run generates an empty manifest.
This is intentional. Use `npm run test:images` to exercise real raster fixtures.

## WebGL behavior

- Covers still use Three.js `TextureLoader`; they are not DOM `next/image` assets.
- Entering a cluster warms up to the existing quality profile's preview budget
  (high: 3, medium: 2, low: 1), in content order. Nearby preview candidates also
  prepare their covers before becoming visually revealed.
- Hover or project selection requests the full variant. Direct selection starts
  thumbnail and full requests independently, so full-resolution networking never
  gates the lightweight cover. Very fast clicks or slow networks may still show
  the existing procedural glyph until the thumbnail arrives.
- Images are explicitly decoded, then `WebGLRenderer.initTexture` prepares their
  GPU texture before the hook publishes it. This moves work earlier; GPU upload
  still has a cost, and does not become asynchronous merely because it is preloaded.
- Full textures replace thumbnails only after preparation. Pointer-out does not
  downgrade a visible cover. The reveal's progress, shader material, geometry and
  UV crop remain stable across resolution changes.
- A shared cache deduplicates by asset URL, retains eight entries where possible,
  and never evicts a held texture. Two loads run concurrently; queued full covers
  take priority over queued previews. Abandoned queued work is skipped. Already
  running downloads may finish and become reusable cache entries. Unheld least
  recently used textures are disposed when the cache exceeds its target.
- Generated variants bound texture dimensions. Legacy or remote originals remain
  compatible but have no automatic GPU dimension cap: run the tool on local assets
  or resize remote images at their source.

Existing adaptive quality is retained: high DPR 1–1.5, medium 1–1.25, low 0.85–1,
with Drei `AdaptiveDpr` during orbit interaction. Camera interpolation and reveal
animation continue using refs and Three.js object mutation. React updates remain
at reveal/navigation boundaries; no new per-frame store updates were introduced.

## DOM images

Case images use static responsive `srcSet`/`sizes` with the generated dimensions;
explorer cards use thumbnails. Lazy loading, asynchronous decoding, aspect ratios,
remote image compatibility and procedural error fallbacks are preserved. Missing
generated assets fall back to their original URL. There is no image optimization
server or remote-domain allowlist to configure.

## Validation and profiling

`npm test` includes content/schema/navigation tests, cache lifecycle tests and
Sharp fixture tests. `npm run typecheck` checks TypeScript; this template currently
has no ESLint configuration or lint script. Production builds also validate local
asset paths, including generated manifest paths.

Profile a production build, not `next dev`. On standalone deployments, follow the
existing deployment instructions for starting the traced server and copying static
assets. For local inspection, `npm run build` / `npm run start` serves the same
production client bundles (Next emits its existing standalone-start advisory).

Record cold overview → cluster → focus, direct selection, rapid back/refocus and
mobile/reduced-motion navigation. Compare resource timing, decoded dimensions,
texture upload counts, frame intervals, console messages and screenshots. Test a
slow full-cover response: the thumbnail should remain visible without a blank
frame or restarting the fragmentation animation. File bytes alone do not measure
GPU memory: an RGBA texture with mipmaps uses approximately `width × height × 4 × 4/3`
bytes. Hardware profiling is needed before considering KTX2/Basis or changing
secondary scene effects.

API references: [Three.js texture preparation](https://threejs.org/docs/pages/WebGLRenderer.html),
[Sharp resizing](https://sharp.pixelplumbing.com/api-resize/),
[Sharp output formats](https://sharp.pixelplumbing.com/api-output/).
