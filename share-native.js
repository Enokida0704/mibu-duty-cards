(function () {
  "use strict";

  const FALLBACK_DELAY_MS = 1400;

  function shouldUseAppLink() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
      || window.matchMedia("(pointer: coarse)").matches
      || window.matchMedia("(display-mode: standalone)").matches;
  }

  function isAndroid() {
    return /Android/i.test(navigator.userAgent);
  }

  function isIos() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  function cleanPageUrl() {
    const pageUrl = new URL(window.location.href);
    pageUrl.search = "";
    pageUrl.hash = "";
    return pageUrl.toString();
  }

  function shareText() {
    const score = document.querySelector("#resultScore")?.textContent.trim() || "結果";
    const rank = document.querySelector("#leaderboardOwnRank strong")?.textContent.trim();
    const safeRank = rank && !["確認中", "取得できませんでした"].includes(rank) ? rank : "順位確認中";
    const resultText = document.querySelector("#resultText")?.textContent.trim() || "";
    const stageLine = resultText.split("。").find((line) => line.includes("の")) || "京都の隊務";
    const breakdown = Array.from(document.querySelectorAll("#resultBreakdown div"))
      .map((item) => Array.from(item.children).map((child) => child.textContent.trim()).join(""))
      .filter(Boolean);
    const scoreLine = breakdown.filter((item) => /^(治安|士気|名声)/.test(item)).join("・");
    return [
      `新選組の隊務パズル『壬生の隊務札』で${score}、${safeRank}！`,
      "",
      `${stageLine}を隊士の采配で収めました。`,
      scoreLine,
      "あなたなら何点まで伸ばせますか？",
      "",
      "#壬生の隊務札 #新選組"
    ].filter(Boolean).join("\n");
  }

  function postText() {
    return `${shareText()}\n${cleanPageUrl()}`;
  }

  function webIntentUrl(text) {
    const url = new URL("https://x.com/intent/post");
    url.searchParams.set("text", text);
    return url.toString();
  }

  function appUrl(text, fallbackUrl) {
    const encodedText = encodeURIComponent(text);
    if (isAndroid()) {
      return `intent://post?message=${encodedText}#Intent;scheme=twitter;package=com.twitter.android;S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`;
    }
    if (isIos()) {
      return `twitter://post?message=${encodedText}`;
    }
    return `twitter://post?message=${encodedText}`;
  }

  function openAppThenFallback(appLink, fallbackUrl) {
    let leftPage = false;
    const startedAt = Date.now();
    const cleanup = () => {
      window.removeEventListener("pagehide", markLeftPage);
      document.removeEventListener("visibilitychange", markHidden);
    };
    const fallbackTimer = window.setTimeout(() => {
      cleanup();
      const stillHere = !leftPage && Date.now() - startedAt < FALLBACK_DELAY_MS + 900;
      if (stillHere) {
        window.location.href = fallbackUrl;
      }
    }, FALLBACK_DELAY_MS);

    function markLeftPage() {
      leftPage = true;
      window.clearTimeout(fallbackTimer);
      cleanup();
    }

    function markHidden() {
      if (document.hidden) {
        markLeftPage();
      }
    }

    window.addEventListener("pagehide", markLeftPage, { once: true });
    document.addEventListener("visibilitychange", markHidden);
    window.location.href = appLink;
  }

  function handleShare(event) {
    if (!shouldUseAppLink()) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const text = postText();
    const fallbackUrl = webIntentUrl(text);
    openAppThenFallback(appUrl(text, fallbackUrl), fallbackUrl);
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest("#shareXButton")) {
      handleShare(event);
    }
  }, true);
})();
