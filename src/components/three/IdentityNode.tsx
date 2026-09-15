import {useRef, useState} from "react";
import {Billboard, Html} from "@react-three/drei";
import {useFrame, useThree} from "@react-three/fiber";
import {useTranslations} from "next-intl";
import {Group, MathUtils, MeshBasicMaterial, Vector3} from "three";

import {identity} from "@/content/identity";
import {IdentityActions} from "@/components/portfolio/IdentityActions";
import {getFormationProgress, imageFormationConfig} from "@/lib/scene-config";
import {resolveLocalizedText} from "@/lib/portfolio-types";
import {activateWorldItem} from "@/lib/world-interaction";
import {useExperienceStore} from "@/store/experience-store";

import {FragmentedProjectCover} from "./FragmentedProjectCover";
import {MicroUniverse} from "./MicroUniverse";
import {useProjectCoverTexture} from "./useProjectCoverTexture";

const identityPosition = new Vector3(...identity.position);

export function IdentityNode() {
  const core = useRef<Group>(null);
  const coreMaterial = useRef<MeshBasicMaterial>(null);
  const ringMaterial = useRef<MeshBasicMaterial>(null);
  const composition = useRef<Group>(null);
  const label = useRef<HTMLDivElement>(null);
  const distanceRef = useRef(Infinity);
  const revealRef = useRef({image: false, focused: false});
  const [reveal, setReveal] = useState(revealRef.current);
  const locale = useExperienceStore((state) => state.locale);
  const stage = useExperienceStore((state) => state.stage);
  const reducedMotion = useExperienceStore((state) => state.reducedMotion);
  const quality = useExperienceStore((state) => state.quality);
  const focusIdentity = useExperienceStore((state) => state.focusIdentity);
  const size = useThree((state) => state.size);
  const t = useTranslations("Identity");
  const prominent = stage === "overview" || stage === "identity-focus";
  const focused = prominent && reveal.focused;
  const cover = useProjectCoverTexture(identity, locale, prominent, stage === "identity-focus");

  useFrame(({camera}, delta) => {
    distanceRef.current = camera.position.distanceTo(identityPosition);
    const previous = revealRef.current;
    const image = prominent && distanceRef.current < imageFormationConfig.fragmentsDistance + (previous.image ? 1 : 0);
    const nextFocused = prominent && distanceRef.current < (previous.focused ? 13 : 11.5);
    if (image !== previous.image || nextFocused !== previous.focused) {
      revealRef.current = {image, focused: nextFocused};
      setReveal(revealRef.current);
    }
    if (core.current) {
      core.current.scale.setScalar(MathUtils.damp(core.current.scale.x, prominent ? image ? 0.6 : 1 : 0.72, 4, delta));
      if (!reducedMotion) core.current.rotation.y += delta * 0.045;
    }
    // Fit the revealed composition in portrait screens without changing the camera.
    if (composition.current) {
      const scale = image ? Math.min(1, size.width / size.height * 1.8) : 1;
      composition.current.scale.setScalar(MathUtils.damp(composition.current.scale.x, scale, 7, delta));
    }
    const coreOpacity = cover ? 1 - getFormationProgress(distanceRef.current) : 1;
    if (coreMaterial.current) coreMaterial.current.opacity = 0.66 * coreOpacity;
    if (ringMaterial.current) ringMaterial.current.opacity = 0.48 * coreOpacity;
    if (label.current) label.current.style.opacity = prominent ? "1" : "0.35";
  });

  return (
    <group position={identity.position}>
      <group ref={composition}>
        <MicroUniverse satellites={identity.signals} color="#78d7ff" radius={6.3}
          emphasis={focused ? 0.2 : prominent ? 0.85 : 0.15} ambient />
        <group ref={core} onClick={(event) => activateWorldItem(event, focusIdentity)}>
          <mesh>
            <icosahedronGeometry args={[1.15, 1]} />
            <meshBasicMaterial ref={coreMaterial} color="#b9eaff" wireframe transparent opacity={0.66} depthWrite={false} />
          </mesh>
          <mesh rotation={[0.7, 0.4, 0]}>
            <torusGeometry args={[1.6, 0.012, 4, 64]} />
            <meshBasicMaterial ref={ringMaterial} color="#78d7ff" transparent opacity={0.48} depthWrite={false} />
          </mesh>
        </group>
        {reveal.image && cover && <Billboard follow position={[0, 0.8, 0]}>
          <group scale={0.72} onClick={(event) => activateWorldItem(event, focusIdentity)}>
            <FragmentedProjectCover cover={cover} distanceRef={distanceRef} quality={quality} reducedMotion={reducedMotion} seed={identity.id} />
          </group>
        </Billboard>}
      </group>
      <Billboard follow>
        <Html center position={[0, reveal.image ? -1.3 : -2.1, 0]} zIndexRange={[22, 0]} style={{pointerEvents: "none"}}>
          <div ref={label} className={`identity-world-label${reveal.image ? " identity-world-label--near" : ""}`}>
            <button className="identity-focus-trigger" type="button" aria-label={t("focus", {name: identity.shortName})}
              aria-expanded={focused} onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => activateWorldItem(event, focusIdentity)}>
              <strong>{resolveLocalizedText(identity.title, locale)}</strong>
              <span>{resolveLocalizedText(identity.primaryRole, locale)}</span>
              <small>{resolveLocalizedText(identity.secondaryRole, locale)}</small>
            </button>
            <p className={`identity-summary${focused ? " is-visible" : ""}`} aria-hidden={!focused}>
              {resolveLocalizedText(identity.summary, locale)}
            </p>
            <IdentityActions locale={locale} visible={focused} spatial labels={{contactActions: t("contactActions", {name: identity.shortName}), unavailable: t("unavailable"), downloadPdf: t("downloadPdf")}} />
          </div>
        </Html>
      </Billboard>
    </group>
  );
}
