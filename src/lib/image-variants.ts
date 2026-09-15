import manifest from '../content/generated/image-variants.json';

type ImageVariant = {src: string; width: number; height: number; bytes: number};
type ImageVariants = {source: {width: number; height: number; bytes: number}; thumbnail: ImageVariant; full: ImageVariant};

/** No inferred filenames or speculative requests: unprocessed/remote content uses its original. */
export function getImageVariants(src: string): ImageVariants | undefined {
  return (manifest as Record<string, ImageVariants>)[src];
}
