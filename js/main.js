(function(){
  "use strict";

  var toggle = document.getElementById("themeToggle");
  var mqLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)");
  function currentIsLight(){
    var explicit = document.documentElement.getAttribute("data-theme");
    if (explicit === "light") return true;
    if (explicit === "dark") return false;
    return !!(mqLight && mqLight.matches);
  }
  function syncToggleLabel(){
    var light = currentIsLight();
    toggle.textContent = light ? "Light" : "Dark";
    toggle.setAttribute("aria-pressed", light ? "true" : "false");
  }
  toggle.addEventListener("click", function(){
    var next = currentIsLight() ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
    syncToggleLabel();
  });
  syncToggleLabel();

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function cssVar(name){
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#888888";
  }

  var canvas3d = document.getElementById("scene3d");
  var heroBanner = document.getElementById("heroBanner");
  if (canvas3d && heroBanner && typeof THREE !== "undefined") {
    var renderer = new THREE.WebGLRenderer({ canvas: canvas3d, alpha: true, antialias: false });
    var scene = new THREE.Scene();
    var camera = new THREE.Camera();

    var VERT = "void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }";

    var FRAG = [
      "precision highp float;",
      "uniform vec2 uResolution;",
      "uniform float uTime;",
      "uniform vec3 uColorA;",
      "uniform vec3 uColorB;",
      "uniform vec3 uColorC;",
      "",
      "float waveHeight(vec2 p, float t){",
      "  float h = 0.0;",
      "  h += sin(p.x * 0.9 - t * 1.2) * 0.5;",
      "  h += sin(p.y * 1.1 + t * 0.9) * 0.35;",
      "  h += sin((p.x * 0.6 + p.y * 0.6) - t * 0.6) * 0.3;",
      "  h += sin(length(p * 0.5) - t * 1.6) * 0.35;",
      "  return h * 0.35;",
      "}",
      "",
      "void main(){",
      "  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);",
      "",
      "  vec3 ro = vec3(-6.5, 1.7, 0.0);",
      "  vec3 target = vec3(6.5, -0.2, 0.0);",
      "  vec3 fwd = normalize(target - ro);",
      "  vec3 right = normalize(cross(fwd, vec3(0.0, 1.0, 0.0)));",
      "  vec3 up = cross(right, fwd);",
      "  vec3 rd = normalize(fwd + uv.x * right * 1.7 + uv.y * up * 1.7);",
      "",
      "  float t = 0.1;",
      "  float h = 0.0;",
      "  bool hit = false;",
      "  vec3 p = ro;",
      "  float prevT = t;",
      "  for (int i = 0; i < 110; i++){",
      "    p = ro + rd * t;",
      "    h = waveHeight(p.xz, uTime);",
      "    float diff = p.y - h;",
      "    if (diff < 0.0){",
      "      float lo = prevT;",
      "      float hi = t;",
      "      for (int j = 0; j < 5; j++){",
      "        float mid = 0.5 * (lo + hi);",
      "        vec3 pm = ro + rd * mid;",
      "        float dm = pm.y - waveHeight(pm.xz, uTime);",
      "        if (dm < 0.0){ hi = mid; } else { lo = mid; }",
      "      }",
      "      t = 0.5 * (lo + hi);",
      "      p = ro + rd * t;",
      "      h = waveHeight(p.xz, uTime);",
      "      hit = true;",
      "      break;",
      "    }",
      "    prevT = t;",
      "    t += clamp(diff * 0.5, 0.03, 0.35);",
      "    if (t > 22.0){ break; }",
      "  }",
      "",
      "  vec3 col;",
      "  float alpha;",
      "  if (hit){",
      "    float e = 0.06;",
      "    float hx1 = waveHeight(p.xz + vec2(e, 0.0), uTime);",
      "    float hx2 = waveHeight(p.xz - vec2(e, 0.0), uTime);",
      "    float hz1 = waveHeight(p.xz + vec2(0.0, e), uTime);",
      "    float hz2 = waveHeight(p.xz - vec2(0.0, e), uTime);",
      "    vec3 n = normalize(vec3(-(hx1 - hx2), 2.0 * e, -(hz1 - hz2)));",
      "",
      "    vec3 lightDir = normalize(vec3(0.4, 0.8, 0.3));",
      "    float diff = max(dot(n, lightDir), 0.0);",
      "    float fres = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);",
      "",
      "    float hn = clamp((h + 0.6) / 1.2, 0.0, 1.0);",
      "    vec3 base = mix(uColorB, uColorA, hn);",
      "    base = mix(base, uColorC, fres * 0.6);",
      "",
      "    float gx = abs(fract(p.x - 0.5) - 0.5);",
      "    float gz = abs(fract(p.z - 0.5) - 0.5);",
      "    float grid = 1.0 - smoothstep(0.0, 0.025, min(gx, gz));",
      "",
      "    col = base * (0.35 + 0.85 * diff) + fres * uColorA * 0.5 + grid * uColorA * 0.4;",
      "",
      "    float fog = clamp(1.0 - t / 22.0, 0.0, 1.0);",
      "    alpha = fog;",
      "    col *= fog;",
      "  } else {",
      "    col = vec3(0.0);",
      "    alpha = 0.0;",
      "  }",
      "",
      "  gl_FragColor = vec4(col, alpha);",
      "}"
    ].join("\n");

    var uniforms = {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: reduceMotion ? 2.3 : 0 },
      uColorA: { value: new THREE.Color(cssVar("--accent-bright")) },
      uColorB: { value: new THREE.Color(cssVar("--accent-hover")) },
      uColorC: { value: new THREE.Color(cssVar("--green")) }
    };

    var material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true
    });
    var mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    function sizeScene(){
      var r = heroBanner.getBoundingClientRect();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(r.width, r.height, false);
      uniforms.uResolution.value.set(renderer.domElement.width, renderer.domElement.height);
    }
    sizeScene();
    window.addEventListener("resize", sizeScene);

    var clock = new THREE.Clock();
    function render(){
      uniforms.uTime.value = clock.getElapsedTime();
      renderer.render(scene, camera);
    }
    if (reduceMotion) {
      render();
    } else {
      (function loop(){ render(); requestAnimationFrame(loop); })();
    }
  }
})();
