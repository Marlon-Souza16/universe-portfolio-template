import {useTranslations} from "next-intl";
import {useId, useState} from "react";

import {clusters} from "@/content/clusters";
import {identity} from "@/content/identity";
import {portfolioNodes} from "@/content/nodes";
import type {AppLocale} from "@/i18n/routing";
import {resolveLocalizedText, type PortfolioNode} from "@/lib/portfolio-types";
import {useExperienceStore} from "@/store/experience-store";

import {ResponsiveImage} from "./ResponsiveImage";
import {ProceduralCover} from "./ProceduralCover";
import {IdentityActions} from "./IdentityActions";

type VectorSpaceFallbackProps = {
  locale: AppLocale;
  webglUnavailable?: boolean;
  onNavigate?: () => void;
};

function ExplorerCover({node, locale}: {node: PortfolioNode; locale: AppLocale}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const cover = node.coverImage;

  if (!cover || failedSource === cover.src) {
    return <ProceduralCover node={node} locale={locale} compact />;
  }

  return (
    <span className="fallback-node__cover">
      <ResponsiveImage
        src={cover.src}
        thumbnail
        alt={resolveLocalizedText(cover.alt, locale)}
        width={960}
        height={540}
        loading="lazy"
        decoding="async"
        onError={() => setFailedSource(cover.src)}
      />
      <strong>{resolveLocalizedText(node.title, locale)}</strong>
    </span>
  );
}

export function VectorSpaceFallback({
  locale,
  webglUnavailable = false,
  onNavigate,
}: VectorSpaceFallbackProps) {
  const t = useTranslations("Fallback");
  const identityText = useTranslations("Identity");
  const titleId = useId();
  const selectedClusterId = useExperienceStore((state) => state.selectedClusterId);
  const focusCluster = useExperienceStore((state) => state.focusCluster);
  const focusNode = useExperienceStore((state) => state.focusNode);
  const focusIdentity = useExperienceStore((state) => state.focusIdentity);
  const stage = useExperienceStore((state) => state.stage);

  return (
    <section className="fallback-map" aria-labelledby={titleId}>
        <header className="fallback-map__header">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h2 id={titleId}>{webglUnavailable ? t("title") : t("explore")}</h2>
          <p>{resolveLocalizedText(identity.title, locale)} · {resolveLocalizedText(identity.primaryRole, locale)} · {resolveLocalizedText(identity.secondaryRole, locale)}</p>
          <button type="button" className="text-action" onClick={() => {focusIdentity(); onNavigate?.();}}>{identityText("focus", {name: identity.shortName})}</button>
          {webglUnavailable && stage === "identity-focus" && <>
            <p>{resolveLocalizedText(identity.summary, locale)}</p>
            <IdentityActions locale={locale} visible labels={{contactActions: identityText("contactActions", {name: identity.shortName}), unavailable: identityText("unavailable"), downloadPdf: identityText("downloadPdf")}} />
          </>}
          {webglUnavailable && <p>{t("description")}</p>}
        </header>

      <div className="fallback-clusters">
        {clusters.map((cluster) => {
          const nodes = portfolioNodes.filter((node) => node.cluster === cluster.id);
          const clusterTitle = resolveLocalizedText(cluster.title, locale);
          const isSelected = selectedClusterId === cluster.id;

          return (
            <article
              className={`fallback-cluster${isSelected ? " is-selected" : ""}`}
              key={cluster.id}
            >
              <h3>
                <button
                  type="button"
                  className="fallback-cluster__header"
                  onClick={() => focusCluster(cluster.id)}
                  aria-expanded={isSelected}
                >
                  <span className="cluster-index" aria-hidden="true">
                    {String(clusters.indexOf(cluster) + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <strong>{clusterTitle}</strong>
                    <small>{resolveLocalizedText(cluster.description, locale)}</small>
                  </span>
                </button>
              </h3>

              <div className="fallback-nodes">
                {nodes.length === 0 && <p className="case-note">{t("empty")}</p>}
                {nodes.map((node) => {
                  const title = resolveLocalizedText(node.title, locale);
                  return (
                    <button
                      type="button"
                      className="fallback-node"
                      key={node.id}
                      onClick={() => {focusNode(node.id, node.cluster, webglUnavailable); onNavigate?.();}}
                      aria-label={t("openNode", {title})}
                    >
                      <ExplorerCover node={node} locale={locale} />
                      <span className="fallback-node__summary">{resolveLocalizedText(node.summary, locale)}</span>
                    </button>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
