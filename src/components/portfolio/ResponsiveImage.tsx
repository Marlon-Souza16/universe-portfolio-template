import {useState} from "react";
import type {ImgHTMLAttributes} from "react";
import {getImageVariants} from "@/lib/image-variants";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet"> & {
  src: string;
  thumbnail?: boolean;
};

/** Static responsive assets also work with remote originals and standalone hosting. */
export function ResponsiveImage({src, thumbnail = false, onError, width = 960, height = 540, ...props}: Props) {
  const [failedVariant, setFailedVariant] = useState<string | null>(null);
  const variants = failedVariant === src ? undefined : getImageVariants(src);
  const selected = thumbnail ? variants?.thumbnail : variants?.full;
  const srcSet = !thumbnail && variants && variants.thumbnail.src !== variants.full.src
    ? `${variants.thumbnail.src} ${variants.thumbnail.width}w, ${variants.full.src} ${variants.full.width}w`
    : undefined;
  return <img {...props} src={selected?.src ?? src} srcSet={srcSet}
    width={selected?.width ?? width} height={selected?.height ?? height}
    loading="lazy" decoding="async"
    onError={event => {
      if (variants && (selected?.src !== src || srcSet)) setFailedVariant(src);
      else onError?.(event);
    }} />;
}
