"use client";

import {useEffect, useRef, useState} from "react";
import {useTranslations} from "next-intl";

import {clusterById} from "@/content/clusters";
import type {AppLocale} from "@/i18n/routing";
import {resolveLocalizedText} from "@/lib/portfolio-types";
import type {PortfolioNode} from "@/lib/portfolio-types";

import type {GraphTarget} from "@/lib/portfolio-graph";
import {CaseEvidence} from "./CaseEvidence";
import {ResponsiveImage} from "./ResponsiveImage";
import {ProceduralCover} from "./ProceduralCover";

type NodeDetailsPanelProps = {
  node: PortfolioNode;
  locale: AppLocale;
  onClose: () => void;
  onNavigate: (target: GraphTarget) => void;
};

export function NodeDetailsPanel({node, locale, onClose, onNavigate}: NodeDetailsPanelProps) {
  const t = useTranslations("Details");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const navigatingRef = useRef(false);
  const [imageFailed, setImageFailed] = useState(false);
  const cluster = clusterById[node.cluster];
  const title = resolveLocalizedText(node.title, locale);

  useEffect(() => {
    const dialog = dialogRef.current;
    navigatingRef.current = false;
    setImageFailed(false);
    if (dialog && !dialog.open) dialog.showModal();

    return () => {
      requestAnimationFrame(() => {
        // The case action unmounts while the dialog is open, so activeElement
        // at effect time may already be the body in a production render.
        const opener = document.getElementById("open-case-action");
        const destination = navigatingRef.current || !opener || opener.matches(":disabled")
          ? document.getElementById("career-explorer-action") : opener;
        destination?.focus();
      });
    };
  }, [node.id]);

  return (
    <dialog
      ref={dialogRef}
      className="node-dialog"
      aria-labelledby="node-dialog-title"
      onClose={onClose}
      onCancel={(event) => {event.preventDefault(); event.stopPropagation(); dialogRef.current?.close();}}
    >
      <div className="node-dialog__inner">
        <button
          type="button"
          className="dialog-close"
          aria-label={t("close")}
          onClick={() => dialogRef.current?.close()}
          autoFocus
        >
          <span aria-hidden="true">×</span>
        </button>

        <div className="node-dialog__visual">
          {node.coverImage && !imageFailed ? (
            <ResponsiveImage
              src={node.coverImage.src}
              sizes="(max-width: 768px) calc(100vw - 48px), 656px"
              alt={resolveLocalizedText(node.coverImage.alt, locale)}
              width={960}
              height={540}
              loading="lazy"
              decoding="async"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <ProceduralCover node={node} locale={locale} />
          )}
        </div>

        {(!node.coverImage || imageFailed || node.coverImage.category === "conceptual" || node.confidential) && <p className="case-visual-caption">{t("conceptual")}</p>}
        <div className="node-dialog__content">
          <p className="eyebrow">
            {t("cluster")} / {resolveLocalizedText(cluster.title, locale)}
          </p>
          <h2 id="node-dialog-title">{title}</h2>
          <p className="node-summary">{resolveLocalizedText(node.summary, locale)}</p>
          <p className="node-description">
            {resolveLocalizedText(node.description, locale)}
          </p>

          <CaseEvidence node={node} locale={locale} onNavigate={(target) => {
            navigatingRef.current = true;
            onNavigate(target);
          }} />
        </div>
      </div>
    </dialog>
  );
}
