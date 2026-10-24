const axios = require("axios");

module.exports = {
  config: {
    name: "waifuadult",
    aliases: ["anihot2", "pnx", "noughti"],
    version: "2.0",
    author: "xalman",
    countDown: 3,
    role: 0,
    shortDescription: "Get anime nsfw image",
    longDescription: "Fetch direct image from API",
    category: "media",
    guide: "{pn}",
  },

  onStart: async function ({ api, event, args, message, usersData }) {
    /// ==========================================
    // ЁЯСС VIP CHECK LOGIC
    // ==========================================
    const uid = event.senderID;
    const userData = await usersData.get(uid);

    const vipExpires = Number(userData?.data?.vip?.expires || 0);

    // Permanent VIP рж╣рж▓рзЗ expires = 0
    const isPermanentVIP = userData?.data?.vip?.expires === 0;

    // Temporary VIP рж╣рж▓рзЗ expiry ржПржЦржирзЛ рж╢рзЗрж╖ рж╣рзЯржирж┐
    const isTempVIP = vipExpires > Date.now();

    if (!isPermanentVIP && !isTempVIP) {
      return message.reply(
        "рждрзБржЗ ржЧрж░рж┐ржм" +
          "ржЧрж░рж┐ржм ржорж╛ржирзБрж╖ ржПржЧрзБрж▓рзЛ ржмрзНржпржмрж╣рж╛рж░ ржХрж░рждрзЗ ржкрж╛рж░рзЗ ржирж╛" +
          "ржзржирзЗрж░ ржорж╛рж▓рж┐ржХ рж╣рждрзЗ ржЪрж╛ржЗрж▓рзЗ ржЯрж╛ржЗржк /VIP"
      );
    }
    // ==========================================
    try {
      const response = await axios.get(
        "https://xalman-apis.vercel.app/api/waifuadult",
        {
          responseType: "stream",
        }
      );

      return api.sendMessage(
        {
          body: "ЁЯШЛЁЭЧЫЁЭЧ▓ЁЭЧ┐ЁЭЧ▓ ЁЭЧ╢ЁЭША ЁЭШЖЁЭЧ╝ЁЭШВЁЭЧ┐ ЁЭЧоЁЭЧ▒ЁЭШВЁЭЧ╣ЁЭШБ ЁЭЧоЁЭЧ╗ЁЭЧ╢ЁЭЧ║ЁЭЧ▓ ЁЭЧ╢ЁЭЧ║ЁЭЧоЁЭЧ┤ЁЭЧ▓ЁЯлжЁЯТЛ",
          attachment: response.data,
        },
        event.threadID,
        event.messageID
      );
    } catch (error) {
      return api.sendMessage("Error fetching image.", event.threadID);
    }
  },
};
