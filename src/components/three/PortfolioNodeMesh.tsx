import {useMemo, useRef, useState} from "react";
import type {RefObject} from "react";
import {Billboard, Html, Line, useCursor} from "@react-three/drei";
import {useFrame, useThree} from "@react-three/fiber";
import {Group, MathUtils} from "three";

import {portfolioNodes} from "@/content/nodes";
import {imageFormationConfig} from "@/lib/scene-config";
import {clusterById} from "@/content/clusters";
import {nodeRevealDistance, getRevealState} from "@/lib/performance-quality";
import {resolveLocalizedText} from "@/lib/portfolio-types";
import type {NodeRevealState, PortfolioNode, Vector3Tuple} from "@/lib/portfolio-types";
import type {ProjectSatelliteContext} from "@/lib/satellite-layout";
import {
  activateWorldItem,
  worldInteractionPriority,
} from "@/lib/world-interaction";
import {useExperienceStore} from "@/store/experience-store";

import {MicroUniverse} from "./MicroUniverse";
import {FragmentedProjectCover} from "./FragmentedProjectCover";
import type {ProjectCoverTexture} from "./useProjectCoverTexture";
import {useProjectCoverTexture} from "./useProjectCoverTexture";

type PortfolioNodeMeshProps = {
  activePreviewIdsRef: RefObject<ReadonlySet<string>>;
  microUniverseRef: RefObject<ProjectSatelliteContext>;
  node: PortfolioNode;
  position: Vector3Tuple;
};

const previewFrameWidth = 5.6;
const previewFrameHeight = 3.15;
const previewFramePoints: Vector3Tuple[] = [
  [-previewFrameWidth / 2, -previewFrameHeight / 2, 0.04],
  [previewFrameWidth / 2, -previewFrameHeight / 2, 0.04],
  [previewFrameWidth / 2, previewFrameHeight / 2, 0.04],
  [-previewFrameWidth / 2, previewFrameHeight / 2, 0.04],
  [-previewFrameWidth / 2, -previewFrameHeight / 2, 0.04],
];

function NodeCore({node, color}: {node: PortfolioNode; color: string}) {
  const geometry = node.visual.variant;
  return (
    <mesh scale={node.visual.size ?? 1}>
      {geometry === "data-node" && <octahedronGeometry args={[0.38, 0]} />}
      {geometry === "genomic-nebula" && <sphereGeometry args={[0.35, 8, 6]} />}
      {geometry === "agent-network" && <icosahedronGeometry args={[0.38, 0]} />}
      {geometry === "system-module" && <boxGeometry args={[0.58, 0.42, 0.34]} />}
      {geometry === "human-signal" && <torusGeometry args={[0.32, 0.1, 6, 18]} />}
      <meshBasicMaterial color={color} wireframe transparent opacity={0.78} />
    </mesh>
  );
}

function FallbackGlyph({node, color}: {node: PortfolioNode; color: string}) {
  if (node.visual.variant === "system-module") {
    return <>{[-1.2, 0, 1.2].map((x) => <mesh key={x} position={[x, 0.2, 0.03]}><boxGeometry args={[0.7, 0.5, 0.04]} /><meshBasicMaterial color={color} wireframe transparent opacity={0.55} /></mesh>)}</>;
  }
  if (node.visual.variant === "human-signal") {
    return <>{[0.45, 0.85, 1.25].map((radius) => <mesh key={radius} position={[0, 0.2, 0.03]}><ringGeometry args={[radius - 0.015, radius, 40]} /><meshBasicMaterial color={color} transparent opacity={0.28} /></mesh>)}</>;
  }
  if (node.visual.variant === "genomic-nebula") {
    const wave = Array.from({length: 12}, (_, index) => [index * 0.3 - 1.65, Math.sin(index * 0.9) * 0.45 + 0.2, 0.03] as [number, number, number]);
    return <><Line points={wave} color={color} transparent opacity={0.56} lineWidth={0.7} /><Line points={wave.map(([x, y, z]) => [x, -y + 0.4, z] as [number, number, number])} color={color} transparent opacity={0.32} lineWidth={0.7} /></>;
  }
  const nodes: [number, number, number][] = [[-1.4, -0.45, 0.03], [-0.6, 0.7, 0.03], [0.3, 0.1, 0.03], [1.35, 0.65, 0.03]];
  return <>{nodes.slice(0, -1).map((point, index) => <Line key={point.join(":")} points={[point, nodes[index + 1]]} color={color} transparent opacity={0.5} lineWidth={0.7} />)}{nodes.map((point) => <mesh key={point.join(":")} position={point}><circleGeometry args={[0.08, 12]} /><meshBasicMaterial color={color} /></mesh>)}</>;
}

function NodePreview({
  node,
  color,
  distanceRef,
  onActivate,
  cover,
}: {
  node: PortfolioNode;
  color: string;
  distanceRef: RefObject<number>;
  onActivate: () => void;
  cover: ProjectCoverTexture | null;
}) {
  const quality = useExperienceStore((state) => state.quality);
  const reducedMotion = useExperienceStore((state) => state.reducedMotion);

  return (
    <Billboard
      follow
      position={[0, 0.25, 0]}
    >
      {cover ? (
        <FragmentedProjectCover
          cover={cover}
          distanceRef={distanceRef}
          quality={quality}
          reducedMotion={reducedMotion}
          seed={node.id}
        />
      ) : (
        <>
          <mesh position={[0, 0, -0.02]}>
            <planeGeometry args={[5.6, 3.15]} />
            <meshBasicMaterial color="#06131d" transparent opacity={0.18} depthWrite={false} />
          </mesh>
          <FallbackGlyph node={node} color={color} />
        </>
      )}
      <Line points={previewFramePoints} color={color} transparent opacity={0.48} lineWidth={0.7} />
      <mesh
        name={`project-preview-hit-area-${node.id}`}
        position={[0, 0, 0.08]}
        userData={{interactionPriority: worldInteractionPriority.projectPreview}}
        onClick={(event) => activateWorldItem(event, onActivate)}
      >
        <planeGeometry args={[previewFrameWidth, previewFrameHeight]} />
        <meshBasicMaterial
          colorWrite={false}
          depthWrite={false}
          opacity={0}
          transparent
        />
      </mesh>
    </Billboard>
  );
}

export function PortfolioNodeMesh({
  activePreviewIdsRef,
  microUniverseRef,
  node,
  position,
}: PortfolioNodeMeshProps) {
  const groupRef = useRef<Group>(null);
  const microModeRef = useRef<ProjectSatelliteContext["mode"]>("none");
  const [microMode, setMicroMode] = useState<ProjectSatelliteContext["mode"]>("none");
  const [microMounted, setMicroMounted] = useState(false);
  const coreRef = useRef<Group>(null);
  const distanceRef = useRef(Infinity);
  const revealRef = useRef<NodeRevealState>("signal");
  const [reveal, setReveal] = useState<NodeRevealState>("signal");
  const formationActiveRef = useRef(false);
  const [formationActive, setFormationActive] = useState(false);
  const [hovered, setHovered] = useState(false);
  const locale = useExperienceStore((state) => state.locale);
  const reducedMotion = useExperienceStore((state) => state.reducedMotion);
  const selectedNodeId = useExperienceStore((state) => state.selectedNodeId);
  const selectedClusterId = useExperienceStore((state) => state.selectedClusterId);
  const quality = useExperienceStore((state) => state.quality);
  const viewport = useThree((state) => state.size);
  const focusNode = useExperienceStore((state) => state.focusNode);
  const openNodeCase = useExperienceStore((state) => state.openNodeCase);
  const selected = selectedNodeId === node.id;
  const cluster = clusterById[node.cluster];
  const title = resolveLocalizedText(node.title, locale);
  const summary = resolveLocalizedText(node.summary, locale);
  const relevant = !selectedNodeId || selected;
  const showsIdentity = reveal !== "signal" && relevant;
  const showsPreview = reveal === "preview" || reveal === "selected";
  // Limit cluster warming to the same number of covers allowed by the scene budget.
  const clusterIndex = useMemo(() => portfolioNodes.filter(candidate => candidate.cluster === node.cluster)
    .findIndex(candidate => candidate.id === node.id), [node]);
  const clusterWarm = selectedClusterId === node.cluster && !selectedNodeId
    && clusterIndex < imageFormationConfig[quality].activeNodeLimit;
  const cover = useProjectCoverTexture(node, locale,
    selected || hovered || formationActive || clusterWarm, selected || hovered);
  useCursor(hovered);

  useFrame(({camera}, delta) => {
    const group = groupRef.current;
    if (!group) return;
    distanceRef.current = camera.position.distanceTo(group.position);
    const nextReveal = getRevealState(distanceRef.current, revealRef.current, selected);
    if (nextReveal !== revealRef.current) { revealRef.current = nextReveal; setReveal(nextReveal); }
    const nextFormationActive = selected || activePreviewIdsRef.current.has(node.id);
    if (nextFormationActive !== formationActiveRef.current) {
      formationActiveRef.current = nextFormationActive;
      setFormationActive(nextFormationActive);
    }
    const nextMicroMode = microUniverseRef.current.nodeId === node.id ? microUniverseRef.current.mode : "none";
    if (nextMicroMode !== microModeRef.current) {
      microModeRef.current = nextMicroMode;
      setMicroMode(nextMicroMode);
      if (nextMicroMode !== "none") setMicroMounted(true);
    }
    const farScale = distanceRef.current > nodeRevealDistance.signal ? 0.68 : 1;
    const orbitFit = viewport.width < 720 ? 1.05 : 0.64;
    const compactScale = selected ? Math.min(1, viewport.width / viewport.height * orbitFit) : 1;
    const relevanceScale = selectedNodeId && !selected ? 0.55 : selectedClusterId && selectedClusterId !== node.cluster ? 0.75 : 1;
    const targetScale = (selected ? 1.12 : hovered ? 1.06 : 1) * farScale * compactScale * relevanceScale;
    group.scale.setScalar(MathUtils.damp(group.scale.x, targetScale, 7, delta));
    if (coreRef.current && !reducedMotion) coreRef.current.rotation.y += delta * 0.42;
  });

  const activate = () => focusNode(node.id, node.cluster);
  const openDetails = () => openNodeCase(node.id, node.cluster);

  return (
    <group ref={groupRef} position={position} onClick={(event) => activateWorldItem(event, activate)} onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}>
      <mesh>
        <sphereGeometry args={[0.78, 10, 8]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} />
      </mesh>
      {microMounted && node.signals?.some(signal => signal.showInOrbit !== false) ? (
        <MicroUniverse satellites={node.signals} color={cluster.color} mode={microMode}
          onHidden={() => {if (microModeRef.current === "none") setMicroMounted(false);}} />
      ) : null}
      <group ref={coreRef}><NodeCore node={node} color={cluster.color} /></group>
      {showsIdentity && formationActive && (
        <NodePreview
          node={node}
          cover={cover}
          color={cluster.color}
          distanceRef={distanceRef}
          onActivate={openDetails}
        />
      )}
      {showsIdentity && !formationActive && (
        <Billboard follow>
          <Line points={[[-1.4, -0.75, 0], [1.4, -0.75, 0], [1.4, 0.75, 0], [-1.4, 0.75, 0], [-1.4, -0.75, 0]]} color={cluster.color} transparent opacity={0.3} lineWidth={0.6} />
        </Billboard>
      )}
      {showsIdentity && (
        <Html center position={[0, showsPreview ? -1.9 : 1.15, 0]} distanceFactor={showsPreview ? 9 : 12} zIndexRange={[20, 1]}>
          <button
            className={`node-world-label node-world-label--${reveal}`}
            type="button"
            aria-haspopup="dialog"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => activateWorldItem(event, openDetails)}
          >
            <strong>{title}</strong>
            {showsPreview && <span className="node-world-label__summary">{summary}</span>}
            {showsPreview && <small>{node.technologies.slice(0, 3).join(" · ")}</small>}
          </button>
        </Html>
      )}
    </group>
  );
}
