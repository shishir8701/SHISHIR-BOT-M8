"use strict";

const axios = require("axios");

const baseApiUrl = async () => {
  const base = await axios.get(
    "https://raw.githubusercontent.com/mahmudx7/exe/main/baseApiUrl.json",
    { timeout: 30000 }
  );
  return base.data.mahmud;
};

const obfuscatedAuthor = String.fromCharCode(77, 97, 104, 77, 85, 68); // MahMUD

module.exports = {
  config: {
    name: "waifugame",
    aliases: ["waifu"],
    version: "1.7.3",
    author: "MahMUD",
    countDown: 10,
    role: 0,
    category: "game",
    description: "Guess the Waifu name game",
    guide: {
      en: "{pn}",
    },
  },

  // =====================================================
  // ON REPLY
  // =====================================================

  onReply: async function ({ api, event, Reply, usersData }) {
    try {
      // Author protection
      if (module.exports.config.author !== obfuscatedAuthor) {
        return api.sendMessage(
          "You are not authorized to change the author name.",
          event.threadID,
          event.messageID
        );
      }

      if (!Reply) return;

      const { waifu, author, messageID } = Reply;
      const getCoin = 500;
      const getExp = 121;

      // Only the person who started the game can answer
      if (String(event.senderID) !== String(author)) {
        return api.sendMessage(
          "𝐓𝐡𝐢𝐬 𝐢𝐬 𝐧𝐨𝐭 𝐲𝐨𝐮𝐫 𝐪𝐮𝐢𝐳 𝐛𝐚𝐛𝐲 >🐸",
          event.threadID,
          event.messageID
        );
      }

      const reply = String(event.body || "")
        .trim()
        .toLowerCase();

      // The API can return multiple accepted names as one comma-separated
      // string (e.g. "Kurisu Makise,Makise,kurisu"). Split them and accept
      // a match against ANY of the accepted variants, not the whole string.
      const acceptedAnswers = String(waifu || "")
        .split(",")
        .map((n) => n.trim().toLowerCase())
        .filter(Boolean);

      const displayName = String(waifu || "")
        .split(",")[0]
        .trim();
      const isCorrect = acceptedAnswers.includes(reply);

      // Clean up onReply listener on answer attempt
      try {
        global.GoatBot.onReply.delete(messageID);
      } catch (_) {}

      // Get user data cleanly
      const userData = (await usersData.get(event.senderID)) || {};
      const currentMoney = Number(userData.money) || 0;
      const currentExp = Number(userData.exp) || 0;

      // Unsend the quiz message
      if (messageID) {
        try {
          await api.unsendMessage(messageID);
        } catch (e) {
          console.error("Unsend error:", e.message);
        }
      }

      // =================================================
      // CORRECT ANSWER
      // =================================================
      if (isCorrect) {
        // Safe Data Update (Preserves existing profile data)
        userData.money = currentMoney + getCoin;
        userData.exp = currentExp + getExp;
        await usersData.set(event.senderID, userData);

        return api.sendMessage(
          `╭━━━━━━━━━━━━━━━━━━╮\n 🎉 𝐂𝐎𝐑𝐑𝐄𝐂𝐓 𝐀𝐍𝐒𝐖𝐄𝐑\n╰━━━━━━━━━━━━━━━━━━╯\n\n✅ 𝐖𝐞𝐥𝐥 𝐝𝐨𝐧𝐞 𝐛𝐚𝐛𝐲! 🐸\n\n💰 +${getCoin} 𝐂𝐨𝐢𝐧𝐬\n✨ +${getExp} 𝐄𝐗𝐏\n\n💳 𝐁𝐚𝐥𝐚𝐧𝐜𝐞: ${( currentMoney + getCoin ).toLocaleString()}\n\n━━━━━━━━━━━━━━━━━━`,
          event.threadID,
          event.messageID
        );
      }

      // =================================================
      // WRONG ANSWER
      // =================================================
      return api.sendMessage(
        `╭━━━━━━━━━━━━━━━━━━╮\n ❌ 𝐖𝐑𝐎𝐍𝐆 𝐀𝐍𝐒𝐖𝐄𝐑\n╰━━━━━━━━━━━━━━━━━━╯\n\n❌ Better luck next time! 🥹\n\n🎯 𝐂𝐨𝐫𝐫𝐞𝐜𝐭 𝐀𝐧𝐬𝐰𝐞𝐫:\n『 ${displayName} 』\n\n━━━━━━━━━━━━━━━━━━`,
        event.threadID,
        event.messageID
      );
    } catch (error) {
      console.error("WAIFU onReply ERROR:", error);
      return api.sendMessage(
        "❌ | An error occurred while checking your answer.",
        event.threadID,
        event.messageID
      );
    }
  },

  // =====================================================
  // ON START
  // =====================================================

  onStart: async function ({ api, event }) {
    if (module.exports.config.author !== obfuscatedAuthor) {
      return api.sendMessage(
        "You are not authorized to change the author name.",
        event.threadID,
        event.messageID
      );
    }

    try {
      const apiUrl = await baseApiUrl();
      const response = await axios.get(`${apiUrl}/api/waifu`, {
        timeout: 30000,
      });

      if (!response.data || !response.data.waifu) {
        throw new Error("Invalid API response.");
      }

      const { name, imgurLink } = response.data.waifu;

      if (!name || !imgurLink) {
        throw new Error("Waifu data missing name or image link.");
      }

      // Download Stream Image
      const imageStream = await axios({
        url: imgurLink,
        method: "GET",
        responseType: "stream",
        headers: { "User-Agent": "Mozilla/5.0" },
        timeout: 60000,
      });

      return api.sendMessage(
        {
          body: `╭━━━━━━━━━━━━━━━━━━╮\n 👑 𝐖𝐀𝐈𝐅𝐔 𝐆𝐀𝐌𝐄\n╰━━━━━━━━━━━━━━━━━━╯\n\n🖼️ A random waifu has appeared!\n\n🤔 𝐆𝐮𝐞𝐬𝐬 𝐭𝐡𝐞 𝐖𝐚𝐢𝐟𝐮'𝐬 𝐍𝐚𝐦𝐞\n\n💰 Reward: +500 Coins\n✨ EXP: +121\n\n⏳ You have 40 seconds!\n\n━━━━━━━━━━━━━━━━━━`,
          attachment: imageStream.data,
        },
        event.threadID,
        (err, info) => {
          if (err) {
            console.error("WAIFU SEND ERROR:", err);
            return;
          }

          // Save Reply Data
          global.GoatBot.onReply.set(info.messageID, {
            commandName: module.exports.config.name,
            type: "reply",
            messageID: info.messageID,
            author: event.senderID,
            waifu: String(name),
          });

          // Auto delete after 40 seconds if active
          setTimeout(async () => {
            const replyData = global.GoatBot.onReply.get(info.messageID);
            if (replyData) {
              global.GoatBot.onReply.delete(info.messageID);
              try {
                await api.unsendMessage(info.messageID);
              } catch (_) {}
            }
          }, 40000);
        },
        event.messageID
      );
    } catch (error) {
      console.error(
        "WAIFU ERROR:",
        error?.response?.data || error?.message || error
      );
      return api.sendMessage(
        "🥹 | Waifu game failed to load.\n\nPlease try again later.",
        event.threadID,
        event.messageID
      );
    }
  },
};
