# Image and rendering audit — 2026-09-15

## Scope and method

Audited the existing template and ran `npm run build` / `npm run start` before and
after changes. Chrome DevTools MCP was unavailable, so a temporary Playwright
Chromium 153 browser supplied screenshots, resource timings, animation-frame
intervals, React DevTools root commit notifications and instrumentation around
WebGL texture-upload/shader APIs. No browser test dependency was added to the
project. Tests used SwiftShader software WebGL, not the user's physical GPU.

Desktop: 1440×900 CSS pixels, device scale factor 2. Mobile emulation: 390×844,
scale factor 2, touch/coarse pointer. Both use the same sequence: enter English,
settle overview, enter Key Projects, settle cluster, open the explorer, focus the
example project, open its case. Interaction measurements cover 2500 ms from the
corresponding pointer event. Root commit counts include DOM, Drei Html and the
R3F root; they are not counts of project-mesh renders.

[Machine-readable measurements](image-audit.json) retain the final before/after
samples. These are single synthetic runs, not a statistically established speedup
or a physical-mobile benchmark. Desktop software rendering produces large stalls
in both builds. No hardware FPS improvement is claimed.

## Bottlenecks and existing protections

- Project covers used manual `TextureLoader`, started inside `NodePreview` only
  after the preview mounted. There was no separate decode, contextual preload or
  explicit GPU preparation step. The first reveal also mounted its materials and
  geometry, so preparation coincided with camera approach.
- In this checkout, the only project cover is a **398-byte, 960×540 SVG**. Other
  shipped case SVGs are 398–402 bytes, also 960×540. Procedural covers are 960×540.
  There are no oversized real project photographs to optimize or benchmark here.
- During baseline desktop cluster entry, the cover request started **474.4 ms**
  after the click, took **2.1 ms**, and uploaded at **685.3 ms** after the click.
  The sampled upload API call took **6.0 ms**; this is CPU wall time, not GPU time.
  Late loading/preparation is evident; network transfer was small and fast.
- The baseline already reused cached covers. The measured project-focus step
  occurred after visiting the cluster and had **zero** cover uploads even before
  this patch. This run does **not** establish texture upload as the cause of the
  user's focus-only stutter with their own content.
- Canvas DPR was already capped/adaptive: high 1–1.5, medium 1–1.25, low 0.85–1.
  Particle budgets were already quality-dependent. These were preserved.
- Camera motion mutates refs/Three objects; store changes occur on arrival/back
  navigation. Local frame callbacks update React at reveal/micro-universe state
  boundaries, not unconditionally each frame. No evidence justified replacing
  state management or changing scene effects.
- The old shared texture cache had reference counts and an eight-entry target.
  It lacked a bounded loading queue. Its lifecycle was extended, not replaced
  with a second texture loader/cache system.
- No project-focus render-target allocation was found. Cover geometries were
  memoized. Shader materials depended on the cover object, which would cause
  resource recreation and progress reset during a newly introduced resolution
  swap unless corrected. This was a prerequisite for progressive covers, not an
  observed pre-existing two-resolution bug.

## Changes

See the [reusable image guide](../en/image-performance.md) for commands and asset
conventions. The implementation adds bounded contextual thumbnail preparation,
full-cover requests on hover/selection, explicit decode and GPU initialization,
a shared URL cache with two concurrent loads, priority for queued full covers,
abandoned-queue cancellation, and disposal of unheld LRU entries above the target.

Thumbnail/full swaps update existing shader uniforms; geometry, material and
formation progress survive the swap. Geometry and material disposal effects now
track their own lifetimes independently. Identity preparation is also separated
from its original distance-based visibility gate.

DOM images remain DOM images: responsive static variants, generated dimensions,
`sizes`, lazy loading, decoding and original-source/procedural fallbacks are shared
by case media, the case cover and explorer cards. Original content JSON remains
compatible. SVGs are kept intact; the checked-in generated manifest is empty.

## Before / after

| Measurement | Before | Final |
| --- | ---: | ---: |
| Desktop cover request relative to cluster click | +474.4 ms | −2559.3 ms |
| Desktop cover upload relative to cluster click | +685.3 ms | −2532.1 ms |
| Mobile cover upload relative to cluster click | +402.3 ms | −2583.0 ms |
| Cover uploads during cluster approach | 1 | 0 |
| Cover uploads during subsequent project focus | 0 | 0 |
| Desktop canvas buffer | 2160×1350 | 2160×1350 |
| Mobile canvas buffer | 487×1055 | 487×1055 |
| Shipped project cover bytes | 398 | 398 |
| Desktop focus p95 frame interval | 200.0 ms | 266.6 ms |
| Desktop focus maximum frame interval | 383.3 ms | 350.0 ms |
| Mobile focus p95 frame interval | 16.8 ms | 16.7 ms |
| Desktop React root commits during focus | 52 | 52 |
| Mobile React root commits during focus | 59 | 59 |

Negative timings mean the cover was prepared from nearby preview candidates in
the overview before the user selected the cluster. Contextual preparation may
instead start on cluster selection when a project is farther away. The objective
change is preparation timing, not an established FPS gain. Desktop p95 worsened
in the final sample while its maximum improved; intermediate runs also varied.

One WebGL cover upload was recorded across initial focus and a later back/refocus
cycle. The original SVG has an additional DOM request when opening the explorer:
it revalidates with 300 transferred header bytes and no new body payload. This is
not a duplicate GPU texture. The patch does not claim to eliminate all DOM HTTP
revalidation. Cache-control behavior of original public assets remains unchanged.

## Large-image fixture (isolated copy, not shipped content)

The existing illustration was rasterized to a 4000×2250 PNG in `/tmp`, then the
optimizer and a separate production build were run against it:

| Asset | Dimensions | File bytes | Estimated RGBA + mipmaps |
| --- | --- | ---: | ---: |
| Original PNG | 4000×2250 | 212,264 | 45.8 MiB |
| Thumbnail WebP | 960×540 | 4,308 | 2.6 MiB |
| Full WebP | 1920×1080 | 10,010 | 10.5 MiB |

The estimates use `width × height × 4 × 4/3`; they are not measured GPU allocation.
A focused node can retain both variants (about 13.2 MiB combined for this fixture).
Source assets remain unchanged.

A five-second full-cover response delay kept the thumbnail displayed after camera
arrival. Screenshots before/after the swap preserved composition and crop, with
no observed blank/reset. Instrumentation recorded one 960×540 upload and one
1920×1080 upload, with **zero shader compilation calls after the full upload**.
The full texture's measured upload API call took about 21 ms in software WebGL:
preloading moves that work; it does not make uploading free. Deliberate request
interception disables browser HTTP caching, so fixture request counts must not be
compared with normal HTTP-cache measurements. All case images eventually resolved
under the delayed-response test.

## Validation and limits

- Content/schema/asset/navigation and cache tests passed via `npm run validate:content`.
- Sharp tests passed: dimension bounds, aspect ratio, no enlargement, original
  preservation, deterministic reruns, efficient JPEG retention, SVG preservation,
  EXIF rotation and alpha preservation.
- `npm run typecheck`, `git diff --check`, and the production build passed.
- Desktop/mobile project focus, case images, back/refocus and reduced motion were
  checked in the real browser. This is mobile emulation, not a physical handset.
- No new console error was observed in normal flows. The existing dependency
  warning remains: `THREE.Clock` is deprecated (R3F creates the clock internally).
  Next also prints its existing `next start`/standalone advisory.
- There is no lint script or ESLint configuration in this template; TypeScript,
  existing validation and whitespace checks were used, rather than claiming lint ran.

## Remaining measurement

Profile the user's actual cover assets on a physical GPU/mobile device if the
focus-only stutter persists. The sample cannot establish its cause, and software
rendering cannot distinguish the user's GPU bottlenecks. No evidence here warrants
KTX2/Basis, navigation redesign, or reducing secondary effects.
