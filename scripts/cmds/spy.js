"use strict";

/** * ===================================================== * SPY.JS - PREMIUM PROFILE & GAME DASHBOARD * Fixed by ARIYAN AI (v5.1 — race-condition + avatar fix) * * NO mongoose * NO GameStat * NO utils * NO wins/losses * ===================================================== */

if (typeof process.stderr.clearLine !== "function") {
  process.stderr.clearLine = function () {};
}
if (typeof process.stderr.cursorTo !== "function") {
  process.stderr.cursorTo = function () {};
}

const fs = require("fs-extra");
const path = require("path");
const Canvas = require("canvas");
const moment = require("moment");
const GIFEncoder = require("gifencoder");
const axios = require("axios");

// =====================================================
// NUMBER FORMAT
// =====================================================

const units = ["", "K", "M", "B", "T", "Q", "S", "O", "N", "D"];

function shortenNumber(num) {
  num = Number(num) || 0;
  if (num < 1000) return Math.floor(num).toString();

  let unitIndex = 0;
  let n = num;
  while (n >= 1000 && unitIndex < units.length - 1) {
    n /= 1000;
    unitIndex++;
  }

  return n.toFixed(2).replace(/\.?0+$/, "") + units[unitIndex];
}

// =====================================================
// LEVEL SYSTEM
// =====================================================

function getLevelInfo(exp) {
  let level = 1;
  let expNeed = 100;
  exp = Number(exp) || 0;

  while (exp >= expNeed) {
    exp -= expNeed;
    level++;
    expNeed = level * 100 + 70;
  }

  return { level, curExp: exp, expNeed };
}

// =====================================================
// GAME LIST
// =====================================================

const GAMES_DISPLAY = [
  { key: "quiz", name: "Quiz", icon: "🎯" },
  { key: "flag", name: "Flag", icon: "🚩" },
  { key: "cartoon", name: "Cartoon", icon: "🎨" },
  { key: "freefire", name: "Free Fire", icon: "🔥" },
  { key: "waifu", name: "Waifu", icon: "💖" },
  { key: "aniqz", name: "Aniquiz", icon: "⚡" },
  { key: "guess", name: "Guess", icon: "🤔" },
  { key: "mine", name: "Mine", icon: "⛏️" },
  { key: "slot", name: "Slot", icon: "🎰" },
  { key: "actor", name: "Actor", icon: "🎭" },
  { key: "dice", name: "Dice", icon: "🎲" },
  { key: "spin", name: "Spin", icon: "🌀" },
];

// =====================================================
// COMMAND MAPPING
// =====================================================

const COMMAND_MAPPINGS = [
  { cmds: ["guess"], gameKey: "guess" },
  { cmds: ["mine", "mines"], gameKey: "mine" },
  { cmds: ["waifu"], gameKey: "waifu" },
  { cmds: ["quiz"], gameKey: "quiz" },
  { cmds: ["aniqz"], gameKey: "aniqz" },
  { cmds: ["ffqz", "freefire", "freefireqz", "ff"], gameKey: "freefire" },
  { cmds: ["slot"], gameKey: "slot" },
  { cmds: ["actor", "actorqz"], gameKey: "actor" },
  { cmds: ["flag", "flaggame"], gameKey: "flag" },
  { cmds: ["dice"], gameKey: "dice" },
  { cmds: ["cartoon", "carton"], gameKey: "cartoon" },
  { cmds: ["spin"], gameKey: "spin" },
];

// =====================================================
// COOLDOWN
// =====================================================

const commandCooldowns = new Map();
const TRACK_COOLDOWN = 2000;

function getCommandFromText(body) {
  let text = String(body || "")
    .trim()
    .toLowerCase();
  if (!text) return null;

  text = text.replace(/^[!./#$?%-]+/, "");
  const command = text.split(/\s+/)[0];

  for (const map of COMMAND_MAPPINGS) {
    if (map.cmds.includes(command)) return map;
  }
  return null;
}

// =====================================================
// PER-USER LOCK — prevents the read-then-write race that
// was silently dropping game counts when two commands
// fired close together for the same user
// =====================================================

const userLocks = new Map();

function withUserLock(uid, fn) {
  const prev = userLocks.get(uid) || Promise.resolve();
  const run = prev.then(fn, fn); // run fn regardless of prior errors
  userLocks.set(
    uid,
    run.catch(() => {}) // don't let one failure jam the queue for this uid
  );
  return run;
}

// =====================================================
// GAME DATA HELPERS
// =====================================================

function getSpyGames(user) {
  if (!user.data || typeof user.data !== "object") user.data = {};
  if (!user.data.spyGames || typeof user.data.spyGames !== "object")
    user.data.spyGames = {};
  return user.data.spyGames;
}

async function trackGamePlay(uid, gameKey, usersData) {
  uid = String(uid);
  return withUserLock(uid, async () => {
    try {
      if (!uid || !gameKey) return;

      // fresh read happens INSIDE the lock, so no other trackGamePlay
      // call for this uid can read stale data in between
      const user = await usersData.get(uid);
      if (!user) return;

      const spyGames = getSpyGames(user);
      const current = Number(spyGames[gameKey] || 0);
      spyGames[gameKey] = current + 1;

      await usersData.set(uid, { data: { ...user.data, spyGames } });
    } catch (error) {
      console.log("[SPY GAME TRACK]", error.message);
    }
  });
}

function getGamePlays(user, gameKey) {
  const spyGames = user?.data?.spyGames;
  if (spyGames && typeof spyGames === "object") {
    return Number(spyGames[gameKey] || 0);
  }

  const possible = [
    user?.data?.games?.[gameKey],
    user?.data?.gameplay?.[gameKey],
    user?.data?.gamePlay?.[gameKey],
    user?.data?.gameStats?.[gameKey],
  ];

  for (const value of possible) {
    if (typeof value === "number") return Number(value) || 0;
    if (value && typeof value === "object") {
      return Number(
        value.plays || value.play || value.count || value.total || 0
      );
    }
  }
  return 0;
}

function getTotalGamePlays(user) {
  let total = 0;
  for (const game of GAMES_DISPLAY) total += getGamePlays(user, game.key);
  return total;
}

function getTaskComplete(user) {
  const possible = [
    user?.data?.tasksCompleted,
    user?.data?.taskComplete,
    user?.data?.tasksComplete,
    user?.data?.completedTasks,
    user?.data?.tasks?.completed,
    user?.data?.task?.completed,
    user?.tasksCompleted,
    user?.taskComplete,
  ];

  for (const value of possible) {
    if (typeof value === "number") return Number(value) || 0;
    if (Array.isArray(value)) return value.length;
    if (value && typeof value === "object") return Object.keys(value).length;
  }
  return 0;
}

function getAchievementCount(user) {
  const possible = [
    user?.data?.achievements,
    user?.data?.achievement,
    user?.achievements,
    user?.achievement,
  ];

  for (const value of possible) {
    if (typeof value === "number") return Number(value) || 0;
    if (Array.isArray(value)) return value.length;
    if (value && typeof value === "object") return Object.keys(value).length;
  }
  return 0;
}

function isVIP(user) {
  const vip = user?.data?.vip;
  if (vip) {
    const expires = Number(vip.expires || 0);
    if (expires === 0) return true;
    if (expires > Date.now()) return true;
  }

  if (user?.premium === true) {
    const expires = Number(user?.vipUntil || 0);
    if (expires === 0 || expires > Date.now()) return true;
  }

  return false;
}

// =====================================================
// AVATAR — try the bot's own authenticated session first
// (usersData.getAvatarUrl), it works for far more profiles
// than the public graph.facebook.com endpoint alone
// =====================================================

async function fetchAvatarBuffer(uid, usersData) {
  const urls = [];

  try {
    const sessionUrl = await usersData.getAvatarUrl(uid);
    if (sessionUrl) urls.push(sessionUrl);
  } catch (_) {}

  urls.push(`https://graph.facebook.com/${uid}/picture?height=512&width=512`);
  urls.push(`https://graph.facebook.com/${uid}/picture?type=large`);

  for (const url of urls) {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 10000,
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 400,
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      if (response.data) {
        return await Canvas.loadImage(Buffer.from(response.data));
      }
    } catch (error) {
      console.log("[SPY AVATAR]", error.message);
    }
  }

  return null;
}

// =====================================================
// CANVAS HELPERS
// =====================================================

function roundedRect(ctx, x, y, width, height, radius) {
  radius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function text(ctx, value, x, y, size, color, align = "left", bold = false) {
  ctx.font = `${bold ? "bold " : ""}${size}px Sans`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(String(value), x, y);
}

function drawProgressBar(ctx, x, y, width, height, percent) {
  percent = Math.max(0, Math.min(100, percent));

  ctx.fillStyle = "#24263d";
  roundedRect(ctx, x, y, width, height, height / 2);
  ctx.fill();

  const gradient = ctx.createLinearGradient(x, y, x + width, y);
  gradient.addColorStop(0, "#00f5a0");
  gradient.addColorStop(0.5, "#00d9ff");
  gradient.addColorStop(1, "#c86cff");

  const fillWidth = width * (percent / 100);
  if (fillWidth > 0) {
    ctx.fillStyle = gradient;
    roundedRect(ctx, x, y, fillWidth, height, height / 2);
    ctx.fill();
  }
}

// =====================================================
// DIMENSIONS
// =====================================================

const W = 1200;
const HEADER_Y = 30;
const HEADER_H = 250;
const BOX_Y = 305;
const BOX_H = 130;
const DETAILS_TITLE_Y = 500;
const DETAILS_Y0 = 550;
const DETAIL_ROW_H = 88;
const DETAIL_CARD_H = 75;
const GAMES_TITLE_Y = DETAILS_Y0 + 2 * DETAIL_ROW_H + DETAIL_CARD_H + 49;
const GAMES_Y0 = GAMES_TITLE_Y + 50;
const GAME_CARD_W = 550;
const GAME_CARD_H = 105;
const GAME_GAP_X = 30;
const GAME_GAP_Y = 18;
const GAME_ROWS = Math.ceil(GAMES_DISPLAY.length / 2);
const GAMES_H = GAME_ROWS * GAME_CARD_H + (GAME_ROWS - 1) * GAME_GAP_Y;
const FOOTER_TEXT_Y = GAMES_Y0 + GAMES_H + 55;
const H = FOOTER_TEXT_Y + 35;

// =====================================================
// MODULE
// =====================================================

module.exports = {
  config: {
    name: "spy",
    aliases: ["profile", "stats", "gameprofile"],
    version: "5.1.0",
    author: "ARIYAN",
    countDown: 3,
    role: 0,
    shortDescription: { en: "Premium profile dashboard" },
    longDescription: {
      en: "Shows balance, VIP, level, EXP rank, money rank, tasks, achievements and game activity.",
    },
    category: "profile",
    guide: { en: "{pn}\n{pn} @mention\n{pn} uid" },
  },

  onChat: async function ({ event, usersData }) {
    try {
      if (!event?.senderID || !event?.body) return;

      const map = getCommandFromText(event.body);
      if (!map) return;

      const uid = String(event.senderID);
      const cooldownKey = `${uid}_${map.gameKey}`;
      const last = commandCooldowns.get(cooldownKey) || 0;
      if (Date.now() - last < TRACK_COOLDOWN) return;
      commandCooldowns.set(cooldownKey, Date.now());

      await trackGamePlay(uid, map.gameKey, usersData);
    } catch (error) {
      console.log("[SPY ONCHAT]", error.message);
    }
  },

  onStart: async function ({ api, event, usersData }) {
    let tmp = null;

    try {
      let uid = event.senderID;

      if (event.mentions && Object.keys(event.mentions).length > 0) {
        uid = Object.keys(event.mentions)[0];
      } else if (event.type === "message_reply" && event.messageReply) {
        uid = event.messageReply.senderID;
      }
      uid = String(uid);

      const userInfo = await api.getUserInfo(uid);
      const info = userInfo?.[uid] || {};
      const name = info.name || "Unknown User";

      let nickname = "None";
      try {
        const threadInfo = await api.getThreadInfo(event.threadID);
        if (threadInfo?.nicknames?.[uid]) nickname = threadInfo.nicknames[uid];
      } catch {}

      const userData = (await usersData.get(uid)) || {};
      const exp = Number(userData.exp) || 0;
      const money = Number(userData.money) || 0;
      const vip = isVIP(userData);
      const { level, curExp, expNeed } = getLevelInfo(exp);

      const allUsers = (await usersData.getAll()) || [];

      const sortedExp = [...allUsers].sort(
        (a, b) => (Number(b?.exp) || 0) - (Number(a?.exp) || 0)
      );
      const expRank = sortedExp.findIndex((u) => String(u?.userID) === uid) + 1;

      const sortedMoney = [...allUsers].sort(
        (a, b) => (Number(b?.money) || 0) - (Number(a?.money) || 0)
      );
      const moneyRank =
        sortedMoney.findIndex((u) => String(u?.userID) === uid) + 1;

      const gameStats = {};
      let totalGames = 0;
      for (const game of GAMES_DISPLAY) {
        const plays = getGamePlays(userData, game.key);
        gameStats[game.key] = plays;
        totalGames += plays;
      }

      const taskComplete = getTaskComplete(userData);
      const achievements = getAchievementCount(userData);
      const avatar = await fetchAvatarBuffer(uid, usersData);

      // GIF SETUP
      const FRAMES = 4;
      const FPS = 10;

      const tempDir = path.join(__dirname, "cache");
      await fs.ensureDir(tempDir);
      tmp = path.join(tempDir, `spy-${uid}-${Date.now()}.gif`);

      const enc = new GIFEncoder(W, H);
      const gifStream = fs.createWriteStream(tmp);
      enc.createReadStream().pipe(gifStream);

      enc.start();
      enc.setRepeat(0);
      enc.setDelay(1000 / FPS);
      enc.setQuality(10);

      for (let frame = 0; frame < FRAMES; frame++) {
        const cv = Canvas.createCanvas(W, H);
        const ctx = cv.getContext("2d");

        const bg = ctx.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, "#090b1c");
        bg.addColorStop(0.35, "#11142d");
        bg.addColorStop(0.7, "#12112d");
        bg.addColorStop(1, "#090918");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        for (let i = 0; i < 90; i++) {
          ctx.beginPath();
          ctx.arc(
            Math.random() * W,
            Math.random() * H,
            Math.random() * 1.7 + 0.3,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = `rgba(255,255,255,${( Math.random() * 0.7 + 0.15 ).toFixed(2)})`;
          ctx.fill();
        }

        const phase = frame / FRAMES;
        const border = ctx.createLinearGradient(0, 0, W, H);
        border.addColorStop(0, `hsl(${phase * 360},100%,60%)`);
        border.addColorStop(0.5, `hsl(${(phase + 0.5) * 360},100%,60%)`);
        border.addColorStop(1, `hsl(${(phase + 1) * 360},100%,60%)`);
        ctx.strokeStyle = border;
        ctx.lineWidth = 10;
        ctx.strokeRect(5, 5, W - 10, H - 10);

        ctx.fillStyle = "rgba(20,22,45,0.95)";
        roundedRect(ctx, 35, HEADER_Y, W - 70, HEADER_H, 28);
        ctx.fill();

        const avatarX = 170,
          avatarY = 155;
        const ringGradient = ctx.createLinearGradient(70, 70, 270, 270);
        ringGradient.addColorStop(0, "#00eaff");
        ringGradient.addColorStop(1, "#c86cff");
        ctx.strokeStyle = ringGradient;
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, 105, 0, Math.PI * 2);
        ctx.stroke();

        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, 92, 0, Math.PI * 2);
        ctx.clip();
        if (avatar) {
          ctx.drawImage(avatar, avatarX - 92, avatarY - 92, 184, 184);
        } else {
          ctx.fillStyle = "#25263b";
          ctx.fillRect(avatarX - 92, avatarY - 92, 184, 184);
          text(ctx, "?", avatarX, avatarY, 70, "#ffffff", "center", true);
        }
        ctx.restore();

        text(ctx, name, 320, 105, 48, "#ffffff", "left", true);
        text(ctx, `ID: ${uid}`, 320, 150, 26, "#9296ae");
        text(
          ctx,
          nickname !== "None" ? `Nick: ${nickname}` : "No Nickname",
          320,
          177,
          20,
          "#777d98"
        );
        text(
          ctx,
          vip ? "👑 VIP PLAYER" : "FREE PLAYER",
          320,
          210,
          25,
          vip ? "#ffd43b" : "#8e93aa",
          "left",
          true
        );

        text(ctx, `LEVEL ${level}`, 1110, 105, 27, "#ffffff", "right", true);
        text(
          ctx,
          `${shortenNumber(exp)} EXP`,
          1110,
          145,
          21,
          "#c86cff",
          "right",
          true
        );

        const boxW = 350,
          gap = 25;
        const boxes = [
          {
            x: 35,
            title: "BALANCE",
            value: shortenNumber(money),
            color: "#00f5a0",
          },
          {
            x: 35 + boxW + gap,
            title: "LEVEL",
            value: level,
            color: "#ffffff",
          },
          {
            x: 35 + (boxW + gap) * 2,
            title: "GAME PLAYS",
            value: shortenNumber(totalGames),
            color: "#c86cff",
          },
        ];
        for (const box of boxes) {
          ctx.fillStyle = "#171a32";
          roundedRect(ctx, box.x, BOX_Y, boxW, BOX_H, 22);
          ctx.fill();
          text(
            ctx,
            box.title,
            box.x + 25,
            BOX_Y + 38,
            22,
            "#858aa5",
            "left",
            true
          );
          text(
            ctx,
            box.value,
            box.x + 25,
            BOX_Y + 95,
            40,
            box.color,
            "left",
            true
          );
        }

        text(
          ctx,
          "👤 USER DETAILS",
          35,
          DETAILS_TITLE_Y,
          32,
          "#ffffff",
          "left",
          true
        );
        const lineGrad = ctx.createLinearGradient(35, 0, 410, 0);
        lineGrad.addColorStop(0, "#c86cff");
        lineGrad.addColorStop(1, "#00eaff");
        ctx.fillStyle = lineGrad;
        ctx.fillRect(35, DETAILS_TITLE_Y + 18, 375, 5);

        const detailCards = [
          ["EXP", `${shortenNumber(curExp)} / ${shortenNumber(expNeed)}`],
          ["EXP Rank", expRank ? `#${expRank}` : "N/A"],
          ["Money Rank", moneyRank ? `#${moneyRank}` : "N/A"],
          ["Tasks", shortenNumber(taskComplete)],
          ["Achievements", shortenNumber(achievements)],
          ["VIP Status", vip ? "ACTIVE" : "NORMAL"],
        ];

        for (let i = 0; i < detailCards.length; i++) {
          const col = i % 2;
          const row = Math.floor(i / 2);
          const x = col === 0 ? 35 : 615;
          const y = DETAILS_Y0 + row * DETAIL_ROW_H;

          ctx.fillStyle = "#171a32";
          roundedRect(ctx, x, y, 550, DETAIL_CARD_H, 18);
          ctx.fill();

          text(
            ctx,
            detailCards[i][0],
            x + 22,
            y + 30,
            19,
            "#8f94ad",
            "left",
            true
          );
          text(
            ctx,
            detailCards[i][1],
            x + 528,
            y + 48,
            21,
            "#d17aff",
            "right",
            true
          );
        }

        text(
          ctx,
          "🎮 GAME ACHIEVEMENTS",
          35,
          GAMES_TITLE_Y,
          34,
          "#ffffff",
          "left",
          true
        );
        ctx.fillStyle = lineGrad;
        ctx.fillRect(35, GAMES_TITLE_Y + 18, 420, 5);

        for (let i = 0; i < GAMES_DISPLAY.length; i++) {
          const game = GAMES_DISPLAY[i];
          const plays = Number(gameStats[game.key]) || 0;
          const col = i % 2;
          const row = Math.floor(i / 2);
          const x = 35 + col * (GAME_CARD_W + GAME_GAP_X);
          const y = GAMES_Y0 + row * (GAME_CARD_H + GAME_GAP_Y);

          ctx.fillStyle = "#171a32";
          roundedRect(ctx, x, y, GAME_CARD_W, GAME_CARD_H, 20);
          ctx.fill();

          text(ctx, game.icon, x + 22, y + 31, 23, "#ffffff");
          text(ctx, game.name, x + 58, y + 31, 22, "#ffffff", "left", true);
          text(
            ctx,
            `${shortenNumber(plays)} Plays`,
            x + GAME_CARD_W - 22,
            y + 31,
            19,
            "#ffd36a",
            "right",
            true
          );

          const progress = plays > 0 ? Math.min(100, (plays / 50) * 100) : 0;
          drawProgressBar(ctx, x + 22, y + 58, GAME_CARD_W - 44, 12, progress);

          text(
            ctx,
            plays > 0 ? "ACTIVE PLAYER" : "NOT PLAYED",
            x + 22,
            y + 88,
            15,
            plays > 0 ? "#00f5a0" : "#858aa5",
            "left",
            true
          );
        }

        text(
          ctx,
          `Updated: ${moment().format("DD/MM/YYYY • hh:mm A")}`,
          W / 2,
          FOOTER_TEXT_Y,
          19,
          "#777d98",
          "center"
        );

        enc.addFrame(ctx);
      }

      enc.finish();

      await new Promise((resolve, reject) => {
        gifStream.on("finish", resolve);
        gifStream.on("error", reject);
      });

      const bodyMessage =
        event.type === "message_reply"
          ? `🎮 ${name}'s Game Profile`
          : `🎮 ${name}, here's your Game Profile!`;

      await api.sendMessage(
        { body: bodyMessage, attachment: fs.createReadStream(tmp) },
        event.threadID,
        () => {
          try {
            if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
          } catch {}
        }
      );
    } catch (error) {
      console.error("[SPY ERROR]", error);

      try {
        if (tmp && fs.existsSync(tmp)) fs.unlinkSync(tmp);
      } catch {}

      return api.sendMessage(
        `⚠️ Spy Error:\n${error.message}`,
        event.threadID,
        event.messageID
      );
    }
  },
};
