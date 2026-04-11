'use client';

import { useEffect, useRef } from 'react';

/**
 * Faithful port of the vary-science-lab "research canvas" —
 * 320 particles in scattered/formation states, connecting lines,
 * mouse repulsion, dot-matrix post-processing.
 * Adapted for the ALETHEIA cream palette (ink dots on cream bg).
 */
export function ThreeParticleCanvas({ height = 380 }: { height?: number }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    const cleanupFns: (() => void)[] = [];

    (async () => {
      if (disposed) return;
      const THREE = await import('three');
      if (disposed) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { EffectComposer } = await import('three/examples/jsm/postprocessing/EffectComposer.js') as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { RenderPass }     = await import('three/examples/jsm/postprocessing/RenderPass.js') as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { ShaderPass }     = await import('three/examples/jsm/postprocessing/ShaderPass.js') as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { OutputPass }     = await import('three/examples/jsm/postprocessing/OutputPass.js') as any;
      if (disposed) return;

      const getSize = () => ({ w: mount.clientWidth || 800, h: mount.clientHeight || height });
      let { w, h } = getSize();

      // ── Scene ──────────────────────────────────────────────────────────────
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x020203); // dark so particles = high-lum dots

      const cam = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
      cam.position.set(0, 0, 12);

      const renderer = new THREE.WebGLRenderer({ antialias: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setSize(w, h);
      mount.appendChild(renderer.domElement);

      // ── Particles ──────────────────────────────────────────────────────────
      const COUNT = 320;
      const posArr  = new Float32Array(COUNT * 3);
      const homeArr = new Float32Array(COUNT * 3);
      const velArr  = new Float32Array(COUNT * 3);

      for (let i = 0; i < COUNT; i++) {
        const x = (Math.random() - 0.5) * 42;
        const y = (Math.random() - 0.5) * 18;
        const z = (Math.random() - 0.5) * 6;
        posArr[i * 3] = homeArr[i * 3] = x;
        posArr[i * 3 + 1] = homeArr[i * 3 + 1] = y;
        posArr[i * 3 + 2] = homeArr[i * 3 + 2] = z;
        velArr[i * 3]     = (Math.random() - 0.5) * 0.005;
        velArr[i * 3 + 1] = (Math.random() - 0.5) * 0.005;
        velArr[i * 3 + 2] = (Math.random() - 0.5) * 0.002;
      }

      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
      const pMat = new THREE.PointsMaterial({
        color: 0xffffff, size: 1.9, sizeAttenuation: true,
        transparent: true, opacity: 0.55,
      });
      scene.add(new THREE.Points(pGeo, pMat));

      // ── Connection lines ────────────────────────────────────────────────────
      const MAX_LINES = 800;
      const linePos = new Float32Array(MAX_LINES * 6);
      const lineColors = new Float32Array(MAX_LINES * 6);
      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
      lineGeo.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));
      const lineMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.22 });
      scene.add(new THREE.LineSegments(lineGeo, lineMat));

      // ── Formation 2 — scattered square clusters (the N-body look) ──────────
      const formation2 = new Float32Array(COUNT * 3);
      (() => {
        const groups = [
          { cx: -12, cy:  4,    size: 4,   dots: 5 },
          { cx:  -5, cy:  5.5,  size: 3,   dots: 4 },
          { cx:   3, cy:  6,    size: 5,   dots: 6 },
          { cx:  11, cy:  4.5,  size: 3.5, dots: 5 },
          { cx: -10, cy: -3,    size: 3.5, dots: 5 },
          { cx:  -2, cy: -4,    size: 4.5, dots: 5 },
          { cx:   7, cy: -3.5,  size: 3,   dots: 4 },
          { cx:  13, cy: -5,    size: 4,   dots: 5 },
        ];
        let idx = 0;
        const perGroup = Math.floor(COUNT / groups.length);
        const rem = COUNT - perGroup * groups.length;
        for (let g = 0; g < groups.length; g++) {
          const { cx, cy, size, dots } = groups[g];
          const count = perGroup + (g < rem ? 1 : 0);
          const cols = dots;
          const rows = Math.ceil(count / cols);
          const spacing = size / (dots - 1);
          for (let i = 0; i < count && idx < COUNT; i++) {
            const col = i % cols, row = Math.floor(i / cols);
            formation2[idx * 3]     = cx + col * spacing - (cols - 1) * spacing * 0.5;
            formation2[idx * 3 + 1] = cy + row * spacing - (rows - 1) * spacing * 0.5;
            formation2[idx * 3 + 2] = 0;
            idx++;
          }
        }
        while (idx < COUNT) {
          formation2[idx * 3] = (Math.random() - 0.5) * 4;
          formation2[idx * 3 + 1] = (Math.random() - 0.5) * 4;
          formation2[idx * 3 + 2] = 0;
          idx++;
        }
      })();

      // Default home = scattered; we allow hover to blend into formation2
      let formationBlend = 0;
      let formationTarget = 0;

      // ── Mouse interaction ───────────────────────────────────────────────────
      const mouseWorld = new THREE.Vector3(9999, 9999, 0);
      const rMouse = new THREE.Vector2(9999, 9999);
      const raycaster = new THREE.Raycaster();
      const mousePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

      const onMouseMove = (e: MouseEvent) => {
        const rect = mount.getBoundingClientRect();
        rMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        rMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(rMouse, cam);
        const t = new THREE.Vector3();
        raycaster.ray.intersectPlane(mousePlane, t);
        mouseWorld.copy(t);
        formationTarget = 1; // show formation on hover
      };
      const onMouseLeave = () => {
        mouseWorld.set(9999, 9999, 0);
        formationTarget = 0;
      };
      mount.addEventListener('mousemove', onMouseMove);
      mount.addEventListener('mouseleave', onMouseLeave);
      cleanupFns.push(() => {
        mount.removeEventListener('mousemove', onMouseMove);
        mount.removeEventListener('mouseleave', onMouseLeave);
      });

      // ── Dot-matrix post-processing (cream bg, ink dots) ────────────────────
      const DotShader = {
        uniforms: {
          tDiffuse:    { value: null },
          uResolution: { value: new THREE.Vector2(w, h) },
          uDotSize:    { value: 3.5 },
          uDotGap:     { value: 2.0 },
          uBrightness: { value: 1.0 },
          uContrast:   { value: 0.5 },
          uBgColor:    { value: new THREE.Vector3(0.941, 0.929, 0.910) },  // cream
          uDotColor:   { value: new THREE.Vector3(0.102, 0.102, 0.094) },  // ink
        },
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position,1.0); }`,
        fragmentShader: `
          precision highp float;
          uniform sampler2D tDiffuse;
          uniform vec2  uResolution;
          uniform float uDotSize, uDotGap, uBrightness, uContrast;
          uniform vec3  uBgColor, uDotColor;
          varying vec2 vUv;
          void main() {
            vec2 px = vUv * uResolution;
            float sp = uDotSize + uDotGap;
            vec2 cell = floor(px / sp);
            vec2 center = (cell + 0.5) * sp;
            vec2 sUV = center / uResolution;
            vec3 c = texture2D(tDiffuse, sUV).rgb;
            float lum = dot(c, vec3(0.299,0.587,0.114)) * uBrightness;
            lum = clamp((lum - 0.5) / uContrast + 0.5, 0.0, 1.0);
            if (lum < 0.04) { gl_FragColor = vec4(uBgColor, 1.0); return; }
            float maxR = uDotSize * 0.5;
            float r = mix(0.3, maxR, pow(lum, uContrast));
            float d = length(px - center);
            float mask = 1.0 - smoothstep(r - 0.5, r + 0.5, d);
            gl_FragColor = vec4(mix(uBgColor, uDotColor, mask), 1.0);
          }
        `,
      };

      const composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, cam));
      const dotPass = new ShaderPass(DotShader);
      composer.addPass(dotPass);
      composer.addPass(new OutputPass());

      // ── Resize ─────────────────────────────────────────────────────────────
      function resize() {
        const s = getSize();
        w = s.w; h = s.h;
        cam.aspect = w / h;
        cam.updateProjectionMatrix();
        renderer.setSize(w, h);
        composer.setSize(w, h);
        dotPass.uniforms.uResolution.value.set(w, h);
      }
      const ro = new ResizeObserver(resize);
      ro.observe(mount);
      cleanupFns.push(() => ro.disconnect());

      // ── Visibility ─────────────────────────────────────────────────────────
      let active = false;
      const obs = new IntersectionObserver(
        (e) => { active = e[0].isIntersecting; },
        { threshold: 0.05 }
      );
      obs.observe(mount);
      cleanupFns.push(() => obs.disconnect());

      // ── Animation ──────────────────────────────────────────────────────────
      const THRESHOLD = 4.0;
      const SPRING = 0.008;
      const SPRING_FORM = 0.014;
      const DAMPING = 0.92;
      const MOUSE_R = 7.5;
      const MOUSE_STR = 0.12;

      function animate() {
        if (disposed) return;
        requestAnimationFrame(animate);
        if (!active) return;

        const pos = pGeo.attributes.position.array as Float32Array;
        const mx = mouseWorld.x, my = mouseWorld.y;

        // Blend formation
        formationBlend = formationTarget > 0
          ? Math.min(formationBlend + 0.03, 1.0)
          : Math.max(formationBlend - 0.025, 0.0);

        const springStr = SPRING + (SPRING_FORM - SPRING) * formationBlend;

        for (let i = 0; i < COUNT; i++) {
          const ix = i * 3, iy = ix + 1, iz = ix + 2;

          // Effective home: lerp scattered ↔ formation2
          const hx = homeArr[ix]   * (1 - formationBlend) + formation2[ix]   * formationBlend;
          const hy = homeArr[iy]   * (1 - formationBlend) + formation2[iy]   * formationBlend;
          const hz = homeArr[iz]   * (1 - formationBlend) + formation2[iz]   * formationBlend;

          // Spring toward home
          velArr[ix] += (hx - pos[ix]) * springStr;
          velArr[iy] += (hy - pos[iy]) * springStr;
          velArr[iz] += (hz - pos[iz]) * springStr;

          // Mouse repulsion
          const dx = pos[ix] - mx, dy = pos[iy] - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MOUSE_R && dist > 0.001) {
            const force = (1 - dist / MOUSE_R) * MOUSE_STR;
            velArr[ix] += (dx / dist) * force;
            velArr[iy] += (dy / dist) * force;
          }

          velArr[ix] *= DAMPING; velArr[iy] *= DAMPING; velArr[iz] *= DAMPING;
          pos[ix] += velArr[ix]; pos[iy] += velArr[iy]; pos[iz] += velArr[iz];
        }
        pGeo.attributes.position.needsUpdate = true;

        // Rebuild connection lines
        let li = 0;
        const lp = lineGeo.attributes.position.array as Float32Array;
        const lc = lineGeo.attributes.color.array as Float32Array;
        for (let i = 0; i < COUNT && li < MAX_LINES; i++) {
          for (let j = i + 1; j < COUNT && li < MAX_LINES; j++) {
            const dx = pos[i*3] - pos[j*3];
            const dy = pos[i*3+1] - pos[j*3+1];
            const dz = pos[i*3+2] - pos[j*3+2];
            const d = Math.sqrt(dx*dx + dy*dy + dz*dz);
            if (d < THRESHOLD) {
              const a = 1 - d / THRESHOLD;
              const idx6 = li * 6;
              lp[idx6]   = pos[i*3];   lp[idx6+1] = pos[i*3+1]; lp[idx6+2] = pos[i*3+2];
              lp[idx6+3] = pos[j*3];   lp[idx6+4] = pos[j*3+1]; lp[idx6+5] = pos[j*3+2];
              lc[idx6]   = a * 0.8; lc[idx6+1] = a * 0.8; lc[idx6+2] = a * 0.9;
              lc[idx6+3] = a * 0.8; lc[idx6+4] = a * 0.8; lc[idx6+5] = a * 0.9;
              li++;
            }
          }
        }
        for (let i = li * 6; i < MAX_LINES * 6; i++) { lp[i] = 0; lc[i] = 0; }
        lineGeo.attributes.position.needsUpdate = true;
        lineGeo.attributes.color.needsUpdate = true;
        lineGeo.setDrawRange(0, li * 2);

        composer.render();
      }
      animate();

      cleanupFns.push(() => {
        renderer.setAnimationLoop(null);
        renderer.dispose();
        if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      });
    })();

    return () => {
      disposed = true;
      cleanupFns.forEach(fn => fn());
    };
  }, [height]);

  return (
    <div
      ref={mountRef}
      style={{ width: '100%', height, display: 'block', cursor: 'crosshair' }}
    />
  );
}
