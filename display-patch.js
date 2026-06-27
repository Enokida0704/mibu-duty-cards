(() => {
  const TRAILING_KEI = /^(剣術|巡察|聞込|規律|隠密|士気|名声|書状)系$/;
  const REWARD_SPACE = /^(治安|士気|名声) \+(\d+)$/;

  function simplifyText(value) {
    if (!value) return value;
    let text = value.replace(TRAILING_KEI, "$1");
    text = text.replace(REWARD_SPACE, "$1+$2");
    text = text.replace(/^ボーナス (.+?)以上 \+(\d+)点$/, "+$2 $1");
    text = text.replace(/^今他を選ぶと信用低下: (信用-\d+)(.*)$/, "今他で$1$2");
    text = text.replace(/^あと(\d+)手後に信用低下: (信用-\d+)(.*)$/, "あと$1手 $2$3");
    text = text.replace("（根回しで半減）", "（半減）");
    return text;
  }

  function patchTextNode(node) {
    const next = simplifyText(node.textContent);
    if (next !== node.textContent) node.textContent = next;
  }

  function patchRoot(root = document) {
    root.querySelectorAll(".tag, .bar-chip, .card-kind, .reward-line span, .goal-pill, .penalty-line")
      .forEach(patchTextNode);
  }

  window.addEventListener("DOMContentLoaded", () => {
    patchRoot();
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          if (node.matches?.(".tag, .bar-chip, .card-kind, .reward-line span, .goal-pill, .penalty-line")) {
            patchTextNode(node);
          }
          patchRoot(node);
        });
        if (mutation.type === "characterData") {
          const parent = mutation.target.parentElement;
          if (parent?.matches(".tag, .bar-chip, .card-kind, .reward-line span, .goal-pill, .penalty-line")) {
            patchTextNode(parent);
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  });
})();
