(() => {
  "use strict";

  const CONFIG = Object.freeze({
    leafletVersion: "1.9.4",
    initialView: Object.freeze({ lat: 42.934, lng: 143.287, zoom: 13 }),
    mapMinZoom: 7,
    mapMaxZoom: 18,
    vegetationMinZoom: 12,
    debounceMs: 220,
    legendSearchDebounceMs: 90,
    pageSize: 2000,
    maxPages: 6,
    queryBufferRatio: 0.18,
    lowPowerQueryBufferRatio: 0.12,
    memoryCacheEntries: 4,
    vegetationPane: "vegetationPane",
    vegetationPaneZIndex: 410,
    locationAccuracyPane: "locationAccuracyPane",
    locationAccuracyPaneZIndex: 425,
    locationPane: "locationPane",
    locationPaneZIndex: 430,
    locationMaxZoom: 15,
    locationTimeoutMs: 12000,
    locationMaximumAgeMs: 30000,
    featureServiceUrl:
      "https://svr-moej.gisservice.jp/arcgis/rest/services/Hosted/veg2024bk1gdb/FeatureServer/0",
    standardTileUrl: "https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png",
    photoTileUrl:
      "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg",
    fields: Object.freeze({
      objectId: "fid",
      legendCode: "凡例コード",
      legendName: "凡例名",
      naturalness: "植生自然度",
      naturalnessClass: "植生自然度区分",
      vegetationClass: "植生区分",
      createdYear: "作成年度",
    }),
    stagPreset: Object.freeze({
      primaryKeywords: Object.freeze([
        "ミズナラ",
        "コナラ",
        "カシワ",
        "クヌギ",
        "ナラ林",
        "ハルニレ",
        "ニレ林",
        "ヤナギ",
        "ハンノキ",
      ]),
      habitatKeywords: Object.freeze([
        "ヤチダモ",
        "落葉広葉樹林",
        "広葉樹二次林",
        "落葉広葉樹二次林",
        "河畔林",
        "湿性林",
        "ブナ林",
      ]),
      excludedKeywords: Object.freeze([
        "耕作地",
        "市街地",
        "造成地",
        "裸地",
        "水面",
        "水域",
        "ゴルフ場",
        "畑雑草",
        "水田雑草",
        "牧草地",
        "果樹園",
      ]),
    }),
  });

  const DEVICE_PROFILE = Object.freeze((() => {
    const hardwareConcurrency = Number(navigator.hardwareConcurrency) || 4;
    const deviceMemory = Number(navigator.deviceMemory) || 0;
    const mobile = window.matchMedia("(max-width: 700px), (pointer: coarse)").matches;
    const lowPower = hardwareConcurrency <= 4 || (deviceMemory > 0 && deviceMemory <= 4);
    return Object.freeze({
      hardwareConcurrency,
      deviceMemory,
      mobile,
      lowPower,
      rendererPadding: lowPower ? 0.18 : 0.25,
      smoothFactor: lowPower ? 1.8 : 1.25,
      generalizationPixelFactor: lowPower ? 0.72 : 0.48,
    });
  })());

  const DESCRIPTION_RULES = Object.freeze([
    Object.freeze({
      keywords: Object.freeze(["ミズナラ"]),
      text: "北海道の冷涼な地域を代表する落葉広葉樹林です。樹液を利用する昆虫や、老木・枯死木を利用する生物の環境になりやすい植生です。",
    }),
    Object.freeze({
      keywords: Object.freeze(["コナラ"]),
      text: "コナラを主体とする落葉広葉樹林です。薪炭林など人の利用と関わって成立した二次林を含み、樹液性昆虫の観察候補になりやすい植生です。",
    }),
    Object.freeze({
      keywords: Object.freeze(["カシワ"]),
      text: "カシワを主体または混生する落葉広葉樹林です。十勝では比較的乾いた立地にも見られ、ミズナラと混じる林もあります。",
    }),
    Object.freeze({
      keywords: Object.freeze(["クヌギ"]),
      text: "クヌギを主体とする落葉広葉樹林です。樹液が出る木として知られますが、北海道では分布が限られるため現地確認が必要です。",
    }),
    Object.freeze({
      keywords: Object.freeze(["ハルニレ"]),
      text: "湿潤で肥沃な場所に成立しやすいハルニレ中心の落葉広葉樹林です。河川沿いや段丘斜面下部などで見られます。",
    }),
    Object.freeze({
      keywords: Object.freeze(["ヤチダモ"]),
      text: "湿った低地や河畔に成立しやすいヤチダモ中心の落葉広葉樹林です。ハルニレやハンノキなどと混生する場合があります。",
    }),
    Object.freeze({
      keywords: Object.freeze(["ハンノキ"]),
      text: "湿地や水分の多い低地に成立しやすいハンノキ林です。河畔林や湿性林の一部として他の広葉樹と混じることがあります。",
    }),
    Object.freeze({
      keywords: Object.freeze(["ヤナギ"]),
      text: "主に河川沿いに成立するヤナギ類の河畔林です。洪水や河道変化の影響を受けやすい、水辺に特徴的な植生です。",
    }),
    Object.freeze({
      keywords: Object.freeze(["シラカンバ", "ダケカンバ"]),
      text: "カンバ類を主体とする落葉広葉樹林です。攪乱後に成立した二次林や、標高の高い場所の林を含むことがあります。",
    }),
    Object.freeze({
      keywords: Object.freeze(["ブナ"]),
      text: "ブナを主体または混生する落葉広葉樹林です。比較的湿潤な環境に成立し、成熟した森林では多様な樹齢・枯死木が見られます。",
    }),
    Object.freeze({
      keywords: Object.freeze(["カラマツ"]),
      text: "カラマツを主体とする落葉針葉樹の植林です。十勝で広く見られる人工林で、天然の落葉広葉樹林とは林の構造が異なります。",
    }),
    Object.freeze({
      keywords: Object.freeze(["トドマツ", "アカエゾマツ", "エゾマツ", "常緑針葉樹植林"]),
      text: "常緑針葉樹を主体とする森林または植林です。林床の明るさや樹種構成は、落葉広葉樹林と大きく異なる場合があります。",
    }),
    Object.freeze({
      keywords: Object.freeze(["針広混交"]),
      text: "針葉樹と広葉樹が混在する森林です。混合の割合や林齢によって、林内環境は場所ごとに大きく変わります。",
    }),
    Object.freeze({
      keywords: Object.freeze(["落葉広葉樹林", "広葉樹二次林", "落葉広葉樹二次林"]),
      text: "落葉広葉樹を主体とする森林です。樹種、林齢、枯死木の量などによって昆虫や野生生物の利用環境は変わります。",
    }),
    Object.freeze({
      keywords: Object.freeze(["植林"]),
      text: "人為的に造成・管理された植林地です。植栽樹種や管理履歴により、林の密度や下層植生が異なります。",
    }),
    Object.freeze({
      keywords: Object.freeze(["ササ"]),
      text: "ササ類が優占する植生です。林床に広がる場合と、伐採跡地などでまとまった群落をつくる場合があります。",
    }),
    Object.freeze({
      keywords: Object.freeze(["ヨシ", "湿原", "湿性草原", "スゲ"]),
      text: "水分の多い低地や湿原に成立する草本植生です。水位や土壌条件の変化に影響されやすい環境です。",
    }),
    Object.freeze({
      keywords: Object.freeze(["草原", "牧草"]),
      text: "草本が優占する開けた植生です。自然草原、半自然草原、牧草地など成立要因の異なる区域を含むことがあります。",
    }),
    Object.freeze({
      keywords: Object.freeze(["水田", "畑", "耕作地", "農耕地"]),
      text: "農業利用されている土地の植生区分です。作物、管理方法、休耕状態によって実際の植被は変化します。",
    }),
    Object.freeze({
      keywords: Object.freeze(["市街地", "造成地", "人工構造物"]),
      text: "建物、道路、造成地など人為的な土地利用が中心の区域です。局所的な樹林や緑地は縮尺上まとめられている場合があります。",
    }),
    Object.freeze({
      keywords: Object.freeze(["裸地", "自然裸地", "砂礫地"]),
      text: "植物被覆が少ない裸地や砂礫地です。河原、崩壊地、造成地など、成立要因は場所により異なります。",
    }),
    Object.freeze({
      keywords: Object.freeze(["開放水域", "水面", "河川", "湖沼"]),
      text: "河川、湖沼などの開放水域として区分された区域です。水際の細かな植生は縮尺上別表示されない場合があります。",
    }),
  ]);

  class AppError extends Error {
    constructor(code, message, details = null) {
      super(message);
      this.name = "AppError";
      this.code = code;
      this.details = details;
    }
  }

  const elements = {
    map: document.getElementById("map"),
    controlPanel: document.getElementById("control-panel"),
    settingsToggle: document.getElementById("settings-toggle"),
    settingsContent: document.getElementById("settings-content"),
    locationButton: document.getElementById("location-button"),
    baseMapRadios: Array.from(document.querySelectorAll('input[name="base-map"]')),
    vegetationToggle: document.getElementById("vegetation-toggle"),
    opacitySlider: document.getElementById("opacity-slider"),
    opacityValue: document.getElementById("opacity-value"),
    statusOrb: document.getElementById("status-orb"),
    statusLive: document.getElementById("status-live"),
    legendToggle: document.getElementById("legend-toggle"),
    legendContent: document.getElementById("legend-content"),
    legendCount: document.getElementById("legend-count"),
    legendSearch: document.getElementById("legend-search"),
    legendList: document.getElementById("legend-list"),
    legendEmpty: document.getElementById("legend-empty"),
    legendVisibleSummary: document.getElementById("legend-visible-summary"),
    legendShowAll: document.getElementById("legend-show-all"),
    legendHideAll: document.getElementById("legend-hide-all"),
    presetAll: document.getElementById("preset-all"),
    presetStag: document.getElementById("preset-stag"),
    presetNote: document.getElementById("preset-note"),
  };

  let map;
  let standardLayer;
  let photoLayer;
  let activeBaseLayer;
  let vegetationGroup;
  let activeGeoJsonLayer = null;
  let vegetationRenderer;
  let preparedLayerRecords = [];
  let currentFillOpacity = 0.45;
  let activeAbortController = null;
  let requestSequence = 0;
  let debounceTimer = null;
  let legendSearchTimer = null;
  let sourceFeatureCollection = createEmptyFeatureCollection();
  let renderedFeatureCollection = createEmptyFeatureCollection();
  let legendCatalog = new Map();
  let filterMode = "all";
  let hiddenLegendKeys = new Set();
  let legendSearchText = "";
  let lastRequestedBounds = null;
  let lastQueryZoom = null;
  let lastReachedClientLimit = false;
  let lastDiagnostics = null;
  let viewCache = [];
  let locationMarker = null;
  let locationAccuracyCircle = null;

  function assertDependencies() {
    if (!window.L) {
      throw new AppError(
        "LEAFLET_UNAVAILABLE",
        "Leafletを読み込めませんでした。ローカル配布ファイルを確認してください。",
      );
    }

    for (const [name, element] of Object.entries(elements)) {
      if (name === "baseMapRadios") {
        if (element.length < 2) {
          throw new AppError("DOM_MISSING", "背景地図切替の画面要素が不足しています。");
        }
        continue;
      }
      if (!element) {
        throw new AppError("DOM_MISSING", `必要な画面要素がない: ${name}`);
      }
    }
  }

  function initializeMap() {
    map = L.map(elements.map, {
      center: [CONFIG.initialView.lat, CONFIG.initialView.lng],
      zoom: CONFIG.initialView.zoom,
      minZoom: CONFIG.mapMinZoom,
      maxZoom: CONFIG.mapMaxZoom,
      zoomControl: true,
      preferCanvas: false,
      zoomAnimation: !DEVICE_PROFILE.lowPower,
      fadeAnimation: false,
      markerZoomAnimation: false,
      wheelDebounceTime: 35,
      wheelPxPerZoomLevel: 72,
    });

    const tileOptions = {
      minZoom: CONFIG.mapMinZoom,
      maxZoom: CONFIG.mapMaxZoom,
      maxNativeZoom: 18,
      updateWhenIdle: true,
      updateWhenZooming: false,
      keepBuffer: DEVICE_PROFILE.lowPower ? 1 : 2,
      detectRetina: false,
    };

    standardLayer = L.tileLayer(CONFIG.standardTileUrl, {
      ...tileOptions,
      attribution:
        '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener noreferrer">地理院タイル</a>（標準地図）',
    });

    photoLayer = L.tileLayer(CONFIG.photoTileUrl, {
      ...tileOptions,
      attribution:
        '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener noreferrer">地理院タイル</a>（全国最新写真）',
    });

    activeBaseLayer = standardLayer.addTo(map);

    map.createPane(CONFIG.vegetationPane);
    const vegetationPane = map.getPane(CONFIG.vegetationPane);
    vegetationPane.style.zIndex = String(CONFIG.vegetationPaneZIndex);
    vegetationPane.style.pointerEvents = "auto";

    map.createPane(CONFIG.locationAccuracyPane);
    const accuracyPane = map.getPane(CONFIG.locationAccuracyPane);
    accuracyPane.style.zIndex = String(CONFIG.locationAccuracyPaneZIndex);
    accuracyPane.style.pointerEvents = "none";

    map.createPane(CONFIG.locationPane);
    const locationPane = map.getPane(CONFIG.locationPane);
    locationPane.style.zIndex = String(CONFIG.locationPaneZIndex);

    vegetationRenderer = L.svg({
      pane: CONFIG.vegetationPane,
      padding: DEVICE_PROFILE.rendererPadding,
    });

    vegetationGroup = L.featureGroup().addTo(map);

    map.on("locationfound", handleLocationFound);
    map.on("locationerror", handleLocationError);

    map.attributionControl.addAttribution(
      '<a href="https://svr-moej.gisservice.jp/arcgis/rest/services/Hosted/veg2024bk1gdb/FeatureServer/0" target="_blank" rel="noopener noreferrer">環境省 現存植生図2024</a>',
    );
  }

  function initializeControls() {
    elements.baseMapRadios.forEach((radio) => {
      radio.addEventListener("change", handleBaseMapChange);
    });

    elements.settingsToggle.addEventListener("click", toggleSettings);
    elements.locationButton.addEventListener("click", locateUser);
    elements.vegetationToggle.addEventListener("change", handleVegetationToggle);
    elements.opacitySlider.addEventListener("input", handleOpacityChange);
    elements.legendToggle.addEventListener("click", toggleLegend);
    elements.legendSearch.addEventListener("input", handleLegendSearch);
    elements.legendList.addEventListener("change", handleLegendItemChange);
    elements.legendShowAll.addEventListener("click", () => setFilterMode("all"));
    elements.legendHideAll.addEventListener("click", hideAllLegends);
    elements.presetAll.addEventListener("click", () => setFilterMode("all"));
    elements.presetStag.addEventListener("click", () => setFilterMode("stag"));

    const mobileQuery = window.matchMedia("(max-width: 700px)");
    setSettingsExpanded(!mobileQuery.matches);
    setLegendExpanded(!mobileQuery.matches);

    map.on("movestart zoomstart", cancelActiveRequest);
    map.on("moveend", () => scheduleVegetationLoad("map-change"));

    elements.opacityValue.value = `${elements.opacitySlider.value}%`;
    updateOpacitySliderVisual();
    updateLocationButton("idle", "現在地を表示");
    updateStatus("loading", "植生データを読み込んでいます。");
    renderLegend();
  }

  function toggleSettings() {
    const expanded = elements.settingsToggle.getAttribute("aria-expanded") === "true";
    setSettingsExpanded(!expanded);
  }

  function setSettingsExpanded(expanded) {
    elements.settingsToggle.setAttribute("aria-expanded", String(expanded));
    elements.settingsContent.hidden = !expanded;
    elements.controlPanel.dataset.collapsed = String(!expanded);
  }

  function locateUser() {
    if (!window.isSecureContext || !navigator.geolocation) {
      updateLocationButton("error", "現在地はHTTPSまたはlocalhostでのみ利用できます。");
      return;
    }

    updateLocationButton("loading", "現在地を取得しています。");
    map.locate({
      watch: false,
      setView: true,
      maxZoom: CONFIG.locationMaxZoom,
      enableHighAccuracy: true,
      timeout: CONFIG.locationTimeoutMs,
      maximumAge: CONFIG.locationMaximumAgeMs,
    });
  }

  function handleLocationFound(event) {
    const accuracy = Math.max(0, Math.round(event.accuracy || 0));

    if (locationAccuracyCircle) {
      locationAccuracyCircle.setLatLng(event.latlng).setRadius(accuracy);
    } else {
      locationAccuracyCircle = L.circle(event.latlng, {
        pane: CONFIG.locationAccuracyPane,
        className: "location-accuracy",
        radius: accuracy,
        color: "#7A5A46",
        weight: 1,
        opacity: 0.5,
        fillColor: "#B59278",
        fillOpacity: 0.12,
        interactive: false,
      }).addTo(map);
    }

    if (locationMarker) {
      locationMarker.setLatLng(event.latlng);
    } else {
      locationMarker = L.circleMarker(event.latlng, {
        pane: CONFIG.locationPane,
        className: "location-marker",
        radius: 7,
        color: "#FFFDF9",
        weight: 3,
        opacity: 1,
        fillColor: "#674938",
        fillOpacity: 1,
      }).addTo(map);
    }

    const accuracyText = accuracy > 0 ? `精度 約±${accuracy.toLocaleString("ja-JP")}m` : "精度情報なし";
    locationMarker.bindTooltip(`現在地（${accuracyText}）`, { direction: "top", offset: [0, -8] });
    updateLocationButton("success", `現在地を表示中・${accuracyText}`);
  }

  function handleLocationError(event) {
    const messageByCode = {
      1: "位置情報の利用が許可されていません。ブラウザの設定を確認してください。",
      2: "現在地を取得できませんでした。屋外または通信環境の良い場所で再試行してください。",
      3: "現在地の取得がタイムアウトしました。もう一度お試しください。",
    };
    updateLocationButton(
      "error",
      messageByCode[event.code] || "現在地を取得できませんでした。",
    );
  }

  function updateLocationButton(state, message) {
    elements.locationButton.dataset.state = state;
    elements.locationButton.dataset.tooltip = message;
    elements.locationButton.title = message;
    elements.locationButton.setAttribute("aria-label", message);
  }

  function handleBaseMapChange(event) {
    const selected = event.target.value === "photo" ? photoLayer : standardLayer;
    if (selected === activeBaseLayer) {
      return;
    }

    map.removeLayer(activeBaseLayer);
    activeBaseLayer = selected.addTo(map);
  }

  function handleVegetationToggle() {
    if (!elements.vegetationToggle.checked) {
      cancelActiveRequest();
      detachVisibleVegetation();
      updateStatus("idle", "植生オーバーレイは非表示です。");
      return;
    }

    if (preparedLayerRecords.length > 0) {
      void refreshVegetationFromFilter("overlay-enabled");
      return;
    }

    scheduleVegetationLoad("overlay-enabled", 0);
  }

  function handleOpacityChange() {
    currentFillOpacity = Number(elements.opacitySlider.value) / 100;
    elements.opacityValue.value = `${elements.opacitySlider.value}%`;
    updateOpacitySliderVisual();

    preparedLayerRecords.forEach(({ layer }) => {
      if (typeof layer.setStyle === "function") {
        layer.setStyle({ fillOpacity: currentFillOpacity });
      }
    });
  }

  function updateOpacitySliderVisual() {
    const minimum = Number(elements.opacitySlider.min);
    const maximum = Number(elements.opacitySlider.max);
    const value = Number(elements.opacitySlider.value);
    const percentage = ((value - minimum) / (maximum - minimum)) * 100;
    elements.opacitySlider.style.background =
      `linear-gradient(to right, #7A5A46 0%, #7A5A46 ${percentage}%, #DED3C9 ${percentage}%, #DED3C9 100%)`;
  }

  function toggleLegend() {
    const expanded = elements.legendToggle.getAttribute("aria-expanded") === "true";
    setLegendExpanded(!expanded);
  }

  function setLegendExpanded(expanded) {
    elements.legendToggle.setAttribute("aria-expanded", String(expanded));
    elements.legendContent.hidden = !expanded;
  }

  function handleLegendSearch(event) {
    legendSearchText = normalizeText(event.target.value);
    window.clearTimeout(legendSearchTimer);
    legendSearchTimer = window.setTimeout(renderLegend, CONFIG.legendSearchDebounceMs);
  }

  function handleLegendItemChange(event) {
    const checkbox = event.target.closest(".legend-checkbox");
    if (!checkbox) {
      return;
    }

    transitionToCustomFilter();
    const key = checkbox.dataset.legendKey;
    if (checkbox.checked) {
      hiddenLegendKeys.delete(key);
    } else {
      hiddenLegendKeys.add(key);
    }

    void refreshVegetationFromFilter("legend-item");
  }

  function transitionToCustomFilter() {
    if (filterMode === "custom") {
      return;
    }

    const currentlyHidden = new Set();
    legendCatalog.forEach((item, key) => {
      if (!isLegendVisible(item)) {
        currentlyHidden.add(key);
      }
    });
    hiddenLegendKeys = currentlyHidden;
    filterMode = "custom";
    syncPresetUi();
  }

  function setFilterMode(mode) {
    if (mode !== "all" && mode !== "stag") {
      return;
    }

    filterMode = mode;
    if (mode === "all") {
      hiddenLegendKeys.clear();
    }
    syncPresetUi();
    void refreshVegetationFromFilter(`preset-${mode}`);
  }

  function hideAllLegends() {
    filterMode = "custom";
    hiddenLegendKeys = new Set(legendCatalog.keys());
    syncPresetUi();
    void refreshVegetationFromFilter("hide-all");
  }

  function syncPresetUi() {
    elements.presetAll.setAttribute("aria-pressed", String(filterMode === "all"));
    elements.presetStag.setAttribute("aria-pressed", String(filterMode === "stag"));
    elements.presetNote.hidden = filterMode !== "stag";
  }

  function scheduleVegetationLoad(reason, delay = CONFIG.debounceMs) {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      void loadVegetation(reason);
    }, delay);
  }

  function cancelActiveRequest() {
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }
  }

  async function loadVegetation(reason) {
    if (!elements.vegetationToggle.checked) {
      return;
    }

    const zoom = map.getZoom();
    const viewBounds = map.getBounds();
    if (zoom < CONFIG.vegetationMinZoom) {
      cancelActiveRequest();
      resetVegetationData();
      updateStatus(
        "warning",
        `植生を表示するにはズーム${CONFIG.vegetationMinZoom}以上まで拡大してください。`,
      );
      return;
    }

    if (canReuseCurrentData(viewBounds, zoom)) {
      console.info("[Vegetation] 取得済み余白範囲を再利用", { reason, zoom });
      updateStatusForCurrentView(lastDiagnostics ?? createLightweightDiagnostics(), lastReachedClientLimit);
      return;
    }

    const cachedEntry = findCachedView(viewBounds, zoom);
    if (cachedEntry) {
      console.info("[Vegetation] メモリキャッシュを再利用", { reason, zoom });
      useSourceData(cachedEntry.featureCollection, cachedEntry.bounds, zoom, cachedEntry.reachedLimit);
      const diagnostics = await renderFilteredVegetation(viewBounds);
      lastDiagnostics = diagnostics;
      updateStatusForCurrentView(diagnostics, cachedEntry.reachedLimit);
      return;
    }

    cancelActiveRequest();
    const controller = new AbortController();
    activeAbortController = controller;
    const requestId = ++requestSequence;
    const bufferRatio = DEVICE_PROFILE.lowPower
      ? CONFIG.lowPowerQueryBufferRatio
      : CONFIG.queryBufferRatio;
    const requestedBounds = viewBounds.pad(bufferRatio);

    updateStatus("loading", "植生データを読み込んでいます。");

    try {
      const result = await fetchAllPages(requestedBounds, zoom, controller.signal, requestId);
      if (requestId !== requestSequence || controller.signal.aborted) {
        return;
      }

      useSourceData(result.featureCollection, requestedBounds, zoom, result.reachedClientLimit);
      rememberView(requestedBounds, zoom, result.featureCollection, result.reachedClientLimit);

      const diagnostics = await renderFilteredVegetation(viewBounds);
      lastDiagnostics = diagnostics;

      const issues = runSelfDiagnosis(
        sourceFeatureCollection,
        renderedFeatureCollection,
        diagnostics,
        viewBounds,
      );

      if (issues.length > 0) {
        console.error("[Vegetation] 自己診断エラー", issues, diagnostics);
        updateStatus("error", `植生を描画できませんでした: ${issues.join(" / ")}`);
        return;
      }

      updateStatusForCurrentView(diagnostics, result.reachedClientLimit);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        console.info("[Vegetation] 古い通信を中断", { requestId });
        return;
      }
      if (controller.signal.aborted) {
        return;
      }

      handleLoadError(error);
    } finally {
      if (activeAbortController === controller) {
        activeAbortController = null;
      }
    }
  }

  async function fetchAllPages(bounds, zoom, signal, requestId) {
    const uniqueFeatures = new Map();
    let reachedClientLimit = false;

    for (let pageIndex = 0; pageIndex < CONFIG.maxPages; pageIndex += 1) {
      const offset = pageIndex * CONFIG.pageSize;
      const queryUrl = buildQueryUrl(bounds, offset, zoom);

      console.groupCollapsed(`[Vegetation] Query page ${pageIndex + 1}`);
      console.info("Query URL", queryUrl);

      let response;
      try {
        response = await fetch(queryUrl, {
          method: "GET",
          mode: "cors",
          credentials: "omit",
          cache: "default",
          signal,
          headers: {
            Accept: "application/geo+json, application/json;q=0.9, */*;q=0.8",
          },
        });
      } catch (error) {
        console.error("通信失敗", error);
        console.groupEnd();
        throw new AppError("NETWORK_ERROR", "API通信エラー", error);
      }

      const contentType = response.headers.get("content-type") ?? "不明";
      console.info("HTTP Status", response.status);
      console.info("content-type", contentType);

      if (!response.ok) {
        console.groupEnd();
        throw new AppError(
          "HTTP_ERROR",
          `API通信エラー（HTTP ${response.status}）`,
          { status: response.status, contentType },
        );
      }

      const text = await response.text();
      let geoJson;
      try {
        geoJson = JSON.parse(text);
      } catch (error) {
        console.error("GeoJSON解析失敗", error);
        console.groupEnd();
        throw new AppError("GEOJSON_PARSE_ERROR", "GeoJSON解析エラー", error);
      }

      if (geoJson?.error) {
        console.error("ArcGIS API error", geoJson.error);
        console.groupEnd();
        throw new AppError(
          "ARCGIS_API_ERROR",
          `API通信エラー: ${safeText(geoJson.error.message)}`,
          geoJson.error,
        );
      }

      if (geoJson?.type !== "FeatureCollection" || !Array.isArray(geoJson.features)) {
        console.error("FeatureCollectionではないレスポンス", {
          type: geoJson?.type,
          keys: geoJson && typeof geoJson === "object" ? Object.keys(geoJson) : [],
        });
        console.groupEnd();
        throw new AppError(
          "INVALID_GEOJSON",
          "GeoJSON解析エラー: FeatureCollectionではない",
        );
      }

      const geometryCounts = countGeometryTypes(geoJson.features);
      console.info("Feature件数", geoJson.features.length);
      console.info("GeoJSON Geometry Type内訳", geometryCounts);

      let addedOnThisPage = 0;
      geoJson.features.forEach((feature, index) => {
        const objectId = feature?.properties?.[CONFIG.fields.objectId];
        const key = objectId == null ? `${pageIndex}:${index}` : String(objectId);
        if (!uniqueFeatures.has(key)) {
          uniqueFeatures.set(key, feature);
          addedOnThisPage += 1;
        }
      });

      const exceededTransferLimit =
        geoJson.exceededTransferLimit === true ||
        geoJson.properties?.exceededTransferLimit === true;

      console.info("重複除外後の追加件数", addedOnThisPage);
      console.info("exceededTransferLimit", exceededTransferLimit);
      console.groupEnd();

      if (requestId !== requestSequence || signal.aborted) {
        throw new DOMException("Request aborted", "AbortError");
      }

      if (geoJson.features.length === 0) {
        break;
      }

      if (addedOnThisPage === 0) {
        throw new AppError(
          "PAGINATION_STALLED",
          "ページングで同一Featureが返されたため、取得を停止しました。",
        );
      }

      if (geoJson.features.length < CONFIG.pageSize && !exceededTransferLimit) {
        break;
      }

      if (pageIndex === CONFIG.maxPages - 1) {
        reachedClientLimit = true;
      }
    }

    return {
      featureCollection: {
        type: "FeatureCollection",
        features: Array.from(uniqueFeatures.values()),
      },
      reachedClientLimit,
    };
  }

  function buildQueryUrl(bounds, offset, zoom) {
    const west = bounds.getWest().toFixed(6);
    const south = bounds.getSouth().toFixed(6);
    const east = bounds.getEast().toFixed(6);
    const north = bounds.getNorth().toFixed(6);
    const outFields = [
      CONFIG.fields.objectId,
      CONFIG.fields.legendCode,
      CONFIG.fields.legendName,
      CONFIG.fields.naturalness,
      CONFIG.fields.naturalnessClass,
      CONFIG.fields.vegetationClass,
      CONFIG.fields.createdYear,
    ].join(",");
    const degreesPerPixel = 360 / (256 * 2 ** zoom);
    const maxAllowableOffset = Math.max(0.000001, degreesPerPixel * DEVICE_PROFILE.generalizationPixelFactor);
    const geometryPrecision = zoom <= 13 ? 5 : 6;

    const params = new URLSearchParams({
      where: "1=1",
      geometry: `${west},${south},${east},${north}`,
      geometryType: "esriGeometryEnvelope",
      inSR: "4326",
      spatialRel: "esriSpatialRelIntersects",
      outFields,
      returnGeometry: "true",
      outSR: "4326",
      returnZ: "false",
      returnM: "false",
      maxAllowableOffset: maxAllowableOffset.toFixed(8),
      geometryPrecision: String(geometryPrecision),
      orderByFields: `${CONFIG.fields.objectId} ASC`,
      resultOffset: String(offset),
      resultRecordCount: String(CONFIG.pageSize),
      returnExceededLimitFeatures: "true",
      f: "geojson",
    });

    return `${CONFIG.featureServiceUrl}/query?${params.toString()}`;
  }

  function canReuseCurrentData(viewBounds, zoom) {
    return Boolean(
      lastRequestedBounds &&
      lastQueryZoom === zoom &&
      sourceFeatureCollection.features.length > 0 &&
      lastRequestedBounds.contains(viewBounds),
    );
  }

  function findCachedView(viewBounds, zoom) {
    const index = viewCache.findIndex(
      (entry) => entry.zoom === zoom && entry.bounds.contains(viewBounds),
    );
    if (index < 0) {
      return null;
    }

    const [entry] = viewCache.splice(index, 1);
    viewCache.unshift(entry);
    return entry;
  }

  function rememberView(bounds, zoom, featureCollection, reachedLimit) {
    viewCache = viewCache.filter(
      (entry) => !(entry.zoom === zoom && entry.bounds.equals(bounds)),
    );
    viewCache.unshift({
      bounds: L.latLngBounds(bounds.getSouthWest(), bounds.getNorthEast()),
      zoom,
      featureCollection,
      reachedLimit,
    });
    if (viewCache.length > CONFIG.memoryCacheEntries) {
      viewCache.length = CONFIG.memoryCacheEntries;
    }
  }

  function useSourceData(featureCollection, bounds, zoom, reachedLimit) {
    sourceFeatureCollection = featureCollection;
    legendCatalog = buildLegendCatalog(sourceFeatureCollection.features);
    lastRequestedBounds = L.latLngBounds(bounds.getSouthWest(), bounds.getNorthEast());
    lastQueryZoom = zoom;
    lastReachedClientLimit = reachedLimit;
    prepareVegetationLayers();
  }

  function prepareVegetationLayers() {
    vegetationGroup.clearLayers();
    preparedLayerRecords = [];

    if (sourceFeatureCollection.features.length === 0) {
      activeGeoJsonLayer = vegetationGroup;
      return;
    }

    const preparedGeoJson = L.geoJSON(sourceFeatureCollection, {
      pane: CONFIG.vegetationPane,
      renderer: vegetationRenderer,
      smoothFactor: DEVICE_PROFILE.smoothFactor,
      style: styleFeature,
      onEachFeature: bindFeaturePopup,
    });

    preparedGeoJson.eachLayer((layer) => {
      const feature = layer.feature;
      if (!feature) {
        return;
      }
      preparedLayerRecords.push({
        layer,
        feature,
        key: getVegetationKey(feature.properties ?? {}),
      });
    });

    activeGeoJsonLayer = vegetationGroup;
    console.info("[Vegetation] Leaflet Layerを初回生成", {
      count: preparedLayerRecords.length,
      smoothFactor: DEVICE_PROFILE.smoothFactor,
    });
  }

  function detachVisibleVegetation() {
    if (vegetationGroup) {
      vegetationGroup.clearLayers();
    }
    renderedFeatureCollection = createEmptyFeatureCollection();
    activeGeoJsonLayer = vegetationGroup;
  }

  function createLightweightDiagnostics() {
    const geometryCounts = countGeometryTypes(renderedFeatureCollection.features);
    return {
      sourceFeatureCount: sourceFeatureCollection.features.length,
      visibleFeatureCount: renderedFeatureCollection.features.length,
      polygonFeatureCount: (geometryCounts.Polygon ?? 0) + (geometryCounts.MultiPolygon ?? 0),
      geometryCounts,
      leafletLayerCount: vegetationGroup?.getLayers().length ?? 0,
      svgPathCount: map.getPane(CONFIG.vegetationPane)?.querySelectorAll("svg path").length ?? 0,
    };
  }

  async function refreshVegetationFromFilter(reason) {
    renderLegend();

    if (!elements.vegetationToggle.checked) {
      return;
    }

    console.info("[Vegetation] 凡例フィルターを更新", {
      reason,
      filterMode,
      hiddenLegendCount: hiddenLegendKeys.size,
    });

    const diagnostics = await renderFilteredVegetation(map.getBounds());
    lastDiagnostics = diagnostics;
    updateStatusForCurrentView(diagnostics, lastReachedClientLimit);
  }

  async function renderFilteredVegetation(requestedBounds) {
    if (preparedLayerRecords.length === 0 && sourceFeatureCollection.features.length > 0) {
      prepareVegetationLayers();
    }

    const visibleFeatures = [];
    let visibleLayerCount = 0;

    preparedLayerRecords.forEach((record) => {
      const item = legendCatalog.get(record.key);
      const shouldShow = elements.vegetationToggle.checked && (item ? isLegendVisible(item) : true);
      const isShown = vegetationGroup.hasLayer(record.layer);

      if (shouldShow) {
        visibleFeatures.push(record.feature);
        visibleLayerCount += 1;
        if (!isShown) {
          vegetationGroup.addLayer(record.layer);
        }
      } else if (isShown) {
        vegetationGroup.removeLayer(record.layer);
      }
    });

    renderedFeatureCollection = {
      type: "FeatureCollection",
      features: visibleFeatures,
    };
    activeGeoJsonLayer = vegetationGroup;

    const geometryCounts = countGeometryTypes(visibleFeatures);
    const polygonFeatureCount =
      (geometryCounts.Polygon ?? 0) + (geometryCounts.MultiPolygon ?? 0);

    await nextAnimationFrame();

    const rendered = inspectRenderedVegetation(renderedFeatureCollection, requestedBounds);
    renderLegend();

    console.info("[Vegetation] 再利用Layer総数", preparedLayerRecords.length);
    console.info("[Vegetation] 表示Layer件数", visibleLayerCount);
    console.info("[Vegetation] SVG Path要素数", rendered.svgPathCount);

    return {
      sourceFeatureCount: sourceFeatureCollection.features.length,
      visibleFeatureCount: visibleFeatures.length,
      polygonFeatureCount,
      geometryCounts,
      leafletLayerCount: visibleLayerCount,
      ...rendered,
    };
  }

  function styleFeature(feature) {
    const key = getVegetationKey(feature?.properties ?? {});
    const fillColor = stableColor(key);
    return {
      pane: CONFIG.vegetationPane,
      renderer: vegetationRenderer,
      color: darkenHex(fillColor, 0.56),
      fillColor,
      fillOpacity: currentFillOpacity,
      opacity: 0.82,
      weight: 1,
      lineJoin: "round",
      interactive: true,
    };
  }

  function bindFeaturePopup(feature, layer) {
    const properties = feature?.properties ?? {};
    layer.bindPopup(createPopupContent(properties), {
      maxWidth: 360,
      autoPanPadding: L.point(20, 20),
    });
  }

  function createPopupContent(properties) {
    const item = buildLegendItemFromProperties(properties);
    const root = document.createElement("article");
    root.className = "vegetation-popup";

    const title = document.createElement("h2");
    title.textContent = item.name;
    root.appendChild(title);

    const badges = document.createElement("div");
    badges.className = "popup-badges";

    if (item.code !== "情報なし") {
      const codeBadge = document.createElement("span");
      codeBadge.className = "popup-badge";
      codeBadge.textContent = `凡例 ${item.code}`;
      badges.appendChild(codeBadge);
    }

    if (item.isStagCandidate) {
      const stagBadge = document.createElement("span");
      stagBadge.className = "popup-badge popup-badge--stag";
      stagBadge.textContent = "クワガタ候補";
      badges.appendChild(stagBadge);
    }

    if (badges.childElementCount > 0) {
      root.appendChild(badges);
    }

    const description = document.createElement("p");
    description.className = "popup-description";
    description.textContent = item.description;
    root.appendChild(description);

    const list = document.createElement("dl");
    const rows = [
      ["凡例コード", properties[CONFIG.fields.legendCode]],
      ["植生自然度", properties[CONFIG.fields.naturalness]],
      ["自然度区分", properties[CONFIG.fields.naturalnessClass]],
      ["植生区分", properties[CONFIG.fields.vegetationClass]],
      ["作成年度", properties[CONFIG.fields.createdYear]],
    ];

    rows.forEach(([label, value]) => {
      const term = document.createElement("dt");
      term.textContent = label;
      const descriptionValue = document.createElement("dd");
      descriptionValue.textContent = valueOrFallback(value);
      list.append(term, descriptionValue);
    });

    root.appendChild(list);
    return root;
  }

  function buildLegendCatalog(features) {
    const catalog = new Map();

    features.forEach((feature) => {
      const properties = feature?.properties ?? {};
      const key = getVegetationKey(properties);
      const existing = catalog.get(key);

      if (existing) {
        existing.featureCount += 1;
        return;
      }

      catalog.set(key, buildLegendItemFromProperties(properties));
    });

    return catalog;
  }

  function buildLegendItemFromProperties(properties) {
    const key = getVegetationKey(properties);
    const item = {
      key,
      name: valueOrFallback(properties[CONFIG.fields.legendName]),
      code: valueOrFallback(properties[CONFIG.fields.legendCode]),
      naturalness: valueOrFallback(properties[CONFIG.fields.naturalness]),
      naturalnessClass: valueOrFallback(properties[CONFIG.fields.naturalnessClass]),
      vegetationClass: valueOrFallback(properties[CONFIG.fields.vegetationClass]),
      createdYear: valueOrFallback(properties[CONFIG.fields.createdYear]),
      color: stableColor(key),
      featureCount: 1,
      isStagCandidate: false,
      description: "",
    };

    item.isStagCandidate = isStagCandidate(item);
    item.description = describeVegetation(item);
    return item;
  }

  function renderLegend() {
    syncPresetUi();

    const sortedItems = Array.from(legendCatalog.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "ja"),
    );
    const visibleLegendCount = sortedItems.filter(isLegendVisible).length;
    const filteredItems = sortedItems.filter(matchesLegendSearch);

    elements.legendList.replaceChildren();
    const fragment = document.createDocumentFragment();
    filteredItems.forEach((item) => {
      fragment.appendChild(createLegendListItem(item));
    });
    elements.legendList.appendChild(fragment);

    elements.legendCount.textContent = `${visibleLegendCount} / ${sortedItems.length}`;
    elements.legendVisibleSummary.textContent = `${visibleLegendCount}種類を表示中`;

    if (legendCatalog.size === 0) {
      elements.legendEmpty.textContent = "この範囲に表示できる植生はありません。";
    } else if (filteredItems.length === 0) {
      elements.legendEmpty.textContent = "検索条件に一致する植生はありません。";
    }

    elements.legendEmpty.hidden = filteredItems.length > 0;
    elements.legendList.hidden = filteredItems.length === 0;
  }

  function createLegendListItem(item) {
    const isVisible = isLegendVisible(item);
    const listItem = document.createElement("li");
    listItem.className = "legend-item";
    listItem.dataset.visible = String(isVisible);

    const label = document.createElement("label");
    label.className = "legend-item-label";

    const checkbox = document.createElement("input");
    checkbox.className = "legend-checkbox";
    checkbox.type = "checkbox";
    checkbox.checked = isVisible;
    checkbox.dataset.legendKey = item.key;
    checkbox.setAttribute("aria-label", `${item.name}を地図に表示`);

    const swatch = document.createElement("span");
    swatch.className = "legend-swatch";
    swatch.style.backgroundColor = item.color;
    swatch.style.borderColor = darkenHex(item.color, 0.5);
    swatch.setAttribute("aria-hidden", "true");

    const copy = document.createElement("span");
    copy.className = "legend-copy";

    const titleRow = document.createElement("span");
    titleRow.className = "legend-title-row";

    const name = document.createElement("span");
    name.className = "legend-name";
    name.textContent = item.name;

    const count = document.createElement("span");
    count.className = "legend-feature-count";
    count.textContent = `${item.featureCount.toLocaleString("ja-JP")}件`;

    titleRow.append(name, count);

    const description = document.createElement("p");
    description.className = "legend-description";
    description.textContent = item.description;

    const meta = document.createElement("span");
    meta.className = "legend-meta";

    if (item.code !== "情報なし") {
      meta.appendChild(createLegendTag(`凡例 ${item.code}`));
    }
    if (item.vegetationClass !== "情報なし") {
      meta.appendChild(createLegendTag(item.vegetationClass));
    }
    if (item.isStagCandidate) {
      meta.appendChild(createLegendTag("クワガタ候補", true));
    }

    copy.append(titleRow, description);
    if (meta.childElementCount > 0) {
      copy.appendChild(meta);
    }

    label.append(checkbox, swatch, copy);
    listItem.appendChild(label);
    return listItem;
  }

  function createLegendTag(text, isStag = false) {
    const tag = document.createElement("span");
    tag.className = isStag ? "legend-tag legend-tag--stag" : "legend-tag";
    tag.textContent = text;
    return tag;
  }

  function matchesLegendSearch(item) {
    if (!legendSearchText) {
      return true;
    }

    const searchable = normalizeText(
      [item.name, item.code, item.vegetationClass, item.naturalnessClass, item.description].join(" "),
    );
    return searchable.includes(legendSearchText);
  }

  function isLegendVisible(item) {
    if (filterMode === "all") {
      return true;
    }
    if (filterMode === "stag") {
      return item.isStagCandidate;
    }
    return !hiddenLegendKeys.has(item.key);
  }

  function isStagCandidate(item) {
    const searchable = normalizeText(`${item.name} ${item.vegetationClass}`);
    const hasPrimary = CONFIG.stagPreset.primaryKeywords.some((keyword) =>
      searchable.includes(normalizeText(keyword)),
    );
    if (hasPrimary) {
      return true;
    }

    const hasExcluded = CONFIG.stagPreset.excludedKeywords.some((keyword) =>
      searchable.includes(normalizeText(keyword)),
    );
    if (hasExcluded) {
      return false;
    }

    return CONFIG.stagPreset.habitatKeywords.some((keyword) =>
      searchable.includes(normalizeText(keyword)),
    );
  }

  function describeVegetation(item) {
    const searchable = normalizeText(`${item.name} ${item.vegetationClass}`);
    const matchedRule = DESCRIPTION_RULES.find((rule) =>
      rule.keywords.some((keyword) => searchable.includes(normalizeText(keyword))),
    );

    const baseText = matchedRule
      ? matchedRule.text
      : `環境省の植生図で「${item.name}」として区分された区域です。`;

    const context = [];
    if (item.vegetationClass !== "情報なし" && !baseText.includes(item.vegetationClass)) {
      context.push(`植生区分は「${item.vegetationClass}」`);
    }
    if (item.naturalnessClass !== "情報なし") {
      context.push(`自然度区分は「${item.naturalnessClass}」`);
    }

    return context.length > 0 ? `${baseText} ${context.join("、")}です。` : baseText;
  }

  function clearRenderedVegetation() {
    if (vegetationGroup) {
      vegetationGroup.clearLayers();
    }
    activeGeoJsonLayer = vegetationGroup;
    preparedLayerRecords = [];
    renderedFeatureCollection = createEmptyFeatureCollection();
  }

  function resetVegetationData() {
    clearRenderedVegetation();
    sourceFeatureCollection = createEmptyFeatureCollection();
    legendCatalog = new Map();
    lastRequestedBounds = null;
    lastQueryZoom = null;
    lastReachedClientLimit = false;
    lastDiagnostics = null;
    renderLegend();
  }

  function inspectRenderedVegetation(featureCollection, requestedBounds = null) {
    const pane = map.getPane(CONFIG.vegetationPane);
    const svgElements = pane ? Array.from(pane.querySelectorAll("svg")) : [];
    const pathElements = pane ? Array.from(pane.querySelectorAll("svg path")) : [];

    const invalidFillPaths = [];
    const zeroOpacityPaths = [];

    pathElements.forEach((path, index) => {
      const computed = window.getComputedStyle(path);
      const fill = (path.getAttribute("fill") ?? computed.fill ?? "").trim().toLowerCase();
      const fillOpacityRaw = path.getAttribute("fill-opacity") ?? computed.fillOpacity ?? "";
      const fillOpacity = Number.parseFloat(fillOpacityRaw);

      if (
        !fill ||
        fill === "none" ||
        fill === "transparent" ||
        fill === "rgba(0, 0, 0, 0)"
      ) {
        invalidFillPaths.push(index);
      }
      if (Number.isFinite(fillOpacity) && fillOpacity <= 0) {
        zeroOpacityPaths.push(index);
      }
    });

    const paneStyle = pane ? window.getComputedStyle(pane) : null;
    const paneHidden =
      !pane ||
      paneStyle.display === "none" ||
      paneStyle.visibility === "hidden" ||
      paneStyle.opacity === "0";

    let boundsIntersect = null;
    let layerBoundsValid = false;
    if (activeGeoJsonLayer && typeof activeGeoJsonLayer.getBounds === "function") {
      const layerBounds = activeGeoJsonLayer.getBounds();
      layerBoundsValid = layerBounds.isValid();
      if (layerBoundsValid && requestedBounds) {
        boundsIntersect = requestedBounds.intersects(layerBounds);
      }
    }

    return {
      renderedFeatureCount: featureCollection?.features?.length ?? 0,
      svgElementCount: svgElements.length,
      svgPathCount: pathElements.length,
      invalidFillPathCount: invalidFillPaths.length,
      zeroOpacityPathCount: zeroOpacityPaths.length,
      paneHidden,
      paneDisplay: paneStyle?.display ?? "paneなし",
      paneVisibility: paneStyle?.visibility ?? "paneなし",
      paneOpacity: paneStyle?.opacity ?? "paneなし",
      layerBoundsValid,
      boundsIntersect,
    };
  }

  function runSelfDiagnosis(sourceCollection, visibleCollection, diagnostics, requestedBounds) {
    const issues = [];
    const sourceFeatures = sourceCollection?.features ?? [];
    const visibleFeatures = visibleCollection?.features ?? [];

    if (sourceFeatures.length === 0 || visibleFeatures.length === 0) {
      console.info("[Vegetation] 自己診断", {
        requestedBounds: requestedBounds?.toBBoxString() ?? "範囲なし",
        issues,
        reason: sourceFeatures.length === 0 ? "取得Featureなし" : "フィルターですべて非表示",
        diagnostics,
      });
      return issues;
    }

    if (diagnostics.polygonFeatureCount < 1) {
      issues.push("Polygon / MultiPolygonがない");
    }
    if (diagnostics.leafletLayerCount < 1) {
      issues.push("L.geoJSONにLayerが追加されていない");
    }
    if (diagnostics.svgElementCount < 1) {
      issues.push("vegetationPane内にSVGがない");
    }
    if (diagnostics.svgPathCount < 1) {
      issues.push("SVG内にpathがない");
    }
    if (diagnostics.invalidFillPathCount > 0) {
      issues.push(`fillが無効なpathが${diagnostics.invalidFillPathCount}件`);
    }
    if (diagnostics.zeroOpacityPathCount > 0) {
      issues.push(`fill-opacityが0のpathが${diagnostics.zeroOpacityPathCount}件`);
    }
    if (diagnostics.paneHidden) {
      issues.push("植生Paneが非表示");
    }
    if (diagnostics.layerBoundsValid && diagnostics.boundsIntersect === false) {
      issues.push("地図範囲とポリゴン範囲が交差していない");
    }

    console.info("[Vegetation] 自己診断", {
      requestedBounds: requestedBounds?.toBBoxString() ?? "範囲なし",
      issues,
      diagnostics,
    });

    return issues;
  }

  function updateStatusForCurrentView(diagnostics, reachedLimit) {
    if (!elements.vegetationToggle.checked) {
      updateStatus("idle", "植生オーバーレイは非表示です。");
      return;
    }

    if (diagnostics.sourceFeatureCount === 0) {
      updateStatus("warning", "この表示範囲には植生データがありません。");
      return;
    }

    if (diagnostics.visibleFeatureCount === 0) {
      if (filterMode === "stag") {
        updateStatus("warning", "この範囲ではクワガタ候補に一致する植生がありません。");
      } else {
        updateStatus("idle", "凡例フィルターですべての植生が非表示です。");
      }
      return;
    }

    if (reachedLimit) {
      updateStatus(
        "warning",
        `${diagnostics.visibleFeatureCount.toLocaleString("ja-JP")}件を表示中です。取得上限に達したため、もう少し拡大してください。`,
      );
      return;
    }

    const visibleLegendCount = Array.from(legendCatalog.values()).filter(isLegendVisible).length;
    updateStatus(
      "success",
      `${visibleLegendCount.toLocaleString("ja-JP")}種類、${diagnostics.visibleFeatureCount.toLocaleString("ja-JP")}件の植生を表示しています。`,
    );
  }

  function updateStatus(state, message) {
    const allowedStates = new Set(["loading", "success", "warning", "error", "idle"]);
    const normalizedState = allowedStates.has(state) ? state : "idle";
    elements.statusOrb.dataset.state = normalizedState;
    elements.statusOrb.dataset.tooltip = message;
    elements.statusOrb.title = message;
    elements.statusOrb.setAttribute("aria-label", message);
    elements.statusLive.textContent = message;
  }

  function handleLoadError(error) {
    console.error("[Vegetation] エラー詳細", error);
    resetVegetationData();

    if (error instanceof AppError) {
      updateStatus("error", error.message);
      return;
    }

    updateStatus("error", "植生データを読み込めませんでした。通信状況を確認してください。");
  }

  function getVegetationKey(properties) {
    const code = safeText(properties[CONFIG.fields.legendCode]).trim();
    const name = safeText(properties[CONFIG.fields.legendName]).trim();
    return code || name || "unknown-vegetation";
  }

  function stableColor(value) {
    const hash = hashString(value);
    const hue = ((hash % 360) + 360) % 360;
    const saturation = 66 + ((hash >>> 8) % 14);
    const lightness = 49 + ((hash >>> 16) % 10);
    return hslToHex(hue, saturation, lightness);
  }

  function hashString(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function hslToHex(hue, saturation, lightness) {
    const h = hue / 360;
    const s = saturation / 100;
    const l = lightness / 100;

    if (s === 0) {
      const gray = Math.round(l * 255);
      return rgbToHex(gray, gray, gray);
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const red = hueToRgb(p, q, h + 1 / 3);
    const green = hueToRgb(p, q, h);
    const blue = hueToRgb(p, q, h - 1 / 3);
    return rgbToHex(Math.round(red * 255), Math.round(green * 255), Math.round(blue * 255));
  }

  function hueToRgb(p, q, input) {
    let t = input;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }

  function rgbToHex(red, green, blue) {
    return `#${[red, green, blue]
      .map((channel) => Math.max(0, Math.min(255, channel)).toString(16).padStart(2, "0"))
      .join("")}`.toUpperCase();
  }

  function darkenHex(hex, factor) {
    const normalized = hex.replace("#", "");
    const channels = [0, 2, 4].map((start) =>
      Math.round(Number.parseInt(normalized.slice(start, start + 2), 16) * factor),
    );
    return rgbToHex(channels[0], channels[1], channels[2]);
  }

  function countGeometryTypes(features) {
    return features.reduce((counts, feature) => {
      const type = feature?.geometry?.type ?? "null";
      counts[type] = (counts[type] ?? 0) + 1;
      return counts;
    }, {});
  }

  function createEmptyFeatureCollection() {
    return { type: "FeatureCollection", features: [] };
  }

  function valueOrFallback(value) {
    const text = safeText(value).trim();
    return text || "情報なし";
  }

  function safeText(value) {
    if (value == null) {
      return "";
    }
    return String(value);
  }

  function normalizeText(value) {
    return safeText(value).normalize("NFKC").trim().toLowerCase();
  }

  function nextAnimationFrame() {
    return new Promise((resolve) => window.requestAnimationFrame(resolve));
  }

  function showFatalError(error) {
    console.error("[App] 初期化エラー", error);
    if (!elements.statusOrb || !elements.statusLive) {
      return;
    }
    updateStatus(
      "error",
      error instanceof Error ? error.message : "地図を初期化できませんでした。",
    );
  }

  function main() {
    try {
      assertDependencies();
      initializeMap();
      initializeControls();
      console.info("[App] 初期化完了", {
        leafletVersion: L.version,
        expectedLeafletVersion: CONFIG.leafletVersion,
        config: CONFIG,
        deviceProfile: DEVICE_PROFILE,
      });
      scheduleVegetationLoad("initial-load", 0);
    } catch (error) {
      showFatalError(error);
    }
  }

  main();
})();
