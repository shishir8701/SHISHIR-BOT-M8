const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const GIFEncoder = require("gif-encoder-2");
const twemoji = require("twemoji");
const fetch = require("node-fetch");

// ======================================================
// GAME CONFIGURATION
// ======================================================
const symbols = ["🍒", "🍋", "🍊", "🍉", "⭐", "🔔", "💎", "7️⃣"];

const payouts = {
  "7️⃣7️⃣7️⃣": 200,
  "💎💎💎": 100,
  "🔔🔔🔔": 50,
  "⭐⭐⭐": 30,
  "🍉🍉🍉": 20,
  "🍊🍊🍊": 15,
  "🍋🍋🍋": 10,
  "🍒🍒🍒": 6,
  "🍒🍒": 3,
  "🍋🍋": 3,
  "🍊🍊": 3,
  "🍉🍉": 3,
  "⭐⭐": 3,
  "🔔🔔": 3,
  "💎💎": 5,
  "7️⃣7️⃣": 10,
};

// ======================================================
// LIMIT CONFIGURATION
// ======================================================
const MAX_BET = 2000000;
const MAX_PLAYS = 20;
const COOLDOWN = 3 * 60 * 60 * 1000; // 3 hours

// ======================================================
// EMOJI CACHE & PRELOAD
// ======================================================
const emojiCache = {};

async function preloadEmojis() {
  for (const emoji of symbols) {
    if (emojiCache[emoji]) continue;
    try {
      const codePoint = twemoji.convert.toCodePoint(emoji);
      const emojiUrl = `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/${codePoint}.png`;
      const response = await fetch(emojiUrl);
      if (!response.ok)
        throw new Error(`Failed to fetch emoji: ${response.statusText}`);
      const buffer = await response.buffer();
      emojiCache[emoji] = await loadImage(buffer);
    } catch (error) {
      console.error(`Emoji load failed for ${emoji}:`, error.message);
      const tempCanvas = createCanvas(72, 72);
      const tempCtx = tempCanvas.getContext("2d");
      const fallbackColors = {
        "🍒": "#FF0000",
        "🍋": "#FFFF00",
        "🍊": "#FFA500",
        "🍉": "#008000",
        "⭐": "#FFD700",
        "🔔": "#FFD700",
        "💎": "#4169E1",
        "7️⃣": "#FFFFFF",
      };
      tempCtx.fillStyle = fallbackColors[emoji] || "#FFFFFF";
      tempCtx.font = "bold 50px Arial";
      tempCtx.textAlign = "center";
      tempCtx.textBaseline = "middle";
      tempCtx.fillText(emoji, 36, 36);
      emojiCache[emoji] = await loadImage(tempCanvas.toBuffer());
    }
  }
}

function drawEmoji(ctx, x, y, emoji, size = 70) {
  const img = emojiCache[emoji];
  if (!img) {
    ctx.font = `bold ${Math.floor(size * 0.9)}px Arial`;
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(emoji, x, y + Math.floor(size * 0.3));
    return;
  }
  ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
}

// ======================================================
// NUMBER SHORTENER
// ======================================================
const units = ["", "K", "M", "B", "T", "Q"];
function shortenNumber(num) {
  if (typeof num !== "number") num = Number(num) || 0;
  if (num < 1000) return String(num);
  let unitIndex = 0;
  let n = num;
  while (n >= 1000 && unitIndex < units.length - 1) {
    n /= 1000;
    unitIndex++;
  }
  return n.toFixed(2).replace(/\.?0+$/, "") + units[unitIndex];
}

// ======================================================
// STRICT ODDS LOGIC (65% Loss / 35% Win)
// ======================================================
function getResult() {
  const rand = Math.random();

  if (rand < 0.65) {
    // 65% Pure Loss (All 3 symbols different)
    const shuffled = [...symbols].sort(() => 0.5 - Math.random());
    return [shuffled[0], shuffled[1], shuffled[2]];
  } else {
    // 35% Win Chance
    const winRand = Math.random();
    if (winRand < 0.15) {
      // Jackpot
      const sym = symbols[Math.floor(Math.random() * symbols.length)];
      return [sym, sym, sym];
    } else {
      // Double (Match 2 symbols side-by-side)
      const sym = symbols[Math.floor(Math.random() * symbols.length)];
      const other = symbols.filter((s) => s !== sym)[
        Math.floor(Math.random() * (symbols.length - 1))
      ];
      return Math.random() < 0.5 ? [sym, sym, other] : [other, sym, sym];
    }
  }
}

function calculateWinnings(result, bet) {
  const joined = result.join("");
  if (payouts[joined])
    return { amount: bet * payouts[joined], winType: "JACKPOT" };

  const two01 = result[0] + result[1];
  const two12 = result[1] + result[2];

  if (payouts[two01])
    return { amount: bet * payouts[two01], winType: "DOUBLE" };
  if (payouts[two12])
    return { amount: bet * payouts[two12], winType: "DOUBLE" };

  return { amount: 0, winType: "LOSS" };
}

// ======================================================
// MODULE START
// ======================================================
module.exports = {
  config: {
    name: "slots",
    aliases: ["slotvip"],
    version: "3.2.0",
    author: "Ariyan AI",
    role: 0,
    category: "economy",
    guide: "{pn} <bet_amount>",
  },

  onStart: async function ({ message, event, usersData, args }) {
    const senderID = event.senderID;
    const uid = event.senderID;
    const userData = await usersData.get(uid);

    const vipExpires = Number(userData?.data?.vip?.expires || 0);

    // Permanent VIP হলে expires = 0
    const isPermanentVIP = userData?.data?.vip?.expires === 0;

    // Temporary VIP হলে expiry এখনো শেষ হয়নি
    const isTempVIP = vipExpires > Date.now();

    if (!isPermanentVIP && !isTempVIP) {
      return message.reply(
        "👑 𝗩𝗜𝗣 𝗙𝗘𝗔𝗧𝗨𝗥𝗘 𝗢𝗡𝗟𝗬!\n\n" +
          "Only VIP members can play the Slot Machine.\n" +
          "💎 Type /vip to buy a VIP subscription."
      );
    }

    // ==================================================
    // BET VALIDATION
    // ==================================================
    const betAmount = parseInt(args[0]);

    if (isNaN(betAmount) || betAmount <= 0) {
      return message.reply(
        `🎰 Please enter a valid bet amount.\n💰 Maximum bet: $${shortenNumber( MAX_BET )}`
      );
    }
    if (betAmount > MAX_BET) {
      return message.reply(`❌ Maximum bet is $${shortenNumber(MAX_BET)}.`);
    }
    if (userData.money < betAmount) {
      return message.reply(
        `💰 You don't have enough money.\n💳 Your balance: $${shortenNumber( userData.money )}`
      );
    }

    // ==================================================
    // CASINO LIMIT CHECK (Perfected Logic)
    // ==================================================
    const now = Date.now();
    if (!userData.data.casinoLimit) {
      userData.data.casinoLimit = { count: 0, resetAt: now + COOLDOWN };
    }

    let limitData = userData.data.casinoLimit;

    if (now >= limitData.resetAt) {
      limitData.count = 0;
      limitData.resetAt = now + COOLDOWN;
    }

    if (limitData.count >= MAX_PLAYS) {
      const remaining = limitData.resetAt - now;
      const hours = Math.floor(remaining / (60 * 60 * 1000));
      const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
      return message.reply(
        `⛔ 𝗦𝗟𝗢𝗧 𝗟𝗜𝗠𝗜𝗧\n━━━━━━━━━━━━━━━━━━\n` +
          `🎰 You have used all ${MAX_PLAYS} plays.\n` +
          `⏳ Try again after: ${hours}h ${minutes}m\n` +
          `🔄 Limit resets every 3 hours.`
      );
    }

    // ==================================================
    // PROCESSING
    // ==================================================
    const processingMessage = await message.reply(
      "🎰 Creating your VIP Slot Machine, please wait..."
    );

    try {
      await preloadEmojis();

      // Update Limit & Deduct Bet
      limitData.count += 1;
      userData.data.casinoLimit = limitData;

      const result = getResult();
      const { amount: winnings, winType } = calculateWinnings(
        result,
        betAmount
      );

      // Save Final Data
      userData.money = userData.money - betAmount + winnings;
      await usersData.set(senderID, userData);

      // =================================================
      // GIF GENERATION (Unchanged Core Graphics)
      // =================================================
      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const gifPath = path.join(cacheDir, `slot_${senderID}_${Date.now()}.gif`);

      const canvasWidth = 600;
      const canvasHeight = 400;
      const encoder = new GIFEncoder(canvasWidth, canvasHeight);
      const gifStream = fs.createWriteStream(gifPath);

      encoder.createReadStream().pipe(gifStream);
      encoder.start();
      encoder.setRepeat(0);
      encoder.setDelay(100);
      encoder.setQuality(15);

      const canvas = createCanvas(canvasWidth, canvasHeight);
      const ctx = canvas.getContext("2d");

      const reelPositionsX = [150, 300, 450];
      const reelWindowY = 190;
      const frameCount = 30;

      for (let i = 0; i < frameCount; i++) {
        // Background
        const gradient = ctx.createLinearGradient(
          0,
          0,
          canvasWidth,
          canvasHeight
        );
        gradient.addColorStop(0, "#1a1a2e");
        gradient.addColorStop(1, "#16213e");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Machine body
        ctx.fillStyle = "#222242";
        ctx.fillRect(80, 110, 440, 160);
        ctx.strokeStyle = "#ffcc00";
        ctx.lineWidth = 5;
        ctx.strokeRect(80, 110, 440, 160);

        // Title
        ctx.fillStyle = "#ffcc00";
        ctx.shadowColor = "rgba(255, 204, 0, 0.6)";
        ctx.shadowBlur = 10;
        ctx.font = "bold 44px Arial";
        ctx.textAlign = "center";
        ctx.fillText("👑 VIP SLOTS 👑", canvasWidth / 2, 60);
        ctx.shadowBlur = 0;
        ctx.textAlign = "left";

        // Reels
        for (let r = 0; r < 3; r++) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(reelPositionsX[r] - 50, reelWindowY - 50, 100, 100);
          ctx.clip();

          const stopFrame = 10 + r * 6;

          if (i < stopFrame) {
            const spinOffset = (i * 20 + r * 10) % 120;
            for (let s = -1; s < 2; s++) {
              const randomSymbol =
                symbols[Math.floor(Math.random() * symbols.length)];
              drawEmoji(
                ctx,
                reelPositionsX[r],
                reelWindowY + spinOffset + s * 100 - 50,
                randomSymbol,
                70
              );
            }
          } else {
            if (winType !== "LOSS") {
              ctx.shadowColor = "#ffcc00";
              ctx.shadowBlur = 15;
            }
            drawEmoji(ctx, reelPositionsX[r], reelWindowY, result[r], 70);
            ctx.shadowBlur = 0;
          }

          ctx.restore();
          ctx.strokeStyle = "#444466";
          ctx.lineWidth = 2;
          ctx.strokeRect(reelPositionsX[r] - 50, reelWindowY - 50, 100, 100);
        }

        // Result Text on Last Frames
        if (i >= frameCount - 2) {
          ctx.fillStyle = winnings > 0 ? "#4ade80" : "#ef4444";
          ctx.font = "bold 28px Arial";
          ctx.textAlign = "center";

          if (winType === "JACKPOT") {
            ctx.fillText(`JACKPOT! ${result.join(" ")}`, canvasWidth / 2, 320);
          } else if (winType === "DOUBLE") {
            ctx.fillText(`DOUBLE! ${result.join(" ")}`, canvasWidth / 2, 320);
          } else {
            ctx.fillText("NO WIN", canvasWidth / 2, 320);
            ctx.fillStyle = "#ef4444";
            ctx.font = "bold 22px Arial";
            ctx.fillText(
              `You lost: $${shortenNumber(betAmount)}`,
              canvasWidth / 2,
              355
            );
          }

          if (winnings > 0) {
            ctx.fillStyle = "#ffcc00";
            ctx.font = "bold 22px Arial";
            ctx.fillText(
              `You won: $${shortenNumber(winnings)}`,
              canvasWidth / 2,
              355
            );
          }

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 18px Arial";
          ctx.fillText(
            `Bet: $${shortenNumber(betAmount)} | Balance: $${shortenNumber( userData.money )}`,
            canvasWidth / 2,
            385
          );
        }

        encoder.addFrame(ctx);
      }

      for (let hold = 0; hold < 12; hold++) {
        encoder.addFrame(ctx);
      }
      encoder.finish();

      await new Promise((resolve, reject) => {
        gifStream.on("finish", resolve);
        gifStream.on("error", reject);
      });

      // =================================================
      // SEND RESULT MESSAGE
      // =================================================
      let resultMessage = "🎰 𝗩𝗜𝗣 𝗦𝗟𝗢𝗧 𝗠𝗔𝗖𝗛𝗜𝗡𝗘 🎰\n";
      resultMessage += `💰 Bet: $${shortenNumber(betAmount)}\n`;
      resultMessage += `🎯 Result: ${result.join(" ")}\n`;

      if (winType === "JACKPOT")
        resultMessage += `🎉 JACKPOT! Three ${result[0]} symbols!\n`;
      else if (winType === "DOUBLE")
        resultMessage += `✨ DOUBLE! Two matching symbols!\n`;
      else
        resultMessage += `❌ No Win! You lost $${shortenNumber(betAmount)}\n`;

      if (winnings > 0)
        resultMessage += `💰 You won: $${shortenNumber(winnings)}!\n`;

      resultMessage += `💳 New balance: $${shortenNumber(userData.money)}\n`;
      resultMessage += `📊 Casino Limit: ${limitData.count}/${MAX_PLAYS}\n`;

      await message.reply(
        { body: resultMessage, attachment: fs.createReadStream(gifPath) },
        () => {
          try {
            if (fs.existsSync(gifPath)) fs.unlinkSync(gifPath);
          } catch (_) {}
        }
      );

      try {
        if (processingMessage && typeof message.unsend === "function") {
          await message.unsend(processingMessage.messageID);
        }
      } catch (_) {}
    } catch (error) {
      console.error("Slot machine error:", error);
      try {
        if (processingMessage && typeof message.unsend === "function") {
          await message.unsend(processingMessage.messageID);
        }
      } catch (_) {}
      return message.reply(
        "❌ Sorry, the slot machine encountered an error.\nPlease try again later."
      );
    }
  },
};
