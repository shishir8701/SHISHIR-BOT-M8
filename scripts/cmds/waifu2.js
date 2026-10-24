const axios = require("axios");

module.exports = {
  config: {
    name: "waifu2",
    aliases: ["waifu2, neko"],
    version: "1.0",
    author: "eran",
    countDown: 5,
    role: 0,
    shortDescription: "get random waifu",
    longDescription: "",
    category: "anime",
    guide: "{pn} {{<name>}}",
  },

  onStart: async function ({ message, args }) {
    const name = args.join(" ");
    if (!name)
      try {
        let res = await axios.get(`https://api.waifu.pics/sfw/waifu`);

        let res2 = res.data;
        let img = res2.url;

        const form = {
          body: `𝙽𝚒𝚂𝚊𝙽`,
        };
        if (img) form.attachment = await global.utils.getStreamFromURL(img);
        message.reply(form);
      } catch (e) {
        message.reply(`🥺 Not Found`);
      }
    else {
      try {
        let res = await axios.get(`https://api.waifu.pics/sfw/${name}`);

        let res2 = res.data;
        let img1 = res2.url;

        const form = {
          body: ` 「 𝙽𝙸𝚂𝙰𝙽 𝚁𝙰𝙽𝙳𝙾𝙼 𝚆𝙰𝙸𝙵𝚄 」 `,
        };
        if (img1) form.attachment = await global.utils.getStreamFromURL(img1);
        message.reply(form);
      } catch (e) {
        message.reply(
          `🥺 No waifu 🥲 \n category: waifu, neko, shinobu, megumin, bully, cuddle, cry, kiss, lick, hug, awoo, pat, smug, bonk, yeet, blush, smile, wave, highfive, handhold, nom, bite, glomp, slap, kill, kick, happy, wink, poke, dance, cringe `
        );
      }
    }
  },
};
