"use strict";

const MAX_BET = 20000000; // 20M
const MAX_SPINS = 40;
const COOLDOWN_MS = 3 * 60 * 60 * 1000;

const ITEMS = ["🔮", "⚡", "👑", "💎", "🍒", "🔥", "7️⃣"];

const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

// ─────────────────────────────────────────────
// USER LOCK
// ─────────────────────────────────────────────

const userLocks = new Map();

function withUserLock(uid, fn) {
  const prev = userLocks.get(uid) || Promise.resolve();
  const run = prev.then(fn, fn);

  userLocks.set(
    uid,
    run.catch(() => {})
  );

  return run;
}

// ─────────────────────────────────────────────
// NUMBER
// ─────────────────────────────────────────────

function parseAmount(input) {
  if (typeof input !== "string") return input;

  const unit = input.slice(-1).toLowerCase();
  const value = parseFloat(input);

  if (unit === "k") return value * 1000;
  if (unit === "m") return value * 1000000;
  if (unit === "b") return value * 1000000000;

  return value;
}

function formatNumber(num) {
  num = Number(num) || 0;

  if (num >= 1e12) {
    return (num / 1e12).toFixed(2).replace(/\.00$/, "") + "T";
  }

  if (num >= 1e9) {
    return (num / 1e9).toFixed(2).replace(/\.00$/, "") + "B";
  }

  if (num >= 1e6) {
    return (num / 1e6).toFixed(2).replace(/\.00$/, "") + "M";
  }

  if (num >= 1e3) {
    return (num / 1e3).toFixed(2).replace(/\.00$/, "") + "K";
  }

  return Math.floor(num).toLocaleString();
}

// ─────────────────────────────────────────────
// SLOT RESULT
// ─────────────────────────────────────────────

function rollResult() {
  const roll = Math.random() * 100;

  if (roll < 2) {
    const m = ITEMS[Math.floor(Math.random() * ITEMS.length)];

    return {
      symbols: [m, m, m],
      multiplier: 10,
      title: "🚨 MEGA JACKPOT! 🚨",
    };
  }

  if (roll < 10) {
    const m = ITEMS[Math.floor(Math.random() * (ITEMS.length - 1))];

    return {
      symbols: [m, m, "7️⃣"],
      multiplier: 5,
      title: "🔥 WILD BOOST! 🔥",
    };
  }

  if (roll < 20) {
    const m = ITEMS[Math.floor(Math.random() * ITEMS.length)];

    const otherItems = ITEMS.filter((x) => x !== m);

    const other = otherItems[Math.floor(Math.random() * otherItems.length)];

    return {
      symbols: [m, m, other],
      multiplier: 3,
      title: "✨ SWEET STRIKE! ✨",
    };
  }

  if (roll < 35) {
    const m = ITEMS[Math.floor(Math.random() * ITEMS.length)];

    const otherItems = ITEMS.filter((x) => x !== m);

    const other = otherItems[Math.floor(Math.random() * otherItems.length)];

    return {
      symbols: [m, m, other],
      multiplier: 1.5,
      title: "🍀 NICE WIN! 🍀",
    };
  }

  if (roll < 60) {
    const m = ITEMS[Math.floor(Math.random() * ITEMS.length)];

    const remaining = ITEMS.filter((x) => x !== m);

    return {
      symbols: [m, remaining[0], remaining[1]],
      multiplier: 1,
      title: "🛡️ SAFE BET! 🛡️",
    };
  }

  const shuffled = [...ITEMS].sort(() => Math.random() - 0.5);

  return {
    symbols: shuffled.slice(0, 3),
    multiplier: 0,
    title: "💀 HARD LUCK 💀",
  };
}

// ─────────────────────────────────────────────
// TEXT HELPERS
// ─────────────────────────────────────────────

function safeName(name) {
  return (
    String(name || "Unknown")
      .replace(/[<>]/g, "")
      .trim() || "Unknown"
  );
}

function truncate(ctx, text, maxWidth) {
  text = String(text);

  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }

  let result = text;

  while (result.length > 1 && ctx.measureText(result + "…").width > maxWidth) {
    result = result.slice(0, -1);
  }

  return result + "…";
}

// ─────────────────────────────────────────────
// MODULE
// ─────────────────────────────────────────────

module.exports = {
  config: {
    name: "slot",
    version: "11.0.0",
    author: "ARIYAN AI",
    countDown: 7,
    role: 0,
    category: "Game",

    guide:
      "{pn} <amount>\n" +
      "Example: !slot 50k\n" +
      "Example: !slot 1m\n" +
      "Example: !slot 20m\n\n" +
      "{pn} top\n" +
      "{pn} top <page>",
  },

  onStart: async function ({ args, message, event, usersData }) {
    try {
      // ═══════════════════════════════════════
      // SLOT TOP
      // ═══════════════════════════════════════

      if (args[0] && args[0].toLowerCase() === "top") {
        let page = parseInt(args[1]) || 1;

        if (page < 1) page = 1;

        let allUsers;

        try {
          allUsers = await usersData.getAll();
        } catch (err) {
          console.error("[SLOT TOP GETALL]", err);

          return message.reply("❌ User data load করতে সমস্যা হয়েছে।");
        }

        if (!Array.isArray(allUsers) || !allUsers.length) {
          return message.reply("❌ কোনো user data পাওয়া যায়নি।");
        }

        // ─────────────────────────────────────
        // BUILD STATS
        // ─────────────────────────────────────

        const ranking = allUsers
          .filter((user) => user && user.userID)
          .map((user) => {
            const data =
              user.data && typeof user.data === "object" ? user.data : {};

            const slot =
              data.slotInfo && typeof data.slotInfo === "object"
                ? data.slotInfo
                : {};

            const wins = Number(slot.wins) || 0;

            const losses = Number(slot.losses) || 0;

            const totalSpins = Number(slot.totalSpins) || wins + losses;

            const streak = Number(slot.streak) || 0;

            const bestStreak = Number(slot.bestStreak) || 0;

            const winRate = totalSpins > 0 ? (wins / totalSpins) * 100 : 0;

            return {
              ...user,
              slotStats: {
                wins,
                losses,
                totalSpins,
                streak,
                bestStreak,
                winRate,
              },
            };
          })
          // Rank primarily by wins
          .sort((a, b) => {
            if (b.slotStats.wins !== a.slotStats.wins) {
              return b.slotStats.wins - a.slotStats.wins;
            }

            return b.slotStats.winRate - a.slotStats.winRate;
          });

        // ─────────────────────────────────────
        // ONLY USERS WHO PLAYED
        // ─────────────────────────────────────

        const playedUsers = ranking.filter((u) => u.slotStats.totalSpins > 0);

        if (!playedUsers.length) {
          return message.reply("🎰 এখনো কেউ Slot খেলেনি!");
        }

        const PAGE_SIZE = 10;

        const totalPages = Math.ceil(playedUsers.length / PAGE_SIZE);

        if (page > totalPages) {
          page = totalPages;
        }

        const start = (page - 1) * PAGE_SIZE;

        const pageUsers = playedUsers.slice(start, start + PAGE_SIZE);

        // Current user's rank
        const myIndex = playedUsers.findIndex(
          (u) => String(u.userID) === String(event.senderID)
        );

        const myRank = myIndex === -1 ? null : myIndex + 1;

        // ─────────────────────────────────────
        // CANVAS
        // ─────────────────────────────────────

        const WIDTH = 1000;
        const ROW_H = 72;
        const TOP_AREA = 390;

        const HEIGHT = TOP_AREA + PAGE_SIZE * 94 + 210;

        const canvas = createCanvas(WIDTH, HEIGHT);

        const ctx = canvas.getContext("2d");

        // Background
        const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);

        bg.addColorStop(0, "#07112f");

        bg.addColorStop(0.45, "#101a42");

        bg.addColorStop(1, "#030615");

        ctx.fillStyle = bg;

        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // ─────────────────────────────────────
        // STARS
        // ─────────────────────────────────────

        for (let i = 0; i < 180; i++) {
          const x = Math.random() * WIDTH;

          const y = Math.random() * HEIGHT;

          const r = Math.random() * 1.8 + 0.3;

          ctx.beginPath();

          ctx.arc(x, y, r, 0, Math.PI * 2);

          ctx.fillStyle = "rgba(255,255,255,0.25)";

          ctx.fill();
        }

        // ─────────────────────────────────────
        // HEADER
        // ─────────────────────────────────────

        ctx.textAlign = "center";

        ctx.font = "bold 48px Arial";

        ctx.fillStyle = "#facc15";

        ctx.shadowColor = "rgba(250,204,21,0.7)";

        ctx.shadowBlur = 25;

        ctx.fillText("SLOT GAME GLOBAL RANKING", WIDTH / 2, 70);

        ctx.shadowBlur = 0;

        ctx.font = "19px Arial";

        ctx.fillStyle = "#94a3d8";

        ctx.fillText(
          `GLOBAL WIN LEADERBOARD • PAGE ${page}/${totalPages}`,
          WIDTH / 2,
          108
        );

        // Crown
        ctx.font = "38px Arial";

        ctx.fillText("👑", WIDTH / 2, 155);

        // ─────────────────────────────────────
        // AVATAR CACHE
        // ─────────────────────────────────────

        const avatarCache = {};

        const top3 = playedUsers.slice(0, 3);

        for (const user of top3) {
          try {
            let avatarURL = null;

            try {
              avatarURL = await usersData.getAvatarUrl(user.userID);
            } catch (_) {}

            if (avatarURL) {
              const response = await axios.get(avatarURL, {
                responseType: "arraybuffer",
                timeout: 8000,
              });

              avatarCache[user.userID] = await loadImage(
                Buffer.from(response.data)
              );
            }
          } catch (_) {}
        }

        // ─────────────────────────────────────
        // DRAW TOP 3
        // ─────────────────────────────────────

        const podium = [
          {
            user: top3[1],
            x: 245,
            y: 245,
            r: 72,
            rank: 2,
            ring: "#cbd5e1",
          },
          {
            user: top3[0],
            x: 500,
            y: 220,
            r: 88,
            rank: 1,
            ring: "#facc15",
          },
          {
            user: top3[2],
            x: 755,
            y: 245,
            r: 72,
            rank: 3,
            ring: "#fb923c",
          },
        ];

        function drawTopAvatar(user, x, y, r, ring) {
          if (!user) return;

          // Glow
          ctx.save();

          ctx.beginPath();

          ctx.arc(x, y, r + 10, 0, Math.PI * 2);

          ctx.strokeStyle = ring;

          ctx.lineWidth = 5;

          ctx.shadowColor = ring;

          ctx.shadowBlur = 25;

          ctx.stroke();

          ctx.restore();

          // Avatar
          ctx.save();

          ctx.beginPath();

          ctx.arc(x, y, r, 0, Math.PI * 2);

          ctx.clip();

          if (avatarCache[user.userID]) {
            ctx.drawImage(avatarCache[user.userID], x - r, y - r, r * 2, r * 2);
          } else {
            ctx.fillStyle = "#1e293b";

            ctx.fillRect(x - r, y - r, r * 2, r * 2);

            ctx.fillStyle = "#64748b";

            ctx.font = `bold ${Math.floor(r * 0.6)}px Arial`;

            ctx.textAlign = "center";

            ctx.textBaseline = "middle";

            ctx.fillText(safeName(user.name).charAt(0), x, y);
          }

          ctx.restore();

          // Ring
          ctx.beginPath();

          ctx.arc(x, y, r, 0, Math.PI * 2);

          ctx.strokeStyle = ring;

          ctx.lineWidth = 3;

          ctx.stroke();

          // Rank badge
          ctx.beginPath();

          ctx.arc(x + r * 0.72, y - r * 0.72, 21, 0, Math.PI * 2);

          ctx.fillStyle = ring;

          ctx.fill();

          ctx.font = "bold 16px Arial";

          ctx.fillStyle = "#020617";

          ctx.textAlign = "center";

          ctx.textBaseline = "middle";

          ctx.fillText(`#${user.rank || ""}`, x + r * 0.72, y - r * 0.72);

          ctx.textBaseline = "alphabetic";

          // Name
          ctx.font = "bold 20px Arial";

          ctx.fillStyle = "#f8fafc";

          ctx.fillText(truncate(ctx, safeName(user.name), 200), x, y + r + 34);

          // Wins
          ctx.font = "bold 18px Arial";

          ctx.fillStyle = ring;

          ctx.fillText(
            `Wins ${formatNumber(user.slotStats.wins)}`,
            x,
            y + r + 62
          );
        }

        // Add actual rank
        top3.forEach((user, index) => {
          user.rank = index + 1;
        });

        for (const item of podium) {
          if (!item.user) continue;

          drawTopAvatar(item.user, item.x, item.y, item.r, item.ring);
        }

        // ─────────────────────────────────────
        // LIST
        // ─────────────────────────────────────

        const LIST_START = TOP_AREA;

        for (let i = 0; i < pageUsers.length; i++) {
          const user = pageUsers[i];

          const globalRank = start + i + 1;

          const y = LIST_START + i * 94;

          const isMe = String(user.userID) === String(event.senderID);

          // Card
          ctx.beginPath();

          ctx.roundRect(45, y, WIDTH - 90, 72, 15);

          ctx.fillStyle = isMe
            ? "rgba(14,165,233,0.20)"
            : "rgba(30,41,78,0.80)";

          ctx.fill();

          ctx.strokeStyle = isMe ? "#38bdf8" : "rgba(148,163,184,0.12)";

          ctx.lineWidth = isMe ? 2 : 1;

          ctx.stroke();

          // Rank
          ctx.textAlign = "left";

          ctx.font = "bold 18px Arial";

          ctx.fillStyle =
            globalRank === 1
              ? "#facc15"
              : globalRank === 2
              ? "#cbd5e1"
              : globalRank === 3
              ? "#fb923c"
              : "#94a3b8";

          ctx.fillText(`#${globalRank}`, 65, y + 43);

          // Avatar
          const avX = 132;
          const avY = y + 36;
          const avR = 25;

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
            ctx.fillStyle = "#334155";

            ctx.fillRect(avX - avR, avY - avR, avR * 2, avR * 2);
          }

          ctx.restore();

          // Name
          ctx.font = "bold 19px Arial";

          ctx.fillStyle = isMe ? "#7dd3fc" : "#f1f5f9";

          ctx.fillText(truncate(ctx, safeName(user.name), 220), 175, y + 31);

          // Stats
          ctx.font = "14px Arial";

          ctx.fillStyle = "#94a3b8";

          ctx.fillText(
            `Wins ${formatNumber( user.slotStats.wins )} • ${user.slotStats.winRate.toFixed(1)}%`,
            175,
            y + 53
          );

          // Progress bar
          const barX = 470;
          const barY = y + 29;
          const barW = 250;
          const barH = 11;

          ctx.beginPath();

          ctx.roundRect(barX, barY, barW, barH, 6);

          ctx.fillStyle = "rgba(255,255,255,0.08)";

          ctx.fill();

          const maxWins = Math.max(playedUsers[0].slotStats.wins, 1);

          const ratio = Math.min(user.slotStats.wins / maxWins, 1);

          const activeW = Math.max(ratio * barW, 8);

          const grad = ctx.createLinearGradient(barX, 0, barX + activeW, 0);

          grad.addColorStop(0, "#06b6d4");

          grad.addColorStop(1, "#38bdf8");

          ctx.beginPath();

          ctx.roundRect(barX, barY, activeW, barH, 6);

          ctx.fillStyle = grad;

          ctx.shadowColor = "#22d3ee";

          ctx.shadowBlur = 10;

          ctx.fill();

          ctx.shadowBlur = 0;

          // Streak
          ctx.textAlign = "right";

          ctx.font = "bold 16px Arial";

          ctx.fillStyle = "#fbbf24";

          ctx.fillText(`🔥 ${user.slotStats.streak}`, WIDTH - 65, y + 42);

          // YOU
          if (isMe) {
            ctx.font = "bold 13px Arial";

            ctx.fillStyle = "#38bdf8";

            ctx.fillText("YOU", WIDTH - 65, y + 61);
          }
        }

        // ─────────────────────────────────────
        // FOOTER
        // ─────────────────────────────────────

        const footerY = HEIGHT - 120;

        ctx.textAlign = "center";

        ctx.font = "bold 17px Arial";

        ctx.fillStyle = "#94a3b8";

        ctx.fillText(
          `PAGE ${page}/${totalPages} • ${playedUsers.length} PLAYERS`,
          WIDTH / 2,
          footerY
        );

        if (myRank) {
          ctx.font = "bold 21px Arial";

          ctx.fillStyle = "#38bdf8";

          ctx.fillText(
            `👑 YOUR GLOBAL RANK: #${myRank}`,
            WIDTH / 2,
            footerY + 38
          );
        } else {
          ctx.font = "16px Arial";

          ctx.fillStyle = "#64748b";

          ctx.fillText(
            "🎰 Play Slot to enter the Global Ranking",
            WIDTH / 2,
            footerY + 38
          );
        }

        ctx.font = "14px Arial";

        ctx.fillStyle = "rgba(148,163,184,0.55)";

        ctx.fillText(
          "⟡ ARIYAN AI • SLOT GAME GLOBAL RANKING",
          WIDTH / 2,
          HEIGHT - 25
        );

        // ─────────────────────────────────────
        // SAVE IMAGE
        // ─────────────────────────────────────

        const cacheDir = path.join(__dirname, "cache");

        await fs.ensureDir(cacheDir);

        const imagePath = path.join(cacheDir, `slot_top_${Date.now()}.png`);

        await fs.writeFile(imagePath, canvas.toBuffer("image/png"));

        return message.reply(
          {
            body:
              `👑 𝐒𝐋𝐎𝐓 𝐆𝐀𝐌𝐄 𝐆𝐋𝐎𝐁𝐀𝐋 𝐑𝐀𝐍𝐊𝐈𝐍𝐆\n` +
              `📄 Page ${page}/${totalPages}` +
              (myRank ? `\n🏆 Your Rank: #${myRank}` : ""),

            attachment: fs.createReadStream(imagePath),
          },
          () => {
            fs.remove(imagePath).catch(() => {});
          }
        );
      }

      // ═══════════════════════════════════════
      // NORMAL SLOT GAME
      // ═══════════════════════════════════════

      const { senderID } = event;

      if (!args[0]) {
        return message.reply(
          "🎰 𝐒𝐋𝐎𝐓 𝐆𝐀𝐌𝐄\n\n" +
            "💰 /slot 50k\n" +
            "💰 /slot 1m\n" +
            "💰 /slot 20m\n\n" +
            "👑 /slot top\n" +
            "📄 /slot top 2"
        );
      }

      const amount = parseAmount(args[0]);

      if (isNaN(amount) || amount <= 0) {
        return message.reply("❌ ইনপুট সঠিক নয়!");
      }

      if (amount > MAX_BET) {
        return message.reply(
          `❌ একবারে সর্বোচ্চ ${formatNumber(MAX_BET)} পর্যন্ত খেলতে পারবেন!`
        );
      }

      const outcome = await withUserLock(String(senderID), async () => {
        const userData = (await usersData.get(senderID)) || {};

        const userMoney = Number(userData.money) || 0;

        if (amount > userMoney) {
          return {
            type: "insufficient",
            userMoney,
          };
        }

        const currentData =
          userData.data && typeof userData.data === "object"
            ? userData.data
            : {};

        const oldSlotInfo =
          currentData.slotInfo && typeof currentData.slotInfo === "object"
            ? currentData.slotInfo
            : {};

        const now = Date.now();

        let count = Number(oldSlotInfo.count) || 0;

        let lastTime = Number(oldSlotInfo.lastTime) || 0;

        if (!lastTime || now - lastTime >= COOLDOWN_MS) {
          count = 0;
          lastTime = now;
        }

        if (count >= MAX_SPINS) {
          const remaining = Math.max(0, COOLDOWN_MS - (now - lastTime));

          const hours = Math.floor(remaining / (60 * 60 * 1000));

          const minutes = Math.floor(
            (remaining % (60 * 60 * 1000)) / (60 * 1000)
          );

          return {
            type: "limited",
            hours,
            minutes,
          };
        }

        const result = rollResult();

        const { symbols, multiplier, title } = result;

        const win = multiplier > 0;

        const winnings = win ? Math.floor(amount * multiplier) : 0;

        const profit = win ? winnings - amount : -amount;

        const finalMoney = userMoney + profit;

        const newCount = count + 1;

        // ─────────────────────────────
        // STATS
        // ─────────────────────────────

        let wins = Number(oldSlotInfo.wins) || 0;

        let losses = Number(oldSlotInfo.losses) || 0;

        let totalSpins = Number(oldSlotInfo.totalSpins) || 0;

        let streak = Number(oldSlotInfo.streak) || 0;

        let bestStreak = Number(oldSlotInfo.bestStreak) || 0;

        totalSpins++;

        if (win) {
          wins++;
          streak++;

          if (streak > bestStreak) {
            bestStreak = streak;
          }
        } else {
          losses++;
          streak = 0;
        }

        await usersData.set(senderID, {
          money: finalMoney,

          data: {
            ...currentData,

            slotInfo: {
              ...oldSlotInfo,

              count: newCount,

              lastTime,

              wins,

              losses,

              totalSpins,

              streak,

              bestStreak,
            },
          },
        });

        let payoutText;

        if (!win) {
          payoutText = `🔴 -$${formatNumber(amount)}`;
        } else if (multiplier === 1) {
          payoutText = "🟡 +$0 (Refund)";
        } else {
          payoutText = `🟢 +$${formatNumber(profit)}`;
        }

        return {
          type: "result",

          symbols,
          title,
          payoutText,

          finalMoney,

          newCount,

          wins,

          losses,

          totalSpins,

          streak,
        };
      });

      // ─────────────────────────────────────
      // RESPONSES
      // ─────────────────────────────────────

      if (outcome.type === "insufficient") {
        return message.reply(
          `💸 আপনার একাউন্টে পর্যাপ্ত ব্যালেন্স নেই!\n\n` +
            `💰 Balance: $${formatNumber(outcome.userMoney)}`
        );
      }

      if (outcome.type === "limited") {
        return message.reply(
          `🛑 slot 𝐋𝐈𝐌𝐈𝐓 𝐑𝐄𝐀𝐂𝐇𝐄𝐃!\n\n` +
            `🎰 Used: [ ${MAX_SPINS}/${MAX_SPINS} ]\n` +
            `⏳ আবার খেলতে পারবেন: ${outcome.hours}h ${outcome.minutes}m পর।\n\n` +
            `🔄 প্রতি 3 ঘণ্টায় আবার ${MAX_SPINS}টি spin পাবেন।`
        );
      }

      const resultMsg =
        `🌸 ━━ 𝑨𝒀𝑴𝑨 𝒁𝑶𝑵𝑬 ━━ 🌸\n` +
        `[ ${outcome.symbols.join(" | ")} ]\n\n` +
        `${outcome.title}\n\n` +
        `💰 Payout: ${outcome.payoutText}\n` +
        `💳 Wallet: $${formatNumber(outcome.finalMoney)}\n` +
        `🎟️ slot: [ ${outcome.newCount}/${MAX_SPINS} ]\n` +
        `🏆 Wins: ${outcome.wins}\n` +
        `🔥 Streak: ${outcome.streak}\n\n` +
        `⏳ Limit resets every 3 hours`;

      return message.reply(resultMsg);
    } catch (error) {
      console.error("[SLOT ERROR]", error);

      return message.reply(`❌ Slot Error:\n${error.message}`);
    }
  },
};
