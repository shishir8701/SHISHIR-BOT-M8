"use strict";

/** * ============================================================ * TASK.JS - DAILY MISSIONS & GAME ACHIEVEMENTS DASHBOARD * Author: ARIYAN AI * ============================================================ */

const { createCanvas, loadImage } = require("canvas");
const mongoose = require("mongoose");
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const cmdCooldowns = new Map();
const COOLDOWN_TIME = 3000;

const MISSIONS = [
  {
    id: 1,
    label: "Chat 1 Message",
    desc: "Send 1 message in group",
    reward: "20K",
    rewardVal: 20000,
    target: 1,
    type: "chat",
  },
  {
    id: 2,
    label: "Chat 100 Messages",
    desc: "Send 100 messages in group",
    reward: "200K",
    rewardVal: 200000,
    target: 100,
    type: "chat",
  },
  {
    id: 3,
    label: "Guess Play",
    desc: "Play Guess 20 times",
    reward: "1M",
    rewardVal: 1000000,
    target: 20,
    type: "cmd",
    cmds: ["guess"],
  },
  {
    id: 4,
    label: "Mine Play",
    desc: "Play Mine 20 times",
    reward: "1M",
    rewardVal: 1000000,
    target: 20,
    type: "cmd",
    cmds: ["mine", "mines"],
  },
  {
    id: 5,
    label: "Waifu Play",
    desc: "Play Waifu 25 times",
    reward: "2M",
    rewardVal: 2000000,
    target: 25,
    type: "cmd",
    cmds: ["waifu"],
  },
  {
    id: 6,
    label: "quiz Play",
    desc: "Play quiz 25 times",
    reward: "3M",
    rewardVal: 3000000,
    target: 25,
    type: "cmd",
    cmds: ["quiz", " qz"],
  },
  {
    id: 7,
    label: "Aniqz Play",
    desc: "Play Aniqz 25 times",
    reward: "2M",
    rewardVal: 2000000,
    target: 25,
    type: "cmd",
    cmds: ["aniqz"],
  },
  {
    id: 8,
    label: "Free Fire Play",
    desc: "Play Free Fire 10 times",
    reward: "1M",
    rewardVal: 1000000,
    target: 10,
    type: "cmd",
    cmds: ["ffqz", "freefire", "freefireqz", "ff"],
  },
  {
    id: 9,
    label: "Slot Play",
    desc: "Play Slot 25 times",
    reward: "1M",
    rewardVal: 1000000,
    target: 25,
    type: "cmd",
    cmds: ["slot"],
  },
  {
    id: 10,
    label: "Actor Play",
    desc: "Play Actor 10 times",
    reward: "2M",
    rewardVal: 2000000,
    target: 10,
    type: "cmd",
    cmds: ["actor", "actorqz"],
  },
  {
    id: 11,
    label: "Flag Game",
    desc: "Play Flag Game 25 times",
    reward: "2M",
    rewardVal: 2000000,
    target: 25,
    type: "cmd",
    cmds: ["flag", "flaggame"],
  },
  {
    id: 12,
    label: "Dice Play",
    desc: "Play Dice 25 times",
    reward: "2M",
    rewardVal: 2000000,
    target: 25,
    type: "cmd",
    cmds: ["dice"],
  },
  {
    id: 13,
    label: "Cartoon Play",
    desc: "Play Cartoon 25 times",
    reward: "2M",
    rewardVal: 2000000,
    target: 25,
    type: "cmd",
    cmds: ["cartoon", "carton"],
  },
  {
    id: 14,
    label: "Completionist",
    desc: "Claim all 13 daily missions",
    reward: "5M",
    rewardVal: 5000000,
    target: 13,
    type: "meta",
  },
];

const NORMAL_MISSION_COUNT = 13;

const missionSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, index: true },
    dateKey: { type: String, required: true, index: true },
    missionId: { type: Number, required: true },
    progress: { type: Number, default: 0 },
    claimed: { type: Boolean, default: false },
  },
  { timestamps: true }
);
missionSchema.index({ uid: 1, dateKey: 1, missionId: 1 }, { unique: true });
const Mission =
  mongoose.models.DailyMission || mongoose.model("DailyMission", missionSchema);

const gameStatSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, index: true },
    gameKey: { type: String, required: true, index: true },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
  },
  { timestamps: true }
);
gameStatSchema.index({ uid: 1, gameKey: 1 }, { unique: true });
const GameStat =
  mongoose.models.UserGameStat ||
  mongoose.model("UserGameStat", gameStatSchema);

let isConnected = false;
async function ensureMongo() {
  try {
    if (mongoose.connection.readyState === 1) {
      isConnected = true;
      return true;
    }
    const mongoURI =
      process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGO_URL;
    if (!mongoURI) return false;
    await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 5000 });
    isConnected = true;
    return true;
  } catch (err) {
    return false;
  }
}

function todayKey() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
}

async function bumpMany(uid, missionIds, inc = 1) {
  try {
    if (!isConnected && !(await ensureMongo())) return;
    const ops = missionIds.map((id) => ({
      updateOne: {
        filter: { uid: String(uid), dateKey: todayKey(), missionId: id },
        update: { $inc: { progress: inc } },
        upsert: true,
      },
    }));
    await Mission.bulkWrite(ops, { ordered: false });
  } catch (err) {}
}

async function bump(uid, missionId, inc = 1) {
  try {
    if (!isConnected && !(await ensureMongo())) return;
    await Mission.findOneAndUpdate(
      { uid: String(uid), dateKey: todayKey(), missionId },
      { $inc: { progress: inc } },
      { upsert: true, setDefaultsOnInsert: true }
    );
  } catch (err) {}
}

async function bumpGameAchievement(uid, gameKey) {
  try {
    if (!isConnected && !(await ensureMongo())) return;
    await GameStat.findOneAndUpdate(
      { uid: String(uid), gameKey: String(gameKey).toLowerCase() },
      { $inc: { wins: 1 } },
      { upsert: true, setDefaultsOnInsert: true }
    );
  } catch (err) {}
}

async function setProgress(uid, missionId, value) {
  try {
    if (!isConnected && !(await ensureMongo())) return;
    await Mission.findOneAndUpdate(
      { uid: String(uid), dateKey: todayKey(), missionId },
      { $set: { progress: value } },
      { upsert: true, setDefaultsOnInsert: true }
    );
  } catch (err) {}
}

async function getProgressMap(uid) {
  try {
    if (!isConnected && !(await ensureMongo())) return {};
    const docs = await Mission.find({
      uid: String(uid),
      dateKey: todayKey(),
    }).lean();
    const map = {};
    for (const d of docs) {
      map[d.missionId] = {
        progress: Number(d.progress) || 0,
        claimed: d.claimed === true,
      };
    }
    return map;
  } catch (err) {
    return {};
  }
}

async function updateCompletionist(uid) {
  try {
    if (!isConnected && !(await ensureMongo())) return;
    const claimedCount = await Mission.countDocuments({
      uid: String(uid),
      dateKey: todayKey(),
      missionId: { $lte: NORMAL_MISSION_COUNT },
      claimed: true,
    });
    await setProgress(uid, 14, Math.min(claimedCount, NORMAL_MISSION_COUNT));
  } catch (err) {}
}

async function claimMission(uid, missionId, usersData) {
  try {
    if (!isConnected && !(await ensureMongo()))
      return { ok: false, reason: "Database connection failed." };
    const def = MISSIONS.find((m) => m.id === missionId);
    if (!def) return { ok: false, reason: "Invalid mission ID." };

    if (missionId === 14) {
      await updateCompletionist(uid);
      const completionDoc = await Mission.findOne({
        uid: String(uid),
        dateKey: todayKey(),
        missionId: 14,
      });
      if (
        !completionDoc ||
        Number(completionDoc.progress) < NORMAL_MISSION_COUNT
      ) {
        return {
          ok: false,
          reason: `Complete and claim all ${NORMAL_MISSION_COUNT} missions first.`,
        };
      }
    }

    const claimedDoc = await Mission.findOneAndUpdate(
      {
        uid: String(uid),
        dateKey: todayKey(),
        missionId,
        progress: { $gte: def.target },
        claimed: false,
      },
      { $set: { claimed: true } },
      { new: true }
    );

    if (!claimedDoc) {
      const current = await Mission.findOne({
        uid: String(uid),
        dateKey: todayKey(),
        missionId,
      });
      if (!current) return { ok: false, reason: "No progress found today." };
      if (current.claimed)
        return { ok: false, reason: "Already claimed today." };
      return {
        ok: false,
        reason: `Incomplete (${current.progress}/${def.target}).`,
      };
    }

    try {
      const userData = (await usersData.get(uid)) || {};
      const currentMoney = Number(userData.money) || 0;
      await usersData.set(uid, { money: currentMoney + def.rewardVal });
    } catch (moneyErr) {
      await Mission.updateOne(
        { _id: claimedDoc._id },
        { $set: { claimed: false } }
      );
      return { ok: false, reason: "Failed to update money balance." };
    }

    if (missionId <= NORMAL_MISSION_COUNT) await updateCompletionist(uid);
    return { ok: true, reward: def.rewardVal, mission: def };
  } catch (err) {
    return { ok: false, reason: "Database error." };
  }
}

// ── canvas styling ──────────────────────────────────────────
const BG_TOP = "#05070f";
const BG_BOT = "#0a0e1f";
const CARD_TOP = "rgba(18, 22, 44, 0.9)";
const CARD_BOT = "rgba(10, 13, 28, 0.9)";
const WHITE = "#ffffff";
const GRAY = "#8b9bb4";
const NEON_CYAN = "#00f0ff";
const NEON_PURPLE = "#bd00ff";
const NEON_GREEN = "#00ff66";
const NEON_ORANGE = "#ff9500";
const FONT_FAMILY = 'Arial, "Segoe UI", sans-serif';

function setGlow(ctx, color, blur) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}
function clearGlow(ctx) {
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
}

function roundedRect(ctx, x, y, w, h, r) {
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

function truncate(ctx, text, maxWidth) {
  text = String(text || "").replace(/[\u0002-\u0008]/g, "");
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "...").width > maxWidth)
    t = t.slice(0, -1);
  return t + "...";
}

async function fetchAvatarImg(url) {
  try {
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 8000,
    });
    return await loadImage(Buffer.from(res.data));
  } catch (_) {
    return null;
  }
}

function drawAvatar(ctx, img, name, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  if (img) {
    ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
  } else {
    ctx.fillStyle = "#161b33";
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = WHITE;
    ctx.font = `bold ${Math.floor(r)}px ${FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.fillText(
      (name || "?").trim().charAt(0).toUpperCase(),
      cx,
      cy + r * 0.35
    );
  }
  ctx.restore();

  ctx.save();
  setGlow(ctx, NEON_CYAN, 22);
  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
  const ring = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  ring.addColorStop(0, NEON_CYAN);
  ring.addColorStop(1, NEON_PURPLE);
  ctx.strokeStyle = ring;
  ctx.lineWidth = 4;
  ctx.stroke();
  clearGlow(ctx);
  ctx.restore();
}

async function buildCard({ name, avatarImg, completedCount, progressMap }) {
  const W = 1080;
  const PAD = 48;
  const PROFILE_Y = 40;
  const PROFILE_H = 160;
  const SECTION_TITLE_Y = PROFILE_Y + PROFILE_H + 55;
  const GRID_Y0 = SECTION_TITLE_Y + 45;
  const COL_GAP = 30;
  const COL_W = (W - PAD * 2 - COL_GAP) / 2;
  const CARD_H = 135;
  const ROW_GAP = 25;
  const rows = Math.ceil(MISSIONS.length / 2);
  const GRID_H = rows * CARD_H + (rows - 1) * ROW_GAP;
  const FOOT_SEP_Y = GRID_Y0 + GRID_H + 35;
  const FOOT_TXT_Y = FOOT_SEP_Y + 30;
  const H = FOOT_TXT_Y + 30;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // background with depth
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, BG_TOP);
  bg.addColorStop(1, BG_BOT);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow1 = ctx.createRadialGradient(W * 0.15, 60, 0, W * 0.15, 60, 420);
  glow1.addColorStop(0, "rgba(0,240,255,0.10)");
  glow1.addColorStop(1, "transparent");
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, W, H);

  const glow2 = ctx.createRadialGradient(W * 0.9, 200, 0, W * 0.9, 200, 460);
  glow2.addColorStop(0, "rgba(189,0,255,0.08)");
  glow2.addColorStop(1, "transparent");
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);

  // faint grid texture
  ctx.strokeStyle = "rgba(0,240,255,0.03)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Profile Banner
  ctx.save();
  roundedRect(ctx, PAD, PROFILE_Y, W - PAD * 2, PROFILE_H, 18);
  const cardGrad = ctx.createLinearGradient(
    0,
    PROFILE_Y,
    0,
    PROFILE_Y + PROFILE_H
  );
  cardGrad.addColorStop(0, CARD_TOP);
  cardGrad.addColorStop(1, CARD_BOT);
  ctx.fillStyle = cardGrad;
  ctx.fill();
  setGlow(ctx, NEON_CYAN, 14);
  ctx.strokeStyle = "rgba(0,240,255,0.6)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  clearGlow(ctx);
  ctx.restore();

  const avR = 62;
  const avCX = PAD + 35 + avR;
  const avCY = PROFILE_Y + PROFILE_H / 2;
  drawAvatar(ctx, avatarImg, name, avCX, avCY, avR);

  ctx.save();
  ctx.fillStyle = WHITE;
  ctx.font = `bold 34px ${FONT_FAMILY}`;
  ctx.fillText(
    truncate(ctx, name, W - avCX - avR - 160),
    avCX + avR + 30,
    avCY - 10
  );
  setGlow(ctx, NEON_CYAN, 8);
  ctx.fillStyle = NEON_CYAN;
  ctx.font = `bold 20px ${FONT_FAMILY}`;
  ctx.fillText(
    `Missions Completed: ${completedCount}/${NORMAL_MISSION_COUNT}`,
    avCX + avR + 30,
    avCY + 28
  );
  clearGlow(ctx);
  ctx.restore();

  // Section Header
  ctx.save();
  setGlow(ctx, NEON_PURPLE, 16);
  ctx.fillStyle = WHITE;
  ctx.font = `900 28px ${FONT_FAMILY}`;
  ctx.fillText("⚡ DAILY TASKS & REWARDS", PAD, SECTION_TITLE_Y);
  clearGlow(ctx);
  const underline = ctx.createLinearGradient(PAD, 0, PAD + 160, 0);
  underline.addColorStop(0, NEON_PURPLE);
  underline.addColorStop(1, NEON_CYAN);
  roundedRect(ctx, PAD, SECTION_TITLE_Y + 12, 160, 4, 2);
  ctx.fillStyle = underline;
  ctx.fill();
  ctx.restore();

  // Task Grid
  MISSIONS.forEach((m, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = PAD + col * (COL_W + COL_GAP);
    const y = GRID_Y0 + row * (CARD_H + ROW_GAP);

    const prog = progressMap[m.id] || { progress: 0, claimed: false };
    const cur = Math.min(Number(prog.progress) || 0, m.target);
    const ratio = m.target ? cur / m.target : 0;
    const complete = cur >= m.target;

    ctx.save();
    roundedRect(ctx, x, y, COL_W, CARD_H, 14);
    const cGrad = ctx.createLinearGradient(0, y, 0, y + CARD_H);
    cGrad.addColorStop(0, CARD_TOP);
    cGrad.addColorStop(1, CARD_BOT);
    ctx.fillStyle = cGrad;
    ctx.fill();

    if (prog.claimed) {
      ctx.strokeStyle = "rgba(139, 155, 180, 0.3)";
    } else if (complete) {
      setGlow(ctx, NEON_GREEN, 12);
      ctx.strokeStyle = NEON_GREEN;
    } else {
      ctx.strokeStyle = "rgba(0, 240, 255, 0.3)";
    }
    ctx.lineWidth = 1.3;
    ctx.stroke();
    clearGlow(ctx);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = WHITE;
    ctx.font = `bold 19px ${FONT_FAMILY}`;
    ctx.fillText(
      truncate(ctx, `${m.id}. ${m.label}`, COL_W - 140),
      x + 22,
      y + 38
    );

    setGlow(ctx, NEON_ORANGE, 8);
    ctx.fillStyle = NEON_ORANGE;
    ctx.font = `bold 17px ${FONT_FAMILY}`;
    ctx.textAlign = "right";
    ctx.fillText(`+${m.reward}`, x + COL_W - 22, y + 38);
    clearGlow(ctx);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = GRAY;
    ctx.font = `14px ${FONT_FAMILY}`;
    ctx.fillText(truncate(ctx, m.desc, COL_W - 44), x + 22, y + 66);
    ctx.restore();

    const barX = x + 22;
    const barY = y + CARD_H - 26;
    const barW = COL_W - 44;
    const barH = 7;

    ctx.save();
    roundedRect(ctx, barX, barY, barW, barH, 3.5);
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fill();

    if (complete) {
      roundedRect(ctx, barX, barY, barW, barH, 3.5);
      ctx.fillStyle = prog.claimed ? GRAY : NEON_GREEN;
      if (!prog.claimed) setGlow(ctx, NEON_GREEN, 10);
      ctx.fill();
      clearGlow(ctx);

      ctx.font = `bold 13px ${FONT_FAMILY}`;
      ctx.textAlign = "right";
      ctx.fillStyle = prog.claimed ? GRAY : NEON_GREEN;
      ctx.fillText(
        prog.claimed ? "✓ CLAIMED" : "✓ CLAIMABLE",
        x + COL_W - 22,
        barY - 10
      );
    } else {
      if (ratio > 0) {
        const fillW = Math.max(ratio * barW, 6);
        roundedRect(ctx, barX, barY, fillW, barH, 3.5);
        const barGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
        barGrad.addColorStop(0, NEON_CYAN);
        barGrad.addColorStop(1, NEON_PURPLE);
        setGlow(ctx, NEON_CYAN, 10);
        ctx.fillStyle = barGrad;
        ctx.fill();
        clearGlow(ctx);
      }
      ctx.fillStyle = NEON_CYAN;
      ctx.font = `bold 13px ${FONT_FAMILY}`;
      ctx.textAlign = "right";
      ctx.fillText(`${cur}/${m.target}`, x + COL_W - 22, barY - 10);
    }
    ctx.restore();
  });

  // Footer
  ctx.save();
  setGlow(ctx, NEON_CYAN, 6);
  ctx.strokeStyle = "rgba(0, 240, 255, 0.3)";
  ctx.beginPath();
  ctx.moveTo(PAD, FOOT_SEP_Y);
  ctx.lineTo(W - PAD, FOOT_SEP_Y);
  ctx.stroke();
  clearGlow(ctx);

  ctx.fillStyle = GRAY;
  ctx.font = "13px monospace";
  ctx.textAlign = "left";
  ctx.fillText("➜ ARIYAN AI • NEON TASK ENGINE", PAD, FOOT_TXT_Y);
  ctx.textAlign = "right";
  ctx.fillText("RESET DAILY | BD TIMEZONE", W - PAD, FOOT_TXT_Y);
  ctx.restore();

  return canvas;
}

module.exports = {
  config: {
    name: "task",
    aliases: ["dailytask", "missions", "dt"],
    version: "3.1.0",
    author: "ARIYAN AI",
    countDown: 5,
    role: 0,
    description: "Cyberpunk Daily Task & Achievements System",
    category: "economy",
    guide: {
      en: "{pn} - view daily missions\n{pn} claim <number> - claim reward",
    },
  },

  onStart: async function ({ event, args, message, usersData }) {
    try {
      const uid = String(event.senderID);
      await ensureMongo();

      if (args[0] && String(args[0]).toLowerCase() === "claim") {
        const id = parseInt(args[1], 10);
        if (!id || id < 1 || id > 14) {
          return message.reply(
            "⚠️ Usage: task claim <number>\nExample: task claim 5"
          );
        }

        const result = await claimMission(uid, id, usersData);
        if (!result.ok) {
          return message.reply(`❌ Mission ${id}: ${result.reason}`);
        }

        return message.reply(
          `🎉 𝐌𝐈𝐒𝐒𝐈𝐎𝐍 𝐂𝐋𝐀𝐈𝐌𝐄𝐃!\n\n` +
            `✅ Mission ${id}: ${result.mission.label}\n` +
            `💰 Reward: +$${result.reward.toLocaleString()} Coins`
        );
      }

      let name = "User";
      let avatarUrl = null;
      try {
        name = (await usersData.getName(uid)) || name;
      } catch (_) {}
      try {
        avatarUrl = await usersData.getAvatarUrl(uid);
      } catch (_) {}

      const avatarImg = avatarUrl ? await fetchAvatarImg(avatarUrl) : null;
      const progressMap = await getProgressMap(uid);

      const completedCount = MISSIONS.filter(
        (m) =>
          m.id <= NORMAL_MISSION_COUNT &&
          progressMap[m.id] &&
          Number(progressMap[m.id].progress) >= m.target
      ).length;

      const canvas = await buildCard({
        name,
        avatarImg,
        completedCount,
        progressMap,
      });

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const imgPath = path.join(cacheDir, `task_${uid}_${Date.now()}.png`);

      await fs.writeFile(imgPath, canvas.toBuffer("image/png"));

      // send with a body (attachment-only replies fail silently on some FCA
      // forks) and clean up via the reply callback instead of a short fixed
      // timeout, so the file only gets deleted once the upload is done
      await message.reply(
        {
          body: `📋 ${name}'s Daily Missions — ${completedCount}/${NORMAL_MISSION_COUNT} completed today.`, attachment: fs.createReadStream(imgPath), }, () => { setTimeout(() => fs.remove(imgPath).catch(() => {}), 60000); } ); } catch (err) { console.error("[TASK ERROR]:", err); return message.reply(`❌ Failed to process task UI: ${err.message}`); } }, onChat: async function ({ event }) { try { if (!event.senderID || !event.body || !event.isGroup) return; const uid = String(event.senderID); const text = String(event.body).trim().toLowerCase(); const now = Date.now(); await bumpMany(uid, [1, 2], 1); const userKey = `${uid}_cmd_cooldown`; const lastCmdTime = cmdCooldowns.get(userKey) || 0; for (const mission of MISSIONS) { if (mission.type !== "cmd" || !Array.isArray(mission.cmds)) continue; let matched = false; let matchedCmd = ""; for (const cmd of mission.cmds) { const escaped = String(cmd).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); const regex = new RegExp(`^(?:[!./#$?%-])?${escaped}(?:\\s|$)`, "i"); if (regex.test(text)) { matched = true; matchedCmd = cmd; break; } } if (matched) { if (now - lastCmdTime >= COOLDOWN_TIME) { cmdCooldowns.set(userKey, now); await bump(uid, mission.id, 1); await bumpGameAchievement(uid, matchedCmd); } break; } } } catch (e) {} }, };
