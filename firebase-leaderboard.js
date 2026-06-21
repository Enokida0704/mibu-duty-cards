(function () {
  "use strict";

  const SDK_VERSION = "12.15.0";
  const COLLECTION_NAME = "leaderboard_scores";
  const PLAYER_NAME_KEY = "mibuDutyCards.playerName";
  const MAX_NAME_LENGTH = 12;
  const START_SCORE_LIMIT = 5;
  const ALLOWED_STAGE_IDS = ["mibu", "shimabara", "ikedaya", "fushimi"];
  const ALLOWED_DIFFICULTY_IDS = ["easy", "normal", "hard"];
  const SCORE_KEYS = ["security", "morale", "fame"];

  const state = {
    bound: false,
    config: null,
    modules: null,
    app: null,
    db: null,
    payload: null,
    submitted: false,
    latestDocId: "",
    startRequestId: 0,
    resultRequestId: 0
  };

  function $(id) {
    return document.getElementById(id);
  }

  function elements() {
    return {
      panel: $("leaderboardPanel"),
      scope: $("leaderboardScope"),
      form: $("leaderboardForm"),
      name: $("leaderboardName"),
      submit: $("leaderboardSubmit"),
      status: $("leaderboardStatus"),
      ownRank: $("leaderboardOwnRank")
    };
  }

  function startElements() {
    return {
      panel: $("startLeaderboardPanel"),
      scope: $("startLeaderboardScope"),
      status: $("startLeaderboardStatus"),
      list: $("startLeaderboardList")
    };
  }

  function activeConfig() {
    const config = window.MIBU_FIREBASE_CONFIG;
    if (!config || config.enabled === false) return null;
    if (!config.apiKey || !config.projectId || !config.appId) return null;
    return config;
  }

  function bind() {
    if (state.bound) return;
    const ui = elements();
    if (!ui.form) return;
    state.bound = true;
    ui.form.addEventListener("submit", (event) => {
      event.preventDefault();
      submitScore();
    });
    ui.name?.addEventListener("input", () => {
      const name = cleanPlayerName(ui.name.value);
      ui.submit.disabled = !state.payload || state.submitted || !name.valid;
      if (name.valid || !ui.name.value.trim()) {
        setStatus("");
      }
    });
  }

  function showResult(payload) {
    bind();
    const ui = elements();
    state.config = activeConfig();
    state.payload = normalizePayload(payload);
    state.submitted = false;
    state.latestDocId = "";
    state.resultRequestId += 1;

    if (!ui.panel) return;
    if (!state.config || !state.payload) {
      ui.panel.hidden = true;
      return;
    }

    ui.panel.hidden = false;
    if (ui.scope) ui.scope.textContent = state.payload.recordLabel;
    if (ui.name) ui.name.value = loadPlayerName();
    renderOwnRank(
      {
        label: "確認中",
        detail: `${state.payload.total}点 / ${state.payload.rankTitle}`
      },
      false,
      "投稿した場合の順位"
    );
    setStatus("順位を確認しています。");
    updateSubmitState();
    loadProjectedRank(state.resultRequestId);
  }

  function loadProjectedRank(requestId) {
    fetchOwnRank(state.payload.recordKey, state.payload.total)
      .then((rankResult) => {
        if (state.resultRequestId !== requestId || state.submitted) return;
        renderOwnRank(rankResult, false, "投稿した場合の順位");
        setStatus("未投稿です。名前を入れて投稿できます。");
      })
      .catch((error) => {
        if (state.resultRequestId !== requestId || state.submitted) return;
        console.warn("Projected rank load failed", error);
        renderOwnRank(null, true, "投稿した場合の順位");
        setStatus(errorMessage(error, "順位を確認できませんでした。投稿はできます。"));
      });
  }

  function showStartRanking(scope) {
    const ui = startElements();
    const normalized = normalizeScope(scope);
    const config = activeConfig();
    if (!ui.panel) return;
    if (!config || !normalized) {
      ui.panel.hidden = true;
      return;
    }

    state.config = config;
    const requestId = state.startRequestId + 1;
    state.startRequestId = requestId;
    ui.panel.hidden = false;
    if (ui.scope) ui.scope.textContent = normalized.recordLabel;
    if (ui.list) ui.list.replaceChildren();
    setStartStatus("ランキングを読み込み中です。");

    fetchScores(normalized.recordKey, START_SCORE_LIMIT)
      .then((rows) => {
        if (state.startRequestId !== requestId) return;
        renderStartScores(rows);
        setStartStatus(rows.length ? "" : "まだ投稿がありません。");
      })
      .catch((error) => {
        if (state.startRequestId !== requestId) return;
        console.warn("Start leaderboard load failed", error);
        renderStartScores([]);
        setStartStatus(errorMessage(error, "ランキングを読み込めませんでした。"));
      });
  }

  async function submitScore() {
    const ui = elements();
    if (!state.payload || !ui.name || state.submitted) return;
    const name = cleanPlayerName(ui.name.value);
    if (!name.valid) {
      setStatus(name.message);
      updateSubmitState();
      return;
    }

    savePlayerName(name.value);
    setBusy(true);
    setStatus("投稿しています。");

    try {
      const db = await firestoreDb();
      const modules = state.modules;
      const docRef = await modules.addDoc(modules.collection(db, COLLECTION_NAME), {
        playerName: name.value,
        total: state.payload.total,
        rankTitle: state.payload.rankTitle,
        stageId: state.payload.stageId,
        stageTitle: state.payload.stageTitle,
        difficultyId: state.payload.difficultyId,
        difficultyTitle: state.payload.difficultyTitle,
        recordKey: state.payload.recordKey,
        scores: state.payload.scores,
        trust: state.payload.trust,
        turn: state.payload.turn,
        goalBonus: state.payload.goalBonus,
        difficultyBonus: state.payload.difficultyBonus,
        stats: state.payload.stats,
        clientVersion: state.payload.clientVersion,
        createdAt: modules.serverTimestamp()
      });
      state.submitted = true;
      state.latestDocId = docRef.id;
      try {
        state.resultRequestId += 1;
        const rankResult = await fetchOwnRank(state.payload.recordKey, state.payload.total);
        renderOwnRank(rankResult, false, "あなたの順位");
        setStatus("投稿しました。");
      } catch (rankError) {
        console.warn("Own rank load failed", rankError);
        renderOwnRank(null, true, "あなたの順位");
        setStatus(errorMessage(rankError, "投稿しましたが、順位を取得できませんでした。"));
      }
    } catch (error) {
      console.warn("Leaderboard submit failed", error);
      setStatus(errorMessage(error, "投稿できませんでした。通信状態とFirebase設定を確認してください。"));
    } finally {
      setBusy(false);
      updateSubmitState();
    }
  }

  async function fetchScores(recordKey, limitCount) {
    const db = await firestoreDb();
    const modules = state.modules;
    const queryParts = [
      modules.where("recordKey", "==", recordKey),
      modules.orderBy("total", "desc"),
      modules.orderBy("createdAt", "asc")
    ];
    if (limitCount) {
      queryParts.push(modules.limit(limitCount));
    }
    const rankingQuery = modules.query(
      modules.collection(db, COLLECTION_NAME),
      ...queryParts
    );
    const snapshot = await modules.getDocs(rankingQuery);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async function fetchOwnRank(recordKey, total) {
    const rows = await fetchScores(recordKey);
    const score = safeNumber(total);
    const higherCount = rows.filter((row) => safeNumber(row.total) > score).length;
    return {
      label: `${higherCount + 1}位`,
      detail: `${score}点 / ${state.payload.rankTitle} / 同点は同順位`
    };
  }

  async function firestoreDb() {
    if (state.db) return state.db;
    if (!state.config) {
      throw new Error("Firebase config is missing.");
    }
    const modules = await loadModules();
    state.modules = modules;
    state.app = modules.getApps().length
      ? modules.getApps()[0]
      : modules.initializeApp(state.config);
    state.db = modules.getFirestore(state.app);
    return state.db;
  }

  async function loadModules() {
    if (state.modules) return state.modules;
    const [appModule, firestoreModule] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-firestore.js`)
    ]);
    return {
      initializeApp: appModule.initializeApp,
      getApps: appModule.getApps,
      getFirestore: firestoreModule.getFirestore,
      collection: firestoreModule.collection,
      addDoc: firestoreModule.addDoc,
      query: firestoreModule.query,
      where: firestoreModule.where,
      orderBy: firestoreModule.orderBy,
      limit: firestoreModule.limit,
      getDocs: firestoreModule.getDocs,
      serverTimestamp: firestoreModule.serverTimestamp
    };
  }

  function renderOwnRank(rankResult, failed = false, title = "あなたの順位") {
    const ui = elements();
    if (!ui.ownRank) return;
    if (!state.payload || (!rankResult && !failed)) {
      ui.ownRank.hidden = true;
      ui.ownRank.replaceChildren();
      return;
    }

    const label = document.createElement("span");
    label.textContent = title;
    const rank = document.createElement("strong");
    rank.textContent = failed ? "取得できませんでした" : rankResult.label;
    const detail = document.createElement("small");
    detail.textContent = failed ? `${state.payload.total}点 / ${state.payload.rankTitle}` : rankResult.detail;
    ui.ownRank.replaceChildren(label, rank, detail);
    ui.ownRank.hidden = false;
  }

  function renderStartScores(rows) {
    const ui = startElements();
    if (!ui.list) return;
    if (!rows.length) {
      const item = document.createElement("li");
      item.className = "leaderboard-empty";
      item.textContent = "この条件の投稿はまだありません。";
      ui.list.replaceChildren(item);
      return;
    }

    ui.list.replaceChildren(
      ...rows.map((row, index) => {
        const item = document.createElement("li");

        const rank = document.createElement("span");
        rank.className = "leaderboard-rank";
        rank.textContent = `${index + 1}`;

        const name = document.createElement("strong");
        name.textContent = safeText(row.playerName, "匿名隊士");

        const score = document.createElement("span");
        score.className = "leaderboard-score";
        score.textContent = `${safeNumber(row.total)}点`;

        const detail = document.createElement("small");
        detail.textContent = safeText(row.rankTitle, "評定");

        item.append(rank, name, score, detail);
        return item;
      })
    );
  }

  function normalizeScope(scope) {
    if (!scope || typeof scope !== "object") return null;
    const stageId = safeId(scope.stageId, ALLOWED_STAGE_IDS);
    const difficultyId = safeId(scope.difficultyId, ALLOWED_DIFFICULTY_IDS);
    if (!stageId || !difficultyId) return null;
    return {
      stageId,
      difficultyId,
      recordKey: `${stageId}:${difficultyId}`,
      recordLabel: safeText(scope.recordLabel, `${stageId}・${difficultyId}`)
    };
  }

  function normalizePayload(payload) {
    if (!payload || typeof payload !== "object") return null;
    const stageId = safeId(payload.stageId, ALLOWED_STAGE_IDS);
    const difficultyId = safeId(payload.difficultyId, ALLOWED_DIFFICULTY_IDS);
    const total = safeNumber(payload.total);
    if (!stageId || !difficultyId) return null;
    return {
      total,
      rankTitle: safeText(payload.rankTitle, "評定"),
      stageId,
      stageTitle: safeText(payload.stageTitle, stageId),
      difficultyId,
      difficultyTitle: safeText(payload.difficultyTitle, difficultyId),
      recordKey: `${stageId}:${difficultyId}`,
      recordLabel: safeText(payload.recordLabel, `${stageId}・${difficultyId}`),
      scores: normalizeScores(payload.scores),
      trust: clampNumber(payload.trust, 0, 20),
      turn: clampNumber(payload.turn, 1, 100),
      goalBonus: clampNumber(payload.goalBonus, -10000, 10000),
      difficultyBonus: clampNumber(payload.difficultyBonus, -10000, 10000),
      stats: normalizeStats(payload.stats),
      clientVersion: safeText(payload.clientVersion, "unknown")
    };
  }

  function normalizeScores(scores = {}) {
    return Object.fromEntries(
      SCORE_KEYS.map((key) => [key, clampNumber(scores[key], -10000, 100000)])
    );
  }

  function normalizeStats(stats = {}) {
    return {
      maxChain: clampNumber(stats.maxChain, 0, 100),
      chainActions: clampNumber(stats.chainActions, 0, 100),
      fireCount: clampNumber(stats.fireCount, 0, 100),
      bigSuccesses: clampNumber(stats.bigSuccesses, 0, 100),
      routeProgress: clampNumber(stats.routeProgress, 0, 3),
      climaxCleared: Boolean(stats.climaxCleared),
      penalties: clampNumber(stats.penalties, 0, 100),
      trustLost: clampNumber(stats.trustLost, 0, 1000),
      trainings: clampNumber(stats.trainings, 0, 100),
      itemsUsed: clampNumber(stats.itemsUsed, 0, 100)
    };
  }

  function cleanPlayerName(value) {
    const trimmed = String(value || "").replace(/\s+/g, " ").trim();
    const length = Array.from(trimmed).length;
    if (!trimmed) {
      return { valid: false, value: "", message: "ニックネームを入力してください。" };
    }
    if (length > MAX_NAME_LENGTH) {
      return { valid: false, value: trimmed, message: `ニックネームは${MAX_NAME_LENGTH}文字までです。` };
    }
    return { valid: true, value: trimmed, message: "" };
  }

  function loadPlayerName() {
    try {
      return localStorage.getItem(PLAYER_NAME_KEY) || "";
    } catch (error) {
      return "";
    }
  }

  function savePlayerName(name) {
    try {
      localStorage.setItem(PLAYER_NAME_KEY, name);
    } catch (error) {
      // Ignore storage failures; posting should still work.
    }
  }

  function updateSubmitState() {
    const ui = elements();
    if (!ui.submit) return;
    const name = cleanPlayerName(ui.name?.value || "");
    ui.submit.disabled = !state.payload || state.submitted || !name.valid;
    ui.submit.textContent = state.submitted ? "投稿済み" : "投稿";
  }

  function setBusy(busy) {
    const ui = elements();
    ui.submit?.classList.toggle("is-loading", busy);
    if (ui.submit) ui.submit.disabled = busy || state.submitted;
  }

  function setStatus(message) {
    const ui = elements();
    if (!ui.status) return;
    ui.status.textContent = message;
    ui.status.hidden = !message;
  }

  function setStartStatus(message) {
    const ui = startElements();
    if (!ui.status) return;
    ui.status.textContent = message;
    ui.status.hidden = !message;
  }

  function errorMessage(error, fallback) {
    const code = error?.code || "";
    if (code.includes("failed-precondition")) {
      return "ランキングの準備が未完了です。Firestoreのインデックスを作成してください。";
    }
    if (code.includes("permission-denied")) {
      return "投稿権限がありません。Firestoreルールを確認してください。";
    }
    if (code.includes("unavailable")) {
      return "通信できません。接続後にもう一度お試しください。";
    }
    return fallback;
  }

  function safeId(value, allowed) {
    const text = String(value || "");
    return allowed.includes(text) ? text : "";
  }

  function safeText(value, fallback) {
    const text = String(value || "").trim();
    return text ? Array.from(text).slice(0, 40).join("") : fallback;
  }

  function safeNumber(value) {
    return clampNumber(value, 0, 100000);
  }

  function clampNumber(value, min, max) {
    const number = Number.isFinite(Number(value)) ? Math.round(Number(value)) : min;
    return Math.max(min, Math.min(max, number));
  }

  window.MibuLeaderboard = {
    showResult,
    showStartRanking
  };

  document.addEventListener("DOMContentLoaded", bind);
})();
