(function () {
  "use strict";

  const MAX_TURNS = 100;
  const TRUST_MAX = 20;
  const HAND_SIZE = 3;
  const BOARD_SIZE = 3;
  const STORAGE_KEY = "mibuDutyCards.v2";
  const LEGACY_STORAGE_KEY = "mibuDutyCards.v1";
  const CLIENT_VERSION = "v91";
  const MOTION_DURATION_MS = 2800;
  const BIG_SUCCESS_DURATION_MS = 3600;
  const TRAINING_COST = 10;
  const TRAINING_BONUS = 2;
  const ITEM_CATALOG = [
    {
      id: "hikyaku",
      name: "早駕籠",
      cost: 8,
      label: "猶予+2手",
      text: "人を走らせ、選択中の隊務が悪化するまでの猶予を2手延ばします。",
      tag: "早駕籠",
      effect: "extend"
    },
    {
      id: "chochin",
      name: "御用提灯",
      cost: 8,
      label: "得点+3",
      text: "御用の名で動きやすくし、選択中の隊務を実行した時の得点を+3します。",
      tag: "提灯+3",
      effect: "bonus"
    },
    {
      id: "negomawashi",
      name: "根回し状",
      cost: 8,
      label: "信用減半減",
      text: "先に話を通しておき、選択中の隊務を放置した時の信用減少を半分にします。",
      tag: "根回し",
      effect: "shield"
    }
  ];
  const ITEM_EXTENSION = 2;
  const ITEM_REWARD_BONUS = 3;
  const MATCH_MULTIPLIERS = {
    strong: 1.36,
    partial: 1.14,
    mismatch: 0.92
  };
  const BROAD_TRAIT_MULTIPLIER = 0.94;
  const SCORE_KEYS = ["security", "morale", "fame"];
  const SCORE_LABELS = {
    security: "治安",
    morale: "士気",
    fame: "名声"
  };
  const TAGS = {
    sword: "剣術系",
    patrol: "巡察系",
    inquiry: "聞込系",
    command: "規律系",
    stealth: "隠密系",
    morale: "士気系",
    fame: "名声系",
    letters: "書状系"
  };
  const TAG_META = {
    sword: { label: "剣術", icon: "刀", className: "type-sword" },
    patrol: { label: "巡察", icon: "見", className: "type-patrol" },
    inquiry: { label: "聞込", icon: "聞", className: "type-inquiry" },
    command: { label: "規律", icon: "令", className: "type-command" },
    stealth: { label: "隠密", icon: "影", className: "type-stealth" },
    morale: { label: "士気", icon: "気", className: "type-morale" },
    fame: { label: "名声", icon: "誉", className: "type-fame" },
    letters: { label: "書状", icon: "文", className: "type-letters" }
  };
  const goalDeck = [
    {
      id: "balance",
      title: "均衡采配",
      shortText: "三項目120以上",
      bonus: 180,
      achieved: (scores) => SCORE_KEYS.every((key) => scores[key] >= 120)
    },
    {
      id: "security",
      title: "治安回復",
      shortText: "治安180以上",
      bonus: 140,
      achieved: (scores) => scores.security >= 180
    },
    {
      id: "morale",
      title: "士気高揚",
      shortText: "士気150以上",
      bonus: 130,
      achieved: (scores) => scores.morale >= 150
    },
    {
      id: "fame",
      title: "名声挽回",
      shortText: "名声150以上",
      bonus: 130,
      achieved: (scores) => scores.fame >= 150
    }
  ];

  const stageDeck = [
    {
      id: "mibu",
      title: "壬生の一日",
      shortTitle: "壬生",
      text: "基本の隊務。偏りなく京の一日を整える。",
      preferredTags: ["command", "patrol", "morale"],
      route: ["command", "patrol", "morale"],
      climaxTitle: "屯所総締め",
      climaxPlace: "壬生",
      climaxTags: ["command", "morale"],
      climaxRisk: "不和",
      climaxText: "一日の乱れを、隊規と気迫で締め直す。",
      climaxReward: { security: 5, morale: 8, fame: 4 },
      climaxPenalty: { security: 3, morale: 6, fame: 2 }
    },
    {
      id: "shimabara",
      title: "島原の噂",
      shortTitle: "島原",
      text: "聞込と名声が鍵。噂を広げず手掛かりへ変える。",
      preferredTags: ["inquiry", "fame", "letters"],
      route: ["inquiry", "fame", "letters"],
      climaxTitle: "茶屋筋の口止め",
      climaxPlace: "島原",
      climaxTags: ["inquiry", "fame"],
      climaxRisk: "噂",
      climaxText: "座敷で広がる名を、穏やかに収める。",
      climaxReward: { security: 3, morale: 3, fame: 9 },
      climaxPenalty: { security: 2, morale: 1, fame: 7 }
    },
    {
      id: "ikedaya",
      title: "池田屋筋の気配",
      shortTitle: "池田屋",
      text: "巡察から剣術へ。終盤の火元を逃さない。",
      preferredTags: ["patrol", "sword", "stealth"],
      route: ["patrol", "inquiry", "sword"],
      climaxTitle: "池田屋筋の急報",
      climaxPlace: "三条小橋",
      climaxTags: ["patrol", "sword"],
      climaxRisk: "浪士",
      climaxText: "旅籠の奥で、抜き身の気配が濃くなる。",
      climaxReward: { security: 9, morale: 3, fame: 5 },
      climaxPenalty: { security: 8, morale: 2, fame: 2 }
    },
    {
      id: "fushimi",
      title: "伏見口の密書",
      shortTitle: "伏見",
      text: "書状と隠密が鍵。届く前に筋を押さえる。",
      preferredTags: ["letters", "stealth", "command"],
      route: ["letters", "stealth", "command"],
      climaxTitle: "伏見口の差配",
      climaxPlace: "伏見",
      climaxTags: ["letters", "stealth"],
      climaxRisk: "密書",
      climaxText: "行き違う書付を、夜明け前に読み解く。",
      climaxReward: { security: 7, morale: 2, fame: 7 },
      climaxPenalty: { security: 5, morale: 1, fame: 6 }
    }
  ];

  const difficultyDeck = [
    {
      id: "easy",
      title: "見廻り",
      text: "練習向け。期限に少し余裕があり、信用低下も控えめです。",
      deadlineOffset: 1,
      penaltyScale: 0.65,
      dangerChance: 0.08,
      finalMultiplier: 0.85
    },
    {
      id: "normal",
      title: "隊務",
      text: "標準。放置が重なると信用がはっきり削られます。",
      deadlineOffset: 0,
      penaltyScale: 1.18,
      dangerChance: 0.18,
      finalMultiplier: 1
    },
    {
      id: "hard",
      title: "非常",
      text: "高得点向け。期限が短く、信用低下がかなり重い隊務です。",
      deadlineOffset: -1,
      penaltyScale: 1.65,
      dangerChance: 0.34,
      finalMultiplier: 1.2
    }
  ];

  const officers = [
    {
      id: "okita",
      name: "沖田総司",
      role: "一番隊組長",
      mark: "沖",
      traits: ["sword", "patrol"],
      stats: { security: 4, morale: 2, fame: 2 },
      ability: {
        name: "一閃",
        text: "剣術任務なら治安と名声が大きく伸びる。"
      },
      text: "剣筋は軽く、騒ぎの火元を一息で断つ。"
    },
    {
      id: "hijikata",
      name: "土方歳三",
      role: "副長",
      mark: "土",
      traits: ["command", "inquiry", "letters"],
      stats: { security: 3, morale: 3, fame: 2 },
      ability: {
        name: "副長の沙汰",
        text: "この手番の放置ペナルティを防ぎ、規律・書状任務を強める。"
      },
      text: "帳面と隊規を照らし、乱れた場を締める。"
    },
    {
      id: "saito",
      name: "斎藤一",
      role: "三番隊組長",
      mark: "斎",
      traits: ["stealth", "patrol"],
      stats: { security: 4, morale: 1, fame: 3 },
      ability: {
        name: "無言の内偵",
        text: "隠密・巡察任務を強め、残った隊務の刻限を少し稼ぐ。"
      },
      text: "人影の薄い路地で、言葉少なく筋を追う。"
    },
    {
      id: "nagakura",
      name: "永倉新八",
      role: "二番隊組長",
      mark: "永",
      traits: ["sword", "morale"],
      stats: { security: 3, morale: 4, fame: 1 },
      ability: {
        name: "稽古場の気迫",
        text: "剣術・士気任務で士気を大きく押し上げる。"
      },
      text: "前に出る気風で、隊士の肩に力を戻す。"
    },
    {
      id: "kondo",
      name: "近藤勇",
      role: "局長",
      mark: "近",
      traits: ["morale", "fame", "command"],
      stats: { security: 2, morale: 3, fame: 3 },
      ability: {
        name: "局長の一声",
        text: "士気を上げ、最も低い局面を立て直す。"
      },
      text: "大きく構え、屯所の空気をひとつにする。"
    },
    {
      id: "harada",
      name: "原田左之助",
      role: "十番隊組長",
      mark: "原",
      traits: ["sword", "morale"],
      stats: { security: 3, morale: 3, fame: 2 },
      ability: {
        name: "槍働き",
        text: "刃傷・乱闘の気配で治安を大きく取り戻す。"
      },
      text: "槍働きの気迫で、物騒な場を押し返す。"
    },
    {
      id: "yamanami",
      name: "山南敬助",
      role: "総長",
      mark: "山",
      traits: ["letters", "inquiry", "fame"],
      stats: { security: 2, morale: 3, fame: 3 },
      ability: {
        name: "穏やかな説得",
        text: "聞込・書状任務で名声を伸ばす。"
      },
      text: "柔らかな言葉で、人の口から手掛かりを引く。"
    },
    {
      id: "inoue",
      name: "井上源三郎",
      role: "六番隊組長",
      mark: "井",
      traits: ["command", "patrol"],
      stats: { security: 3, morale: 3, fame: 2 },
      ability: {
        name: "古参の目配り",
        text: "規律・巡察任務で安定して伸ばす。"
      },
      text: "古参の落ち着きで、乱れた持ち場を整える。"
    },
    {
      id: "todo",
      name: "藤堂平助",
      role: "八番隊組長",
      mark: "藤",
      traits: ["sword", "patrol", "fame"],
      stats: { security: 3, morale: 2, fame: 3 },
      ability: {
        name: "先駆け",
        text: "剣術・巡察任務で治安を伸ばし、連携点も上げる。"
      },
      text: "軽い足取りで先に出て、場の流れを作る。"
    },
    {
      id: "serizawa",
      name: "芹沢鴨",
      role: "初代局長",
      mark: "芹",
      traits: ["sword", "morale", "command"],
      stats: { security: 5, morale: 3, fame: 0 },
      ability: {
        name: "豪胆な一喝",
        text: "剣術・規律任務を強く押す。"
      },
      text: "荒い気迫で、揉め事ごと場をねじ伏せる。"
    },
    {
      id: "takeda",
      name: "武田観柳斎",
      role: "五番隊組長",
      mark: "武",
      traits: ["letters", "command", "fame"],
      stats: { security: 2, morale: 2, fame: 4 },
      ability: {
        name: "理詰めの弁",
        text: "書状・規律任務で名声を伸ばし、山場準備も進めやすい。"
      },
      text: "筋道を立て、書付と面目を整えていく。"
    },
    {
      id: "ito",
      name: "伊東甲子太郎",
      role: "参謀兼文学師範",
      mark: "伊",
      traits: ["inquiry", "fame", "letters"],
      stats: { security: 1, morale: 3, fame: 4 },
      ability: {
        name: "参謀の見立て",
        text: "聞込・名声任務で大きく伸び、連携も作りやすい。"
      },
      text: "人の流れを読み、評判を味方につける。"
    }
  ];

  const stageOfficerDrafts = {
    mibu: ["hijikata", "kondo", "inoue"],
    shimabara: ["yamanami", "ito", "takeda"],
    ikedaya: ["okita", "saito", "nagakura"],
    fushimi: ["hijikata", "saito", "takeda"]
  };

  const taskDeck = [
    {
      title: "池田屋筋の気配",
      place: "三条小橋",
      tags: ["patrol", "sword"],
      risk: "浪士",
      text: "夕刻から旅籠の出入りが増えている。",
      reward: { security: 5, morale: 1, fame: 3 },
      penalty: { security: 5, morale: 1, fame: 0 },
      deadline: 2
    },
    {
      title: "島原帰りの聞き込み",
      place: "島原",
      tags: ["inquiry", "fame"],
      risk: "噂",
      text: "茶屋の座敷で、見慣れぬ名がささやかれた。",
      reward: { security: 2, morale: 1, fame: 6 },
      penalty: { security: 1, morale: 0, fame: 5 },
      deadline: 3
    },
    {
      title: "壬生屯所の隊規",
      place: "壬生",
      tags: ["command", "morale"],
      risk: "不和",
      text: "若い隊士の気が緩み、稽古場にざわめきが残る。",
      reward: { security: 2, morale: 6, fame: 1 },
      penalty: { security: 0, morale: 5, fame: 1 },
      deadline: 2
    },
    {
      title: "伏見口の書状",
      place: "伏見",
      tags: ["letters", "stealth"],
      risk: "密書",
      text: "急ぎの書付が、夜道を越えて届いた。",
      reward: { security: 4, morale: 1, fame: 4 },
      penalty: { security: 4, morale: 0, fame: 3 },
      deadline: 2
    },
    {
      title: "木屋町の小競り合い",
      place: "木屋町",
      tags: ["sword", "patrol"],
      risk: "刃傷",
      text: "酒の勢いで抜きかけた者を、通りが避けている。",
      reward: { security: 6, morale: 2, fame: 1 },
      penalty: { security: 6, morale: 2, fame: 1 },
      deadline: 1
    },
    {
      title: "商家の帳面違い",
      place: "四条",
      tags: ["inquiry", "letters"],
      risk: "金子",
      text: "御用達の帳尻に、妙な空白がある。",
      reward: { security: 3, morale: 1, fame: 5 },
      penalty: { security: 1, morale: 0, fame: 4 },
      deadline: 3
    },
    {
      title: "稽古場の立て直し",
      place: "八木邸",
      tags: ["sword", "morale"],
      risk: "緩み",
      text: "竹刀の音が鈍く、隊士の足が重い。",
      reward: { security: 3, morale: 6, fame: 1 },
      penalty: { security: 0, morale: 5, fame: 0 },
      deadline: 2
    },
    {
      title: "祇園社前の見回り",
      place: "祇園",
      tags: ["patrol", "stealth"],
      risk: "夜道",
      text: "祭礼の人波に紛れ、合図めいた笠が動く。",
      reward: { security: 5, morale: 1, fame: 4 },
      penalty: { security: 4, morale: 1, fame: 2 },
      deadline: 2
    },
    {
      title: "四条通の口論",
      place: "四条",
      tags: ["command", "fame"],
      risk: "面目",
      text: "諸藩の者が集まり、場の空気が尖っている。",
      reward: { security: 3, morale: 2, fame: 6 },
      penalty: { security: 2, morale: 1, fame: 5 },
      deadline: 2
    },
    {
      title: "屯所裏の影",
      place: "壬生",
      tags: ["stealth", "inquiry"],
      risk: "内偵",
      text: "塀の外に、何度も同じ足跡が重なった。",
      reward: { security: 5, morale: 2, fame: 2 },
      penalty: { security: 5, morale: 1, fame: 1 },
      deadline: 2
    },
    {
      title: "不逞浪士対応",
      place: "蛸薬師",
      tags: ["sword", "command"],
      risk: "乱闘",
      text: "名を問う前から、相手の手は柄にかかる。",
      reward: { security: 6, morale: 2, fame: 2 },
      penalty: { security: 7, morale: 2, fame: 1 },
      deadline: 1
    },
    {
      title: "町年寄への申し開き",
      place: "西本願寺前",
      tags: ["fame", "letters"],
      risk: "評判",
      text: "昨夜の騒ぎについて、町方から苦情が届いた。",
      reward: { security: 1, morale: 2, fame: 6 },
      penalty: { security: 0, morale: 1, fame: 6 },
      deadline: 2
    }
  ];

  const eventDeck = [
    {
      id: "ikedaya",
      title: "池田屋の兆し",
      text: "剣術・巡察任務の治安が伸びるが、放置した隊務の信用低下も重くなる。",
      tags: ["sword", "patrol"],
      bonus: { security: 3, morale: 0, fame: 1 },
      penaltyBoost: { security: 1, morale: 0, fame: 0 }
    },
    {
      id: "rain",
      title: "雨の京",
      text: "隠密・巡察は動きやすい。評判の動きは鈍る。",
      tags: ["stealth", "patrol"],
      bonus: { security: 2, morale: 0, fame: -1 },
      penaltyBoost: { security: 0, morale: 0, fame: 0 }
    },
    {
      id: "edict",
      title: "町方の目",
      text: "規律・書状任務の名声が伸びる。面目の信用低下は響きやすい。",
      tags: ["command", "letters"],
      bonus: { security: 0, morale: 0, fame: 3 },
      penaltyBoost: { security: 0, morale: 0, fame: 1 }
    },
    {
      id: "festival",
      title: "祭礼の人波",
      text: "聞込・名声任務が生きる。噂を放置すると広がりやすい。",
      tags: ["inquiry", "fame"],
      bonus: { security: 0, morale: 1, fame: 2 },
      penaltyBoost: { security: 0, morale: 0, fame: 1 }
    }
  ];

  const flavorLines = [
    "壬生屯所の朝が明ける。",
    "京の辻に、ざらついた風が残る。",
    "隊士の草履が、石畳を小さく鳴らす。",
    "日暮れまでに、片づける隊務は多い。",
    "暖簾の奥から、聞き慣れぬ名が漏れる。",
    "行灯の火が、浅葱の袖を淡く照らす。"
  ];

  const elements = {};
  let state;
  let nextTaskInstanceId = 1;
  let motionTimerId = 0;
  let motionDoneCallback = null;
  let selectedStageId = "mibu";
  let selectedDifficultyId = "normal";
  let selectedInitialOfficerIds = [];
  let startStep = "difficulty";
  let startLeaderboardRequestKey = "";

  function $(id) {
    return document.getElementById(id);
  }

  function storage() {
    try {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (Object.keys(current).length) return current;
      const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || "{}");
      return legacy || {};
    } catch (error) {
      return {};
    }
  }

  function saveStorage(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function createRng(seed) {
    let value = seed >>> 0;
    return function next() {
      value += 0x6d2b79f5;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function todaySeed() {
    const date = new Date();
    return Number(
      `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`
    );
  }

  function randomSeed() {
    return Math.floor(Date.now() % 100000000);
  }

  function selectedStage() {
    return stageDeck.find((stage) => stage.id === selectedStageId) || stageDeck[0];
  }

  function selectedDifficulty() {
    return difficultyDeck.find((difficulty) => difficulty.id === selectedDifficultyId) || difficultyDeck[1];
  }

  function shuffle(items, rng) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function startGame(seed = randomSeed()) {
    const rng = createRng(seed);
    const stage = selectedStage();
    const difficulty = selectedDifficulty();
    nextTaskInstanceId = 1;
    if (elements.startScreen && elements.gameApp) {
      elements.startScreen.hidden = true;
      elements.gameApp.hidden = false;
    }
    state = {
      seed,
      rng,
      turn: 1,
      trust: TRUST_MAX,
      scores: { security: 0, morale: 0, fame: 0 },
      selectedOfficerId: null,
      selectedTaskInstanceId: null,
      pendingAbilityOfficerId: null,
      trainedOfficerIds: {},
      activeTasks: [],
      officers: initialOfficersForGame(rng),
      fatigueByOfficerId: Object.fromEntries(officers.map((officer) => [officer.id, 0])),
      usedAbilityByOfficerId: {},
      currentEvent: drawEvent(rng, 1),
      goal: drawGoal(rng),
      stage,
      difficulty,
      routeStep: 0,
      routeProgress: 0,
      nextClimaxTurn: 10,
      climaxResolved: false,
      climaxInDeck: false,
      rerolls: 1,
      goalBonus: 0,
      difficultyBonus: 0,
      log: [],
      stats: createRunStats(),
      resultMeta: null,
      leaderboardPayload: null,
      nudgeText: "",
      lastActionText: "",
      lastAction: null,
      lastTaskTags: [],
      chainCount: 0,
      finished: false,
      resolving: false,
      motionCanSkipAt: 0
    };
    fillBoard();
    updateSeedText();
    render();
  }

  function drawOfficers(rng) {
    return shuffle(officers, rng).slice(0, HAND_SIZE);
  }

  function initialOfficersForGame(rng) {
    syncInitialOfficerSelection();
    const selected = selectedInitialOfficerIds
      .map((id) => officers.find((officer) => officer.id === id))
      .filter(Boolean);
    return selected.length === HAND_SIZE ? selected : drawOfficers(rng);
  }

  function stageDraftDefaults(stageId = selectedStageId) {
    return stageOfficerDrafts[stageId] || stageOfficerDrafts.mibu;
  }

  function syncInitialOfficerSelection(forceDefault = false) {
    const availableIds = officers.map((officer) => officer.id);
    const selected = selectedInitialOfficerIds.filter((id) => availableIds.includes(id));
    if (!forceDefault && selected.length === HAND_SIZE) {
      selectedInitialOfficerIds = selected;
      return;
    }
    selectedInitialOfficerIds = stageDraftDefaults().slice(0, HAND_SIZE);
  }

  function toggleInitialOfficer(officerId) {
    syncInitialOfficerSelection();
    if (selectedInitialOfficerIds.includes(officerId)) {
      selectedInitialOfficerIds = selectedInitialOfficerIds.filter((id) => id !== officerId);
    } else if (selectedInitialOfficerIds.length < HAND_SIZE) {
      selectedInitialOfficerIds = [...selectedInitialOfficerIds, officerId];
    } else {
      selectedInitialOfficerIds = [...selectedInitialOfficerIds.slice(1), officerId];
    }
    renderOfficerDraft();
  }

  function replaceUsedOfficer(hand, usedOfficerId, rng) {
    const remainingHand = hand.filter((officer) => officer.id !== usedOfficerId);
    const candidates = shuffle(
      officers.filter((officer) => !remainingHand.some((item) => item.id === officer.id)),
      rng
    );
    return [...remainingHand, candidates[0]].filter(Boolean).slice(0, HAND_SIZE);
  }

  function drawTask() {
    const task = shouldDrawClimax()
      ? buildClimaxTask()
      : weightedTaskDraw();
    const deadlineOffset = state.difficulty?.deadlineOffset || 0;
    return {
      ...task,
      instanceId: nextTaskInstanceId,
      remaining: Math.max(1, task.deadline + 1 + deadlineOffset)
    };
  }

  function shouldDrawClimax() {
    return state.turn >= (state.nextClimaxTurn || 10)
      && !state.activeTasks.some((task) => task.isClimax);
  }

  function buildClimaxTask() {
    state.climaxInDeck = true;
    state.nextClimaxTurn = (state.nextClimaxTurn || 10) + 10;
    return {
      title: state.stage.climaxTitle,
      place: state.stage.climaxPlace,
      tags: state.stage.climaxTags,
      risk: state.stage.climaxRisk,
      text: state.stage.climaxText,
      reward: state.stage.climaxReward,
      penalty: state.stage.climaxPenalty,
      deadline: 1,
      isClimax: true
    };
  }

  function weightedTaskDraw() {
    const stageTags = state.stage?.preferredTags || [];
    const dangerousRisks = ["刃傷", "乱闘", "浪士", "密書"];
    const dangerChance = state.difficulty?.dangerChance || 0;
    const source = state.rng() < dangerChance
      ? taskDeck.filter((task) => dangerousRisks.includes(task.risk))
      : taskDeck;
    const weighted = source.flatMap((task) => {
      const stageWeight = task.tags.some((tag) => stageTags.includes(tag)) ? 2 : 1;
      return Array.from({ length: stageWeight }, () => task);
    });
    return shuffle(weighted.length ? weighted : taskDeck, state.rng)[0];
  }

  function fillBoard() {
    while (state.activeTasks.length < BOARD_SIZE) {
      state.activeTasks.push(drawTask());
      nextTaskInstanceId += 1;
    }
  }

  function drawEvent(rng, turn) {
    if (turn === 1 || rng() > 0.34) return null;
    return shuffle(eventDeck, rng)[0];
  }

  function drawGoal(rng) {
    return shuffle(goalDeck, rng)[0];
  }

  function createRunStats() {
    return {
      gained: { security: 0, morale: 0, fame: 0 },
      lost: { security: 0, morale: 0, fame: 0 },
      trustLost: 0,
      penalties: 0,
      missedTasks: [],
      bigSuccesses: 0,
      chainActions: 0,
      maxChain: 0,
      chainScore: 0,
      fireCount: 0,
      fireScore: 0,
      climaxCleared: false,
      climaxBonus: 0,
      routeCompleted: false,
      routeProgress: 0,
      rerollsUsed: 0,
      abilityUses: 0,
      trainings: 0,
      itemsUsed: 0,
      moraleSpent: 0,
      fameSpent: 0
    };
  }

  function openTrainingDialog() {
    if (state.finished || state.resolving) return;
    renderTrainingDialog();
    if (typeof elements.trainingDialog?.showModal === "function") {
      elements.trainingDialog.showModal();
    }
  }

  function applyTraining(officerId) {
    if (state.finished || state.resolving) return;
    const officer = state.officers.find((item) => item.id === officerId);
    if (!officer) return;
    if (state.trainedOfficerIds[officer.id]) {
      state.nudgeText = `${officer.name}は鍛錬済みです。`;
      state.lastActionText = "";
      render();
      renderTrainingDialog();
      return;
    }
    if (state.scores.morale < TRAINING_COST) {
      state.nudgeText = `鍛錬には士気${TRAINING_COST}が必要です。`;
      state.lastActionText = "";
      render();
      renderTrainingDialog();
      return;
    }
    state.scores.morale = Math.max(0, state.scores.morale - TRAINING_COST);
    state.trainedOfficerIds[officer.id] = true;
    state.stats.trainings += 1;
    state.stats.moraleSpent += TRAINING_COST;
    state.nudgeText = `${officer.name}を鍛錬しました。カードの数字が上がりました。`;
    state.lastActionText = "";
    state.lastAction = null;
    elements.trainingDialog?.close();
    render();
  }

  function openItemDialog() {
    if (state.finished || state.resolving) return;
    renderItemDialog();
    if (typeof elements.itemDialog?.showModal === "function") {
      elements.itemDialog.showModal();
    }
  }

  function applySelectedItem(itemId) {
    if (state.finished || state.resolving) return;
    const item = ITEM_CATALOG.find((candidate) => candidate.id === itemId);
    if (!item) return;
    const taskIndex = selectedTaskArrayIndex();
    if (taskIndex < 0) {
      state.nudgeText = "道具を使う隊務を選択してください。";
      state.lastActionText = "";
      render();
      renderItemDialog();
      return;
    }
    const task = state.activeTasks[taskIndex];
    if (task.itemUsed) {
      state.nudgeText = `「${task.title}」には道具を使っています。`;
      state.lastActionText = "";
      render();
      renderItemDialog();
      return;
    }
    if (state.scores.fame < item.cost) {
      state.nudgeText = `${item.name}には名声${item.cost}が必要です。`;
      state.lastActionText = "";
      render();
      renderItemDialog();
      return;
    }
    state.scores.fame = Math.max(0, state.scores.fame - item.cost);
    const nextTask = {
      ...task,
      itemUsed: true,
      itemId: item.id,
      itemName: item.name,
      itemTag: item.tag
    };
    if (item.effect === "extend") {
      nextTask.remaining += ITEM_EXTENSION;
    }
    if (item.effect === "bonus") {
      nextTask.itemRewardBonus = ITEM_REWARD_BONUS;
    }
    if (item.effect === "shield") {
      nextTask.itemPenaltyShield = true;
    }
    state.activeTasks[taskIndex] = nextTask;
    state.stats.itemsUsed += 1;
    state.stats.fameSpent += item.cost;
    state.selectedTaskInstanceId = null;
    state.nudgeText = `${item.name}を使いました。「${task.title}」: ${item.label}`;
    state.lastActionText = "";
    state.lastAction = null;
    elements.itemDialog?.close();
    render();
  }

  function rerollTasks() {
    if (state.finished || state.resolving || state.rerolls <= 0) return;
    state.activeTasks = [];
    state.selectedTaskInstanceId = null;
    state.rerolls -= 1;
    state.stats.rerollsUsed += 1;
    fillBoard();
    state.nudgeText = "隊務を入れ替えました。隊士はそのままです。";
    state.lastActionText = "";
    state.lastAction = null;
    render();
  }

  function selectOfficer(officerId) {
    if (state.finished || state.resolving) return;
    if (state.selectedOfficerId === officerId && selectedTaskArrayIndex() < 0) {
      state.selectedOfficerId = null;
      state.pendingAbilityOfficerId = null;
      state.nudgeText = "隊士の選択を解除しました。";
      state.lastActionText = "";
      state.lastAction = null;
      render();
      return;
    }
    state.selectedOfficerId = officerId;
    state.nudgeText = "";
    state.lastActionText = "";
    state.lastAction = null;
    if (state.pendingAbilityOfficerId !== officerId) {
      state.pendingAbilityOfficerId = null;
    }
    const selectedTaskIndex = selectedTaskArrayIndex();
    if (selectedTaskIndex >= 0) {
      assignTask(selectedTaskIndex);
      return;
    }
    render();
  }

  function armAbility(officerId) {
    if (state.finished || state.resolving || state.usedAbilityByOfficerId[officerId]) return;
    if (state.pendingAbilityOfficerId === officerId && state.selectedOfficerId === officerId) {
      state.selectedOfficerId = null;
      state.pendingAbilityOfficerId = null;
      state.nudgeText = "奥義の待機を解除しました。";
      state.lastActionText = "";
      state.lastAction = null;
      render();
      return;
    }
    state.selectedOfficerId = officerId;
    state.pendingAbilityOfficerId = officerId;
    state.nudgeText = "";
    state.lastActionText = "";
    state.lastAction = null;
    render();
  }

  function assignTask(taskIndex) {
    if (state.finished || state.resolving) return;
    const task = state.activeTasks[taskIndex];
    if (!state.selectedOfficerId) {
      if (state.selectedTaskInstanceId === task.instanceId) {
        state.selectedTaskInstanceId = null;
        state.nudgeText = "隊務の選択を解除しました。";
        state.lastActionText = "";
        state.lastAction = null;
        render();
        return;
      }
      state.selectedTaskInstanceId = task.instanceId;
      state.nudgeText = "任せる隊士を選ぶと実行します。";
      state.lastActionText = "";
      state.lastAction = null;
      render();
      return;
    }
    const officer = state.officers.find((item) => item.id === state.selectedOfficerId);
    const useAbility = state.pendingAbilityOfficerId === officer.id && !state.usedAbilityByOfficerId[officer.id];
    const result = resolveAssignment(officer, task, useAbility);

    applyScoreDelta(result.values);
    if (useAbility) {
      state.usedAbilityByOfficerId[officer.id] = true;
    }
    recordAssignmentStats(task, result, useAbility);
    updateFatigue(officer, result);
    updateRouteProgress(task);
    if (task.isClimax) {
      state.climaxResolved = true;
    }
    state.log.unshift(buildSuccessLog(officer, task, result));
    state.lastActionText = `${result.strongMatch ? "大成功。" : ""}${officer.name}が「${task.title}」を完了。${scoreDeltaText(result.values)}${actionExtraText(result)}。`;
    state.lastAction = {
      officerName: officer.name,
      taskTitle: task.title,
      values: result.values,
      strongMatch: result.strongMatch,
      tempoGain: result.tempoGain,
      chainMatch: result.chainMatch,
      chainBonus: result.chainBonus,
      chainLabel: result.chainLabel,
      chainCount: result.chainCount,
      climaxBonus: result.climaxBonus,
      fireBonus: result.fireBonus,
      itemBonus: result.itemBonus,
      itemName: result.itemName,
      trainingBonus: result.trainingBonus
    };

    state.activeTasks.splice(taskIndex, 1);
    processPendingTasks(result);
    state.turn += 1;
    state.selectedOfficerId = null;
    state.selectedTaskInstanceId = null;
    state.pendingAbilityOfficerId = null;
    state.nudgeText = "";
    state.lastTaskTags = task.tags.slice();
    state.chainCount = result.chainMatch ? result.chainCount : 0;

    if (state.trust <= 0 || state.turn > MAX_TURNS) {
      state.endReason = state.trust <= 0 ? "信用失墜" : "百手満了";
      state.finished = true;
      render();
      playMotionScene(state.lastAction, finishGame);
      return;
    }

    state.officers = replaceUsedOfficer(state.officers, officer.id, state.rng);
    state.currentEvent = drawEvent(state.rng, state.turn);
    fillBoard();
    render();
    playMotionScene(state.lastAction);
  }

  function resolveAssignment(officer, task, useAbility) {
    const fatigue = 0;
    const matchCount = task.tags.filter((tag) => officer.traits.includes(tag)).length;
    const strongMatch = matchCount >= 2;
    const partialMatch = matchCount === 1;
    const chain = chainInfo(task);
    const fatiguePenalty = 1;
    const matchMultiplier = strongMatch
      ? MATCH_MULTIPLIERS.strong
      : partialMatch
        ? MATCH_MULTIPLIERS.partial
        : MATCH_MULTIPLIERS.mismatch;
    const breadthMultiplier = officer.traits.length >= 3 ? BROAD_TRAIT_MULTIPLIER : 1;
    const multiplier = matchMultiplier * fatiguePenalty * breadthMultiplier;
    const focusBonus = officer.traits.includes("morale") ? 1 : 0;
    const commandBonus = officer.traits.includes("command") && task.risk !== "刃傷" ? 1 : 0;
    const swordPenalty = task.tags.includes("sword") && !officer.traits.includes("sword") ? -1 : 0;
    const values = {
      security: Math.max(0, Math.round((task.reward.security + officer.stats.security / 2 + swordPenalty) * multiplier)),
      morale: Math.max(0, Math.round((task.reward.morale + officer.stats.morale / 2 + focusBonus) * multiplier)),
      fame: Math.max(0, Math.round((task.reward.fame + officer.stats.fame / 2 + commandBonus) * multiplier))
    };
    const result = {
      values,
      matchCount,
      strongMatch,
      partialMatch,
      fatigue,
      fatigueGain: 0,
      tempoGain: strongMatch ? 1 : 0,
      chainMatch: chain.match,
      chainBonus: chain.bonus,
      chainLabel: chain.label,
      chainCount: chain.count,
      fireBonus: 0,
      climaxBonus: 0,
      itemBonus: task.itemRewardBonus || 0,
      itemName: task.itemName || "",
      trainingBonus: state.trainedOfficerIds?.[officer.id] ? TRAINING_BONUS : 0,
      abilityUsed: useAbility,
      abilityNote: "",
      suppressPenalties: false,
      extendDeadlines: false
    };

    if (strongMatch) {
      const bestKey = strongestReward(task);
      result.values[bestKey] += 3;
    }
    if (result.chainMatch) {
      const bestKey = strongestReward(task);
      result.values[bestKey] += result.chainBonus;
    }
    if (task.isClimax) {
      const bestKey = strongestReward(task);
      result.climaxBonus = state.routeProgress * 2;
      result.values[bestKey] += result.climaxBonus;
      if (state.routeProgress >= 3) {
        result.values.morale += 2;
        result.values.fame += 2;
      }
    }
    if (task.remaining <= 1) {
      const bestKey = strongestReward(task);
      result.fireBonus = 3;
      result.values[bestKey] += result.fireBonus;
    }
    applyEventBonus(task, result);
    if (useAbility) {
      applyAbility(officer, task, result);
    }
    if (result.itemBonus) {
      result.values[strongestReward(task)] += result.itemBonus;
    }
    if (result.trainingBonus) {
      SCORE_KEYS.forEach((key) => {
        result.values[key] += result.trainingBonus;
      });
    }
    return result;
  }

  function applyEventBonus(task, result) {
    const event = state.currentEvent;
    if (!event || !task.tags.some((tag) => event.tags.includes(tag))) return;
    SCORE_KEYS.forEach((key) => {
      result.values[key] = Math.max(0, result.values[key] + event.bonus[key]);
    });
  }

  function applyAbility(officer, task, result) {
    if (officer.id === "okita") {
      result.values.security += task.tags.includes("sword") ? 4 : 2;
      result.values.fame += task.tags.includes("sword") ? 2 : 0;
      result.abilityNote = "沖田の一閃で火元を断った。";
      return;
    }
    if (officer.id === "hijikata") {
      if (task.tags.some((tag) => ["command", "letters"].includes(tag))) {
        result.values.security += 2;
        result.values.fame += 2;
      }
      result.suppressPenalties = true;
      result.abilityNote = "副長の沙汰で残る隊務にも釘を刺した。";
      return;
    }
    if (officer.id === "saito") {
      if (task.tags.some((tag) => ["stealth", "patrol"].includes(tag))) {
        result.values.security += 3;
        result.values.fame += 1;
      }
      result.extendDeadlines = true;
      result.abilityNote = "斎藤の内偵で次の刻限にも余裕ができた。";
      return;
    }
    if (officer.id === "nagakura") {
      if (task.tags.some((tag) => ["sword", "morale"].includes(tag))) {
        result.values.morale += 5;
      } else {
        result.values.morale += 2;
      }
      result.abilityNote = "永倉の気迫で隊士の背筋が伸びた。";
      return;
    }
    if (officer.id === "kondo") {
      const lowest = lowestScoreKey();
      result.values.morale += 3;
      result.values[lowest] += 3;
      result.abilityNote = "近藤の一声が局面の弱みを支えた。";
      return;
    }
    if (officer.id === "harada") {
      const heavyRisk = ["刃傷", "乱闘", "浪士"].includes(task.risk);
      result.values.security += heavyRisk ? 5 : 2;
      result.values.fame += heavyRisk ? 1 : 0;
      result.abilityNote = "原田の槍働きで物騒な気配を押し返した。";
      return;
    }
    if (officer.id === "yamanami") {
      if (task.tags.some((tag) => ["inquiry", "letters"].includes(tag))) {
        result.values.fame += 4;
        result.values.morale += 1;
      }
      result.abilityNote = "山南の説得で角を立てずに収めた。";
      return;
    }
    if (officer.id === "inoue") {
      if (task.tags.some((tag) => ["command", "patrol"].includes(tag))) {
        result.values.security += 2;
        result.values.morale += 2;
      }
      result.abilityNote = "井上の目配りで持ち場が乱れずに済んだ。";
      return;
    }
    if (officer.id === "todo") {
      if (task.tags.some((tag) => ["sword", "patrol"].includes(tag))) {
        result.values.security += 4;
        result.values.fame += 2;
      }
      if (result.chainMatch) {
        result.chainBonus += 1;
        result.values[strongestReward(task)] += 1;
      }
      result.abilityNote = "藤堂の先駆けで流れが前へ出た。";
      return;
    }
    if (officer.id === "serizawa") {
      if (task.tags.some((tag) => ["sword", "command"].includes(tag))) {
        result.values.security += 4;
        result.values.morale += 2;
      } else {
        result.values.security += 2;
      }
      result.abilityNote = "芹沢の一喝で場を強引に収めた。";
      return;
    }
    if (officer.id === "takeda") {
      if (task.tags.some((tag) => ["letters", "command"].includes(tag))) {
        result.values.fame += 4;
        result.values.security += 1;
      }
      result.abilityNote = "武田の理詰めで面目が整った。";
      return;
    }
    if (officer.id === "ito") {
      if (task.tags.some((tag) => ["inquiry", "fame"].includes(tag))) {
        result.values.fame += 4;
        result.values.morale += 2;
      }
      if (result.chainMatch) {
        result.values[strongestReward(task)] += 1;
      }
      result.abilityNote = "伊東の見立てで評判の流れを読んだ。";
    }
  }

  function lowestScoreKey() {
    return SCORE_KEYS.reduce((lowest, key) => (
      state.scores[key] < state.scores[lowest] ? key : lowest
    ), SCORE_KEYS[0]);
  }

  function applyScoreDelta(delta) {
    SCORE_KEYS.forEach((key) => {
      state.scores[key] = Math.max(0, state.scores[key] + delta[key]);
    });
  }

  function addScoreBucket(bucket, values) {
    SCORE_KEYS.forEach((key) => {
      bucket[key] += Math.max(0, values[key] || 0);
    });
  }

  function recordAssignmentStats(task, result, useAbility) {
    addScoreBucket(state.stats.gained, result.values);
    if (result.strongMatch) state.stats.bigSuccesses += 1;
    if (result.chainMatch) {
      state.stats.chainActions += 1;
      state.stats.maxChain = Math.max(state.stats.maxChain, result.chainCount);
      state.stats.chainScore += result.chainBonus;
    }
    if (result.fireBonus) {
      state.stats.fireCount += 1;
      state.stats.fireScore += result.fireBonus;
    }
    if (task.isClimax) {
      state.stats.climaxCleared = true;
      state.stats.climaxBonus += result.climaxBonus;
    }
    if (useAbility) {
      state.stats.abilityUses += 1;
    }
  }

  function recordPenaltyStats(task, penalty, trustDamage) {
    state.stats.penalties += 1;
    addScoreBucket(state.stats.lost, penalty);
    state.stats.trustLost += trustDamage;
    state.stats.missedTasks.push({
      title: task.title,
      total: trustDamage,
      text: trustDamageText(trustDamage)
    });
  }

  function scoreTotal(values) {
    return SCORE_KEYS.reduce((total, key) => total + Math.max(0, values[key] || 0), 0);
  }

  function updateFatigue(selectedOfficer, result) {
    officers.forEach((officer) => {
      const current = state.fatigueByOfficerId[officer.id] || 0;
      if (officer.id === selectedOfficer.id) {
        state.fatigueByOfficerId[officer.id] = Math.min(3, current + result.fatigueGain);
      } else {
        state.fatigueByOfficerId[officer.id] = Math.max(0, current - 1);
      }
    });
  }

  function updateRouteProgress(task) {
    const route = state.stage?.route || [];
    if (state.routeStep >= route.length) return;
    const expectedTag = route[state.routeStep];
    if (!task.tags.includes(expectedTag)) return;
    state.routeStep += 1;
    state.routeProgress = state.routeStep;
    state.log.unshift(`山場準備が進んだ。${TAGS[expectedTag]}の筋を押さえた。`);
  }

  function processPendingTasks(result) {
    const remainingTasks = [];
    state.activeTasks.forEach((task) => {
      const nextTask = { ...task };
      if (state.currentEvent && state.currentEvent.id === "rain" && task.tags.includes("patrol")) {
        nextTask.remaining -= 1;
      }
      if (result.extendDeadlines || result.tempoGain > 0) {
        nextTask.remaining += 1;
      }
      nextTask.remaining -= 1;

      if (result.suppressPenalties && nextTask.remaining <= 0) {
        nextTask.remaining = 1;
        state.log.unshift(`土方の沙汰で「${task.title}」の悪化を一手だけ止めた。`);
        remainingTasks.push(nextTask);
        return;
      }

      if (nextTask.remaining <= 0) {
        const penalty = penaltyFor(task);
        const trustDamage = trustDamageFromPenalty(penalty);
        recordPenaltyStats(task, penalty, trustDamage);
        state.trust = Math.max(0, state.trust - trustDamage);
        state.log.unshift(`放置した「${task.title}」が悪化。${trustDamageText(trustDamage)}。`);
        return;
      }

      remainingTasks.push(nextTask);
    });
    state.activeTasks = remainingTasks;
  }

  function penaltyFor(task) {
    const scale = state.difficulty?.penaltyScale || 1;
    const penalty = Object.fromEntries(
      SCORE_KEYS.map((key) => [key, Math.ceil(task.penalty[key] * 0.62 * scale)])
    );
    const event = state.currentEvent;
    if (event && task.tags.some((tag) => event.tags.includes(tag))) {
      SCORE_KEYS.forEach((key) => {
        penalty[key] += event.penaltyBoost[key];
      });
    }
    if (task.itemPenaltyShield) {
      SCORE_KEYS.forEach((key) => {
        penalty[key] = Math.ceil(penalty[key] / 2);
      });
    }
    return penalty;
  }

  function penaltyText(penalty) {
    return SCORE_KEYS
      .filter((key) => penalty[key] > 0)
      .map((key) => `${SCORE_LABELS[key]}${penalty[key]}`)
      .join("・") || "面目";
  }

  function trustDamageFromPenalty(penalty) {
    return Math.max(1, Math.ceil(scoreTotal(penalty) / 4));
  }

  function trustDamageFor(task) {
    return trustDamageFromPenalty(penaltyFor(task));
  }

  function trustDamageText(value) {
    return `信用-${value}`;
  }

  function buildSuccessLog(officer, task, result) {
    const outcome = result.strongMatch
      ? "見事な采配で収めた"
      : result.partialMatch
        ? "持ち味を生かして進めた"
        : "苦手筋ながら形にした";
    const fatigueLine = result.fatigue >= 2 ? "ただ、疲れは袖口に滲んでいる。" : "";
    const abilityLine = result.abilityNote ? `${result.abilityNote}` : "";
    const tempoLine = result.tempoGain > 0 ? "大成功で残る隊務にも余裕が生まれた。" : "";
    const chainLine = result.chainMatch ? `${result.chainLabel}の流れをつなぎ、連携が決まった。` : "";
    const climaxLine = task.isClimax ? `山場を収めた。準備${state.routeProgress}/3が効いている。` : "";
    const fireLine = result.fireBonus ? "土壇場の対応で評定が伸びた。" : "";
    const itemLine = result.itemBonus ? `${result.itemName}が効いた。` : "";
    const trainingLine = result.trainingBonus ? "鍛錬の成果が出た。" : "";
    return `${officer.name}が${task.place}の「${task.title}」を${outcome}。${chainLine}${climaxLine}${fireLine}${itemLine}${trainingLine}${tempoLine}${abilityLine}${fatigueLine}`;
  }

  function finishGame() {
    state.finished = true;
    state.goalBonus = goalAchieved() ? state.goal.bonus : 0;
    state.difficultyBonus = difficultyBonusScore();
    state.stats.routeCompleted = state.routeProgress >= (state.stage?.route?.length || 3);
    state.stats.routeProgress = state.routeProgress;
    if (!state.endReason) {
      state.endReason = state.trust <= 0 ? "信用失墜" : "百手満了";
    }
    const total = totalScore();
    const rank = rankFor(total);
    const saved = storage();
    const best = saved.bestTotal || 0;
    const recordKey = currentRecordKey();
    const recordLabel = currentRecordLabel();
    const records = saved.records || {};
    const previousRecord = records[recordKey] || {};
    const previousStageBest = previousRecord.bestTotal || 0;
    const bestScores = saved.bestScores || {};
    const nextBestScores = {
      security: Math.max(bestScores.security || 0, state.scores.security),
      morale: Math.max(bestScores.morale || 0, state.scores.morale),
      fame: Math.max(bestScores.fame || 0, state.scores.fame)
    };
    const isGlobalBest = total > best;
    const isStageBest = total > previousStageBest;
    state.resultMeta = {
      recordKey,
      recordLabel,
      previousGlobalBest: best,
      previousStageBest,
      isGlobalBest,
      isStageBest,
      globalImprovement: isGlobalBest ? total - best : 0,
      stageImprovement: isStageBest ? total - previousStageBest : 0
    };
    state.leaderboardPayload = createLeaderboardPayload(rank, total);
    const nextRecordForMode = {
      ...previousRecord,
      bestTotal: Math.max(previousStageBest, total),
      bestRank: total >= previousStageBest ? rank.title : previousRecord.bestRank,
      bestDate: total >= previousStageBest ? new Date().toISOString() : previousRecord.bestDate,
      playCount: (previousRecord.playCount || 0) + 1,
      lastTotal: total,
      lastRank: rank.title,
      lastStats: summarizeRunStats()
    };
    const nextRecord = {
      ...saved,
      bestTotal: Math.max(best, total),
      bestRank: total >= best ? rank.title : saved.bestRank,
      bestScores: nextBestScores,
      playCount: (saved.playCount || 0) + 1,
      lastResult: `${rank.title} ${total}点`,
      lastScores: state.scores,
      records: {
        ...records,
        [recordKey]: nextRecordForMode
      }
    };
    saveStorage(nextRecord);
    render();
    showResult(rank, total);
  }

  function totalScore() {
    return state.scores.security + state.scores.morale + state.scores.fame + (state.goalBonus || 0) + (state.difficultyBonus || 0);
  }

  function difficultyBonusScore() {
    const base = state.scores.security + state.scores.morale + state.scores.fame + (goalAchieved() ? state.goal.bonus : 0);
    const multiplier = state.difficulty?.finalMultiplier || 1;
    return Math.round(base * multiplier) - base;
  }

  function currentRecordKey() {
    const stageId = state?.stage?.id || selectedStageId;
    const difficultyId = state?.difficulty?.id || selectedDifficultyId;
    return `${stageId}:${difficultyId}`;
  }

  function currentRecordLabel() {
    const stage = state?.stage || selectedStage();
    const difficulty = state?.difficulty || selectedDifficulty();
    return `${stage.shortTitle}・${difficulty.title}`;
  }

  function summarizeRunStats() {
    return {
      maxChain: state.stats.maxChain,
      chainActions: state.stats.chainActions,
      fireCount: state.stats.fireCount,
      bigSuccesses: state.stats.bigSuccesses,
      routeProgress: state.stats.routeProgress,
      climaxCleared: state.stats.climaxCleared,
      penalties: state.stats.penalties,
      trustLost: state.stats.trustLost,
      trainings: state.stats.trainings,
      itemsUsed: state.stats.itemsUsed
    };
  }

  function createLeaderboardPayload(rank, total) {
    return {
      total,
      rankTitle: rank.title,
      stageId: state.stage.id,
      stageTitle: state.stage.title,
      difficultyId: state.difficulty.id,
      difficultyTitle: state.difficulty.title,
      recordKey: currentRecordKey(),
      recordLabel: currentRecordLabel(),
      scores: { ...state.scores },
      trust: Math.max(0, Math.min(TRUST_MAX, state.trust)),
      turn: Math.min(state.turn, MAX_TURNS),
      goalBonus: state.goalBonus || 0,
      difficultyBonus: state.difficultyBonus || 0,
      stats: summarizeRunStats(),
      clientVersion: CLIENT_VERSION
    };
  }

  function goalAchieved() {
    return Boolean(state.goal?.achieved(state.scores));
  }

  function rankFor(total) {
    if (state.trust <= 0) {
      return {
        title: "信用失墜",
        text: "隊への信用が尽き、今日の隊務はここで打ち切りとなった。次は隊務の放置を抑えたい。"
      };
    }
    const lowest = lowestFinalScore();
    const highest = highestFinalScore();
    const balanceText = `${SCORE_LABELS[highest]}は光ったが、${SCORE_LABELS[lowest]}に課題が残る。`;
    if (total >= 130 && state.scores[lowest] >= 32) {
      return {
        title: "局中法度の鑑",
        text: `治安、士気、名声がそろい、屯所には引き締まった空気が戻った。${SCORE_LABELS[highest]}の采配が特に冴えた。`
      };
    }
    if (total >= 112) {
      return {
        title: "京洛安堵",
        text: `大きな乱れは抑えた。今日の京は、新選組の足音を覚えている。${balanceText}`
      };
    }
    if (total >= 92) {
      return {
        title: "壬生働き",
        text: `取りこぼしはあるが、隊務は形になった。次の一日で${SCORE_LABELS[lowest]}を立て直したい。`
      };
    }
    if (total >= 72) {
      return {
        title: "半刻遅れ",
        text: `京の隊務は残った。隊士の得意系統と残り手番を見直せば、もっと伸びる。`
      };
    }
    return {
      title: "屯所反省会",
      text: `采配が噛み合わず、夜の帳に不穏さが残る。系統一致、温存、放置の順を見直したい。`
    };
  }

  function lowestFinalScore() {
    return SCORE_KEYS.reduce((lowest, key) => (
      state.scores[key] < state.scores[lowest] ? key : lowest
    ), SCORE_KEYS[0]);
  }

  function highestFinalScore() {
    return SCORE_KEYS.reduce((highest, key) => (
      state.scores[key] > state.scores[highest] ? key : highest
    ), SCORE_KEYS[0]);
  }

  function updateSeedText() {
    const date = new Date();
    elements.daySeed.textContent = `本日の隊務 ${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  }

  function render() {
    elements.turnText.textContent = `${Math.min(state.turn, MAX_TURNS)} / ${MAX_TURNS}`;
    elements.securityText.textContent = state.scores.security;
    elements.moraleText.textContent = state.scores.morale;
    elements.fameText.textContent = state.scores.fame;
    updateTrustUi();
    updateScoreFocus();
    updateGoalUi();
    updateStageUi();
    updateRerollUi();
    updateCommandUi();
    elements.roundFlavor.textContent = flavorLines[(state.turn - 1) % flavorLines.length];
    elements.selectionHint.textContent = state.selectedTaskInstanceId ? "任せる隊士を選ぶ" : "隊士";
    updateGuide();
    updateActionFeedback();
    updateResultFlash();
    if (elements.eventTitle) {
      elements.eventTitle.textContent = state.currentEvent ? state.currentEvent.title : "平穏";
      elements.eventText.textContent = state.currentEvent ? state.currentEvent.text : "大きな変事はない。残り手番を見ながら隊務を選ぶ。";
    }
    renderTasks();
    renderOfficers();
    renderLog();
    renderRecords();
  }

  function showStartScreen() {
    window.clearTimeout(motionTimerId);
    motionDoneCallback = null;
    if (state) {
      state.resolving = false;
      state.motionCanSkipAt = 0;
      state.selectedOfficerId = null;
      state.selectedTaskInstanceId = null;
      state.pendingAbilityOfficerId = null;
    }
    elements.gameApp?.classList.remove("resolving");
    if (elements.motionBackdrop) elements.motionBackdrop.hidden = true;
    if (elements.motionScene) {
      elements.motionScene.hidden = true;
      elements.motionScene.classList.remove("play");
      elements.motionScene.classList.remove("big-success");
      elements.motionScene.classList.remove("chain-success");
    }
    if (elements.resultDialog?.open) {
      elements.resultDialog.close();
    }
    if (elements.itemDialog?.open) {
      elements.itemDialog.close();
    }
    if (elements.trainingDialog?.open) {
      elements.trainingDialog.close();
    }
    if (elements.helpDialog?.open) {
      elements.helpDialog.close();
    }
    if (elements.startScreen && elements.gameApp) {
      elements.startScreen.hidden = false;
      elements.gameApp.hidden = true;
    }
    startLeaderboardRequestKey = "";
    showStartStep("difficulty");
    renderStartOptions();
    renderStartRecord();
  }

  function showStartStep(step) {
    startStep = step === "setup" ? "setup" : "difficulty";
    if (elements.difficultyStep) {
      elements.difficultyStep.hidden = startStep !== "difficulty";
    }
    if (elements.setupStep) {
      elements.setupStep.hidden = startStep !== "setup";
    }
    if (elements.startScreen) {
      elements.startScreen.dataset.step = startStep;
    }
    renderStartRecord();
    refreshStartLeaderboard();
  }

  function updateGuide() {
    if (!elements.guideText) return;
    const officerSelected = Boolean(state.selectedOfficerId);
    const taskSelected = Boolean(state.selectedTaskInstanceId);
    if (state.nudgeText) {
      elements.guideText.textContent = state.nudgeText;
      return;
    }
    if (officerSelected && !taskSelected) {
      elements.guideText.textContent = "隊務を選択してください";
      return;
    }
    if (!officerSelected && taskSelected) {
      elements.guideText.textContent = "隊士を選択してください";
      return;
    }
    elements.guideText.textContent = "隊士と隊務を1枚ずつ選択してください";
  }

  function updateActionFeedback() {
    if (!elements.actionFeedback) return;
    const officerSelected = Boolean(state.selectedOfficerId);
    const taskSelected = Boolean(state.selectedTaskInstanceId);
    const lowest = lowestScoreKey();
    const lowLabel = SCORE_LABELS[lowest];
    const values = SCORE_KEYS.map((key) => state.scores[key]);
    const tied = Math.min(...values) === Math.max(...values);
    const message = state.lastActionText
      || (taskSelected && !officerSelected
        ? "隊士待ち"
        : officerSelected
        ? tied
          ? "見込み点を確認"
          : `${lowLabel}+を狙う`
        : "");
    elements.actionFeedback.textContent = message;
    elements.actionFeedback.hidden = !message;
    elements.actionFeedback.classList.toggle("recent-feedback", Boolean(state.lastActionText));
  }

  function updateScoreFocus() {
    const values = SCORE_KEYS.map((key) => state.scores[key]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const scoreElements = {
      security: elements.securityText,
      morale: elements.moraleText,
      fame: elements.fameText
    };
    SCORE_KEYS.forEach((key) => {
      const stat = scoreElements[key]?.closest(".stat");
      stat?.classList.toggle("needs-care", min < max && state.scores[key] === min);
    });
  }

  function updateTrustUi() {
    if (!elements.trustText || !elements.trustFill) return;
    const trust = Math.max(0, Math.min(TRUST_MAX, state.trust ?? TRUST_MAX));
    const percent = Math.round((trust / TRUST_MAX) * 100);
    elements.trustText.textContent = `${trust}`;
    elements.trustFill.style.width = `${percent}%`;
    const meter = elements.trustText.closest(".trust-meter");
    meter?.classList.toggle("trust-low", percent <= 35);
    meter?.classList.toggle("trust-critical", percent <= 15);
  }

  function updateGoalUi() {
    if (!elements.goalText || !state.goal) return;
    elements.goalText.textContent = `ボーナス ${state.goal.shortText} +${state.goal.bonus}点`;
    elements.goalText.classList.toggle("goal-complete", goalAchieved());
  }

  function updateStageUi() {
    if (elements.stageText) {
      elements.stageText.textContent = state.stage?.shortTitle || "舞台";
    }
    if (elements.routeText) {
      elements.routeText.textContent = routeProgressText();
      elements.routeText.classList.toggle("route-complete", (state.routeProgress || 0) >= 3);
    }
  }

  function routeProgressText() {
    const route = state.stage?.route || [];
    if ((state.routeProgress || 0) >= route.length) return "山場準備 完了";
    const nextTag = route[state.routeStep || 0];
    const nextLabel = TAG_META[nextTag]?.label || TAGS[nextTag] || "次";
    return `山場準備 次:${nextLabel} ${state.routeProgress || 0}/${route.length}`;
  }

  function updateRerollUi() {
    if (!elements.rerollButton) return;
    elements.rerollButton.textContent = `隊務入替 ${state.rerolls}`;
    elements.rerollButton.disabled = state.finished || state.resolving || state.rerolls <= 0;
  }

  function updateCommandUi() {
    if (elements.trainButton) {
      const availableOfficer = state.officers.some((officer) => !state.trainedOfficerIds[officer.id]);
      const canAfford = state.scores.morale >= TRAINING_COST;
      const isReady = availableOfficer && canAfford;
      elements.trainButton.disabled = state.finished || state.resolving;
      elements.trainButton.classList.toggle("is-ready", Boolean(isReady));
      elements.trainButton.classList.toggle("is-unavailable", Boolean(!isReady));
      setCommandVisual(elements.trainButton, isReady ? "ready" : "unavailable");
      elements.trainButton.title = `鍛錬する隊士を選びます。士気${TRAINING_COST}が必要です。`;
    }
    if (elements.itemButton) {
      const taskIndex = selectedTaskArrayIndex();
      const task = taskIndex >= 0 ? state.activeTasks[taskIndex] : null;
      const minCost = Math.min(...ITEM_CATALOG.map((item) => item.cost));
      const canAfford = state.scores.fame >= minCost;
      const isReady = canAfford && !task?.itemUsed;
      elements.itemButton.disabled = state.finished || state.resolving;
      elements.itemButton.classList.toggle("is-ready", Boolean(isReady));
      elements.itemButton.classList.toggle("is-unavailable", Boolean(!isReady));
      elements.itemButton.classList.toggle("is-used", Boolean(task?.itemUsed));
      setCommandVisual(elements.itemButton, task?.itemUsed ? "used" : isReady ? "ready" : "unavailable");
      elements.itemButton.title = task
        ? task.itemUsed
          ? `「${task.title}」には道具を使っています`
          : `「${task.title}」に使う道具を選びます`
        : canAfford
          ? "名声は足りています。隊務を選ぶと道具を使えます"
          : "道具を選べます。先に隊務を選ぶと使用できます";
    }
  }

  function setCommandVisual(button, stateName) {
    const small = button.querySelector("small");
    const styles = {
      ready: {
        background: "#b0232d",
        border: "#b0232d",
        color: "#fffaf0",
        small: "#fff3c5"
      },
      unavailable: {
        background: "#f5eddb",
        border: "#d5c6a8",
        color: "#60706b",
        small: "#8e8170"
      },
      used: {
        background: "#e0f2df",
        border: "#174f43",
        color: "#174f43",
        small: "#174f43"
      }
    }[stateName];
    button.style.backgroundColor = styles.background;
    button.style.borderColor = styles.border;
    button.style.color = styles.color;
    if (small) small.style.color = styles.small;
  }

  function renderItemDialog() {
    if (!elements.itemOptions) return;
    const taskIndex = selectedTaskArrayIndex();
    const task = taskIndex >= 0 ? state.activeTasks[taskIndex] : null;
    if (elements.itemDialogTask) {
      elements.itemDialogTask.textContent = task
        ? task.itemUsed
          ? `選択中: ${task.title}（${task.itemName || "道具"} 使用済み）`
          : `選択中: ${task.title}`
        : "先に隊務札を選ぶと、その隊務に道具を使えます。";
    }
    elements.itemOptions.replaceChildren(
      ...ITEM_CATALOG.map((item) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "item-choice";
        const blocked = !task || task.itemUsed || state.scores.fame < item.cost;
        button.disabled = blocked;
        button.addEventListener("click", () => applySelectedItem(item.id));

        const name = document.createElement("strong");
        name.textContent = item.name;
        const cost = document.createElement("span");
        cost.className = "item-cost";
        cost.textContent = `名声${item.cost}`;
        const label = document.createElement("span");
        label.className = "item-label";
        label.textContent = item.label;
        const text = document.createElement("small");
        text.textContent = blocked ? itemBlockedReason(task, item) : item.text;
        button.append(name, cost, label, text);
        return button;
      })
    );
  }

  function itemBlockedReason(task, item) {
    if (!task) return "先に隊務札を選択してください。";
    if (task.itemUsed) return `この隊務には${task.itemName || "道具"}を使っています。`;
    if (state.scores.fame < item.cost) return `名声があと${item.cost - state.scores.fame}必要です。`;
    return item.text;
  }

  function renderTrainingDialog() {
    if (!elements.trainingOptions) return;
    const canAfford = state.scores.morale >= TRAINING_COST;
    if (elements.trainingDialogText) {
      elements.trainingDialogText.textContent = canAfford
        ? `士気${TRAINING_COST}を使って、鍛錬する隊士を選んでください。`
        : `鍛錬には士気${TRAINING_COST}が必要です。今の士気は${state.scores.morale}です。`;
    }
    elements.trainingOptions.replaceChildren(
      ...state.officers.map((officer) => {
        const trained = Boolean(state.trainedOfficerIds[officer.id]);
        const before = officer.stats;
        const after = officerDisplayStats(officer, true);
        const button = document.createElement("button");
        button.type = "button";
        button.className = ["training-choice", officerClass(officer), trained ? "trained" : ""].filter(Boolean).join(" ");
        button.disabled = trained || !canAfford;
        button.addEventListener("click", () => applyTraining(officer.id));

        const art = document.createElement("img");
        art.src = `./assets/officers/${officer.id}.svg`;
        art.alt = "";
        art.loading = "eager";
        art.decoding = "async";

        const body = document.createElement("span");
        body.className = "training-body";
        const name = document.createElement("strong");
        name.textContent = officer.name;
        const traits = document.createElement("span");
        traits.className = "training-traits";
        traits.textContent = officer.traits.map((trait) => TAG_META[trait]?.label || TAGS[trait]).join("・");
        const stats = document.createElement("span");
        stats.className = "training-stats";
        SCORE_KEYS.forEach((key) => {
          const stat = document.createElement("span");
          stat.innerHTML = `<em>${SCORE_LABELS[key]}</em><span class="training-before">${before[key]}</span><i aria-hidden="true">→</i><b>${after[key]}</b>`;
          stat.setAttribute("aria-label", `${SCORE_LABELS[key]} ${before[key]}から${after[key]}`);
          stats.append(stat);
        });
        const note = document.createElement("small");
        note.textContent = trainingBlockedReason(officer) || `以後、この隊士のカード数字と隊務得点が+${TRAINING_BONUS}されます。`;
        body.append(name, traits, stats, note);

        const cost = document.createElement("span");
        cost.className = "training-cost";
        cost.textContent = trained ? "鍛錬済" : `士気${TRAINING_COST}`;
        button.append(art, body, cost);
        return button;
      })
    );
  }

  function trainingBlockedReason(officer) {
    if (state.trainedOfficerIds[officer.id]) return "この隊士は鍛錬済みです。";
    if (state.scores.morale < TRAINING_COST) return `士気があと${TRAINING_COST - state.scores.morale}必要です。`;
    return "";
  }

  function updateResultFlash() {
    if (!elements.resultFlash) return;
    elements.gameApp?.classList.toggle("has-result-flash", Boolean(state.lastAction));
    if (!state.lastAction) {
      elements.resultFlash.hidden = true;
      return;
    }
    elements.resultFlash.hidden = false;
    elements.flashTitle.textContent = state.lastAction.strongMatch ? "大成功" : "隊務完了";
    elements.flashText.textContent = `${state.lastAction.officerName}が対応。${scoreDeltaText(state.lastAction.values)}${actionExtraText(state.lastAction)}`;
    elements.resultFlash.classList.toggle("big-success", Boolean(state.lastAction.strongMatch));
  }

  function playMotionScene(action, onDone) {
    if (!action || !elements.motionScene) {
      if (onDone) onDone();
      return;
    }
    window.clearTimeout(motionTimerId);
    motionDoneCallback = onDone || null;
    state.resolving = true;
    state.motionCanSkipAt = performance.now() + 120;
    elements.gameApp.classList.add("resolving");
    elements.motionScene.classList.toggle("big-success", Boolean(action.strongMatch));
    elements.motionScene.classList.toggle("chain-success", Boolean(action.chainMatch));
    elements.motionOfficer.textContent = action.officerName;
    elements.motionTask.textContent = action.taskTitle;
    elements.motionScore.textContent = `${action.strongMatch ? "大成功 " : ""}${action.chainMatch ? `連携${action.chainCount} ` : ""}${scoreDeltaText(action.values)}${actionExtraText(action)}`;
    if (elements.motionBackdrop) elements.motionBackdrop.hidden = false;
    elements.motionScene.hidden = false;
    elements.motionScene.classList.remove("play");
    elements.motionScene.offsetHeight;
    elements.motionScene.classList.add("play");
    animateScoreBumps(action.values);
    motionTimerId = window.setTimeout(completeMotionScene, motionDuration(action));
  }

  function completeMotionScene() {
    if (!state?.resolving && elements.motionScene?.hidden) return;
    window.clearTimeout(motionTimerId);
    if (elements.motionBackdrop) elements.motionBackdrop.hidden = true;
    elements.motionScene.hidden = true;
    elements.motionScene.classList.remove("play");
    elements.motionScene.classList.remove("big-success");
    elements.motionScene.classList.remove("chain-success");
    elements.gameApp.classList.remove("resolving");
    state.resolving = false;
    state.motionCanSkipAt = 0;
    const done = motionDoneCallback;
    motionDoneCallback = null;
    if (done) done();
  }

  function motionDuration(action) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return 650;
    return action?.strongMatch ? BIG_SUCCESS_DURATION_MS : MOTION_DURATION_MS;
  }

  function animateScoreBumps(values) {
    const scoreElements = {
      security: elements.securityText,
      morale: elements.moraleText,
      fame: elements.fameText
    };
    SCORE_KEYS.forEach((key) => {
      const element = scoreElements[key];
      if (!element || values[key] <= 0) return;
      element.classList.remove("score-bump");
      element.offsetHeight;
      element.classList.add("score-bump");
    });
  }

  function renderTasks() {
    elements.taskGrid.replaceChildren(
      ...state.activeTasks.map((task, index) => {
        const button = document.createElement("button");
        button.type = "button";
        const primaryTag = task.tags[0];
        const affinity = selectedAffinity(task);
        const chain = chainInfo(task);
        const route = routeMatchInfo(task);
        const selected = task.instanceId === state.selectedTaskInstanceId;
        button.className = [
          "task-card",
          "duty-card",
          TAG_META[primaryTag]?.className || "",
          selected ? "selected-target" : "",
          task.isClimax ? "climax-task" : "",
          task.remaining <= 1 ? "deadline-now" : "",
          affinity >= 1 ? "good-match" : "",
          state.selectedOfficerId && affinity === 0 ? "low-match" : ""
        ].filter(Boolean).join(" ");
        button.disabled = state.finished || state.resolving;
        button.addEventListener("click", () => assignTask(index));

        const crest = document.createElement("div");
        crest.className = "task-crest";
        crest.setAttribute("aria-hidden", "true");
        crest.textContent = TAG_META[primaryTag]?.icon || "札";

        const artWrap = document.createElement("div");
        artWrap.className = "card-art-wrap";

        const art = document.createElement("div");
        art.className = `card-art art-${primaryTag}`;
        art.setAttribute("aria-hidden", "true");

        const header = document.createElement("div");
        header.className = "card-header";

        const place = document.createElement("span");
        place.className = "task-place";
        place.textContent = task.place;

        const kind = document.createElement("span");
        kind.className = "card-kind";
        kind.textContent = task.isClimax ? "山場札" : `${TAG_META[primaryTag]?.label || "隊務"}系`;
        header.append(place);
        artWrap.append(art, kind);

        const title = document.createElement("h3");
        title.className = "task-title";
        title.textContent = task.title;

        const text = document.createElement("p");
        text.className = "task-text";
        text.textContent = task.text;

        const summary = document.createElement("p");
        summary.className = "task-summary";
        summary.textContent = taskSummary(task, affinity);

        const prepBadge = document.createElement("div");
        prepBadge.className = "prep-badge";
        prepBadge.textContent = "山場準備 +1";

        const tags = document.createElement("div");
        tags.className = "tag-row";
        task.tags.forEach((tag) => tags.append(createTag(TAGS[tag])));
        if (task.isClimax) {
          tags.append(createTag("山場札", "climax"));
        }
        if (task.remaining <= 1) {
          tags.append(createTag("信用減", "urgent"));
        }
        if (task.remaining <= 1) {
          tags.append(createTag("土壇場+3", "fire"));
        }
        if (task.itemUsed) {
          tags.append(createTag(task.itemTag || task.itemName || "道具済", "item"));
        }
        if (chain.match) {
          tags.append(createTag(`連携+${chain.bonus}`, "chain"));
        }
        if (affinity >= 1) {
          tags.append(createTag("相性あり", "match"));
        }

        const rewards = document.createElement("div");
        rewards.className = "reward-line";
        const rewardValues = previewValues(task) || displayRewardValues(task);
        rewards.append(
          createReward("治安", rewardValues.security),
          createReward("士気", rewardValues.morale),
          createReward("名声", rewardValues.fame)
        );

        const penalty = document.createElement("p");
        penalty.className = "penalty-line";
        penalty.textContent = penaltyTimingText(task);

        button.append(crest, header, artWrap);
        if (route.match) {
          button.append(prepBadge);
        }
        button.append(title, text, summary, tags, rewards, penalty);
        return button;
      })
    );
  }

  function rewardTotal(task) {
    return SCORE_KEYS.reduce((total, key) => total + task.reward[key], 0);
  }

  function strongestReward(task) {
    return SCORE_KEYS.reduce((best, key) => (
      task.reward[key] > task.reward[best] ? key : best
    ), SCORE_KEYS[0]);
  }

  function taskSummary(task, affinity) {
    const bestKey = strongestReward(task);
    const rewardValues = displayRewardValues(task);
    const reward = `${SCORE_LABELS[bestKey]}+${rewardValues[bestKey]}`;
    const need = task.tags.map((tag) => TAGS[tag]).join("・");
    const urgent = task.remaining <= 1 ? ` / 今他で${trustDamageText(trustDamageFor(task))}` : "";
    const preview = previewValues(task);
    const previewText = preview ? `見込み ${compactScoreText(preview)}` : "";
    const chain = chainInfo(task);
    const chainText = chain.match ? ` / 連携 ${chain.label}+${chain.bonus}` : "";
    const route = routeMatchInfo(task);
    const routeText = route.match ? ` / この札で山場準備+1` : "";
    const climaxText = task.isClimax ? ` / 山場札: 準備${state.routeProgress}/3で加点` : "";
    const fireText = task.remaining <= 1 ? " / 土壇場+3" : "";
    const itemText = task.itemName ? ` / ${task.itemName}` : "";
    if (!state.selectedOfficerId) return `必要: ${need} / ${reward}${itemText}${routeText}${climaxText}${chainText}${fireText}${urgent}`;
    const matched = matchedTraitLabels(task);
    if (affinity > 0) return `得意一致: ${matched}${itemText}${routeText}${climaxText}${chainText}${fireText} / ${previewText}${urgent}`;
    return `系統不一致${itemText}${routeText}${climaxText}${chainText}${fireText} / ${previewText}${urgent}`;
  }

  function penaltyTimingText(task) {
    const loss = trustDamageText(trustDamageFor(task));
    const shield = task.itemPenaltyShield ? "（根回しで半減）" : "";
    return task.remaining <= 1
      ? `今他を選ぶと信用低下: ${loss}${shield}`
      : `あと${task.remaining}手後に信用低下: ${loss}${shield}`;
  }

  function displayRewardValues(task) {
    const values = { ...task.reward };
    if (task.itemRewardBonus) {
      values[strongestReward(task)] += task.itemRewardBonus;
    }
    return values;
  }

  function previewValues(task) {
    const officer = selectedOfficer();
    if (!officer) return null;
    const useAbility = state.pendingAbilityOfficerId === officer.id && !state.usedAbilityByOfficerId[officer.id];
    return resolveAssignment(officer, task, useAbility).values;
  }

  function compactScoreText(values) {
    return SCORE_KEYS
      .filter((key) => values[key] > 0)
      .map((key) => `${SCORE_LABELS[key]}+${values[key]}`)
      .join("・");
  }

  function chainInfo(task) {
    const previousTags = state?.lastTaskTags || [];
    if (!previousTags.length) {
      return { match: false, bonus: 0, count: 0, label: "" };
    }
    const sharedTags = task.tags.filter((tag) => previousTags.includes(tag));
    if (!sharedTags.length) {
      return { match: false, bonus: 0, count: 0, label: "" };
    }
    const count = Math.min(3, (state.chainCount || 0) + 1);
    return {
      match: true,
      bonus: count + 1,
      count,
      label: sharedTags.map((tag) => TAGS[tag]).join("・")
    };
  }

  function actionExtraText(action) {
    const extras = [];
    if (action.chainMatch) extras.push(`連携+${action.chainBonus}`);
    if (action.climaxBonus) extras.push(`山場+${action.climaxBonus}`);
    if (action.fireBonus) extras.push(`土壇場+${action.fireBonus}`);
    if (action.itemBonus) extras.push(`${action.itemName || "道具"}+${action.itemBonus}`);
    if (action.trainingBonus) extras.push(`鍛錬+${action.trainingBonus}`);
    if (action.tempoGain) extras.push("期限+1");
    return extras.length ? ` / ${extras.join(" / ")}` : "";
  }

  function routeMatchInfo(task) {
    const route = state?.stage?.route || [];
    const expectedTag = route[state?.routeStep || 0];
    return {
      match: Boolean(expectedTag && task.tags.includes(expectedTag)),
      tag: expectedTag || ""
    };
  }

  function selectedTaskArrayIndex() {
    if (!state.selectedTaskInstanceId) return -1;
    return state.activeTasks.findIndex((task) => task.instanceId === state.selectedTaskInstanceId);
  }

  function matchedTraitLabels(task) {
    const officer = selectedOfficer();
    if (!officer) return "";
    return task.tags
      .filter((tag) => officer.traits.includes(tag))
      .map((tag) => TAGS[tag])
      .join("・");
  }

  function selectedOfficer() {
    if (!state.selectedOfficerId) return null;
    return state.officers.find((item) => item.id === state.selectedOfficerId) || null;
  }

  function renderOfficers() {
    elements.officerHand.replaceChildren(
      ...state.officers.map((officer) => {
        const card = document.createElement("article");
        const selected = officer.id === state.selectedOfficerId;
        const abilityArmed = officer.id === state.pendingAbilityOfficerId;
        const trained = Boolean(state.trainedOfficerIds?.[officer.id]);
        card.className = [
          "officer-card",
          "person-card",
          officerClass(officer),
          selected ? "selected-officer" : "",
          abilityArmed ? "ability-armed" : "",
          trained ? "trained-officer" : "",
          state.usedAbilityByOfficerId[officer.id] ? "ability-used" : ""
        ].filter(Boolean).join(" ");

        const selectButton = document.createElement("button");
        selectButton.type = "button";
        selectButton.className = "officer-select";
        selectButton.disabled = state.finished || state.resolving;
        selectButton.addEventListener("click", () => selectOfficer(officer.id));

        const officerArt = document.createElement("img");
        officerArt.className = `officer-art art-${officer.traits[0]}`;
        officerArt.src = `./assets/officers/${officer.id}.svg`;
        officerArt.alt = `${officer.name}の隊士絵`;
        officerArt.loading = "eager";
        officerArt.decoding = "async";

        const meta = document.createElement("div");
        meta.className = "officer-meta";

        const role = document.createElement("span");
        role.className = "officer-role";
        role.textContent = officer.role;

        const name = document.createElement("h3");
        name.className = "officer-name";
        const fullName = document.createElement("span");
        fullName.className = "name-full";
        fullName.textContent = officer.name;
        const shortName = document.createElement("span");
        shortName.className = "name-short";
        shortName.textContent = officer.name.slice(0, 2);
        name.append(fullName, shortName);

        const text = document.createElement("p");
        text.className = "officer-text";
        text.textContent = officer.text;

        const bars = document.createElement("div");
        bars.className = "officer-bars";
        officer.traits.forEach((trait) => {
          const chip = document.createElement("span");
          chip.className = "bar-chip";
          chip.textContent = TAGS[trait];
          bars.append(chip);
        });
        if (trained) {
          const chip = document.createElement("span");
          chip.className = "bar-chip trained-chip";
          chip.textContent = "鍛錬済";
          bars.append(chip);
        }

        const stats = document.createElement("div");
        stats.className = "officer-stats";
        const displayStats = officerDisplayStats(officer, trained);
        stats.append(
          createStatChip("治", displayStats.security, trained ? "trained-stat" : ""),
          createStatChip("士", displayStats.morale, trained ? "trained-stat" : ""),
          createStatChip("名", displayStats.fame, trained ? "trained-stat" : "")
        );

        const top = document.createElement("div");
        top.className = "officer-topline";
        top.append(role);

        meta.append(top, name, text, bars, stats);
        selectButton.append(officerArt, meta);

        const ability = document.createElement("button");
        ability.type = "button";
        ability.className = abilityArmed ? "ability-button armed" : "ability-button";
        ability.disabled = state.finished || Boolean(state.usedAbilityByOfficerId[officer.id]);
        ability.textContent = state.usedAbilityByOfficerId[officer.id]
          ? `奥義済: ${officer.ability.name}`
          : abilityArmed
            ? `奥義待機: ${officer.ability.name}`
            : `奥義: ${officer.ability.name}`;
        ability.title = officer.ability.text;
        ability.addEventListener("click", () => armAbility(officer.id));

        card.append(selectButton, ability);
        return card;
      })
    );
  }

  function selectedAffinity(task) {
    if (!state.selectedOfficerId) return 0;
    const officer = selectedOfficer();
    if (!officer) return 0;
    return task.tags.filter((tag) => officer.traits.includes(tag)).length;
  }

  function officerClass(officer) {
    const primaryTrait = officer.traits[0];
    return TAG_META[primaryTrait]?.className || "";
  }

  function officerDisplayStats(officer, trained = Boolean(state?.trainedOfficerIds?.[officer.id])) {
    if (!trained) return officer.stats;
    return {
      security: officer.stats.security + TRAINING_BONUS,
      morale: officer.stats.morale + TRAINING_BONUS,
      fame: officer.stats.fame + TRAINING_BONUS
    };
  }

  function renderLog() {
    const entries = state.log.length ? state.log : ["浅葱の袖が揃い、隊務が始まる。"];
    elements.logList.replaceChildren(
      ...entries.slice(0, 8).map((entry) => {
        const li = document.createElement("li");
        li.textContent = entry;
        return li;
      })
    );
  }

  function renderRecords() {
    const saved = storage();
    const bestScores = saved.bestScores || {};
    const topScoreLine = SCORE_KEYS
      .filter((key) => bestScores[key])
      .map((key) => `${SCORE_LABELS[key]}${bestScores[key]}`)
      .join(" / ");
    elements.bestRank.textContent = saved.bestRank ? `${saved.bestRank} ${saved.bestTotal}点` : "未記録";
    elements.playCount.textContent = saved.playCount || 0;
    elements.lastResult.textContent = saved.lastResult || "なし";
    if (elements.bestScores) {
      elements.bestScores.textContent = topScoreLine || "未記録";
    }
    renderStartRecord();
  }

  function renderStartRecord() {
    if (!elements.startRecord) return;
    const saved = storage();
    const best = saved.bestRank ? `${saved.bestTotal}点` : "全体未記録";
    if (startStep === "difficulty") {
      const count = saved.playCount || 0;
      elements.startRecord.textContent = `全体最高: ${best} / プレイ回数: ${count}`;
      return;
    }
    const modeRecord = saved.records?.[`${selectedStageId}:${selectedDifficultyId}`];
    const modeBest = modeRecord?.bestTotal ? `${selectedStage().shortTitle}・${selectedDifficulty().title} ${modeRecord.bestTotal}点` : `${selectedStage().shortTitle}・${selectedDifficulty().title} 未記録`;
    const count = saved.playCount || 0;
    elements.startRecord.textContent = `全体最高: ${best} / ${modeBest} / プレイ回数: ${count}`;
  }

  function renderStartOptions() {
    renderOptionGroup(elements.stageOptions, stageDeck, selectedStageId, (id) => {
      selectedStageId = id;
      syncInitialOfficerSelection(true);
      renderStartOptions();
    });
    renderOptionGroup(elements.difficultyOptions, difficultyDeck, selectedDifficultyId, (id) => {
      selectedDifficultyId = id;
      renderStartOptions();
    });
    if (elements.stageDescription) {
      const stageTraits = selectedStage().route.map((tag) => TAG_META[tag]?.label || TAGS[tag]).join("→");
      elements.stageDescription.textContent = `${selectedStage().text} 山場準備: ${stageTraits}`;
    }
    if (elements.difficultyDescription) {
      elements.difficultyDescription.textContent = selectedDifficulty().text;
    }
    renderOfficerDraft();
    renderStartRecord();
    refreshStartLeaderboard();
  }

  function refreshStartLeaderboard(force = false) {
    if (startStep !== "difficulty") return;
    const stage = selectedStage();
    const difficulty = selectedDifficulty();
    const requestKey = `${stage.id}:${difficulty.id}`;
    if (!force && requestKey === startLeaderboardRequestKey) return;
    startLeaderboardRequestKey = requestKey;
    window.MibuLeaderboard?.showStartRanking({
      stageId: stage.id,
      stageTitle: stage.title,
      difficultyId: difficulty.id,
      difficultyTitle: difficulty.title,
      recordLabel: `${stage.shortTitle}・${difficulty.title}`
    });
  }

  function renderOfficerDraft() {
    if (!elements.officerDraft) return;
    syncInitialOfficerSelection();
    const preferred = stageDraftDefaults();
    elements.officerDraft.replaceChildren(
      ...officers.map((officer) => {
        const selected = selectedInitialOfficerIds.includes(officer.id);
        const stageFit = preferred.includes(officer.id);
        const button = document.createElement("button");
        button.type = "button";
        button.className = [
          "draft-officer-card",
          officerClass(officer),
          selected ? "selected" : "",
          stageFit ? "stage-fit" : ""
        ].filter(Boolean).join(" ");
        button.setAttribute("aria-pressed", selected ? "true" : "false");
        button.addEventListener("click", () => toggleInitialOfficer(officer.id));

        const art = document.createElement("img");
        art.src = `./assets/officers/${officer.id}.svg`;
        art.alt = "";
        art.loading = "eager";
        art.decoding = "async";

        const body = document.createElement("span");
        body.className = "draft-officer-body";
        const name = document.createElement("strong");
        name.textContent = officer.name;
        const role = document.createElement("em");
        role.textContent = officer.role;
        const traits = document.createElement("span");
        traits.textContent = officer.traits.map((trait) => TAG_META[trait]?.label || TAGS[trait]).join("・");
        const stats = document.createElement("small");
        stats.textContent = stageFit ? "舞台向き" : "選択可";
        body.append(name, role, traits, stats);
        button.append(art, body);
        return button;
      })
    );
    const selectedCount = selectedInitialOfficerIds.length;
    if (elements.draftCountText) {
      elements.draftCountText.textContent = `${selectedCount}/${HAND_SIZE}人`;
    }
    if (elements.draftDescription) {
      const names = selectedInitialOfficerIds
        .map((id) => officers.find((officer) => officer.id === id)?.name)
        .filter(Boolean)
        .join("・");
      const routeHint = selectedStage().route.map((tag) => TAG_META[tag]?.label || TAGS[tag]).join("・");
      elements.draftDescription.textContent = names
        ? `${names}で開始。${routeHint}を持つ隊士を入れると山場準備が進めやすい。`
        : "得意系統を見て、最初の3人を選んでください。";
    }
    if (elements.startRandomButton) {
      elements.startRandomButton.disabled = false;
    }
    if (elements.setupGameButton) {
      elements.setupGameButton.disabled = selectedCount !== HAND_SIZE;
    }
  }

  function renderOptionGroup(container, items, selectedId, onSelect) {
    if (!container) return;
    container.replaceChildren(
      ...items.map((item) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = item.id === selectedId ? "segment-button selected" : "segment-button";
        button.textContent = item.title;
        button.setAttribute("aria-pressed", item.id === selectedId ? "true" : "false");
        button.addEventListener("click", () => onSelect(item.id));
        return button;
      })
    );
  }

  function createTag(label, extraClass = "") {
    const span = document.createElement("span");
    span.className = extraClass ? `tag ${extraClass}` : "tag";
    span.textContent = label;
    return span;
  }

  function createReward(label, value) {
    const span = document.createElement("span");
    span.textContent = `${label} +${value}`;
    return span;
  }

  function createStatChip(label, value, extraClass = "") {
    const span = document.createElement("span");
    if (extraClass) span.className = extraClass;
    span.textContent = `${label}+${value}`;
    return span;
  }

  function scoreDeltaText(values) {
    return SCORE_KEYS
      .filter((key) => values[key] > 0)
      .map((key) => `${SCORE_LABELS[key]}+${values[key]}`)
      .join(" / ");
  }

  function showResult(rank, total) {
    elements.resultTitle.textContent = rank.title;
    elements.resultScore.textContent = `${total}点`;
    elements.resultText.textContent = `${state.endReason || "百手満了"}。${state.stage.title}。${rank.text}`;
    elements.resultRecord.textContent = resultRecordText(total);
    elements.resultRecord.classList.toggle("record-new", Boolean(state.resultMeta?.isGlobalBest || state.resultMeta?.isStageBest));
    elements.resultBreakdown.replaceChildren(
      createBreakdown("治安", state.scores.security),
      createBreakdown("士気", state.scores.morale),
      createBreakdown("名声", state.scores.fame),
      createBreakdown("信用", `${state.trust}/${TRUST_MAX}`),
      createBreakdown("ボーナス", state.goalBonus || 0),
      createBreakdown("難度", state.difficultyBonus || 0)
    );
    elements.resultHighlights.replaceChildren(...resultHighlightItems());
    elements.resultAdvice.replaceChildren(...resultAdviceItems());
    window.MibuLeaderboard?.showResult(state.leaderboardPayload || createLeaderboardPayload(rank, total));
    if (typeof elements.resultDialog.showModal === "function") {
      elements.resultDialog.showModal();
    }
  }

  function shareResultToX() {
    if (!state?.finished) return;
    const total = totalScore();
    const endReason = state.endReason || "百手満了";
    const visibleRank = document.querySelector("#leaderboardOwnRank strong")?.textContent.trim() || "";
    const rankText = visibleRank && !["確認中", "取得できませんでした"].includes(visibleRank)
      ? visibleRank
      : "順位確認中";
    const pageUrl = new URL(window.location.href);
    pageUrl.search = "";
    pageUrl.hash = "";
    const text = [
      `新選組の隊務パズル『壬生の隊務札』で${total}点、${rankText}！`,
      "",
      `${state.stage.shortTitle}・${state.difficulty.title}で隊士を采配し、信用が尽きる前に京の隊務を収めました。`,
      `治安${state.scores.security}・士気${state.scores.morale}・名声${state.scores.fame} / ${endReason}`,
      "あなたなら何点まで伸ばせますか？",
      "",
      "#壬生の隊務札 #新選組",
      pageUrl.toString()
    ].join("\n");
    const shareUrl = new URL("https://x.com/intent/post");
    shareUrl.searchParams.set("text", text);
    window.open(shareUrl.toString(), "_blank", "noopener,noreferrer");
  }

  function resultRecordText(total) {
    const meta = state.resultMeta || {};
    if (meta.isGlobalBest) {
      return meta.previousGlobalBest
        ? `全体自己ベスト更新 +${meta.globalImprovement}点。${meta.recordLabel}でも新記録です。`
        : `初回記録 ${total}点。${meta.recordLabel}の基準点になりました。`;
    }
    if (meta.isStageBest) {
      return meta.previousStageBest
        ? `${meta.recordLabel} 新記録 +${meta.stageImprovement}点。`
        : `${meta.recordLabel} 初記録。`;
    }
    const gap = Math.max(0, (meta.previousStageBest || 0) - total);
    return gap ? `${meta.recordLabel} の自己ベストまであと${gap}点。` : `${meta.recordLabel} の記録を保存しました。`;
  }

  function resultHighlightItems() {
    const items = [
      createResultMetric("最大連携", `${state.stats.maxChain || 0}`, state.stats.chainScore ? `連携加点 +${state.stats.chainScore}` : "連携なし"),
      createResultMetric("土壇場", `${state.stats.fireCount}`, state.stats.fireScore ? `土壇場加点 +${state.stats.fireScore}` : "なし"),
      createResultMetric("山場", state.stats.climaxCleared ? "成功" : "未対応", state.stats.climaxBonus ? `準備効果 +${state.stats.climaxBonus}` : `準備 ${state.routeProgress}/3`),
      createResultMetric("采配", `${state.stats.trainings + state.stats.itemsUsed}`, state.stats.trainings || state.stats.itemsUsed ? `士気${state.stats.moraleSpent}・名声${state.stats.fameSpent}使用` : "未使用"),
      createResultMetric("信用低下", `${state.stats.trustLost}`, state.stats.penalties ? `${state.stats.penalties}件` : "なし")
    ];
    return items;
  }

  function resultAdviceItems() {
    const tips = [];
    if (state.stats.routeProgress < 3) {
      tips.push(`山場準備をあと${3 - state.stats.routeProgress}つ進めると、10手番ごとの山場加点が伸びます。`);
    }
    if (state.stats.maxChain < 3) {
      tips.push("同じ系統を続けると連携が伸び、自己ベストを狙いやすくなります。");
    }
    if (state.stats.penalties > 0) {
      const worst = [...state.stats.missedTasks].sort((a, b) => b.total - a.total)[0];
      tips.push(worst ? `次は「${worst.title}」の信用低下 ${worst.text} を避けたい。` : "信用低下を減らすと長く続けられます。");
    }
    if (!goalAchieved()) {
      tips.push(`ボーナス「${state.goal.shortText}」を達成すると +${state.goal.bonus}点。`);
    }
    if (!tips.length) {
      tips.push("連携を維持しながら、より高い難易度で同じ舞台の更新を狙えます。");
    }
    return tips.slice(0, 2).map(createAdviceLine);
  }

  function createResultMetric(label, value, note) {
    const div = document.createElement("div");
    div.className = "result-metric";
    const strong = document.createElement("strong");
    strong.textContent = value;
    const span = document.createElement("span");
    span.textContent = label;
    const small = document.createElement("small");
    small.textContent = note;
    div.append(span, strong, small);
    return div;
  }

  function createAdviceLine(text) {
    const p = document.createElement("p");
    p.textContent = text;
    return p;
  }

  function createBreakdown(label, value) {
    const div = document.createElement("div");
    const span = document.createElement("span");
    span.textContent = label;
    const strong = document.createElement("strong");
    strong.textContent = value;
    div.append(span, strong);
    return div;
  }

  function setup() {
    [
      "daySeed",
      "startScreen",
      "gameApp",
      "difficultyStep",
      "setupStep",
      "startRandomButton",
      "setupBackButton",
      "setupGameButton",
      "startDailyButton",
      "startRecord",
      "stageOptions",
      "stageDescription",
      "difficultyOptions",
      "difficultyDescription",
      "officerDraft",
      "draftCountText",
      "draftDescription",
      "turnText",
      "trustText",
      "trustFill",
      "securityText",
      "moraleText",
      "fameText",
      "trainButton",
      "itemButton",
      "stageText",
      "routeText",
      "eventTitle",
      "eventText",
      "goalText",
      "guideText",
      "helpButton",
      "actionFeedback",
      "resultFlash",
      "flashTitle",
      "flashText",
      "motionScene",
      "motionBackdrop",
      "motionOfficer",
      "motionTask",
      "motionScore",
      "roundFlavor",
      "selectionHint",
      "taskGrid",
      "officerHand",
      "rerollButton",
      "newGameButton",
      "dailyButton",
      "titleButton",
      "bestRank",
      "bestScores",
      "playCount",
      "lastResult",
      "logList",
      "resultDialog",
      "helpDialog",
      "closeHelpButton",
      "resultTitle",
      "resultScore",
      "resultText",
      "resultRecord",
      "resultBreakdown",
      "resultHighlights",
      "resultAdvice",
      "closeResultButton",
      "againButton",
      "shareXButton",
      "itemDialog",
      "itemDialogTask",
      "itemOptions",
      "closeItemDialogButton",
      "trainingDialog",
      "trainingDialogText",
      "trainingOptions",
      "closeTrainingDialogButton"
    ].forEach((id) => {
      elements[id] = $(id);
    });

    elements.startRandomButton.addEventListener("click", () => {
      syncInitialOfficerSelection();
      showStartStep("setup");
      renderStartOptions();
    });
    elements.setupBackButton?.addEventListener("click", () => showStartStep("difficulty"));
    elements.setupGameButton?.addEventListener("click", () => startGame(randomSeed()));
    if (elements.startDailyButton) {
      elements.startDailyButton.addEventListener("click", () => startGame(todaySeed()));
    }
    elements.newGameButton?.addEventListener("click", () => startGame(randomSeed()));
    elements.dailyButton?.addEventListener("click", () => startGame(todaySeed()));
    elements.titleButton?.addEventListener("click", showStartScreen);
    elements.rerollButton.addEventListener("click", rerollTasks);
    elements.trainButton?.addEventListener("click", openTrainingDialog);
    elements.closeTrainingDialogButton?.addEventListener("click", () => elements.trainingDialog.close());
    elements.trainingDialog?.addEventListener("click", (event) => {
      if (event.target === elements.trainingDialog) {
        elements.trainingDialog.close();
      }
    });
    elements.itemButton?.addEventListener("click", openItemDialog);
    elements.closeItemDialogButton?.addEventListener("click", () => elements.itemDialog.close());
    elements.itemDialog?.addEventListener("click", (event) => {
      if (event.target === elements.itemDialog) {
        elements.itemDialog.close();
      }
    });
    elements.helpButton.addEventListener("click", () => {
      if (typeof elements.helpDialog.showModal === "function") {
        elements.helpDialog.showModal();
      }
    });
    elements.closeHelpButton.addEventListener("click", () => elements.helpDialog.close());
    elements.helpDialog.addEventListener("click", (event) => {
      if (event.target === elements.helpDialog) {
        elements.helpDialog.close();
      }
    });
    elements.motionScene.addEventListener("click", completeMotionScene);
    elements.motionBackdrop?.addEventListener("click", completeMotionScene);
    elements.gameApp.addEventListener("click", (event) => {
      if (!state?.resolving || performance.now() < (state.motionCanSkipAt || 0)) return;
      if (event.target.closest("#motionScene")) return;
      completeMotionScene();
    });
    elements.motionScene.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        completeMotionScene();
      }
    });
    elements.closeResultButton.addEventListener("click", (event) => {
      event.preventDefault();
      elements.resultDialog.close("close");
      showStartScreen();
    });
    elements.againButton.addEventListener("click", (event) => {
      event.preventDefault();
      elements.resultDialog.close();
      startGame(randomSeed());
    });
    elements.shareXButton?.addEventListener("click", shareResultToX);

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").catch(() => {});
      });
    }

    elements.resultDialog.addEventListener("close", () => {
      if (elements.resultDialog.returnValue !== "again" && state?.finished) {
        showStartScreen();
      }
    });

    showStartScreen();
  }

  document.addEventListener("DOMContentLoaded", setup);
})();
