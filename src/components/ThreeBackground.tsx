'use client';

import { useEffect, useRef } from 'react';

export function ThreeBackground({ cream = false }: { cream?: boolean }) {
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
      const { OrbitControls }  = await import('three/examples/jsm/controls/OrbitControls.js') as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { EffectComposer } = await import('three/examples/jsm/postprocessing/EffectComposer.js') as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { RenderPass }     = await import('three/examples/jsm/postprocessing/RenderPass.js') as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { ShaderPass }     = await import('three/examples/jsm/postprocessing/ShaderPass.js') as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { OutputPass }     = await import('three/examples/jsm/postprocessing/OutputPass.js') as any;
      if (disposed) return;

      // ── Device / quality ─────────────────────────────────────────────────
      const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        || (navigator.maxTouchPoints > 1 && window.innerWidth < 1024);

      const gpuTier = (() => {
        const gl = document.createElement('canvas').getContext('webgl');
        if (!gl) return 'low';
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL).toLowerCase() : '';
        if (/apple gpu|apple m/.test(gpu)) return 'high';
        if (/swiftshader|llvmpipe|mali-4|adreno 3/.test(gpu)) return 'low';
        if (/intel(?!.*(iris|uhd|arc))/.test(gpu)) return 'low';
        if (/mali-g[567]|adreno [45]|intel (iris|uhd)|geforce (mx|gt)|radeon (rx )?(5[0-4]|vega 8)/.test(gpu)) return 'mid';
        return 'high';
      })();

      const qualityPresets: Record<string, { pixelRatio: number; marchSteps: number; aoSteps: number; dotSize: number; dotGap: number; scanlines: number; bloomEnabled: boolean }> = {
        low:  { pixelRatio: 1.0,  marchSteps: 48, aoSteps: 2, dotSize: 6.0, dotGap: 3.0, scanlines: 0.55, bloomEnabled: false },
        mid:  { pixelRatio: 1.25, marchSteps: 64, aoSteps: 3, dotSize: 5.0, dotGap: 2.5, scanlines: 0.75, bloomEnabled: true  },
        high: { pixelRatio: 1.5,  marchSteps: 80, aoSteps: 3, dotSize: 5.0, dotGap: 2.5, scanlines: 0.75, bloomEnabled: true  },
      };
      let currentTier = isMobile ? 'low' : gpuTier;
      let quality = { ...qualityPresets[currentTier] };

      // ── Scene / camera / renderer ─────────────────────────────────────────
      const getSize = () => ({ width: mount.clientWidth || window.innerWidth, height: mount.clientHeight || window.innerHeight });
      let size = getSize();

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(cream ? 0xF0EDE8 : 0x020203);

      const camera = new THREE.PerspectiveCamera(60, size.width / size.height, 0.1, 100);
      camera.position.set(0, 0, 5);

      const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
      renderer.setSize(size.width, size.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.pixelRatio));
      mount.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.enableRotate = false;
      controls.enabled = false;

      // ── Mouse tracking ────────────────────────────────────────────────────
      const mouse = new THREE.Vector2(0, 0);
      let mouseInScene = false;
      let mousePressed = false;
      let mouseSphereRadius = 0.0;
      const mouseSphereTargetRadius = 0.55;
      const mouseSphereClickRadius = 0.95;
      const mouseWorld = new THREE.Vector3(0, 0, 0);
      const mouseWorldTarget = new THREE.Vector3(0, 0, 0);
      const mouseDamping = 0.15;
      let pageVisible = true;

      const onPointerMove = (e: MouseEvent | TouchEvent) => {
        mouseInScene = true;
        const me = e as MouseEvent;
        const te = e as TouchEvent;
        const x = me.clientX ?? (te.touches?.[0]?.clientX ?? 0);
        const y = me.clientY ?? (te.touches?.[0]?.clientY ?? 0);
        mouse.x = (x / window.innerWidth) * 2 - 1;
        mouse.y = -(y / window.innerHeight) * 2 + 1;
      };
      const onMouseLeave   = () => { mouseInScene = false; };
      const onTouchStart   = (e: TouchEvent) => { mouseInScene = true; mousePressed = true; onPointerMove(e); };
      const onTouchEnd     = () => { mousePressed = false; mouseInScene = false; };
      const onVisibility   = () => { pageVisible = !document.hidden; if (document.hidden) mouseInScene = false; };
      const onMouseDown    = () => { mousePressed = true; };
      const onMouseUp      = () => { mousePressed = false; };

      document.addEventListener('mousemove', onPointerMove, { passive: true });
      document.addEventListener('touchmove', onPointerMove, { passive: true });
      document.addEventListener('mouseleave', onMouseLeave, { passive: true });
      document.addEventListener('touchstart', onTouchStart, { passive: true });
      document.addEventListener('touchend', onTouchEnd, { passive: true });
      document.addEventListener('visibilitychange', onVisibility);
      document.addEventListener('mousedown', onMouseDown, { passive: true });
      document.addEventListener('mouseup', onMouseUp, { passive: true });

      // ── Raymarching quad (SDF blob) ───────────────────────────────────────
      const quadGeometry = new THREE.PlaneGeometry(2, 2);
      const quadMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uTime:             { value: 0 },
          uResolution:       { value: new THREE.Vector2(size.width, size.height) },
          uCameraPos:        { value: camera.position.clone() },
          uCameraTarget:     { value: new THREE.Vector3(0, 0, 0) },
          uPixelRatio:       { value: Math.min(window.devicePixelRatio, 1.5) },
          uGooeyness:        { value: 1.20 },
          uSpeed:            { value: 0.85 },
          uMouseSpherePos:   { value: new THREE.Vector3(0, 0, 0) },
          uMouseSphereRadius:{ value: 0.0 },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          precision highp float;
          #define MARCH_STEPS ${quality.marchSteps}
          #define AO_STEPS ${quality.aoSteps}
          uniform float uTime;
          uniform vec2 uResolution;
          uniform vec3 uCameraPos;
          uniform vec3 uCameraTarget;
          uniform float uPixelRatio;
          uniform float uGooeyness;
          uniform float uSpeed;
          uniform vec3 uMouseSpherePos;
          uniform float uMouseSphereRadius;
          varying vec2 vUv;

          float smin(float a, float b, float k) {
            float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
            return mix(b, a, h) - k * h * (1.0 - h);
          }
          float sdSphere(vec3 p, vec3 center, float radius) {
            return length(p - center) - radius;
          }
          float sceneCompound(vec3 p, float t, float k) {
            float angle1 = t * 0.5;
            float angle2 = t * 0.5 + 3.14159;
            vec3 c1 = vec3(cos(angle1)*2.4+sin(t*0.25)*0.3, sin(angle1*0.6)*0.8+cos(t*0.4)*0.2, sin(angle1*0.35)*0.6);
            vec3 c2 = vec3(cos(angle2)*2.4+sin(t*0.3)*0.3, sin(angle2*0.6)*0.8-cos(t*0.35)*0.2, sin(angle2*0.35)*0.6);
            float s1 = sdSphere(p, c1, 1.2+0.07*sin(t*2.5));
            float s2 = sdSphere(p, c2, 1.05+0.07*cos(t*2.0));
            vec3 c3 = c1+vec3(sin(t*1.8)*0.9,cos(t*2.2)*0.9,sin(t*1.5)*0.6);
            vec3 c4 = c2+vec3(-cos(t*1.5)*0.8,sin(t*1.9)*0.8,-cos(t*1.7)*0.5);
            float s3 = sdSphere(p, c3, 0.55);
            float s4 = sdSphere(p, c4, 0.5);
            vec3 c5 = vec3(sin(t*0.7)*3.0,cos(t*0.55)*1.2,cos(t*0.45)*0.7);
            vec3 c6 = vec3(-cos(t*0.65)*2.8,sin(t*0.75)*1.0,sin(t*0.5)*0.8);
            float s5 = sdSphere(p, c5, 0.6);
            float s6 = sdSphere(p, c6, 0.55);
            float d = smin(s1, s2, k);
            d = smin(d, s3, k*0.7);
            d = smin(d, s4, k*0.7);
            d = smin(d, s5, k*0.8);
            d = smin(d, s6, k*0.8);
            return d;
          }
          float sceneSDF(vec3 p) {
            float t = uTime * uSpeed;
            float k = uGooeyness;
            float d = sceneCompound(p, t, k);
            if (uMouseSphereRadius > 0.001) {
              float ms = sdSphere(p, uMouseSpherePos, uMouseSphereRadius);
              d = smin(d, ms, k*0.8);
            }
            return d;
          }
          vec3 calcNormal(vec3 p) {
            const float eps = 0.001;
            vec2 h = vec2(eps, 0.0);
            return normalize(vec3(
              sceneSDF(p+h.xyy)-sceneSDF(p-h.xyy),
              sceneSDF(p+h.yxy)-sceneSDF(p-h.yxy),
              sceneSDF(p+h.yyx)-sceneSDF(p-h.yyx)
            ));
          }
          float calcAO(vec3 pos, vec3 nor) {
            float occ = 0.0; float sca = 1.0;
            for (int i = 0; i < AO_STEPS; i++) {
              float h = 0.02 + 0.15 * float(i);
              float d = sceneSDF(pos + h * nor);
              occ += (h - d) * sca; sca *= 0.9;
            }
            return clamp(1.0 - 3.0 * occ, 0.0, 1.0);
          }
          float fresnel(vec3 viewDir, vec3 normal, float power) {
            return pow(1.0 - max(dot(viewDir, normal), 0.0), power);
          }
          float cheapShadow(vec3 pos, vec3 lightDir) {
            float d1 = sceneSDF(pos+lightDir*0.15);
            float d2 = sceneSDF(pos+lightDir*0.4);
            float d3 = sceneSDF(pos+lightDir*0.8);
            return clamp(0.3+0.7*smoothstep(0.0,0.3,min(min(d1,d2),d3)),0.0,1.0);
          }
          mat3 setCamera(vec3 ro, vec3 ta, float cr) {
            vec3 cw = normalize(ta - ro);
            vec3 cp = vec3(sin(cr), cos(cr), 0.0);
            vec3 cu = normalize(cross(cw, cp));
            vec3 cv = normalize(cross(cu, cw));
            return mat3(cu, cv, cw);
          }
          void main() {
            vec2 fragCoord = vUv * uResolution;
            vec2 uv = (2.0 * fragCoord - uResolution) / uResolution.y;
            vec3 ro = uCameraPos;
            vec3 ta = uCameraTarget;
            mat3 ca = setCamera(ro, ta, 0.0);
            vec3 rd = ca * normalize(vec3(uv, 1.8));
            float t = 0.0; float d; vec3 p; bool hit = false;
            for (int i = 0; i < MARCH_STEPS; i++) {
              p = ro + rd * t; d = sceneSDF(p);
              if (d < 0.002) { hit = true; break; }
              t += d * 0.9;
              if (t > 15.0) break;
            }
            vec3 col = vec3(0.02, 0.02, 0.04);
            col += vec3(0.03, 0.01, 0.06) * (1.0 - uv.y * 0.5);
            if (hit) {
              vec3 nor = calcNormal(p);
              vec3 viewDir = normalize(ro - p);
              vec3 lightPos1 = vec3(3.0, 4.0, 5.0);
              vec3 lightPos2 = vec3(-4.0, 2.0, -3.0);
              vec3 lightDir1 = normalize(lightPos1 - p);
              vec3 lightDir2 = normalize(lightPos2 - p);
              float diff1 = max(dot(nor, lightDir1), 0.0);
              float diff2 = max(dot(nor, lightDir2), 0.0);
              vec3 halfDir1 = normalize(lightDir1 + viewDir);
              vec3 halfDir2 = normalize(lightDir2 + viewDir);
              float spec1 = pow(max(dot(nor, halfDir1), 0.0), 64.0);
              float spec2 = pow(max(dot(nor, halfDir2), 0.0), 32.0);
              float sha1 = cheapShadow(p + nor * 0.01, lightDir1);
              float sha2 = cheapShadow(p + nor * 0.01, lightDir2);
              float ao = calcAO(p, nor);
              float fres = fresnel(viewDir, nor, 3.0);
              float sss = max(0.0, dot(viewDir, -lightDir1)) * 0.3;
              // Original vary-science-lab colors
              vec3 baseColor1 = vec3(0.8, 0.15, 0.3);
              vec3 baseColor2 = vec3(0.15, 0.4, 0.9);
              vec3 baseColor3 = vec3(0.95, 0.5, 0.1);
              float colorMix  = sin(p.x * 1.5 + uTime * 0.5) * 0.5 + 0.5;
              float colorMix2 = cos(p.y * 2.0 - uTime * 0.3) * 0.5 + 0.5;
              vec3 baseColor = mix(baseColor1, baseColor2, colorMix);
              baseColor = mix(baseColor, baseColor3, colorMix2 * 0.3);
              vec3 diffuse  = baseColor * (diff1*sha1*vec3(1.0,0.95,0.9)*0.8 + diff2*sha2*vec3(0.4,0.5,0.9)*0.4);
              vec3 specular = vec3(1.0,0.95,0.9)*spec1*sha1*0.7 + vec3(0.5,0.6,1.0)*spec2*sha2*0.3;
              vec3 ambient  = baseColor * vec3(0.08, 0.06, 0.12) * ao;
              vec3 rim      = mix(vec3(0.4,0.6,1.0), vec3(1.0,0.4,0.6), colorMix) * fres * 0.6;
              vec3 subsurface = baseColor * sss * vec3(1.0, 0.3, 0.2);
              col = ambient + diffuse + specular + rim + subsurface;
              float iridescence = fres * 0.4;
              vec3 iriColor = vec3(
                sin(dot(nor,vec3(1.0,0.0,0.0))*6.0+uTime)*0.5+0.5,
                sin(dot(nor,vec3(0.0,1.0,0.0))*6.0+uTime*1.3)*0.5+0.5,
                sin(dot(nor,vec3(0.0,0.0,1.0))*6.0+uTime*0.7)*0.5+0.5
              );
              col += iriColor * iridescence;
              float envRefl = smoothstep(-0.2,1.0,reflect(-viewDir,nor).y)*0.15;
              col += vec3(0.3,0.4,0.8)*envRefl*fres;
            }
            col = col / (col + vec3(1.0));
            col = pow(col, vec3(1.0/2.2));
            float vig = 1.0 - 0.3 * dot(uv*0.5, uv*0.5);
            col *= vig;
            gl_FragColor = vec4(col, 1.0);
          }
        `,
        depthWrite: false,
        depthTest: false,
      });

      const quad = new THREE.Mesh(quadGeometry, quadMaterial);
      quad.frustumCulled = false;
      const quadScene = new THREE.Scene();
      const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      quadScene.add(quad);

      // ── Dot-matrix + CRT shader ───────────────────────────────────────────
      const DotMatrixShader = {
        uniforms: {
          tDiffuse:         { value: null },
          uResolution:      { value: new THREE.Vector2(size.width, size.height) },
          uDotSize:         { value: quality.dotSize },
          uDotGap:          { value: quality.dotGap },
          uBrightness:      { value: 0.85 },
          uContrast:        { value: 0.60 },
          uThreshold:       { value: 0.03 },
          uDotColor:        { value: cream ? new THREE.Vector3(0.102, 0.102, 0.094) : new THREE.Vector3(1.0, 1.0, 1.0) },
          uBgColor:         { value: cream ? new THREE.Vector3(0.941, 0.929, 0.910) : new THREE.Vector3(0.00784, 0.00784, 0.01176) },
          uCrossEnabled:    { value: 0.0 },
          uCrossIntensity:  { value: 0.95 },
          uCrossAngle:      { value: 0.4363 },
          uBloomEnabled:    { value: quality.bloomEnabled ? 1.0 : 0.0 },
          uBloomIntensity:  { value: 0.55 },
          uBloomSize:       { value: 1.50 },
          uCrtEnabled:      { value: 1.0 },
          uCrtCurvature:    { value: 0.0 },
          uCrtScanlines:    { value: cream ? 0.0 : quality.scanlines },
          uCrtVignette:     { value: cream ? 0.0 : 2.00 },
          uCrtChroma:       { value: 0.0 },
          uDitherEnabled:   { value: 1.0 },
          uTime:            { value: 0 },
        },
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }`,
        fragmentShader: `
          precision highp float;
          uniform sampler2D tDiffuse;
          uniform vec2 uResolution;
          uniform float uDotSize, uDotGap, uBrightness, uContrast, uThreshold;
          uniform vec3 uDotColor, uBgColor;
          uniform float uCrossEnabled, uCrossIntensity, uCrossAngle;
          uniform float uBloomEnabled, uBloomIntensity, uBloomSize;
          uniform float uCrtEnabled, uCrtCurvature, uCrtScanlines, uCrtVignette, uCrtChroma;
          uniform float uDitherEnabled, uTime;
          varying vec2 vUv;

          vec2 crtDistort(vec2 uv, float k) {
            vec2 cc = uv - 0.5;
            float r2 = dot(cc, cc);
            return cc * (1.0 + r2 * k * 0.01) + 0.5;
          }
          void main() {
            vec2 uv = vUv;
            if (uCrtEnabled > 0.5) {
              uv = crtDistort(uv, uCrtCurvature);
              if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
                gl_FragColor = vec4(0.0,0.0,0.0,1.0); return;
              }
            }
            vec3 col;
            if (uCrtEnabled > 0.5 && uCrtChroma > 0.01) {
              vec2 dir = (uv-0.5)*uCrtChroma*0.002;
              col.r = texture2D(tDiffuse, uv+dir).r;
              col.g = texture2D(tDiffuse, uv).g;
              col.b = texture2D(tDiffuse, uv-dir).b;
            } else { col = texture2D(tDiffuse, uv).rgb; }
            if (uDitherEnabled < 0.5) {
              if (uCrtEnabled > 0.5 && uCrtScanlines > 0.001) {
                float sc = sin(uv.y*uResolution.y*0.8)*0.5+0.5;
                col *= 1.0 - uCrtScanlines*(1.0-sc);
              }
              if (uCrtEnabled > 0.5 && uCrtVignette > 0.001) {
                vec2 vig = uv*(1.0-uv);
                col *= pow(vig.x*vig.y*16.0, uCrtVignette*0.3);
              }
              gl_FragColor = vec4(col,1.0); return;
            }
            vec2 px = uv*uResolution;
            float sp = uDotSize+uDotGap;
            vec2 cell = floor(px/sp);
            vec2 cellCenter = (cell+0.5)*sp;
            vec2 sUV = cellCenter/uResolution;
            vec3 cCol;
            if (uCrtEnabled>0.5&&uCrtChroma>0.01) {
              vec2 dir=(sUV-0.5)*uCrtChroma*0.002;
              cCol.r=texture2D(tDiffuse,sUV+dir).r;
              cCol.g=texture2D(tDiffuse,sUV).g;
              cCol.b=texture2D(tDiffuse,sUV-dir).b;
            } else { cCol=texture2D(tDiffuse,sUV).rgb; }
            float lum = dot(cCol,vec3(0.299,0.587,0.114));
            lum = clamp((lum*uBrightness-0.5)*(1.0/uContrast)+0.5,0.0,1.0);
            vec3 bg = uBgColor;
            if (lum < uThreshold) {
              vec3 res = bg;
              if (uCrtEnabled>0.5&&uCrtScanlines>0.001){float sc=sin(uv.y*uResolution.y*0.8)*0.5+0.5;res*=1.0-uCrtScanlines*(1.0-sc)*0.3;}
              if (uCrtEnabled>0.5&&uCrtVignette>0.001){vec2 vig=uv*(1.0-uv);res*=pow(vig.x*vig.y*16.0,uCrtVignette*0.3);}
              gl_FragColor=vec4(res,1.0); return;
            }
            float maxR=uDotSize*0.5; float minR=0.4;
            float lumC=pow(lum,uContrast);
            float dotR=mix(minR,maxR,lumC);
            vec2 d=px-cellCenter; vec2 absD=abs(d);
            float cornerR=mix(0.8,0.2,lumC);
            float squareness=smoothstep(0.15,0.7,lumC);
            float cDist=length(d);
            float cEdge=1.0-smoothstep(dotR-0.5,dotR+0.5,cDist);
            vec2 qd=absD-vec2(dotR-cornerR);
            float rsDist=length(max(qd,0.0))+min(max(qd.x,qd.y),0.0)-cornerR;
            float sEdge=1.0-smoothstep(-0.5,0.5,rsDist);
            float dotMask=mix(cEdge,sEdge,squareness);
            vec3 brt=uDotColor; vec3 mid=uDotColor*0.7; vec3 dim=uDotColor*0.25;
            vec3 colN=cCol/(max(max(cCol.r,cCol.g),cCol.b)+0.001);
            vec3 dotColor;
            if (lum>0.65) { dotColor=mix(brt,brt*colN*1.5,0.2); dotColor*=1.0+(lum-0.65)*1.5; }
            else if (lum>0.25) { float mt=(lum-0.25)/0.4; dotColor=mix(mid,brt,mt); dotColor=mix(dotColor,dotColor*colN*1.2,0.15); }
            else { float st=lum/0.25; dotColor=mix(dim*0.5,dim,st); }
            float bloomMask=0.0;
            if (uBloomEnabled>0.5&&lum>0.6) {
              float bR=dotR*uBloomSize; float bD=length(d);
              bloomMask=(1.0-smoothstep(bR-1.0,bR+1.0,bD))*smoothstep(0.6,1.0,lum)*uBloomIntensity*0.5;
            }
            vec3 res=bg;
            res+=brt*bloomMask;
            res=mix(res,dotColor,dotMask);
            float pEdge=max(dotMask-(1.0-smoothstep(dotR*0.7-0.5,dotR*0.7+0.5,cDist)),0.0);
            res+=brt*pEdge*0.15*lum;
            if (uCrtEnabled>0.5&&uCrtScanlines>0.001){float sc=sin(uv.y*uResolution.y*0.8)*0.5+0.5;res*=1.0-uCrtScanlines*(1.0-sc);}
            if (uCrtEnabled>0.5&&uCrtVignette>0.001){vec2 vig=uv*(1.0-uv);res*=pow(vig.x*vig.y*16.0,uCrtVignette*0.3);}
            gl_FragColor=vec4(res,1.0);
          }
        `,
      };

      // ── Post-processing ───────────────────────────────────────────────────
      const composer = new EffectComposer(renderer);
      composer.setSize(size.width, size.height);
      const renderPass = new RenderPass(quadScene, quadCamera);
      composer.addPass(renderPass);
      const dotMatrixPass = new ShaderPass(DotMatrixShader);
      composer.addPass(dotMatrixPass);
      const outputPass = new OutputPass();
      composer.addPass(outputPass);
      dotMatrixPass.uniforms.uResolution.value.set(size.width, size.height);

      // ── Animation loop ────────────────────────────────────────────────────
      let scrollY = 0;
      let smoothScrollY = 0;
      const clock = new THREE.Clock();
      const raycaster = new THREE.Raycaster();
      const _forward = new THREE.Vector3();
      let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

      const onScroll = () => { scrollY = window.scrollY; };
      window.addEventListener('scroll', onScroll, { passive: true });

      function animate() {
        if (!pageVisible) return;
        const dt = Math.min(clock.getDelta(), 0.05);
        const elapsed = clock.elapsedTime;
        controls.update();

        const targetR = mouseInScene ? (mousePressed ? mouseSphereClickRadius : mouseSphereTargetRadius) : 0.0;
        const fadeSpeed = mouseInScene ? (mousePressed ? 10.0 : 6.0) : 3.0;
        const step = Math.min(1.0, fadeSpeed * dt);
        mouseSphereRadius += (targetR - mouseSphereRadius) * step;
        if (mouseSphereRadius < 0.005 && !mouseInScene) mouseSphereRadius = 0.0;

        raycaster.setFromCamera(mouse, camera);
        const rayDir = raycaster.ray.direction;
        const rayOrigin = raycaster.ray.origin;
        _forward.subVectors(controls.target, camera.position).normalize();
        const dist = camera.position.distanceTo(controls.target);
        const tVal = dist / rayDir.dot(_forward);
        mouseWorldTarget.copy(rayOrigin).addScaledVector(rayDir, tVal);
        mouseWorld.lerp(mouseWorldTarget, mouseDamping);

        smoothScrollY += (scrollY - smoothScrollY) * 0.1;
        const scrollProgress = Math.min(smoothScrollY / (window.innerHeight || 1), 1.0);
        camera.position.y = scrollProgress * 1.5;
        camera.position.z = 5 + scrollProgress * 0.8;
        controls.target.y = scrollProgress * 0.8;

        quadMaterial.uniforms.uMouseSpherePos.value.copy(mouseWorld);
        quadMaterial.uniforms.uMouseSphereRadius.value = mouseSphereRadius;
        quadMaterial.uniforms.uTime.value = elapsed;
        quadMaterial.uniforms.uCameraPos.value.copy(camera.position);
        quadMaterial.uniforms.uCameraTarget.value.copy(controls.target);
        dotMatrixPass.uniforms.uTime.value = elapsed;
        composer.render();
      }

      renderer.setAnimationLoop(animate);

      // ── FPS watchdog ──────────────────────────────────────────────────────
      const tierOrder = ['high', 'mid', 'low'];
      let fpsFrames = 0;
      let fpsStartTime = performance.now();
      let fpsWatchdogActive = true;

      const origAnimate = animate;
      renderer.setAnimationLoop(() => {
        origAnimate();
        if (!fpsWatchdogActive) return;
        fpsFrames++;
        const elapsed_ms = performance.now() - fpsStartTime;
        if (elapsed_ms >= 2000) {
          if ((fpsFrames / elapsed_ms) * 1000 < 30) {
            const idx = tierOrder.indexOf(currentTier);
            if (idx < tierOrder.length - 1) {
              currentTier = tierOrder[idx + 1];
              quality = { ...qualityPresets[currentTier] };
              renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.pixelRatio));
              dotMatrixPass.uniforms.uDotSize.value = quality.dotSize;
              dotMatrixPass.uniforms.uDotGap.value = quality.dotGap;
              dotMatrixPass.uniforms.uCrtScanlines.value = quality.scanlines;
              dotMatrixPass.uniforms.uBloomEnabled.value = quality.bloomEnabled ? 1.0 : 0.0;
              fpsFrames = 0; fpsStartTime = performance.now();
              if (idx + 1 >= tierOrder.length - 1) fpsWatchdogActive = false;
            } else { fpsWatchdogActive = false; }
          } else { fpsWatchdogActive = false; }
        }
      });

      // ── Resize ────────────────────────────────────────────────────────────
      const handleResize = () => {
        size = getSize();
        camera.aspect = size.width / size.height;
        camera.updateProjectionMatrix();
        const pr = Math.min(window.devicePixelRatio, quality.pixelRatio);
        renderer.setPixelRatio(pr);
        renderer.setSize(size.width, size.height);
        quadMaterial.uniforms.uResolution.value.set(size.width, size.height);
        quadMaterial.uniforms.uPixelRatio.value = pr;
        dotMatrixPass.uniforms.uResolution.value.set(size.width, size.height);
        composer.setSize(size.width, size.height);
      };
      const onResize = () => {
        if (renderer.domElement) {
          renderer.domElement.style.width = '100%';
          renderer.domElement.style.height = '100%';
        }
        if (resizeTimeout) clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(handleResize, 200);
      };
      window.addEventListener('resize', onResize, { passive: true });

      // ── Entrance fade-in ──────────────────────────────────────────────────
      renderer.domElement.style.opacity = '0';
      renderer.domElement.style.transition = 'opacity 2.5s cubic-bezier(0.25, 0.1, 0.25, 1) 0.8s';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (!disposed) renderer.domElement.style.opacity = '1';
      }));

      // ── Cleanup registry ──────────────────────────────────────────────────
      cleanupFns.push(() => {
        renderer.setAnimationLoop(null);
        if (resizeTimeout) clearTimeout(resizeTimeout);
        document.removeEventListener('mousemove', onPointerMove);
        document.removeEventListener('touchmove', onPointerMove);
        document.removeEventListener('mouseleave', onMouseLeave);
        document.removeEventListener('touchstart', onTouchStart);
        document.removeEventListener('touchend', onTouchEnd);
        document.removeEventListener('visibilitychange', onVisibility);
        document.removeEventListener('mousedown', onMouseDown);
        document.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onResize);
        quadGeometry.dispose();
        quadMaterial.dispose();
        renderer.dispose();
        if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      });
    })();

    return () => {
      disposed = true;
      cleanupFns.forEach(fn => fn());
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
    />
  );
}
