"use strict";

const MAX_BET = 20000000;
const MAX_SPINS = 30;
const COOLDOWN_MS = 3 * 60 * 60 * 1000;
const WIN_CHANCE = 0.35;

const ITEMS = ["ЁЯТа", "ЁЯФ╖", "ЁЯФо", "тЬи", "ЁЯМЩ", "тнР", "ЁЯТО"];

const SPIN_FRAMES = 4;
const SPIN_DELAY_MS = 450;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function todayKey() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Dhaka",
  });
}

function fmt(num) {
  num = Number(num) || 0;

  if (num >= 1e12)
    return "$" + (num / 1e12).toFixed(2).replace(/\.00$/, "") + "T";

  if (num >= 1e9)
    return "$" + (num / 1e9).toFixed(2).replace(/\.00$/, "") + "B";

  if (num >= 1e6)
    return "$" + (num / 1e6).toFixed(2).replace(/\.00$/, "") + "M";

  if (num >= 1e3)
    return "$" + (num / 1e3).toFixed(2).replace(/\.00$/, "") + "K";

  return "$" + num.toLocaleString();
}

function fmtPlain(num) {
  num = Number(num) || 0;

  if (num >= 1e12) return (num / 1e12).toFixed(2).replace(/\.00$/, "") + "T";

  if (num >= 1e9) return (num / 1e9).toFixed(2).replace(/\.00$/, "") + "B";

  if (num >= 1e6) return (num / 1e6).toFixed(2).replace(/\.00$/, "") + "M";

  if (num >= 1e3) return (num / 1e3).toFixed(2).replace(/\.00$/, "") + "K";

  return Math.floor(num).toLocaleString();
}

function randomRow() {
  return Array.from(
    { length: 5 },
    () => ITEMS[Math.floor(Math.random() * ITEMS.length)]
  );
}

function spinFrameText(row) {
  return `ЁЯФо Spinning...\n\nтФГ ${row.join(" тФГ ")} тФГ`;
}

async function getDailyStats(usersData, uid) {
  const userData = (await usersData.get(uid)) || {};
  const stats = userData.data?.slotStats;

  if (!stats || stats.date !== todayKey()) {
    return {
      date: todayKey(),
      wonTotal: 0,
      lostTotal: 0,
      wins: 0,
      losses: 0,
      rounds: 0,
    };
  }

  return {
    date: stats.date,
    wonTotal: Number(stats.wonTotal) || 0,
    lostTotal: Number(stats.lostTotal) || 0,
    wins: Number(stats.wins) || 0,
    losses: Number(stats.losses) || 0,
    rounds: Number(stats.rounds) || 0,
  };
}

async function saveDailyStats(usersData, uid, stats) {
  const userData = (await usersData.get(uid)) || {};

  if (!userData.data) userData.data = {};

  userData.data.slotStats = stats;

  await usersData.set(uid, {
    data: userData.data,
  });
}

/* * ============================================================ * SPIN LEADERBOARD DATA * ============================================================ * * leaderboard: * { * wins: total wins, * losses: total losses, * rounds: total rounds, * wonMoney: total money won, * lostMoney: total money lost, * bestWin: biggest single win * } */

async function getSpinLeaderboardData(usersData, uid) {
  const userData = (await usersData.get(uid)) || {};

  const data =
    userData.data && typeof userData.data === "object" ? userData.data : {};

  const lb =
    data.spinLeaderboard && typeof data.spinLeaderboard === "object"
      ? data.spinLeaderboard
      : {};

  return {
    wins: Number(lb.wins) || 0,
    losses: Number(lb.losses) || 0,
    rounds: Number(lb.rounds) || 0,
    wonMoney: Number(lb.wonMoney) || 0,
    lostMoney: Number(lb.lostMoney) || 0,
    bestWin: Number(lb.bestWin) || 0,
  };
}

async function saveSpinLeaderboardData(usersData, uid, lb) {
  const userData = (await usersData.get(uid)) || {};

  if (!userData.data) userData.data = {};

  userData.data.spinLeaderboard = lb;

  await usersData.set(uid, {
    data: userData.data,
  });
}

/* * ============================================================ * BUILD REEL * ============================================================ */

function buildReel(tier) {
  const shuffled = [...ITEMS].sort(() => Math.random() - 0.5);

  const main = shuffled[0];

  const other = () => {
    let s;

    do {
      s = shuffled[Math.floor(Math.random() * shuffled.length)];
    } while (s === main);

    return s;
  };

  if (tier === "jackpot") return [main, main, main, main, main];

  if (tier === "quad") {
    const arr = [main, main, main, main, other()];

    return Math.random() < 0.5 ? arr : [arr[4], arr[0], arr[1], arr[2], arr[3]];
  }

  if (tier === "triple") {
    const start = [0, 1, 2][Math.floor(Math.random() * 3)];

    const arr = new Array(5).fill(null);

    for (let i = 0; i < 3; i++) arr[start + i] = main;

    for (let i = 0; i < 5; i++) {
      if (arr[i] === null) arr[i] = other();
    }

    return arr;
  }

  if (tier === "twoPair") {
    const patterns = [
      [0, 1, 3, 4],
      [0, 1, 2, 3],
      [1, 2, 3, 4],
    ];

    const [a, b, c, d] = patterns[Math.floor(Math.random() * patterns.length)];

    const secondary = other();

    const arr = new Array(5).fill(null);

    arr[a] = main;
    arr[b] = main;
    arr[c] = secondary;
    arr[d] = secondary;

    for (let i = 0; i < 5; i++) {
      if (arr[i] === null) arr[i] = other();
    }

    return arr;
  }

  if (tier === "onePair") {
    const patterns = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [0, 4],
    ];

    const [a, b] = patterns[Math.floor(Math.random() * patterns.length)];

    const arr = new Array(5).fill(null);

    arr[a] = main;
    arr[b] = main;

    for (let i = 0; i < 5; i++) {
      if (arr[i] === null) arr[i] = other();
    }

    return arr;
  }

  return shuffled.slice(0, 5);
}

function parseAmount(input) {
  if (typeof input !== "string") return input;

  const unit = input.slice(-1).toLowerCase();
  const value = parseFloat(input);

  if (unit === "k") return value * 1000;

  if (unit === "m") return value * 1000000;

  if (unit === "b") return value * 1000000000;

  return value;
}

/* * ============================================================ * PNG LEADERBOARD * ============================================================ */

async function makeLeaderboardPNG(usersData, senderID) {
  const { createCanvas, loadImage } = require("canvas");
  const axios = require("axios");
  const fs = require("fs-extra");
  const path = require("path");

  const allUsers = await usersData.getAll();

  const leaderboard = [];

  for (const user of allUsers || []) {
    if (!user || !user.userID) continue;

    const lb = user.data && user.data.spinLeaderboard;

    if (!lb) continue;

    const wins = Number(lb.wins) || 0;
    const losses = Number(lb.losses) || 0;
    const rounds = Number(lb.rounds) || 0;
    const wonMoney = Number(lb.wonMoney) || 0;
    const lostMoney = Number(lb.lostMoney) || 0;
    const bestWin = Number(lb.bestWin) || 0;

    if (rounds <= 0) continue;

    const winRate = rounds > 0 ? (wins / rounds) * 100 : 0;

    const net = wonMoney - lostMoney;

    leaderboard.push({
      userID: String(user.userID),
      name: user.name || "Unknown",
      wins,
      losses,
      rounds,
      wonMoney,
      lostMoney,
      bestWin,
      winRate,
      net,
    });
  }

  leaderboard.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;

    if (b.winRate !== a.winRate) return b.winRate - a.winRate;

    return b.net - a.net;
  });

  if (!leaderboard.length)
    throw new Error("No spin leaderboard data available.");

  const myIndex = leaderboard.findIndex((u) => u.userID === String(senderID));

  const myRank = myIndex === -1 ? null : myIndex + 1;

  const WIDTH = 1200;
  const ROW_H = 86;
  const TOP_SECTION = 430;
  const HEADER = 170;

  const visibleCount = Math.min(17, leaderboard.length);

  const HEIGHT = HEADER + TOP_SECTION + visibleCount * ROW_H + 90;

  const canvas = createCanvas(WIDTH, HEIGHT);

  const ctx = canvas.getContext("2d");

  /* * Background */

  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);

  bg.addColorStop(0, "#050816");

  bg.addColorStop(0.5, "#0b1026");

  bg.addColorStop(1, "#02030a");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  /* * Glow */

  const glow = ctx.createRadialGradient(
    WIDTH / 2,
    110,
    20,
    WIDTH / 2,
    110,
    600
  );

  glow.addColorStop(0, "rgba(34,211,238,0.30)");

  glow.addColorStop(0.5, "rgba(139,92,246,0.15)");

  glow.addColorStop(1, "rgba(0,0,0,0)");

  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, 600);

  /* * Stars / particles */

  for (let i = 0; i < 140; i++) {
    const x = Math.random() * WIDTH;

    const y = Math.random() * HEIGHT;

    const r = Math.random() * 1.8 + 0.3;

    ctx.beginPath();

    ctx.arc(x, y, r, 0, Math.PI * 2);

    ctx.fillStyle = "rgba(255,255,255,0.12)";

    ctx.fill();
  }

  /* * Header */

  ctx.textAlign = "center";

  ctx.font = "bold 48px Arial";

  ctx.fillStyle = "#67e8f9";

  ctx.shadowColor = "rgba(34,211,238,0.8)";

  ctx.shadowBlur = 25;

  ctx.fillText("ЁЯСС SPIN GAME GLOBAL RANKING", WIDTH / 2, 65);

  ctx.shadowBlur = 0;

  ctx.font = "20px Arial";

  ctx.fillStyle = "#8b95b7";

  ctx.fillText("THE STRONGEST PLAYERS IN THE CRYSTAL VAULT", WIDTH / 2, 105);

  const line = ctx.createLinearGradient(150, 0, WIDTH - 150, 0);

  line.addColorStop(0, "rgba(255,255,255,0)");

  line.addColorStop(0.5, "#22d3ee");

  line.addColorStop(1, "rgba(255,255,255,0)");

  ctx.fillStyle = line;

  ctx.fillRect(150, 135, WIDTH - 300, 2);

  /* * Avatar cache */

  const avatarCache = {};

  for (const user of leaderboard.slice(0, 17)) {
    try {
      const avatarURL = await usersData.getAvatarUrl(user.userID);

      if (!avatarURL) continue;

      const response = await axios.get(avatarURL, {
        responseType: "arraybuffer",
        timeout: 7000,
      });

      avatarCache[user.userID] = await loadImage(Buffer.from(response.data));
    } catch (_) {}
  }

  /* * Rounded card helper */

  function roundedRect(x, y, w, h, r) {
    ctx.beginPath();

    ctx.moveTo(x + r, y);

    ctx.lineTo(x + w - r, y);

    ctx.arcTo(x + w, y, x + w, y + r, r);

    ctx.lineTo(x + w, y + h - r);

    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);

    ctx.lineTo(x + r, y + h);

    ctx.arcTo(x, y + h, x, y + h - r, r);

    ctx.lineTo(x, y + r);

    ctx.arcTo(x, y, x + r, y, r);

    ctx.closePath();
  }

  /* * TOP 3 */

  const top3 = [
    {
      user: leaderboard[1],
      x: 300,
      y: 280,
      r: 82,
      rank: 2,
      color: "#cbd5e1",
    },
    {
      user: leaderboard[0],
      x: 600,
      y: 240,
      r: 105,
      rank: 1,
      color: "#facc15",
    },
    {
      user: leaderboard[2],
      x: 900,
      y: 280,
      r: 82,
      rank: 3,
      color: "#fb923c",
    },
  ];

  function drawAvatar(user, x, y, r, color) {
    if (!user) return;

    ctx.save();

    ctx.beginPath();

    ctx.arc(x, y, r + 10, 0, Math.PI * 2);

    ctx.strokeStyle = color;

    ctx.lineWidth = 4;

    ctx.shadowColor = color;

    ctx.shadowBlur = 25;

    ctx.stroke();

    ctx.restore();

    ctx.save();

    ctx.beginPath();

    ctx.arc(x, y, r, 0, Math.PI * 2);

    ctx.clip();

    if (avatarCache[user.userID]) {
      ctx.drawImage(avatarCache[user.userID], x - r, y - r, r * 2, r * 2);
    } else {
      ctx.fillStyle = "#17213a";

      ctx.fillRect(x - r, y - r, r * 2, r * 2);

      ctx.fillStyle = "#94a3b8";

      ctx.font = `bold ${Math.floor(r * 0.6)}px Arial`;

      ctx.textAlign = "center";

      ctx.textBaseline = "middle";

      ctx.fillText(
        String(user.name || "?")
          .charAt(0)
          .toUpperCase(),
        x,
        y
      );
    }

    ctx.restore();

    ctx.beginPath();

    ctx.arc(x, y, r, 0, Math.PI * 2);

    ctx.strokeStyle = color;

    ctx.lineWidth = 3;

    ctx.stroke();
  }

  for (const item of top3) {
    if (!item.user) continue;

    drawAvatar(item.user, item.x, item.y, item.r, item.color);

    /* * Rank badge */

    ctx.beginPath();

    ctx.arc(item.x + item.r * 0.72, item.y - item.r * 0.72, 25, 0, Math.PI * 2);

    ctx.fillStyle = item.color;

    ctx.fill();

    ctx.font = "bold 18px Arial";

    ctx.fillStyle = "#050816";

    ctx.textAlign = "center";

    ctx.textBaseline = "middle";

    ctx.fillText(
      `#${item.rank}`,
      item.x + item.r * 0.72,
      item.y - item.r * 0.72
    );

    ctx.textBaseline = "alphabetic";

    /* * Name */

    ctx.font = "bold 22px Arial";

    ctx.fillStyle = "#f8fafc";

    let name = String(item.user.name || "Unknown");

    if (ctx.measureText(name).width > 220) {
      name = name.slice(0, 17) + "тАж";
    }

    ctx.fillText(name, item.x, item.y + item.r + 38);

    /* * Stats */

    ctx.font = "bold 17px Arial";

    ctx.fillStyle = item.color;

    ctx.fillText(
      `WIN ${item.user.wins} тАв ${item.user.winRate.toFixed(1)}%`,
      item.x,
      item.y + item.r + 68
    );

    ctx.font = "14px Arial";

    ctx.fillStyle = "#94a3b8";

    ctx.fillText(
      `BEST ${fmtPlain(item.user.bestWin)}`,
      item.x,
      item.y + item.r + 92
    );
  }

  /* * Leaderboard rows */

  const listStart = HEADER + TOP_SECTION - 20;

  for (let i = 3; i < visibleCount; i++) {
    const user = leaderboard[i];

    const y = listStart + (i - 3) * ROW_H;

    const x = 55;
    const w = WIDTH - 110;
    const h = ROW_H - 10;

    roundedRect(x, y, w, h, 16);

    ctx.fillStyle = "rgba(15,23,42,0.78)";

    ctx.fill();

    ctx.strokeStyle = "rgba(148,163,184,0.13)";

    ctx.lineWidth = 1;

    ctx.stroke();

    /* * Rank */

    ctx.textAlign = "left";

    ctx.font = "bold 20px Arial";

    ctx.fillStyle = "#64748b";

    ctx.fillText(`#${i + 1}`, 78, y + 43);

    /* * Avatar */

    const avX = 145;
    const avY = y + h / 2;
    const avR = 26;

    ctx.save();

    ctx.beginPath();

    ctx.arc(avX, avY, avR, 0, Math.PI * 2);

    ctx.clip();

    if (avatarCache[user.userID]) {
      ctx.drawImage(
        avatarCache[user.userID],
        avX - avR,
        avY - avR,
        avR * 2,
        avR * 2
      );
    } else {
      ctx.fillStyle = "#1e293b";

      ctx.fillRect(avX - avR, avY - avR, avR * 2, avR * 2);
    }

    ctx.restore();

    /* * Name */

    ctx.font = "bold 19px Arial";

    ctx.fillStyle = "#e2e8f0";

    let name = String(user.name || "Unknown");

    if (ctx.measureText(name).width > 230) {
      name = name.slice(0, 18) + "тАж";
    }

    ctx.fillText(name, 190, y + 36);

    /* * Win stats */

    ctx.font = "14px Arial";

    ctx.fillStyle = "#94a3b8";

    ctx.fillText(`${user.wins} wins тАв ${user.rounds} rounds`, 190, y + 59);

    /* * Progress bar */

    const barX = 475;
    const barY = y + 32;
    const barW = 290;
    const barH = 10;

    roundedRect(barX, barY, barW, barH, 5);

    ctx.fillStyle = "rgba(255,255,255,0.06)";

    ctx.fill();

    const ratio = Math.min(user.winRate / 100, 1);

    roundedRect(barX, barY, Math.max(8, ratio * barW), barH, 5);

    const bar = ctx.createLinearGradient(barX, 0, barX + barW, 0);

    bar.addColorStop(0, "#06b6d4");

    bar.addColorStop(1, "#8b5cf6");

    ctx.fillStyle = bar;

    ctx.shadowColor = "#22d3ee";

    ctx.shadowBlur = 8;

    ctx.fill();

    ctx.shadowBlur = 0;

    /* * Win rate */

    ctx.textAlign = "right";

    ctx.font = "bold 18px Arial";

    ctx.fillStyle = "#67e8f9";

    ctx.fillText(`${user.winRate.toFixed(1)}%`, WIDTH - 255, y + 39);

    /* * Best win */

    ctx.font = "14px Arial";

    ctx.fillStyle = "#94a3b8";

    ctx.fillText(`BEST ${fmtPlain(user.bestWin)}`, WIDTH - 70, y + 39);
  }

  /* * Your rank box */

  const footerY = HEIGHT - 65;

  ctx.textAlign = "center";

  ctx.font = "bold 17px Arial";

  if (myRank) {
    const me = leaderboard[myRank - 1];

    ctx.fillStyle = "#67e8f9";

    ctx.fillText(
      `ЁЯСд YOUR RANK #${myRank} тАв ${ me.wins } WINS тАв ${me.winRate.toFixed(1)}% WIN RATE`,
      WIDTH / 2,
      footerY
    );
  } else {
    ctx.fillStyle = "#94a3b8";

    ctx.fillText(
      "ЁЯСд You haven't played enough spins to appear on the leaderboard.",
      WIDTH / 2,
      footerY
    );
  }

  const cacheDir = path.join(__dirname, "cache");

  await fs.ensureDir(cacheDir);

  const imagePath = path.join(cacheDir, `spin_top_${Date.now()}.png`);

  await fs.writeFile(imagePath, canvas.toBuffer("image/png"));

  return imagePath;
}

/* * ============================================================ * COMMAND * ============================================================ */

module.exports = {
  config: {
    name: "spin",
    version: "6.0",
    author: "ARIYAN AI",
    countDown: 5,
    role: 0,
    category: "Game",

    guide:
      "{pn} <amount>\n" +
      "Example: !spin 10k\n" +
      "Example: !spin 1m\n" +
      "Example: !spin 20m\n\n" +
      "{pn} top тАФ Spin Global Leaderboard",
  },

  onStart: async function ({ api, args, message, event, usersData }) {
    try {
      const { senderID } = event;

      /* * ======================================================== * !spin top * ======================================================== */

      if (args[0] && args[0].toLowerCase() === "top") {
        const imagePath = await makeLeaderboardPNG(usersData, senderID);

        return message.reply(
          {
            body:
              "ЁЯСС ЁЭРТЁЭРПЁЭРИЁЭРН ЁЭРЖЁЭРАЁЭРМЁЭРД ЁЭРЖЁЭРЛЁЭРОЁЭРБЁЭРАЁЭРЛ ЁЭРСЁЭРАЁЭРНЁЭРКЁЭРИЁЭРНЁЭРЖ\n\n" +
              "ЁЯФе Wins тАв Win Rate тАв Best Win",
            attachment: require("fs-extra").createReadStream(imagePath),
          },
          () => {
            require("fs-extra")
              .remove(imagePath)
              .catch(() => {});
          }
        );
      }

      /* * ======================================================== * NORMAL SPIN * ======================================================== */

      const userData = await usersData.get(senderID);

      if (!args[0]) {
        return message.reply(
          "тЭМ ржХржд ржЯрж╛ржХрж╛ рж╕рзНрж▓ржЯ ржорж╛рж░рждрзЗ ржЪрж╛ржи рждрж╛ рж▓рж┐ржЦрзБржиред\n\n" +
            "ЁЯТ░ Example: !spin 100k\n" +
            "ЁЯСС Leaderboard: !spin top"
        );
      }

      const amount = parseAmount(args[0]);

      if (isNaN(amount) || amount <= 0) {
        return message.reply(
          "тЭМ ржжржпрж╝рж╛ ржХрж░рзЗ рж╕ржарж┐ржХ ржЯрж╛ржХрж╛рж░ ржкрж░рж┐ржорж╛ржг рж▓рж┐ржЦрзБржиред"
        );
      }

      if (amount > MAX_BET) {
        return message.reply(
          `тЭМ ржПржХржмрж╛рж░рзЗ рж╕рж░рзНржмрзЛржЪрзНржЪ ${fmt( MAX_BET )} ржкрж░рзНржпржирзНржд рж╕рзНржкрж┐ржи ржХрж░рж╛ ржпрж╛ржмрзЗред`
        );
      }

      if (amount > Number(userData.money || 0)) {
        return message.reply(
          `тЭМ ржЖржкржирж╛рж░ ржХрж╛ржЫрзЗ ржкрж░рзНржпрж╛ржкрзНржд ржЯрж╛ржХрж╛ ржирзЗржЗ!\n\nЁЯТ░ Balance: ${fmt( userData.money )}`
        );
      }

      /* * LIMIT */

      const now = Date.now();

      if (!userData.data) userData.data = {};

      if (!userData.data.slotInfo) {
        userData.data.slotInfo = {
          count: 0,
          lastTime: now,
        };
      }

      let { count, lastTime } = userData.data.slotInfo;

      if (now - lastTime > COOLDOWN_MS) {
        count = 0;
        lastTime = now;
      }

      if (count >= MAX_SPINS) {
        const remaining = COOLDOWN_MS - (now - lastTime);

        const hours = Math.floor(remaining / (60 * 60 * 1000));

        const minutes = Math.floor(
          (remaining % (60 * 60 * 1000)) / (60 * 1000)
        );

        return message.reply(
          `ЁЯЫС ЁЭРТЁЭРПЁЭРИЁЭРН ЁЭРЛЁЭРИЁЭРМЁЭРИЁЭРУ ЁЭРСЁЭРДЁЭРАЁЭРВЁЭРЗЁЭРДЁЭРГ!\n\n` +
            `ЁЯОп Used: [ ${MAX_SPINS}/${MAX_SPINS} ]\n` +
            `тП│ ржЖржмрж╛рж░ ржЦрзЗрж▓рждрзЗ ржкрж╛рж░ржмрзЗржи: ${hours}h ${minutes}m ржкрж░ред`
        );
      }

      /* * OUTCOME */

      const isWin = Math.random() < WIN_CHANCE;

      let tier = "loss";

      let multiplier = 0;

      if (isWin) {
        const roll = Math.random() * 100;

        if (roll < 1) {
          tier = "jackpot";
          multiplier = 10;
        } else if (roll < 5) {
          tier = "quad";
          multiplier = 7;
        } else if (roll < 15) {
          tier = "triple";
          multiplier = 4;
        } else if (roll < 35) {
          tier = "twoPair";
          multiplier = 2.5;
        } else {
          tier = "onePair";
          multiplier = 1.5;
        }
      }

      const finalRow = buildReel(tier);

      /* * ANIMATION */

      const info = await message.reply(spinFrameText(randomRow()));

      if (info?.messageID) {
        for (let i = 0; i < SPIN_FRAMES; i++) {
          await sleep(SPIN_DELAY_MS);

          try {
            await api.editMessage(spinFrameText(randomRow()), info.messageID);
          } catch (_) {
            break;
          }
        }
      }

      /* * MONEY */

      const winnings = isWin ? Math.floor(amount * multiplier) : -amount;

      const finalMoney = Number(userData.money || 0) + winnings;

      /* * SAVE SPIN INFO */

      userData.data.slotInfo = {
        count: count + 1,
        lastTime,
      };

      await usersData.set(senderID, {
        money: finalMoney,
        data: userData.data,
      });

      /* * DAILY STATS */

      const stats = await getDailyStats(usersData, senderID);

      if (isWin) {
        stats.wonTotal += winnings;

        stats.wins += 1;
      } else {
        stats.lostTotal += amount;

        stats.losses += 1;
      }

      stats.rounds += 1;

      await saveDailyStats(usersData, senderID, stats);

      /* * GLOBAL LEADERBOARD STATS */

      const lb = await getSpinLeaderboardData(usersData, senderID);

      lb.rounds += 1;

      if (isWin) {
        lb.wins += 1;

        lb.wonMoney += winnings;

        if (winnings > lb.bestWin) {
          lb.bestWin = winnings;
        }
      } else {
        lb.losses += 1;

        lb.lostMoney += amount;
      }

      await saveSpinLeaderboardData(usersData, senderID, lb);

      /* * WIN RATE */

      const winRate =
        lb.rounds > 0 ? ((lb.wins / lb.rounds) * 100).toFixed(1) : "0.0";

      /* * RESULT */

      const resultMsg =
        `ЁЯФо тХРтХРтХР ЁЭРТЁЭРПЁЭРИЁЭРН ЁЭРСЁЭРДЁЭРТЁЭРФЁЭРЛЁЭРУ тХРтХРтХР ЁЯФо\n` +
        `тФГ ${finalRow.join(" тФГ ")} тФГ\n\n` +
        `${ isWin ? "ЁЯСС ЁЭРНЁЭРИЁЭРВЁЭРД ЁЭРЗЁЭРИЁЭРУ!" : "ЁЯТА ЁЭРНЁЭРО ЁЭРЛЁЭРФЁЭРВЁЭРК" }\n` +
        `${isWin ? "ЁЯЯв Won" : "ЁЯФ┤ Lost"}: ${fmt(Math.abs(winnings))}\n\n` +
        `ЁЯУК ЁЭРШЁЭРОЁЭРФЁЭРС ЁЭРТЁЭРПЁЭРИЁЭРН ЁЭРТЁЭРУЁЭРАЁЭРУЁЭРТ\n` +
        `ЁЯПЖ Wins: ${lb.wins}\n` +
        `ЁЯОп Rounds: ${lb.rounds}\n` +
        `ЁЯУИ Win Rate: ${winRate}%\n` +
        `ЁЯФе Best Win: ${fmt(lb.bestWin)}\n\n` +
        `ЁЯТ░ Balance: ${fmt(finalMoney)}\n` +
        `ЁЯОЯя╕П Spins: [ ${count + 1}/${MAX_SPINS} ]\n\n` +
        `ЁЯСС Type !spin top to see Global Ranking`;

      if (info?.messageID) {
        try {
          return await api.editMessage(resultMsg, info.messageID);
        } catch (_) {}
      }

      return message.reply(resultMsg);
    } catch (error) {
      console.error("[SPIN ERROR]", error);

      return message.reply(`тЭМ Spin Error:\n${error.message}`);
    }
  },
};
