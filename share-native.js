(function () {
  "use strict";

  function canUseNativeShare(shareData) {
    if (typeof navigator.share !== "function") return false;
    if (typeof navigator.canShare === "function" && !navigator.canShare(shareData)) return false;
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
      || window.matchMedia("(pointer: coarse)").matches
      || window.matchMedia("(display-mode: standalone)").matches;
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

  async function handleShare(event) {
    const shareData = {
      title: "壬生の隊務札",
      text: shareText(),
      url: cleanPageUrl()
    };
    if (!canUseNativeShare(shareData)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      await navigator.share(shareData);
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.warn("Native share failed", error);
      }
    }
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest("#shareXButton")) {
      handleShare(event);
    }
  }, true);
})();
