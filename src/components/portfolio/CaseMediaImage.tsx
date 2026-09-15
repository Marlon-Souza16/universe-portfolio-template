import {useTranslations} from "next-intl";
import {useState} from "react";
import {resolveLocalizedText} from "@/lib/portfolio-types";
import type {AppLocale, PortfolioImage, PortfolioNode} from "@/lib/portfolio-types";
import {ResponsiveImage} from "./ResponsiveImage";
import {ProceduralCover} from "./ProceduralCover";

export function CaseMediaImage({image, node, locale}: {image: PortfolioImage; node: PortfolioNode; locale: AppLocale}) {
  const t = useTranslations("Details");
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const failed = failedSource === image.src;
  const alt = resolveLocalizedText(image.alt, locale);
  const caption = resolveLocalizedText(image.caption, locale) || alt;
  return <figure>
    {failed ? <ProceduralCover node={node} locale={locale} /> : (
      <ResponsiveImage src={image.src} alt={alt}
        sizes="(max-width: 768px) calc(100vw - 48px), 640px"
        onError={() => setFailedSource(image.src)} />
    )}
    {(failed || image.category === "conceptual" || caption) && <figcaption>{failed || image.category === "conceptual" ? t("conceptual") : caption}</figcaption>}
  </figure>;
}
