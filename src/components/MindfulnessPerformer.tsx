"use client";

import { useEffect, useRef, useState } from "react";
import type * as Three from "three";
import {
  MINDFULNESS_CHARACTER_MODEL,
  MINDFULNESS_CHARACTER_POSTER,
  MINDFULNESS_FINISHES,
  type MindfulnessFinishId,
} from "@/lib/mindfulness";

type RenderMode = "loading" | "model" | "fallback" | "error";
type Controller = { play: (finish: MindfulnessFinishId | null) => void };

type Props = {
  finish?: MindfulnessFinishId | null;
  replayKey?: string | number;
  className?: string;
  onReady?: () => void;
  onError?: () => void;
};

/** 同じ立体モデルを静止中と終了後で使い、表示できない環境では静止画へ切り替える。 */
export function MindfulnessPerformer({ finish = null, replayKey, className = "", onReady, onError }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<Controller | null>(null);
  const currentFinish = useRef(finish);
  const callbacks = useRef({ onReady, onError });
  const posterReady = useRef(false);
  const posterFailed = useRef(false);
  const mode = useRef<RenderMode>("loading");
  const [renderMode, setRenderMode] = useState<RenderMode>("loading");

  useEffect(() => {
    callbacks.current = { onReady, onError };
  }, [onReady, onError]);

  useEffect(() => {
    currentFinish.current = finish;
    controller.current?.play(finish);
  }, [finish, replayKey]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const container = element;
    let active = true;
    const abort = new AbortController();
    let release = () => {};

    function changeMode(next: RenderMode) {
      mode.current = next;
      setRenderMode(next);
    }

    function fallback() {
      release();
      controller.current = null;
      if (!active) return;
      if (posterFailed.current) {
        changeMode("error");
        callbacks.current.onError?.();
      } else {
        changeMode("fallback");
        if (posterReady.current) callbacks.current.onReady?.();
      }
    }

    async function initialize() {
      try {
        const [THREE, { GLTFLoader }, { RoomEnvironment }, { MeshoptDecoder }] = await Promise.all([
          import("three"),
          import("three/addons/loaders/GLTFLoader.js"),
          import("three/addons/environments/RoomEnvironment.js"),
          import("three/addons/libs/meshopt_decoder.module.js"),
        ]);
        if (!active) return;

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.domElement.setAttribute("aria-hidden", "true");
        container.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 30);
        const group = new THREE.Group();
        scene.add(group);
        scene.add(new THREE.HemisphereLight(0xeaf2ff, 0x263341, 2));
        const key = new THREE.DirectionalLight(0xffefd8, 3);
        key.position.set(2.8, 3.5, 4);
        key.target.position.set(0, 0.9, 0);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.camera.left = -1.4;
        key.shadow.camera.right = 1.4;
        key.shadow.camera.top = 1.4;
        key.shadow.camera.bottom = -1.4;
        key.shadow.camera.near = 0.1;
        key.shadow.camera.far = 10;
        key.shadow.bias = -0.0002;
        scene.add(key, key.target);
        const fill = new THREE.DirectionalLight(0xd7e7ff, 1.2);
        fill.position.set(-3, 2.5, 3);
        scene.add(fill);
        const rim = new THREE.DirectionalLight(0xffe1ac, 1.8);
        rim.position.set(1.5, 3, -3);
        scene.add(rim);

        let environment: Three.WebGLRenderTarget | null = null;
        let mixer: Three.AnimationMixer | null = null;
        let model: Three.Group | null = null;
        let request = 0;
        let previousTime = 0;
        let observer: ResizeObserver | null = null;
        let released = false;
        let animated = false;
        let playing: MindfulnessFinishId | null = null;
        const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
        let reducedMotion = motion.matches;
        const actions = new Map<MindfulnessFinishId, Three.AnimationAction>();
        const initialPose = new Map<Three.Object3D, { position: Three.Vector3; quaternion: Three.Quaternion; scale: Three.Vector3 }>();
        let modelHeight = 1.81;
        let modelWidth = 1.3;

        function disposeModel(root: Three.Object3D) {
          const geometries = new Set<Three.BufferGeometry>();
          const materials = new Set<Three.Material>();
          const textures = new Set<Three.Texture>();
          const skeletons = new Set<Three.Skeleton>();
          root.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) return;
            if (object instanceof THREE.SkinnedMesh) skeletons.add(object.skeleton);
            geometries.add(object.geometry);
            for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
              materials.add(material);
              for (const value of Object.values(material)) {
                if (value instanceof THREE.Texture) textures.add(value);
              }
            }
          });
          geometries.forEach((geometry) => geometry.dispose());
          materials.forEach((material) => material.dispose());
          skeletons.forEach((skeleton) => skeleton.dispose());
          textures.forEach((texture) => {
            const image: unknown = texture.source.data;
            if (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap) image.close();
            texture.dispose();
          });
        }

        function stopFrames() {
          if (request) cancelAnimationFrame(request);
          request = 0;
          previousTime = 0;
        }

        function render() {
          if (!released) renderer.render(scene, camera);
        }

        function frame(time: number) {
          request = 0;
          if (released || document.hidden || reducedMotion || !animated) return;
          const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0;
          previousTime = time;
          mixer?.update(delta);
          render();
          request = requestAnimationFrame(frame);
        }

        function resume() {
          if (!released && animated && !document.hidden && !reducedMotion && !request) {
            previousTime = 0;
            request = requestAnimationFrame(frame);
          }
        }

        function applyFinish(next: MindfulnessFinishId | null) {
          if (released || !model || !mixer) return;
          stopFrames();
          playing = next;
          mixer.stopAllAction();
          initialPose.forEach((pose, object) => {
            object.position.copy(pose.position);
            object.quaternion.copy(pose.quaternion);
            object.scale.copy(pose.scale);
          });
          const microphone = model.getObjectByName("StageMicrophone");
          if (microphone) microphone.visible = next === "singing";
          animated = next !== null;
          if (next) {
            const action = actions.get(next);
            if (!action) return;
            action.reset().setLoop(THREE.LoopRepeat, Infinity);
            if (!reducedMotion) action.fadeIn(0.18);
            action.play();
            mixer.update(reducedMotion ? action.getClip().duration * 0.45 : 0);
          }
          model.updateMatrixWorld(true);
          render();
          resume();
        }

        function resize() {
          if (released) return;
          const width = Math.max(1, container.clientWidth);
          const height = Math.max(1, container.clientHeight);
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          const viewHeight = Math.max(modelHeight * 1.08, modelWidth * 1.12 / camera.aspect);
          const distance = viewHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
          camera.position.set(0, modelHeight / 2 + 0.1, distance);
          camera.lookAt(0, modelHeight / 2, 0);
          camera.updateProjectionMatrix();
          render();
        }

        function onVisibility() {
          if (document.hidden) stopFrames();
          else {
            render();
            resume();
          }
        }
        function onMotionChange() {
          reducedMotion = motion.matches;
          applyFinish(playing);
        }
        function onContextLost(event: Event) {
          event.preventDefault();
          fallback();
        }

        release = () => {
          if (released) return;
          released = true;
          stopFrames();
          observer?.disconnect();
          document.removeEventListener("visibilitychange", onVisibility);
          motion.removeEventListener("change", onMotionChange);
          renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
          mixer?.stopAllAction();
          if (model) {
            mixer?.uncacheRoot(model);
            disposeModel(model);
          }
          scene.environment = null;
          environment?.dispose();
          renderer.dispose();
          renderer.forceContextLoss();
          renderer.domElement.remove();
        };

        renderer.domElement.addEventListener("webglcontextlost", onContextLost);
        document.addEventListener("visibilitychange", onVisibility);
        motion.addEventListener("change", onMotionChange);
        const room = new RoomEnvironment();
        const pmrem = new THREE.PMREMGenerator(renderer);
        try {
          environment = pmrem.fromScene(room, 0.04);
          scene.environment = environment.texture;
        } finally {
          room.dispose();
          pmrem.dispose();
        }

        const response = await fetch(MINDFULNESS_CHARACTER_MODEL, { signal: abort.signal });
        if (!response.ok) throw new Error("キャラクターを読み込めませんでした");
        const bytes = await response.arrayBuffer();
        if (!active || released) return;
        const loader = new GLTFLoader();
        loader.setMeshoptDecoder(MeshoptDecoder);
        const gltf = await loader.parseAsync(bytes, new URL("/animations/", window.location.href).href);
        if (!active || released) {
          disposeModel(gltf.scene);
          return;
        }
        const clips = new Map(gltf.animations.map((clip) => [clip.name, clip]));
        if (MINDFULNESS_FINISHES.some((finish) => !clips.has(finish.id))) {
          disposeModel(gltf.scene);
          throw new Error("キャラクターの動きを読み込めませんでした");
        }
        model = gltf.scene;
        const bounds = new THREE.Box3().setFromObject(model);
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        modelHeight = Math.max(size.y, 1.81);
        modelWidth = Math.max(size.x, 1.3);
        group.position.set(-center.x, -bounds.min.y, -center.z);
        group.add(model);
        model.traverse((object) => {
          initialPose.set(object, { position: object.position.clone(), quaternion: object.quaternion.clone(), scale: object.scale.clone() });
          if (object instanceof THREE.Mesh) {
            object.castShadow = true;
            object.receiveShadow = true;
            object.frustumCulled = false;
          }
        });
        mixer = new THREE.AnimationMixer(model);
        for (const finish of MINDFULNESS_FINISHES) {
          const clip = clips.get(finish.id);
          if (clip) actions.set(finish.id, mixer.clipAction(clip));
        }
        observer = new ResizeObserver(resize);
        observer.observe(container);
        resize();
        controller.current = { play: applyFinish };
        applyFinish(currentFinish.current);
        changeMode("model");
        callbacks.current.onReady?.();
      } catch {
        if (active && !abort.signal.aborted) fallback();
      }
    }

    void initialize();
    return () => {
      active = false;
      abort.abort();
      controller.current = null;
      release();
    };
  }, []);

  const label = renderMode === "fallback" || renderMode === "error"
    ? "黒と金の舞台衣装とサングラスで舞台に立つキャラクター"
    : MINDFULNESS_FINISHES.find((move) => move.id === finish)?.alt ?? "黒と金の舞台衣装とサングラスで仁王立ちするキャラクター";

  return (
    <div className={`mindfulness-model ${className}`} role="img" aria-label={label} data-renderer={renderMode}>
      <div ref={host} className="mindfulness-model-canvas" aria-hidden="true" />
      {/* eslint-disable-next-line @next/next/no-img-element -- 描画失敗時に同じ静止画を直接表示するためのフォールバック。 */}
      <img
        src={MINDFULNESS_CHARACTER_POSTER}
        alt=""
        aria-hidden="true"
        className="mindfulness-model-poster"
        onLoad={() => {
          posterReady.current = true;
          posterFailed.current = false;
          if (mode.current === "fallback") callbacks.current.onReady?.();
        }}
        onError={() => {
          posterReady.current = false;
          posterFailed.current = true;
          if (mode.current === "fallback") {
            mode.current = "error";
            setRenderMode("error");
            callbacks.current.onError?.();
          }
        }}
      />
    </div>
  );
}
