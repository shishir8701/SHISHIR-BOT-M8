const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const DATA_PATH = path.join(__dirname, "cache", "penalty_data.json");
const MAX_BET = 15000000; // Max Bet Limit: 15 Million

// Corrected Imgur Image Mapping
const ASSETS = {
  start: "https://i.imgur.com/7H6Pccu.jpeg",
  goal: "https://i.imgur.com/FYvmL0C.jpeg",
  saved: "https://i.imgur.com/IHZpeMD.jpeg",
  missed: "https://i.imgur.com/GhLqAQ1.jpeg",
};

// Unique Image Stream Fetcher
async function getStreamFromURL(url) {
  const cacheDir = path.join(__dirname, "cache");
  if (!fs.existsSync(cacheDir)) fs.mkdirpSync(cacheDir);

  const cachePath = path.join(cacheDir, `${Date.now()}_penalty.jpg`);

  const response = await axios({
    url,
    method: "GET",
    responseType: "arraybuffer",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
    },
  });

  fs.writeFileSync(cachePath, Buffer.from(response.data));
  const stream = fs.createReadStream(cachePath);

  stream.on("close", () => {
    if (fs.existsSync(cachePath)) {
      fs.unlinkSync(cachePath);
    }
  });

  return stream;
}

// Custom Font Transformer
function toBold(text) {
  const chars = {
    A: "𝐀",
    B: "𝐁",
    C: "𝐂",
    D: "𝐃",
    E: "𝐄",
    F: "𝐅",
    G: "𝐆",
    H: "𝐇",
    I: "𝐈",
    J: "𝐉",
    K: "𝐊",
    L: "𝐋",
    M: "𝐌",
    N: "𝐍",
    O: "𝐎",
    P: "𝐏",
    Q: "𝐐",
    R: "𝐑",
    S: "𝐒",
    T: "𝐓",
    U: "𝐔",
    V: "𝐕",
    W: "𝐖",
    X: "𝐗",
    Y: "𝐘",
    Z: "𝐙",
    a: "𝐚",
    b: "𝐛",
    c: "𝐜",
    d: "𝐝",
    e: "𝐞",
    f: "𝐟",
    g: "𝐠",
    h: "𝐡",
    i: "𝐢",
    j: "𝐣",
    k: "𝐤",
    l: "𝐥",
    m: "𝐦",
    n: "𝐧",
    o: "𝐨",
    p: "𝐩",
    q: "𝐪",
    r: "𝐫",
    s: "𝐬",
    t: "𝐭",
    u: "𝐮",
    v: "𝐯",
    w: "𝐰",
    x: "𝐱",
    y: "𝐲",
    z: "𝐳",
    0: "𝟎",
    1: "𝟏",
    2: "𝟐",
    3: "𝟑",
    4: "𝟒",
    5: "𝟓",
    6: "𝟔",
    7: "𝟕",
    8: "𝟖",
    9: "𝟗",
  };
  return text
    .split("")
    .map((c) => chars[c] || c)
    .join("");
}

function getStatsData() {
  if (!fs.existsSync(DATA_PATH)) {
    fs.mkdirpSync(path.dirname(DATA_PATH));
    fs.writeFileSync(DATA_PATH, JSON.stringify({}));
  }
  return fs.readJsonSync(DATA_PATH);
}

function saveStatsData(data) {
  fs.writeJsonSync(DATA_PATH, data, { spaces: 2 });
}

function formatMoney(amount) {
  if (amount >= 1e9) return (amount / 1e9).toFixed(1) + "B";
  if (amount >= 1e6) return (amount / 1e6).toFixed(1) + "M";
  if (amount >= 1e3) return (amount / 1e3).toFixed(1) + "k";
  return amount.toLocaleString();
}

function parseBet(str, userMoney) {
  if (!str) return null;
  str = str.toLowerCase();
  if (str === "all") return Math.min(userMoney, MAX_BET);
  let multiplier = 1;
  if (str.endsWith("k")) {
    multiplier = 1000;
    str = str.slice(0, -1);
  } else if (str.endsWith("m")) {
    multiplier = 1000000;
    str = str.slice(0, -1);
  } else if (str.endsWith("b")) {
    multiplier = 1000000000;
    str = str.slice(0, -1);
  }
  const val = parseFloat(str);
  return isNaN(val) ? null : Math.floor(val * multiplier);
}

module.exports = {
  config: {
    name: "penalty",
    version: "2.8.0",
    author: "ARIYAN",
    role: 0,
    shortDescription: { bn: "পেনাল্টি শুটআউট গেম" },
    category: "game",
    guide: { bn: "{pn} <bet_amount> | {pn} top [page]" },
  },

  onStart: async function ({ api, event, args, usersData }) {
    const { senderID, threadID, messageID } = event;
    const statsData = getStatsData();

    if (!statsData[senderID]) {
      statsData[senderID] = {
        wins: 0,
        total: 0,
        streak: 0,
        sessionWins: 0,
        sessionTotal: 0,
      };
    }

    // TOP RANKING LEADERBOARD
    if (args[0]?.toLowerCase() === "top") {
      let page = 1;
      if (args[1]?.toLowerCase() === "next") page = 2;
      else if (!isNaN(parseInt(args[1]))) page = parseInt(args[1]);

      const allUsers = Object.keys(statsData).map((id) => ({
        id,
        ...statsData[id],
        winRate:
          statsData[id].total > 0
            ? ((statsData[id].wins / statsData[id].total) * 100).toFixed(1)
            : "0.0",
      }));

      allUsers.sort(
        (a, b) =>
          b.wins - a.wins || parseFloat(b.winRate) - parseFloat(a.winRate)
      );

      const itemsPerPage = 10;
      const totalPages = Math.ceil(allUsers.length / itemsPerPage) || 1;
      if (page < 1) page = 1;
      if (page > totalPages) page = totalPages;

      const pageItems = allUsers.slice(
        (page - 1) * itemsPerPage,
        page * itemsPerPage
      );

      let leaderboardMsg = `👑 ${toBold("𝐏𝐞𝐧𝐚𝐥𝐭𝐲 𝐆𝐚𝐦𝐞 𝐆𝐥𝐨𝐛𝐚𝐥 𝐑𝐚𝐧𝐤𝐢𝐧𝐠")}:\n\n`;
      const medalMap = ["🥇", "🥈", "🥉"];

      for (let i = 0; i < pageItems.length; i++) {
        const u = pageItems[i];
        const rankNum = (page - 1) * itemsPerPage + i + 1;
        const prefix =
          rankNum <= 3
            ? medalMap[rankNum - 1]
            : `${toBold(rankNum.toString())}.`;
        const userName = await usersData.getName(u.id);

        leaderboardMsg += `${prefix} ${toBold(userName)}: ${toBold( "𝐖𝐢𝐧𝐬" )} ${toBold(u.wins.toString())} — ${toBold( u.winRate + "%" )} | 🔥 ${toBold(u.streak.toString())} ${toBold("𝐬𝐭𝐫𝐞𝐚𝐤")}\n\n`;
      }

      leaderboardMsg += `• ${toBold("𝐓𝐨𝐭𝐚𝐥 𝐩𝐚𝐠𝐞")}: [${toBold( page.toString() )}/${toBold(totalPages.toString())}]\n`;
      leaderboardMsg += `• ${toBold("𝐭𝐲𝐩𝐞 /𝐩𝐞𝐧𝐚𝐥𝐭𝐲 𝐭𝐨𝐩 𝐧𝐞𝐱𝐭 — 𝐧𝐞𝐱𝐭 𝐩𝐚𝐠𝐞")}\n`;
      leaderboardMsg += `• ${toBold( "𝐭𝐲𝐩𝐞 /𝐩𝐞𝐧𝐚𝐥𝐭𝐲 𝐭𝐨𝐩 [𝐩𝐚𝐠𝐞] — 𝐣𝐮𝐦𝐩 𝐭𝐨 𝐩𝐚𝐠𝐞" )}`;

      return api.sendMessage(leaderboardMsg, threadID, messageID);
    }

    // GAME START LOGIC
    const userMoney = await usersData.get(senderID, "money");
    const betAmount = parseBet(args[0], userMoney);

    if (!args[0] || betAmount === null || betAmount <= 0) {
      return api.sendMessage(
        `⚠️ ${toBold( "দয়া করে সঠিক বেট অ্যামাউন্ট লিখুন!" )}\n👉 উদাহরণ: /penalty 15m অথবা /penalty all`,
        threadID,
        messageID
      );
    }

    if (betAmount > MAX_BET) {
      return api.sendMessage(
        `❌ ${toBold(`সর্বোচ্চ বেট লিমিট $${formatMoney(MAX_BET)}!`)}`,
        threadID,
        messageID
      );
    }

    if (userMoney < betAmount) {
      return api.sendMessage(
        `❌ ${toBold( "আপনার পর্যাপ্ত ব্যালেন্স নেই!" )}\nবর্তমান ব্যালেন্স: $${formatMoney(userMoney)}`,
        threadID,
        messageID
      );
    }

    await usersData.set(senderID, userMoney - betAmount, "money");

    let imgStream;
    try {
      imgStream = await getStreamFromURL(ASSETS.start);
    } catch (e) {
      imgStream = null;
    }

    const startText = `⚽ ${toBold("𝐒𝐮𝐝𝐝𝐞𝐧-𝐃𝐞𝐚𝐭𝐡 𝐏𝐞𝐧𝐚𝐥𝐭𝐲 𝐒𝐡𝐨𝐨𝐭𝐨𝐮𝐭!")} 💰 ${toBold("𝐁𝐞𝐭")}: $${formatMoney(betAmount)} 🎲 ${toBold("𝐖𝐢𝐧 𝐌𝐮𝐥𝐭𝐢𝐩𝐥𝐢𝐞𝐫")}: 1.8x – 4.5x (${toBold("𝐑𝐚𝐧𝐝𝐨𝐦")}) ✉ ${toBold("𝐑𝐞𝐩𝐥𝐲 𝐰𝐢𝐭𝐡 𝐲𝐨𝐮𝐫 𝐬𝐡𝐨𝐭 𝐝𝐢𝐫𝐞𝐜𝐭𝐢𝐨𝐧")}: 👉 left | right | middle | left corner | right corner`;

    const msgObj = imgStream
      ? { body: startText, attachment: imgStream }
      : { body: startText };

    return api.sendMessage(
      msgObj,
      threadID,
      (err, info) => {
        if (err) return;
        global.GoatBot.onReply.set(info.messageID, {
          commandName: this.config.name,
          messageID: info.messageID,
          author: senderID,
          bet: betAmount,
        });
      },
      messageID
    );
  },

  onReply: async function ({ api, event, Reply, usersData }) {
    const { senderID, threadID, messageID, body } = event;

    if (senderID !== Reply.author) return;

    // AUTO-DELETE MESSAGES
    try {
      api.unsendMessage(messageID);
      api.unsendMessage(Reply.messageID);
    } catch (e) {}

    const validDirections = [
      "left",
      "right",
      "middle",
      "left corner",
      "right corner",
    ];
    const userChoice = body?.toLowerCase().trim();

    if (!validDirections.includes(userChoice)) {
      return api.sendMessage(
        `⚠️ ${toBold( "অবৈধ দিক!" )} দয়া করে left, right, middle, left corner, অথবা right corner নির্বাচন করুন।`,
        threadID
      );
    }

    const statsData = getStatsData();
    const userStats = statsData[senderID] || {
      wins: 0,
      total: 0,
      streak: 0,
      sessionWins: 0,
      sessionTotal: 0,
    };

    // Outcome Roll: 45% Goal, 30% Saved, 25% Missed
    const roll = Math.random();
    let outcome = "missed";
    if (roll < 0.45) outcome = "goal";
    else if (roll < 0.75) outcome = "saved";

    userStats.total += 1;
    userStats.sessionTotal += 1;

    let resultMsg = "";
    const bet = Reply.bet;

    if (outcome === "goal") {
      const multiplier = parseFloat(
        (Math.random() * (4.5 - 1.8) + 1.8).toFixed(2)
      );
      const winnings = Math.floor(bet * multiplier);

      const currentBalance = await usersData.get(senderID, "money");
      await usersData.set(senderID, currentBalance + winnings, "money");

      userStats.wins += 1;
      userStats.sessionWins += 1;
      userStats.streak += 1;

      const winRate = (
        (userStats.sessionWins / userStats.sessionTotal) *
        100
      ).toFixed(1);

      resultMsg = `🎉 ${toBold("𝐆𝐎𝐀𝐋! 𝐖𝐡𝐚𝐭 𝐚 𝐬𝐭𝐮𝐧𝐧𝐢𝐧𝐠 𝐬𝐭𝐫𝐢𝐤𝐞!")} 🎯 ${toBold("𝐋𝐮𝐜𝐤𝐲 𝐌𝐮𝐥𝐭𝐢𝐩𝐥𝐢𝐞𝐫")}: ${multiplier}x 💰 ${toBold("𝐖𝐨𝐧")}: $${formatMoney(winnings)} 🎯 ${toBold("𝐒𝐞𝐬𝐬𝐢𝐨𝐧 𝐖𝐢𝐧 𝐑𝐚𝐭𝐞")}: ${winRate}% (${userStats.sessionWins}/${ userStats.sessionTotal }) 🔥 ${toBold("𝐒𝐭𝐫𝐞𝐚𝐤")}: ${userStats.streak}`;
    } else if (outcome === "saved") {
      userStats.streak = 0;
      const winRate = (
        (userStats.sessionWins / userStats.sessionTotal) *
        100
      ).toFixed(1);

      resultMsg = `🧤 ${toBold("𝐒𝐀𝐕𝐄𝐃! 𝐓𝐡𝐞 𝐠𝐨𝐚𝐥𝐤𝐞𝐞𝐩𝐞𝐫 𝐝𝐞𝐧𝐢𝐞𝐝 𝐲𝐨𝐮!")} 💸 ${toBold("𝐋𝐨𝐬𝐭")}: $${formatMoney(bet)} 🎯 ${toBold("𝐒𝐞𝐬𝐬𝐢𝐨𝐧 𝐖𝐢𝐧 𝐑𝐚𝐭𝐞")}: ${winRate}% (${userStats.sessionWins}/${ userStats.sessionTotal }) 🔥 ${toBold("𝐒𝐭𝐫𝐞𝐚𝐤")}: 0`;
    } else {
      userStats.streak = 0;
      const winRate = (
        (userStats.sessionWins / userStats.sessionTotal) *
        100
      ).toFixed(1);

      resultMsg = `❌ ${toBold("𝐌𝐈𝐒𝐒𝐄𝐃! 𝐓𝐡𝐞 𝐬𝐡𝐨𝐭 𝐰𝐞𝐧𝐭 𝐰𝐢𝐝𝐞!")} 💸 ${toBold("𝐋𝐨𝐬𝐭")}: $${formatMoney(bet)} 🎯 ${toBold("𝐒𝐞𝐬𝐬𝐢𝐨𝐧 𝐖𝐢𝐧 𝐑𝐚𝐭𝐞")}: ${winRate}% (${userStats.sessionWins}/${ userStats.sessionTotal }) 🔥 ${toBold("𝐒𝐭𝐫𝐞𝐚𝐤")}: 0`;
    }

    statsData[senderID] = userStats;
    saveStatsData(statsData);

    let imgStream;
    try {
      imgStream = await getStreamFromURL(ASSETS[outcome]);
    } catch (e) {
      imgStream = null;
    }

    const payload = imgStream
      ? { body: resultMsg, attachment: imgStream }
      : { body: resultMsg };
    return api.sendMessage(payload, threadID);
  },
};
