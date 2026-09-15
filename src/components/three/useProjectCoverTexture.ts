import {useEffect, useState} from "react";
import {useThree} from "@react-three/fiber";
import {SRGBColorSpace, Texture, TextureLoader, Vector2} from "three";

import type {AppLocale} from "@/i18n/routing";
import {CoverResourceCache} from "@/lib/cover-resource-cache";
import {getImageVariants} from "@/lib/image-variants";
import type {CoreIdentity, PortfolioNode} from "@/lib/portfolio-types";
import {createProjectFallbackTexture} from "./createProjectFallbackTexture";

export type ProjectCoverTexture = {texture: Texture; uvOffset: Vector2; uvScale: Vector2};
const cache = new CoverResourceCache<ProjectCoverTexture>(8, cover => cover.texture.dispose());

async function loadImageTexture(src: string): Promise<ProjectCoverTexture> {
  const texture = await new TextureLoader().setCrossOrigin("anonymous").loadAsync(src);
  const image = texture.image as HTMLImageElement;
  try {
    // TextureLoader's load event alone does not guarantee decoded pixels are ready.
    await image.decode();
  } catch (error) {
    texture.dispose();
    throw error;
  }
  const imageAspect = image.width / image.height;
  const targetAspect = 16 / 9;
  const uvScale = new Vector2(1, 1);
  const uvOffset = new Vector2(0, 0);
  if (imageAspect > targetAspect) {
    uvScale.x = targetAspect / imageAspect;
    uvOffset.x = (1 - uvScale.x) / 2;
  } else {
    uvScale.y = imageAspect / targetAspect;
    uvOffset.y = (1 - uvScale.y) / 2;
  }
  texture.repeat.copy(uvScale);
  texture.offset.copy(uvOffset);
  texture.colorSpace = SRGBColorSpace;
  return {texture, uvOffset, uvScale};
}

/** Asset lifetime is independent of visual reveal. Full covers never gate thumbnails. */
export function useProjectCoverTexture(
  node: PortfolioNode | CoreIdentity,
  locale: AppLocale,
  active: boolean,
  full = false,
) {
  const gl = useThree(state => state.gl);
  const [preview, setPreview] = useState<ProjectCoverTexture | null>(null);
  const [detail, setDetail] = useState<ProjectCoverTexture | null>(null);
  // Once requested, keep the full lease while active; pointer-out must not downgrade a visible cover.
  const [fullRequest, setFullRequest] = useState<string | null>(null);
  const image = "kind" in node ? node.coverImage : node.image;
  const variants = image ? getImageVariants(image.src) : undefined;
  const previewSrc = variants?.thumbnail.src ?? image?.src;
  const fullSrc = variants?.full.src ?? previewSrc;
  const identity = `${node.id}:${locale}:${image?.src ?? "fallback"}`;

  useEffect(() => {
    if (!active) setFullRequest(null);
    else if (full && fullSrc !== previewSrc) setFullRequest(identity);
  }, [active, full, fullSrc, identity, previewSrc]);

  useEffect(() => {
    setPreview(null);
    if (!active) return;
    let mounted = true;
    const leases: {release: () => void}[] = [];
    const request = async () => {
      let cover: ProjectCoverTexture | null = null;
      if (previewSrc) {
        const lease = cache.acquire(`image:${previewSrc}`, () => loadImageTexture(previewSrc));
        leases.push(lease);
        try {cover = await lease.promise;} catch { /* Original/procedural fallback below. */ }
      }
      if (!cover && mounted && image && previewSrc !== image.src) {
        const lease = cache.acquire(`image:${image.src}`, () => loadImageTexture(image.src));
        leases.push(lease);
        try {cover = await lease.promise;} catch { /* Procedural fallback below. */ }
      }
      if (!cover && mounted) {
        const lease = cache.acquire(`fallback:${identity}`, () => createProjectFallbackTexture(node, locale));
        leases.push(lease);
        cover = await lease.promise;
      }
      if (mounted && cover) {
        // Three deduplicates initialization. Warm the GPU before publishing to reveal meshes.
        gl.initTexture(cover.texture);
        setPreview(cover);
      }
    };
    void request().catch(() => {});
    return () => {mounted = false; leases.forEach(lease => lease.release());};
  }, [active, gl, identity, image, locale, node, previewSrc]);

  const wantsFull = active && (full || fullRequest === identity);
  useEffect(() => {
    setDetail(null);
    if (!wantsFull || !fullSrc || fullSrc === previewSrc) return;
    let mounted = true;
    const lease = cache.acquire(`image:${fullSrc}`, () => loadImageTexture(fullSrc), true);
    void lease.promise.then(cover => {
      if (!mounted || !cover) return;
      gl.initTexture(cover.texture);
      setDetail(cover);
    }).catch(() => { /* Keep the already available preview on failure. */ });
    return () => {mounted = false; lease.release();};
  }, [wantsFull, fullSrc, gl, previewSrc]);

  return active ? detail ?? preview : null;
}
