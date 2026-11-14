(function () {
  'use strict';

  window.AtelierBoot = function bootAtelierStudio(deps) {
    const { THREE, OrbitControls, RoomEnvironment } = deps;
    const {
      PRESET_TEMPLATES,
      MATERIALS_DB,
      buildLampShadeGeometry,
      computeBOMAndPricing,
      generateImalatAntetiSVG,
      downloadImalatAntetiSVG,
      downloadBOMAndPricingCSV,
      downloadBinarySTL,
      downloadWavefrontOBJ,
      downloadBinaryGLB,
      downloadCollarDXF,
      downloadParametricSCAD
    } = window.AtelierCAD;

    const state = {
      params: {
        Avize_Capi_mm: 195,
        Avize_Yuksekligi_mm: 205,
        Dalga_Frekansi: 2.0,
        Burulma_Derecesi: 110,
        Kanat_Sayisi: 36,
        Cidar_Kalinligi_mm: 1.2,
        Duy_Tipi: 'E27_40mm',
        Isi_Tahliye_Delik_Sayisi: 8,
        Desteksiz_45_Kilidi: true
      },
      materialKey: 'PLA_WARM',
      displayMode: 'glow',
      projection: 'perspective',
      printBedFlipped: false,
      lightOn: true,
      lightKelvin: 2700,
      lightIntensityPct: 100,
      showFixture: true,
      clipEnabled: false,
      clipAxis: 'x',
      clipOffsetMm: 0
    };

    const KELVIN_COLORS = {
      2200: new THREE.Color(0xff8e36),
      2700: new THREE.Color(0xffb15e),
      3200: new THREE.Color(0xffcf96)
    };

    let currentCAD = null;

    const canvas = document.getElementById('webgl-canvas');
    const viewportEl = document.getElementById('viewport-container');

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.localClippingEnabled = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0b0d);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.40;
    pmrem.dispose();

    const perspCamera = new THREE.PerspectiveCamera(35, 1, 2, 4000);
    perspCamera.position.set(295, 195, 340);

    const orthoCamera = new THREE.OrthographicCamera(-200, 200, 200, -200, -2000, 4000);
    orthoCamera.position.copy(perspCamera.position);

    let activeCamera = perspCamera;

    const controls = new OrbitControls(activeCamera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.target.set(0, 102, 0);
    controls.minDistance = 80;
    controls.maxDistance = 1200;

    const camAnim = {
      active: false,
      targetPos: new THREE.Vector3(),
      targetLook: new THREE.Vector3()
    };

    const damp = (cur, tgt, lambda, dt) => THREE.MathUtils.lerp(cur, tgt, 1 - Math.exp(-lambda * dt));

    // Studio + Interior Luminaire Lighting (calibrated for 1 unit = 1 mm with physical decay = 2.0)
    const ambientLight = new THREE.AmbientLight(0xd8d5ce, 0.28);
    scene.add(ambientLight);

    const keyDirLight = new THREE.DirectionalLight(0xf6f2ea, 0.65);
    keyDirLight.position.set(260, 420, 280);
    scene.add(keyDirLight);

    const rimDirLight = new THREE.DirectionalLight(0x9fb2cc, 0.28);
    rimDirLight.position.set(-280, 180, -240);
    scene.add(rimDirLight);

    const interiorPointLight = new THREE.PointLight(0xffb15e, 16500, 950, 2.0);
    interiorPointLight.castShadow = true;
    interiorPointLight.shadow.bias = -0.0008;
    interiorPointLight.shadow.mapSize.set(1024, 1024);
    scene.add(interiorPointLight);

    const floorGroup = new THREE.Group();
    scene.add(floorGroup);

    const floorGeo = new THREE.CircleGeometry(320, 96);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x111114,
      roughness: 0.88,
      metalness: 0.05
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = -58;
    floorMesh.receiveShadow = true;
    floorGroup.add(floorMesh);

    const polarGrid = new THREE.PolarGridHelper(200, 12, 8, 96, 0x2a2a30, 0x1c1c21);
    polarGrid.position.y = -57.7;
    floorGroup.add(polarGrid);

    const clipPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);

    const translucencyUniforms = {
      uBulbWorldPos: { value: new THREE.Vector3(0, 140, 0) },
      uGlowColor: { value: new THREE.Color(0xffb15e) },
      uGlowPower: { value: 1.15 }
    };

    const warmDiffuserMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf4efe4,
      roughness: 0.44,
      metalness: 0.0,
      clearcoat: 0.08,
      clearcoatRoughness: 0.55,
      side: THREE.DoubleSide,
      clippingPlanes: []
    });

    warmDiffuserMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uBulbWorldPos = translucencyUniforms.uBulbWorldPos;
      shader.uniforms.uGlowColor = translucencyUniforms.uGlowColor;
      shader.uniforms.uGlowPower = translucencyUniforms.uGlowPower;

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          attribute float aWallThickness;
          varying float vWallThickness;
          varying vec3 vWorldPositionCustom;
          varying vec3 vWorldNormalCustom;`
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          vWallThickness = aWallThickness;
          vec4 wpCustom = modelMatrix * vec4(transformed, 1.0);
          vWorldPositionCustom = wpCustom.xyz;
          vWorldNormalCustom = normalize(mat3(modelMatrix) * objectNormal);`
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform vec3 uBulbWorldPos;
          uniform vec3 uGlowColor;
          uniform float uGlowPower;
          varying float vWallThickness;
          varying vec3 vWorldPositionCustom;
          varying vec3 vWorldNormalCustom;`
        )
        .replace(
          '#include <dithering_fragment>',
          `
          if (uGlowPower > 0.001) {
            vec3 toBulb = uBulbWorldPos - vWorldPositionCustom;
            float distMm = length(toBulb);
            vec3 lDir = toBulb / max(distMm, 1.0);
            vec3 nWorld = normalize(vWorldNormalCustom) * (gl_FrontFacing ? 1.0 : -1.0);

            float backAlign = clamp(dot(-nWorld, lDir) * 0.58 + 0.48, 0.0, 1.0);
            float innerDirect = clamp(dot(nWorld, lDir), 0.0, 1.0);

            float beer = exp(-0.76 * max(0.25, vWallThickness - 0.32));
            float distAtten = 1.0 / (1.0 + 0.00012 * distMm * distMm);

            vec3 vDir = normalize(cameraPosition - vWorldPositionCustom);
            float rimSoft = 0.78 + 0.22 * pow(1.0 - abs(dot(nWorld, vDir)), 1.5);

            vec3 subsurfaceGlow = uGlowColor * (uGlowPower * beer * distAtten * backAlign * rimSoft * 1.45);
            vec3 bounceInner = uGlowColor * (uGlowPower * innerDirect * distAtten * 0.24);
            gl_FragColor.rgb += subsurfaceGlow + bounceInner;
          }
          #include <dithering_fragment>`
        );
    };

    const cadShadedMaterial = new THREE.MeshStandardMaterial({
      color: 0xdcd7cc,
      roughness: 0.52,
      metalness: 0.08,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1
    });

    const overhangHeatmapMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.58,
      metalness: 0.04,
      side: THREE.DoubleSide
    });

    const xrayMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xd96b43,
      roughness: 0.25,
      metalness: 0.05,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0xe6dfd3,
      wireframe: true
    });

    const edgeLineMaterial = new THREE.LineBasicMaterial({
      color: 0x19191b,
      transparent: true,
      opacity: 0.62
    });

    const ALL_SHADE_MATERIALS = [
      warmDiffuserMaterial,
      cadShadedMaterial,
      overhangHeatmapMaterial,
      xrayMaterial,
      wireframeMaterial,
      edgeLineMaterial
    ];

    const lampRootGroup = new THREE.Group();
    scene.add(lampRootGroup);

    let shadeMesh = null;
    let featureEdges = null;
    const fixtureGroup = new THREE.Group();
    lampRootGroup.add(fixtureGroup);

    function rebuildReferenceFixture(collar) {
      while (fixtureGroup.children.length) {
        const ch = fixtureGroup.children.pop();
        if (ch.geometry) ch.geometry.dispose();
        if (ch.material) ch.material.dispose();
      }

      const H = collar.H;
      const rSocket = collar.rBore - 0.35;
      const isE14 = state.params.Duy_Tipi === 'E14_28mm';

      const brassMat = new THREE.MeshStandardMaterial({ color: 0x3b352e, roughness: 0.36, metalness: 0.72 });
      const cordMat = new THREE.MeshStandardMaterial({ color: 0x1c1b1a, roughness: 0.9, metalness: 0.05 });

      const barrelH = 38;
      const barrelGeo = new THREE.CylinderGeometry(rSocket, rSocket, barrelH, 48);
      const barrel = new THREE.Mesh(barrelGeo, brassMat);
      barrel.position.y = H + 8 - barrelH * 0.5;
      fixtureGroup.add(barrel);

      const nutR = collar.spec.nutOuterDiameterMm * 0.5;
      const topNutGeo = new THREE.CylinderGeometry(nutR * 0.92, nutR, 4.2, 48);
      const topNut = new THREE.Mesh(topNutGeo, brassMat);
      topNut.position.y = H + 2.1;
      fixtureGroup.add(topNut);

      const botNutGeo = new THREE.CylinderGeometry(nutR, nutR * 0.94, 4.5, 48);
      const botNut = new THREE.Mesh(botNutGeo, brassMat);
      botNut.position.y = H - collar.hCollar - 2.25;
      fixtureGroup.add(botNut);

      const capGeo = new THREE.CylinderGeometry(6.5, rSocket * 0.78, 14, 32);
      const cap = new THREE.Mesh(capGeo, brassMat);
      cap.position.y = H + 15;
      fixtureGroup.add(cap);

      const cordGeo = new THREE.CylinderGeometry(3.1, 3.1, 220, 16);
      const cord = new THREE.Mesh(cordGeo, cordMat);
      cord.position.y = H + 128;
      fixtureGroup.add(cord);

      const bulbR = isE14 ? 17.5 : 29.0;
      const bulbCenterY = H - collar.hCollar - (isE14 ? 34 : 44);

      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xfff3dc,
        roughness: 0.14,
        transmission: 0.78,
        transparent: true,
        opacity: 0.85,
        emissive: KELVIN_COLORS[state.lightKelvin] || KELVIN_COLORS[2700],
        emissiveIntensity: state.lightOn ? 0.55 : 0.0
      });
      const bulbGeo = new THREE.SphereGeometry(bulbR, 32, 24);
      if (isE14) bulbGeo.scale(1, 1.48, 1);
      const bulbMesh = new THREE.Mesh(bulbGeo, glassMat);
      bulbMesh.position.y = bulbCenterY;
      bulbMesh.name = 'bulbGlass';
      fixtureGroup.add(bulbMesh);

      const coreMat = new THREE.MeshBasicMaterial({
        color: state.lightOn ? (KELVIN_COLORS[state.lightKelvin] || KELVIN_COLORS[2700]) : 0x554c40
      });
      const coreGeo = new THREE.CylinderGeometry(2.2, 2.2, isE14 ? 18 : 22, 16);
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.position.y = bulbCenterY;
      coreMesh.name = 'bulbFilament';
      fixtureGroup.add(coreMesh);

      fixtureGroup.userData.bulbLocalY = bulbCenterY;
    }

    function updateLightingAndMaterials() {
      const kColor = KELVIN_COLORS[state.lightKelvin] || KELVIN_COLORS[2700];
      const pct = state.lightIntensityPct / 100.0;
      const isGlowMode = state.displayMode === 'glow';

      const activeClip = state.clipEnabled ? [clipPlane] : [];
      for (const mat of ALL_SHADE_MATERIALS) {
        mat.clippingPlanes = activeClip;
        mat.needsUpdate = true;
      }

      if (state.lightOn && (isGlowMode || state.displayMode === 'xray')) {
        interiorPointLight.color.copy(kColor);
        interiorPointLight.intensity = 16500 * pct;
        translucencyUniforms.uGlowColor.value.copy(kColor);
        translucencyUniforms.uGlowPower.value = 1.15 * pct;
        ambientLight.intensity = 0.24;
        keyDirLight.intensity = 0.52;
      } else {
        interiorPointLight.intensity = 0;
        translucencyUniforms.uGlowPower.value = 0.0;
        ambientLight.intensity = 0.52;
        keyDirLight.intensity = 1.05;
      }

      const bulbGlass = fixtureGroup.getObjectByName('bulbGlass');
      const bulbFilament = fixtureGroup.getObjectByName('bulbFilament');
      if (bulbGlass && bulbGlass.material) {
        bulbGlass.material.emissive.copy(kColor);
        bulbGlass.material.emissiveIntensity = state.lightOn ? 0.65 * pct : 0.0;
      }
      if (bulbFilament && bulbFilament.material) {
        bulbFilament.material.color.copy(state.lightOn ? kColor : new THREE.Color(0x4b463e));
      }

      fixtureGroup.visible = state.showFixture && !state.printBedFlipped && state.displayMode !== 'overhang';

      if (!shadeMesh) return;
      switch (state.displayMode) {
        case 'glow':
          shadeMesh.material = warmDiffuserMaterial;
          if (featureEdges) featureEdges.visible = false;
          break;
        case 'cad':
          shadeMesh.material = cadShadedMaterial;
          if (featureEdges) featureEdges.visible = true;
          break;
        case 'overhang':
          shadeMesh.material = overhangHeatmapMaterial;
          if (featureEdges) featureEdges.visible = false;
          break;
        case 'xray':
          shadeMesh.material = xrayMaterial;
          if (featureEdges) featureEdges.visible = true;
          break;
        case 'wire':
          shadeMesh.material = wireframeMaterial;
          if (featureEdges) featureEdges.visible = false;
          break;
      }
    }

    function updateClipPlaneEquation() {
      const off = state.clipOffsetMm;
      if (state.clipAxis === 'x') {
        clipPlane.set(new THREE.Vector3(-1, 0, 0), off);
      } else if (state.clipAxis === 'y') {
        const midY = (Number(state.params.Avize_Yuksekligi_mm) || 200) * 0.5;
        clipPlane.set(new THREE.Vector3(0, -1, 0), midY + off);
      } else {
        clipPlane.set(new THREE.Vector3(0, 0, -1), off);
      }
    }

    function syncOrientationTransform() {
      if (!currentCAD) return;
      const H = currentCAD.collar.H;

      if (state.printBedFlipped) {
        lampRootGroup.rotation.set(Math.PI, 0, 0);
        lampRootGroup.position.set(0, H, 0);
        floorMesh.position.y = -0.2;
        polarGrid.position.y = 0.0;
      } else {
        lampRootGroup.rotation.set(0, 0, 0);
        lampRootGroup.position.set(0, 0, 0);
        floorMesh.position.y = -58;
        polarGrid.position.y = -57.7;
      }

      lampRootGroup.updateMatrixWorld(true);
      const bulbLocalY = fixtureGroup.userData.bulbLocalY ?? (H - 52);
      const bulbWorld = new THREE.Vector3(0, bulbLocalY, 0).applyMatrix4(lampRootGroup.matrixWorld);
      interiorPointLight.position.copy(bulbWorld);
      translucencyUniforms.uBulbWorldPos.value.copy(bulbWorld);
    }

    function renderTelemetryAndOutputs(buildMs = '0.0') {
      if (!currentCAD) return;
      const { telemetry, collar, profile, svgLoops } = currentCAD;
      const bom = computeBOMAndPricing(state.params, telemetry, state.materialKey);

      const badgeEl = document.getElementById('overhang-status-badge');
      const fixBtn = document.getElementById('btn-auto-fix-overhang');
      if (telemetry.isSupportFreePass) {
        badgeEl.className = 'status-badge pass';
        badgeEl.textContent = `DESTEKSİZ BASKI ONAYLI — MAKS. SARKMA ${telemetry.maxOverhangDeg.toFixed(1)}° <= 45°`;
        fixBtn.hidden = true;
      } else {
        badgeEl.className = 'status-badge fail';
        badgeEl.textContent = `SARKMA AŞILDI: ${telemetry.maxOverhangDeg.toFixed(1)}° > 45° (DESTEK GEREKİR)`;
        fixBtn.hidden = false;
      }

      document.getElementById('hud-bbox').textContent =
        `${telemetry.bboxMm.x.toFixed(1)} × ${telemetry.bboxMm.z.toFixed(1)} × ${telemetry.bboxMm.y.toFixed(1)} mm`;
      document.getElementById('hud-vol').textContent =
        `${telemetry.volCm3.toFixed(2)} cm³ (${Math.round(telemetry.volumeMm3).toLocaleString('tr-TR')} mm³)`;
      document.getElementById('hud-mass').textContent = `${bom.netMassG.toFixed(1)} g`;
      document.getElementById('hud-overhang').textContent =
        `${telemetry.maxOverhangDeg.toFixed(1)}° (%${telemetry.safeRatioPct.toFixed(1)} güvenli)`;
      document.getElementById('hud-tris').textContent =
        `${telemetry.triangleCount.toLocaleString('tr-TR')} üçgen (${buildMs} ms)`;

      document.getElementById('collar-fitment-readout').textContent =
        `İç Çap Ø${collar.spec.boreDiameterMm.toFixed(1)} mm | Boğaz ${collar.hCollar.toFixed(1)} mm | 6x Örümcek Kol + ${collar.ventCount}x Isı Tahliye`;

      document.getElementById('bom-net-mass').textContent = `${bom.netMassG.toFixed(1)} g (+%5 fire: ${bom.grossMassG.toFixed(1)} g)`;
      document.getElementById('bom-print-time').textContent = `${bom.printHours.toFixed(2)} saat`;
      document.getElementById('bom-filament-cost').textContent = `₺${bom.filamentCostTry.toFixed(2)}`;
      document.getElementById('bom-machine-cost').textContent = `₺${bom.machineCostTry.toFixed(2)}`;
      document.getElementById('bom-hardware-cost').textContent =
        `₺${(bom.socketKitCostTry + bom.ledBulbCostTry + bom.packagingLaborTry).toFixed(2)}`;
      document.getElementById('bom-total-cost').textContent = `₺${bom.bomTotalTry.toFixed(2)}`;
      document.getElementById('bom-wholesale-price').textContent = `₺${bom.wholesalePriceTry.toFixed(2)}`;
      document.getElementById('bom-retail-price').textContent = `₺${bom.retailIncVatTry.toFixed(2)}`;

      const svgMarkup = generateImalatAntetiSVG(
        state.params,
        collar,
        profile,
        svgLoops,
        telemetry,
        state.materialKey
      );
      document.getElementById('antet-svg-preview').innerHTML = svgMarkup;

      const modalEl = document.getElementById('antet-modal');
      if (!modalEl.hidden) {
        document.getElementById('antet-modal-svg').innerHTML = svgMarkup;
      }
    }

    function rebuildModel() {
      const t0 = performance.now();
      const nextCAD = buildLampShadeGeometry(deps, state.params);

      if (shadeMesh) {
        lampRootGroup.remove(shadeMesh);
        shadeMesh.geometry.dispose();
      }
      if (featureEdges) {
        lampRootGroup.remove(featureEdges);
        featureEdges.geometry.dispose();
      }

      currentCAD = nextCAD;

      shadeMesh = new THREE.Mesh(currentCAD.geometry, warmDiffuserMaterial);
      shadeMesh.castShadow = true;
      shadeMesh.receiveShadow = true;
      lampRootGroup.add(shadeMesh);

      const edgesGeo = new THREE.EdgesGeometry(currentCAD.geometry, 24);
      featureEdges = new THREE.LineSegments(edgesGeo, edgeLineMaterial);
      lampRootGroup.add(featureEdges);

      rebuildReferenceFixture(currentCAD.collar);
      syncOrientationTransform();
      updateClipPlaneEquation();
      updateLightingAndMaterials();

      const buildMs = (performance.now() - t0).toFixed(1);
      renderTelemetryAndOutputs(buildMs);
    }

    const PARAM_BINDINGS = [
      { key: 'Avize_Capi_mm', min: 140, max: 250, step: 1 },
      { key: 'Avize_Yuksekligi_mm', min: 150, max: 250, step: 1 },
      { key: 'Dalga_Frekansi', min: 0.5, max: 5.0, step: 0.1 },
      { key: 'Burulma_Derecesi', min: 0, max: 300, step: 5 },
      { key: 'Kanat_Sayisi', min: 18, max: 60, step: 1 },
      { key: 'Cidar_Kalinligi_mm', min: 0.8, max: 2.8, step: 0.1 },
      { key: 'Isi_Tahliye_Delik_Sayisi', min: 4, max: 16, step: 1 }
    ];

    let rebuildQueued = false;
    function scheduleRebuild() {
      if (rebuildQueued) return;
      rebuildQueued = true;
      requestAnimationFrame(() => {
        rebuildQueued = false;
        rebuildModel();
      });
    }

    function syncControlInputsFromState() {
      for (const cfg of PARAM_BINDINGS) {
        const val = state.params[cfg.key];
        const r = document.getElementById(`rng-${cfg.key}`);
        const n = document.getElementById(`num-${cfg.key}`);
        if (r) r.value = String(val);
        if (n) n.value = String(val);
      }
      document.querySelectorAll('[data-duy]').forEach((b) => {
        b.classList.toggle('active', b.dataset.duy === state.params.Duy_Tipi);
      });
    }

    function switchProjection(mode) {
      const prevCam = activeCamera;
      const dist = prevCam.position.distanceTo(controls.target);

      if (mode === 'orthographic') {
        const aspect = viewportEl.clientWidth / Math.max(1, viewportEl.clientHeight);
        const halfH = dist * Math.tan(THREE.MathUtils.degToRad(perspCamera.fov * 0.5));
        orthoCamera.left = -halfH * aspect;
        orthoCamera.right = halfH * aspect;
        orthoCamera.top = halfH;
        orthoCamera.bottom = -halfH;
        orthoCamera.zoom = 1.0;
        orthoCamera.position.copy(prevCam.position);
        orthoCamera.quaternion.copy(prevCam.quaternion);
        orthoCamera.updateProjectionMatrix();
        activeCamera = orthoCamera;
      } else {
        perspCamera.position.copy(prevCam.position);
        perspCamera.quaternion.copy(prevCam.quaternion);
        perspCamera.updateProjectionMatrix();
        activeCamera = perspCamera;
      }

      controls.object = activeCamera;
      controls.update();
    }

    function setStandardView(viewName) {
      const H = Number(state.params.Avize_Yuksekligi_mm) || 205;
      const midY = H * 0.5;
      const dist = Math.max(380, Number(state.params.Avize_Capi_mm) * 2.15);

      if (viewName === 'bed') {
        state.printBedFlipped = !state.printBedFlipped;
        document.querySelector('[data-view="bed"]').classList.toggle('active', state.printBedFlipped);
        syncOrientationTransform();
        updateLightingAndMaterials();
        camAnim.targetLook.set(0, midY, 0);
        camAnim.targetPos.set(dist * 0.68, midY + dist * 0.42, dist * 0.72);
        camAnim.active = true;
        return;
      }

      camAnim.targetLook.set(0, midY, 0);
      switch (viewName) {
        case 'iso':
          camAnim.targetPos.set(dist * 0.66, midY + dist * 0.28, dist * 0.74);
          break;
        case 'top':
          camAnim.targetPos.set(0.01, midY + dist * 1.08, 0.01);
          break;
        case 'front':
          camAnim.targetPos.set(0, midY, dist * 1.05);
          break;
        case 'right':
          camAnim.targetPos.set(dist * 1.05, midY, 0);
          break;
        case 'bottom':
          camAnim.targetPos.set(0.01, midY - dist * 1.08, 0.01);
          break;
      }
      camAnim.active = true;
    }

    function bindControls() {
      for (const cfg of PARAM_BINDINGS) {
        const rangeEl = document.getElementById(`rng-${cfg.key}`);
        const numEl = document.getElementById(`num-${cfg.key}`);
        if (!rangeEl || !numEl) continue;

        const applyVal = (raw) => {
          const parsed = Number(raw);
          if (Number.isNaN(parsed)) return;
          const clamped = THREE.MathUtils.clamp(parsed, cfg.min, cfg.max);
          const val = cfg.step >= 1 ? Math.round(clamped) : Number(clamped.toFixed(2));
          state.params[cfg.key] = val;
          rangeEl.value = String(val);
          numEl.value = String(val);
          scheduleRebuild();
        };

        rangeEl.addEventListener('input', (e) => applyVal(e.target.value));
        numEl.addEventListener('change', (e) => applyVal(e.target.value));
      }

      document.querySelectorAll('[data-duy]').forEach((btn) => {
        btn.addEventListener('click', () => {
          state.params.Duy_Tipi = btn.dataset.duy;
          document.querySelectorAll('[data-duy]').forEach((b) => b.classList.toggle('active', b === btn));
          scheduleRebuild();
        });
      });

      const lockChk = document.getElementById('chk-support-free-lock');
      lockChk.addEventListener('change', () => {
        state.params.Desteksiz_45_Kilidi = lockChk.checked;
        scheduleRebuild();
      });

      document.getElementById('btn-auto-fix-overhang').addEventListener('click', () => {
        state.params.Desteksiz_45_Kilidi = true;
        lockChk.checked = true;
        scheduleRebuild();
      });

      const presetSel = document.getElementById('preset-selector');
      presetSel.addEventListener('change', () => {
        const tpl = PRESET_TEMPLATES[presetSel.value];
        if (!tpl) return;
        Object.assign(state.params, {
          Avize_Capi_mm: tpl.Avize_Capi_mm,
          Avize_Yuksekligi_mm: tpl.Avize_Yuksekligi_mm,
          Dalga_Frekansi: tpl.Dalga_Frekansi,
          Burulma_Derecesi: tpl.Burulma_Derecesi,
          Kanat_Sayisi: tpl.Kanat_Sayisi,
          Cidar_Kalinligi_mm: tpl.Cidar_Kalinligi_mm,
          Duy_Tipi: tpl.Duy_Tipi,
          Isi_Tahliye_Delik_Sayisi: tpl.Isi_Tahliye_Delik_Sayisi
        });
        syncControlInputsFromState();
        scheduleRebuild();
      });

      document.getElementById('chk-light-on').addEventListener('change', (e) => {
        state.lightOn = e.target.checked;
        updateLightingAndMaterials();
      });

      document.getElementById('chk-show-fixture').addEventListener('change', (e) => {
        state.showFixture = e.target.checked;
        updateLightingAndMaterials();
      });

      document.getElementById('rng-light-power').addEventListener('input', (e) => {
        state.lightIntensityPct = Number(e.target.value);
        document.getElementById('lbl-light-power').textContent = `%${state.lightIntensityPct}`;
        updateLightingAndMaterials();
      });

      document.querySelectorAll('[data-kelvin]').forEach((btn) => {
        btn.addEventListener('click', () => {
          state.lightKelvin = Number(btn.dataset.kelvin);
          document.querySelectorAll('[data-kelvin]').forEach((b) => b.classList.toggle('active', b === btn));
          updateLightingAndMaterials();
        });
      });

      document.getElementById('chk-clip-enable').addEventListener('change', (e) => {
        state.clipEnabled = e.target.checked;
        updateClipPlaneEquation();
        updateLightingAndMaterials();
      });

      document.querySelectorAll('[data-clip-axis]').forEach((btn) => {
        btn.addEventListener('click', () => {
          state.clipAxis = btn.dataset.clipAxis;
          document.querySelectorAll('[data-clip-axis]').forEach((b) => b.classList.toggle('active', b === btn));
          updateClipPlaneEquation();
        });
      });

      document.getElementById('rng-clip-offset').addEventListener('input', (e) => {
        state.clipOffsetMm = Number(e.target.value);
        document.getElementById('lbl-clip-offset').textContent = `${state.clipOffsetMm > 0 ? '+' : ''}${state.clipOffsetMm} mm`;
        updateClipPlaneEquation();
      });

      document.querySelectorAll('[data-mode]').forEach((btn) => {
        btn.addEventListener('click', () => {
          state.displayMode = btn.dataset.mode;
          document.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('active', b === btn));
          updateLightingAndMaterials();
        });
      });

      document.querySelectorAll('[data-proj]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const nextProj = btn.dataset.proj;
          if (nextProj === state.projection) return;
          state.projection = nextProj;
          document.querySelectorAll('[data-proj]').forEach((b) => b.classList.toggle('active', b === btn));
          switchProjection(nextProj);
        });
      });

      document.querySelectorAll('[data-view]').forEach((btn) => {
        btn.addEventListener('click', () => setStandardView(btn.dataset.view));
      });

      const matSel = document.getElementById('material-selector');
      for (const [k, m] of Object.entries(MATERIALS_DB)) {
        const opt = document.createElement('option');
        opt.value = k;
        opt.textContent = m.name;
        matSel.appendChild(opt);
      }
      matSel.value = state.materialKey;
      matSel.addEventListener('change', () => {
        state.materialKey = matSel.value;
        renderTelemetryAndOutputs();
      });

      const modal = document.getElementById('antet-modal');
      const openModal = () => {
        if (!currentCAD) return;
        document.getElementById('antet-modal-svg').innerHTML = generateImalatAntetiSVG(
          state.params,
          currentCAD.collar,
          currentCAD.profile,
          currentCAD.svgLoops,
          currentCAD.telemetry,
          state.materialKey
        );
        modal.hidden = false;
      };
      document.getElementById('btn-expand-antet').addEventListener('click', openModal);
      document.getElementById('antet-svg-preview').addEventListener('click', openModal);
      document.getElementById('btn-close-antet').addEventListener('click', () => {
        modal.hidden = true;
      });
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.hidden = true;
      });

      document.getElementById('btn-export-stl').addEventListener('click', () => {
        if (currentCAD) downloadBinarySTL(deps, currentCAD.geometry, state.params);
      });
      document.getElementById('btn-export-svg').addEventListener('click', () => {
        if (currentCAD) {
          downloadImalatAntetiSVG(
            state.params,
            currentCAD.collar,
            currentCAD.profile,
            currentCAD.svgLoops,
            currentCAD.telemetry,
            state.materialKey
          );
        }
      });
      document.getElementById('btn-modal-export-svg').addEventListener('click', () => {
        if (currentCAD) {
          downloadImalatAntetiSVG(
            state.params,
            currentCAD.collar,
            currentCAD.profile,
            currentCAD.svgLoops,
            currentCAD.telemetry,
            state.materialKey
          );
        }
      });
      document.getElementById('btn-export-csv').addEventListener('click', () => {
        if (currentCAD) downloadBOMAndPricingCSV(state.params, currentCAD.telemetry, state.materialKey);
      });
      document.getElementById('btn-export-obj').addEventListener('click', () => {
        if (currentCAD) downloadWavefrontOBJ(deps, currentCAD.geometry, state.params);
      });
      document.getElementById('btn-export-glb').addEventListener('click', () => {
        if (currentCAD) downloadBinaryGLB(deps, currentCAD.geometry, state.params);
      });
      document.getElementById('btn-export-dxf').addEventListener('click', () => {
        if (currentCAD) downloadCollarDXF(state.params, currentCAD.collar, currentCAD.svgLoops);
      });
      document.getElementById('btn-export-scad').addEventListener('click', () => {
        if (currentCAD) downloadParametricSCAD(state.params, currentCAD.collar);
      });
    }

    controls.addEventListener('start', () => {
      camAnim.active = false;
    });

    function handleResize() {
      const w = viewportEl.clientWidth;
      const h = Math.max(1, viewportEl.clientHeight);
      const aspect = w / h;

      renderer.setSize(w, h, false);

      perspCamera.aspect = aspect;
      perspCamera.updateProjectionMatrix();

      const halfH = Math.abs(orthoCamera.top) || 190;
      orthoCamera.left = -halfH * aspect;
      orthoCamera.right = halfH * aspect;
      orthoCamera.top = halfH;
      orthoCamera.bottom = -halfH;
      orthoCamera.updateProjectionMatrix();
    }

    window.addEventListener('resize', handleResize);

    const clock = new THREE.Clock();
    let fpsFrames = 0;
    let fpsAccum = 0;
    const fpsEl = document.getElementById('hud-fps');

    function animate() {
      requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);

      if (camAnim.active) {
        activeCamera.position.x = damp(activeCamera.position.x, camAnim.targetPos.x, 8.5, dt);
        activeCamera.position.y = damp(activeCamera.position.y, camAnim.targetPos.y, 8.5, dt);
        activeCamera.position.z = damp(activeCamera.position.z, camAnim.targetPos.z, 8.5, dt);
        controls.target.x = damp(controls.target.x, camAnim.targetLook.x, 8.5, dt);
        controls.target.y = damp(controls.target.y, camAnim.targetLook.y, 8.5, dt);
        controls.target.z = damp(controls.target.z, camAnim.targetLook.z, 8.5, dt);
        if (activeCamera.position.distanceTo(camAnim.targetPos) < 0.6) {
          camAnim.active = false;
        }
      }

      controls.update();
      renderer.render(scene, activeCamera);

      fpsFrames++;
      fpsAccum += dt;
      if (fpsAccum >= 0.5) {
        const fps = Math.round(fpsFrames / fpsAccum);
        if (fpsEl) fpsEl.textContent = `${fps} FPS`;
        fpsFrames = 0;
        fpsAccum = 0;
      }
    }

    bindControls();
    syncControlInputsFromState();
    handleResize();
    rebuildModel();
    animate();
  };
})();
