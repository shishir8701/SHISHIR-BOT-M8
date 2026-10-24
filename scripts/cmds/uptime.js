const os = require("os");

module.exports = {
  config: {
    name: "uptime",
    aliases: ["up", "upt", "ki"],
    version: "6.0",
    author: "ARIYAN AI",
    role: 0,
    shortDescription: "Advanced Bot Status",
    category: "system",
    guide: "{pn}",
  },

  onStart: async function ({ api, event, usersData, threadsData }) {
    const delay = (ms) => new Promise((res) => setTimeout(res, ms));

    const loadingFrames = [
      "⏳ ᴘʀᴏᴄᴇꜱꜱɪɴɢ... [░░░░░░░░░░]",
      "⏳ ᴘʀᴏᴄᴇꜱꜱɪɴɢ... [▓▓░░░░░░░░]",
      "⏳ ᴘʀᴏᴄᴇꜱꜱɪɴɢ... [▓▓▓▓▓░░░░░]",
      "⏳ ᴘʀᴏᴄᴇꜱꜱɪɴɢ... [▓▓▓▓▓▓▓▓░░]",
      "✅ ᴄᴏᴍᴘʟᴇᴛᴇᴅ! [▓▓▓▓▓▓▓▓▓▓]",
    ];

    try {
      // Step 1: Loading animation with customized style
      const loadingMsg = await api.sendMessage(
        loadingFrames[0],
        event.threadID
      );

      for (let i = 1; i < loadingFrames.length; i++) {
        await delay(300);
        await api.editMessage(loadingFrames[i], loadingMsg.messageID);
      }

      // Step 2: System & Uptime Calculations
      const uptime = process.uptime();
      const hrs = Math.floor(uptime / 3600);
      const mins = Math.floor((uptime % 3600) / 60);
      const secs = Math.floor(uptime % 60);

      const ramUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
      const cpuLoad = os.loadavg()[0].toFixed(2);
      const nodeVersion = process.version;

      // Step 3: Stats Collection
      const allUsers = (await usersData.getAll()) || [];
      const allThreads = (await threadsData.getAll()) || [];

      // Step 4: Advance UI Design
      const statusMessage = ` ╭━━━〔 𝐒𝐘𝐒𝐓𝐄𝐌 𝐒𝐓𝐀𝐓𝐔𝐒 〕━━━🌀 ┃ ┃ 🕒 ᴜᴘᴛɪᴍᴇ: ${hrs}ʜ ${mins}ᴍ ${secs}ꜱ ┃ 🚀 ᴘɪɴɢ: ${Date.now() - event.timestamp}ᴍꜱ ┃ 🧠 ʀᴀᴍ: ${ramUsage} ᴍʙ ┃ 📊 ᴄᴘᴜ ʟᴏᴀᴅ: ${cpuLoad}% ┃ 🌐 ᴘʟᴀᴛꜰᴏʀᴍ: ${os.platform()} ┃ 📦 ɴᴏᴅᴇ: ${nodeVersion} ┣━━━━━━━━━━━━━━━━━━━🌀 ┃ 👥 ᴛᴏᴛᴀʟ ᴜꜱᴇʀꜱ: ${allUsers.length} ┃ 💬 ᴛᴏᴛᴀʟ ɢʀᴏᴜᴘꜱ: ${allThreads.length} ╰━━━━━━━━━━━━━━━━━━━🌀 👤 𝐎𝐰𝐧𝐞𝐫: 𝑺𝑯𝑰𝑺𝑯𝑰𝑹 🔗 𝐂𝐨𝐧𝐭𝐚𝐜𝐭: https://m.me/Ahmed .shishir.nai.gu.kha `.trim();

      await delay(200);
      await api.editMessage(statusMessage, loadingMsg.messageID);
    } catch (err) {
      console.error(err);
      api.sendMessage("❌ ꜱᴏᴍᴇᴛʜɪɴɢ ᴡᴇɴᴛ ᴡʀᴏɴɢ!", event.threadID);
    }
  },
};
