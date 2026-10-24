module.exports = {
  config: {
    name: "rockedplen",
    aliases: ["rocket", "crash"],
    version: "1.0.0",
    author: "𝑨𝑹𝑰𝒀𝑨𝑵",
    countDown: 3,
    role: 0,
    category: "Game",
    description: "🚀 High-Stakes Rocket Plane Crash Game",
    guide: "{pn} <amount>",
  },

  onStart: async function ({ args, message, event, usersData }) {
    const { senderID, messageID } = event;
    const userData = (await usersData.get(senderID)) || {};
    let userMoney = userData.money || 0;

    // --- 1. 𝑨𝑹𝑰𝒀𝑨𝑵 Style Font Mapping ---
    const fonts = {
      a: "𝒂",
      b: "𝒃",
      c: "𝒄",
      d: "𝒅",
      e: "𝒆",
      f: "𝒇",
      g: "𝒈",
      h: "𝒉",
      i: "𝒊",
      j: "𝒋",
      k: "𝒌",
      l: "𝒍",
      m: "𝒎",
      n: "𝒏",
      o: "𝒐",
      p: "𝒑",
      q: "𝒒",
      r: "𝒓",
      s: "𝒔",
      t: "𝒕",
      u: "𝒖",
      v: "𝒗",
      w: "𝒘",
      x: "𝒙",
      y: "𝒚",
      z: "𝛓",
      A: "𝑨",
      B: "𝑩",
      C: "𝑪",
      D: "𝑫",
      E: "𝑬",
      F: "𝑭",
      G: "𝑮",
      H: "𝑯",
      I: "𝑰",
      J: "𝑱",
      K: "𝑩",
      L: "𝑳",
      M: "𝑴",
      N: "𝑵",
      O: "𝑶",
      P: "𝑷",
      Q: "𝑤",
      R: "𝑹",
      S: "𝑺",
      T: "𝑻",
      U: "𝑼",
      V: "𝑽",
      W: "𝑾",
      X: "𝑫",
      Y: "𝒀",
      Z: "𝒁",
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
      ".": ".",
      "+": "+",
      "-": "-",
    };
    const stylize = (text) =>
      text
        .toString()
        .split("")
        .map((char) => fonts[char] || char)
        .join("");

    // --- 2. Input Validation ---
    if (!args[0])
      return message.reply(
        `⚠️ ${stylize("Please enter a bet amount! Ex: !rockedplen 100k")}`
      );
    let bet = parseAmount(args[0]);

    if (isNaN(bet) || bet <= 0)
      return message.reply(`❌ ${stylize("Invalid bet amount!")}`);
    if (bet > 10000000)
      return message.reply(
        `🚫 ${stylize("Max bet limit is $10,000,000 (10M)")}`
      );
    if (bet > userMoney)
      return message.reply(
        `💳 ${stylize( "Insufficient balance! You have:" )} $${userMoney.toLocaleString()}`
      );

    // --- 3. Limit Check (20 Limit / 2 Hours Cooldown) ---
    const now = Date.now();
    const cooldownTime = 2 * 60 * 60 * 1000; // 2 Hours
    const maxPlays = 20;

    if (!userData.data) userData.data = {};
    if (!userData.data.rocketInfo) {
      userData.data.rocketInfo = { count: 0, lastTime: now };
    }

    let { count, lastTime } = userData.data.rocketInfo;

    if (now - lastTime > cooldownTime) {
      count = 0;
      lastTime = now;
    }

    if (count >= maxPlays) {
      const remaining = cooldownTime - (now - lastTime);
      const hours = Math.floor(remaining / (60 * 60 * 1000));
      const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
      return message.reply(
        `🛑 ${stylize("Daily limit reached (20/20)!")}\n${stylize( "Try again in:" )} ${hours}h ${minutes}m`
      );
    }

    // Deduct bet immediately
    userMoney -= bet;
    userData.data.rocketInfo = { count: count + 1, lastTime: lastTime };
    await usersData.set(senderID, { money: userMoney, data: userData.data });

    // --- 4. High-Loss Crash Odds Logic (60% Loss / 40% Win, Max 10x) ---
    let crashPoint = 1.0;
    const chance = Math.random();

    if (chance < 0.6) {
      // 60% Chance: Instant or Early Crash (1.0x - 1.8x) -> Pure Loss
      crashPoint = parseFloat((1 + Math.random() * 0.8).toFixed(1));
    } else {
      // 40% Chance: Higher Multiplier (2.0x up to 10.0x)
      crashPoint = parseFloat((2 + Math.random() * 8.0).toFixed(1));
    }

    // Simulation: Player cashout target (Randomized simulating risk/greed)
    // If cashout target < crashPoint, player wins; else loses.
    let playerCashout = parseFloat((1.5 + Math.random() * 5.0).toFixed(1));
    let isWin = false;
    let multiplier = 0;

    if (playerCashout < crashPoint) {
      isWin = true;
      multiplier = playerCashout;
    } else {
      isWin = false;
    }

    let winnings = isWin ? Math.floor(bet * multiplier) : 0;
    const finalBalance = userMoney + winnings;

    // Update Data
    await usersData.set(senderID, { money: finalBalance });

    // --- 5. Clean & Compact UI Message ---
    const statusHeader = isWin
      ? `🎉 ${stylize("CASHOUT SUCCESSFUL!")}`
      : `💥 ${stylize("CRASHED AT")} ${crashPoint}x!`;

    const resultMsg = `🚀 ━━━ ${stylize("ROCKED PLEN")} ━━━ 🚀 ${statusHeader} 💵 ${stylize("BET")} : $${bet.toLocaleString()} 🎯 ${stylize("CRASHED AT")} : ${crashPoint}x 📈 ${stylize("MULTIPLIER")} : ${isWin ? multiplier + "x" : "0x"} 💰 ${isWin ? stylize("PROFIT") : stylize("LOSS")} : ${ isWin ? "+$" + (winnings - bet).toLocaleString() : "-$" + bet.toLocaleString() } 💳 ${stylize("BAL")} : $${finalBalance.toLocaleString()} 📊 ${stylize("LIMIT")} : [ ${count + 1} / 20 ] 🔔 ${stylize("2 Hours cooldown after 20 plays!")}`;

    return message.reply(resultMsg);
  },
};

function parseAmount(input) {
  if (typeof input !== "string") return input;
  const unit = input.slice(-1).toLowerCase();
  const value = parseFloat(input);
  if (unit === "k") return value * 1000;
  if (unit === "m") return value * 1000000;
  if (unit === "b") return value * 1000000000;
  return value;
      }
