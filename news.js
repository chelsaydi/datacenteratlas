/**
 * Live data-center news via Google News RSS (aggregated through rss2json).
 * Falls back to a static message + search link if the feed cannot be loaded.
 */
(function () {
  const RSS2JSON = "https://api.rss2json.com/v1/api.json?rss_url=";
  const QUERIES = [
    "data center",
    "data center fire",
    "data center outage",
    "datacenter incident",
  ];

  function googleNewsRssUrl(query) {
    const q = encodeURIComponent(query);
    return `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;
  }

  function badgeForTitle(title) {
    const t = (title || "").toLowerCase();
    if (/\bfire\b|\bblaze\b|\bburn\b|\bflames?\b/.test(t))
      return { class: "news-badge-fire", label: "Fire" };
    if (/\boutage\b|\bdown\b|\bfailure\b|\bblackout\b|\bdisrupt/.test(t))
      return { class: "news-badge-outage", label: "Outage" };
    if (/\bflood\b|\bexplosion\b|\bcollapse\b|\battack\b|\bbreach\b|\bleak\b/.test(t))
      return { class: "news-badge-incident", label: "Incident" };
    return null;
  }

  function formatDate(pubDate) {
    if (!pubDate) return "";
    const d = new Date(pubDate);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    const diffMs = now - d;
    const diffH = Math.floor(diffMs / 3600000);
    if (diffH < 24) return diffH <= 1 ? "Just now" : `${diffH}h ago`;
    const diffD = Math.floor(diffMs / 86400000);
    if (diffD < 7) return `${diffD}d ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  async function fetchFeed(rssUrl) {
    const url = RSS2JSON + encodeURIComponent(rssUrl);
    const res = await fetch(url);
    if (!res.ok) throw new Error("Feed request failed");
    const data = await res.json();
    if (data.status !== "ok" || !Array.isArray(data.items)) return [];
    return data.items;
  }

  async function loadAll() {
    const seen = new Set();
    const merged = [];
    for (const q of QUERIES) {
      try {
        const items = await fetchFeed(googleNewsRssUrl(q));
        for (const item of items) {
          const link = item.link || "";
          const title = (item.title || "").trim();
          if (!title) continue;
          const key = link || title;
          if (seen.has(key)) continue;
          seen.add(key);
          merged.push({
            title,
            link: link || "#",
            pubDate: item.pubDate,
            source: item.author || (item.source && item.source.name) || "",
          });
        }
      } catch (_) {
        /* continue with other feeds */
      }
    }
    merged.sort((a, b) => {
      const ta = new Date(a.pubDate).getTime();
      const tb = new Date(b.pubDate).getTime();
      return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta);
    });
    return merged.slice(0, 25);
  }

  function renderList(items) {
    const list = document.getElementById("news-list");
    if (!list) return;
    list.innerHTML = "";
    if (!items.length) {
      list.innerHTML =
        '<li class="news-loading">No headlines returned. Try Refresh or open Google News.</li>';
      return;
    }
    for (const item of items) {
      const badge = badgeForTitle(item.title);
      const badgeHtml = badge
        ? `<span class="news-badge ${badge.class}">${escapeHtml(badge.label)}</span>`
        : "";
      const meta = [formatDate(item.pubDate), item.source]
        .filter(Boolean)
        .join(" · ");
      const li = document.createElement("li");
      li.innerHTML = `
        <a class="news-item" href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">
          <div class="news-item-title">${escapeHtml(item.title)}</div>
          <div class="news-item-meta">${badgeHtml}<span>${escapeHtml(meta)}</span></div>
        </a>
      `;
      list.appendChild(li);
    }
  }

  function showError(msg) {
    const err = document.getElementById("news-error");
    const loading = document.getElementById("news-loading");
    if (loading) loading.classList.add("hidden");
    if (err) {
      err.classList.remove("hidden");
      err.innerHTML =
        msg +
        ' <a href="https://news.google.com/search?q=data+center+fire+OR+outage&hl=en-US&gl=US&ceid=US:en" target="_blank" rel="noopener">Open Google News</a>';
    }
  }

  async function refresh() {
    const loading = document.getElementById("news-loading");
    const err = document.getElementById("news-error");
    const list = document.getElementById("news-list");
    if (loading) {
      loading.classList.remove("hidden");
      loading.textContent = "Loading headlines…";
    }
    if (err) err.classList.add("hidden");
    if (list) list.innerHTML = "";

    try {
      const items = await loadAll();
      if (loading) loading.classList.add("hidden");
      if (items.length) {
        renderList(items);
      } else {
        showError("Could not load RSS feeds (rate limit or network). ");
        renderList([]);
      }
    } catch (e) {
      console.warn(e);
      showError("Could not load live news. ");
    }
  }

  document.getElementById("news-refresh")?.addEventListener("click", refresh);
  refresh();
})();
