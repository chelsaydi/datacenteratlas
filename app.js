/**
 * Data Center World Map — loads hubs and renders Leaflet markers with counts.
 */
(function () {
  const MAP_CENTER = [20, 10];
  const MAP_ZOOM = 2;

  const map = L.map("map", {
    zoomControl: true,
    attributionControl: true,
    worldCopyJump: true,
    minZoom: 2,
    maxBounds: [[-85, -180], [85, 180]],
  }).setView(MAP_CENTER, MAP_ZOOM);

  // Voyager without built-in labels — avoids duplicate text vs our continent overlay below.
  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19,
  }).addTo(map);

  // Continent name overlays — explicit English labels (basemap tiles may vary)
  const CONTINENTS = [
    { name: "Africa", lat: 5, lng: 20 },
    { name: "Asia", lat: 42, lng: 88 },
    { name: "Europe", lat: 54, lng: 18 },
    { name: "North America", lat: 48, lng: -95 },
    { name: "South America", lat: -15, lng: -60 },
    { name: "Oceania", lat: -22, lng: 135 },
    { name: "Antarctica", lat: -82, lng: 0 },
  ];

  const continentLayer = L.layerGroup();
  CONTINENTS.forEach(function (c) {
    const icon = L.divIcon({
      className: "continent-label-icon",
      html: '<span class="continent-label-text">' + escapeHtml(c.name) + "</span>",
      iconSize: [120, 28],
      iconAnchor: [60, 14],
    });
    L.marker([c.lat, c.lng], {
      icon: icon,
      interactive: false,
      keyboard: false,
      zIndexOffset: -500,
    }).addTo(continentLayer);
  });
  continentLayer.addTo(map);

  function iconForCount(count) {
    const size = Math.min(28, 12 + Math.sqrt(count) * 1.2);
    return L.divIcon({
      className: "dc-marker-wrap",
      html: `<div class="marker-dot" style="width:${size}px;height:${size}px;"></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }

  function popupHtml(hub) {
    return `
      <div class="popup-title">${escapeHtml(hub.name)}</div>
      <div class="popup-country">${escapeHtml(hub.country)}</div>
      <div class="popup-count">${hub.count.toLocaleString()} <span>active sites</span></div>
      <div class="popup-type">${escapeHtml(hub.type || "")}</div>
    `;
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function formatUsdLive(amountUsd) {
    if (typeof amountUsd !== "number" || !isFinite(amountUsd)) return "—";
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(amountUsd);
    } catch (_) {
      if (amountUsd >= 1e12) return "$" + (amountUsd / 1e12).toFixed(2) + "T";
      if (amountUsd >= 1e9) return "$" + (amountUsd / 1e9).toFixed(0) + "B";
      return "$" + amountUsd.toLocaleString("en-US");
    }
  }

  function applyInvestment(meta) {
    const inv = meta && meta.investment;
    const elAmount = document.getElementById("investment-amount");
    const elAsOf = document.getElementById("investment-asof");
    if (!inv || !elAmount) return;

    const baseUsd = Number(inv.amountUsd);
    const perSec = Number(inv.perSecondUsd);
    const asOf = inv.asOf || "";
    const caption = inv.caption || "";

    function renderAmount(usd) {
      elAmount.textContent = formatUsdLive(usd);
    }

    renderAmount(baseUsd);

    let line = asOf ? "Base as of " + asOf : "";
    if (caption) line += (line ? " · " : "") + caption;
    if (inv.perSecondUsd > 0) {
      line += (line ? " · " : "") + "Total ticks up at illustrative run-rate.";
    }
    if (elAsOf) elAsOf.textContent = line;

    if (perSec > 0 && isFinite(baseUsd)) {
      const start = Date.now();
      setInterval(function () {
        const elapsedSec = (Date.now() - start) / 1000;
        renderAmount(baseUsd + elapsedSec * perSec);
      }, 1000);
    }
  }

  function formatLitersLive(liters) {
    if (liters == null || liters === "") return "—";
    var L = typeof liters === "string" ? parseFloat(liters, 10) : Number(liters);
    if (!isFinite(L) || L < 0) return "—";
    if (L >= 1e15)
      return (L / 1e15).toFixed(2).replace(/\.?0+$/, "") + " quadrillion L";
    if (L >= 1e12)
      return (L / 1e12).toFixed(2).replace(/\.?0+$/, "") + " trillion L";
    if (L >= 1e9)
      return (L / 1e9).toFixed(2).replace(/\.?0+$/, "") + " billion L";
    if (L >= 1e6)
      return (L / 1e6).toFixed(1).replace(/\.0$/, "") + " million L";
    return Math.round(L).toLocaleString("en-US") + " L";
  }

  function applyWater(meta) {
    const w = meta && meta.water;
    const elAmount = document.getElementById("water-amount");
    const elAsOf = document.getElementById("water-asof");
    if (!elAmount) return;
    if (!w) {
      elAmount.textContent = "—";
      if (elAsOf) elAsOf.textContent = "Add meta.water in centers.json";
      return;
    }

    var baseL =
      typeof w.litersCumulative === "string"
        ? parseFloat(w.litersCumulative, 10)
        : Number(w.litersCumulative);
    const perSec = Number(w.perSecondLiters);
    const asOf = w.asOf || "";
    const caption = w.caption || "";

    function renderLiters(L) {
      elAmount.textContent = formatLitersLive(L);
    }

    renderLiters(baseL);

    let line = asOf ? "Base as of " + asOf : "";
    if (caption) line += (line ? " · " : "") + caption;
    if (perSec > 0) {
      line += (line ? " · " : "") + "Live total ticks up at illustrative rate.";
    }
    if (elAsOf) elAsOf.textContent = line;

    if (perSec > 0 && isFinite(baseL)) {
      const start = Date.now();
      setInterval(function () {
        const elapsedSec = (Date.now() - start) / 1000;
        renderLiters(baseL + elapsedSec * perSec);
      }, 1000);
    }
  }

  async function load() {
    const loading = document.getElementById("loading");
    try {
      const res = await fetch("data/centers.json");
      if (!res.ok) throw new Error("Failed to load data");
      const data = await res.json();
      const hubs = data.hubs || [];

      if (data.meta) {
        applyInvestment(data.meta);
        applyWater(data.meta);
      }

      let totalSites = 0;
      const hubsWithCoords = [];

      hubs.forEach((hub) => {
        if (typeof hub.lat !== "number" || typeof hub.lng !== "number") return;
        totalSites += hub.count || 0;
        hubsWithCoords.push(hub);

        const marker = L.marker([hub.lat, hub.lng], {
          icon: iconForCount(hub.count || 0),
        });
        marker.bindPopup(popupHtml(hub), { maxWidth: 280 });
        marker.addTo(map);
      });

      document.getElementById("total-sites").textContent =
        totalSites.toLocaleString();
      document.getElementById("hub-count").textContent =
        hubsWithCoords.length.toLocaleString();
    } catch (e) {
      console.error(e);
      if (loading) {
        loading.textContent = "Could not load data. Serve via a local server (see README).";
      }
    } finally {
      if (loading) loading.classList.add("hidden");
    }
  }

  load();
})();
