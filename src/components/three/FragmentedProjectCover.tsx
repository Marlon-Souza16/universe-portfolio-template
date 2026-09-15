import {useEffect, useLayoutEffect, useMemo, useRef} from "react";
import {useFrame} from "@react-three/fiber";
import {
  DoubleSide,
  MathUtils,
  MeshBasicMaterial,
  ShaderMaterial,
  Vector2,
} from "three";
import type {RefObject} from "react";

import {getFormationProgress, imageFormationConfig} from "@/lib/scene-config";
import type {PerformanceQuality} from "@/lib/portfolio-types";

import {createFragmentedCoverGeometry, projectCoverSize} from "./createFragmentedCoverGeometry";
import type {ProjectCoverTexture} from "./useProjectCoverTexture";

type FragmentedProjectCoverProps = {
  cover: ProjectCoverTexture;
  distanceRef: RefObject<number>;
  quality: PerformanceQuality;
  reducedMotion: boolean;
  seed: string;
};

const tileVertexShader = `
  uniform float uFormation;
  uniform float uMotionScale;
  uniform float uScatter;
  uniform float uDepth;
  uniform float uRotation;
  uniform vec2 uUvOffset;
  uniform vec2 uUvScale;
  attribute vec3 aCenter;
  attribute vec3 aScatter;
  attribute vec2 aRotation;
  varying vec2 vCoverUv;
  void main() {
    float residual = 1.0 - uFormation;
    float angleX = aRotation.x * uRotation * residual * uMotionScale;
    float angleZ = aRotation.y * uRotation * residual * uMotionScale;
    vec3 tile = position * mix(0.68, 1.0, uFormation);
    tile.yz = mat2(cos(angleX), -sin(angleX), sin(angleX), cos(angleX)) * tile.yz;
    tile.xy = mat2(cos(angleZ), -sin(angleZ), sin(angleZ), cos(angleZ)) * tile.xy;
    vec3 offset = vec3(aScatter.xy * uScatter, aScatter.z * uDepth);
    vec3 formed = aCenter + tile + offset * residual * uMotionScale;
    vCoverUv = uv * uUvScale + uUvOffset;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(formed, 1.0);
  }
`;

const coverFragmentShader = `
  uniform sampler2D uMap;
  uniform float uOpacity;
  varying vec2 vCoverUv;
  void main() {
    vec4 pixel = texture2D(uMap, vCoverUv);
    gl_FragColor = vec4(pixel.rgb, pixel.a * uOpacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const dissolveFragmentShader = `
  uniform sampler2D uMap;
  uniform float uFormation;
  varying vec2 vCoverUv;
  float hash(vec2 value) {
    return fract(sin(dot(floor(value), vec2(127.1, 311.7))) * 43758.5453);
  }
  void main() {
    float noise = hash(vCoverUv * vec2(52.0, 30.0));
    float visible = smoothstep(noise - 0.08, noise + 0.08, uFormation);
    vec4 pixel = texture2D(uMap, vCoverUv);
    gl_FragColor = vec4(pixel.rgb, pixel.a * visible);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function FragmentedProjectCover({
  cover,
  distanceRef,
  quality,
  reducedMotion,
  seed,
}: FragmentedProjectCoverProps) {
  const profile = imageFormationConfig[quality];
  const progressRef = useRef(0);
  const backgroundRef = useRef<MeshBasicMaterial>(null);
  const finalRef = useRef<MeshBasicMaterial>(null);
  const geometry = useMemo(
    () => createFragmentedCoverGeometry(seed, profile.columns, profile.rows),
    [profile.columns, profile.rows, seed],
  );
  const uniforms = useMemo(() => ({
    uFormation: {value: 0},
    uDepth: {value: profile.depth},
    uMap: {value: null},
    uMotionScale: {value: reducedMotion ? 0.14 : 1},
    uOpacity: {value: 0},
    uRotation: {value: profile.rotation},
    uScatter: {value: profile.scatter},
    uUvOffset: {value: new Vector2()},
    uUvScale: {value: new Vector2(1, 1)},
  }), [profile.depth, profile.rotation, profile.scatter, reducedMotion]);
  const material = useMemo(() => new ShaderMaterial({
    depthWrite: false,
    fragmentShader: profile.mode === "tiles" ? coverFragmentShader : dissolveFragmentShader,
    side: DoubleSide,
    transparent: true,
    uniforms,
    vertexShader: tileVertexShader,
  }), [profile.mode, uniforms]);

  useLayoutEffect(() => {
    material.uniforms.uMap.value = cover.texture;
    material.uniforms.uUvOffset.value.copy(cover.uvOffset);
    material.uniforms.uUvScale.value.copy(cover.uvScale);
  }, [cover, material]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, delta) => {
    const target = getFormationProgress(distanceRef.current);
    const progress = MathUtils.damp(progressRef.current, target, reducedMotion ? 18 : 7, delta);
    progressRef.current = progress;
    material.uniforms.uFormation.value = progress;
    material.uniforms.uOpacity.value = profile.mode === "tiles"
      ? MathUtils.smoothstep(progress, 0.02, 0.16) * (1 - MathUtils.smoothstep(progress, 0.86, 1))
      : 1;
    if (backgroundRef.current) backgroundRef.current.opacity = 0.12 + progress * 0.72;
    if (finalRef.current) finalRef.current.opacity = MathUtils.smoothstep(progress, 0.84, 1);
  });

  return (
    <group>
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[projectCoverSize.width + 0.18, projectCoverSize.height + 0.18]} />
        <meshBasicMaterial ref={backgroundRef} color="#06131d" transparent opacity={0.12} depthWrite={false} />
      </mesh>
      <mesh geometry={geometry} material={material} frustumCulled={false} />
      {profile.mode === "tiles" && (
        <mesh position={[0, 0, 0.012]}>
          <planeGeometry args={[projectCoverSize.width, projectCoverSize.height]} />
          <meshBasicMaterial ref={finalRef} map={cover.texture} toneMapped={false} transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}
