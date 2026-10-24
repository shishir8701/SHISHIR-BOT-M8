const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const GIFEncoder = require("gifencoder");

module.exports = {
  config: {
    name: "spy3",
    version: "10.0",
    author: "Ariyan ",
    countDown: 8,
    role: 0,
    description: "HD Crystal Clear Spy Card with Floating Particles",
    category: "info",
  },

  onStart: async function ({ event, api, message, usersData, threadsData }) {
    const { threadID, messageID, senderID } = event;
    const targetID =
      event.type === "message_reply"
        ? event.messageReply.senderID
        : Object.keys(event.mentions)[0] || senderID;

    try {
      const wait = await message.reply(
        "ЁЯТО wait kor tor xhudling card banacchi..."
      );

      const userData = await usersData.get(targetID);
      const allUsers = await usersData.getAll();
      const threadData = await threadsData.get(threadID);
      const memberData = threadData.members.find((m) => m.userID === targetID);

      // HD ржкрзНрж░рзЛржлрж╛ржЗрж▓ ржкрж┐ржХржЪрж╛рж░ ржЖржирж╛рж░ ржЬржирзНржп ржмрзЬ рж╕рж╛ржЗржЬ ржмрзНржпржмрж╣рж╛рж░
      const avatarUrl = await usersData.getAvatarUrl(targetID);
      const avatarImg = await loadImage(avatarUrl);

      const width = 700,
        height = 950; // рж╕рж╛ржЗржЬ ржХрж┐ржЫрзБржЯрж╛ ржмрж╛рзЬрж╛ржирзЛ рж╣рзЯрзЗржЫрзЗ HD ржХрж░рж╛рж░ ржЬржирзНржп
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");
      const encoder = new GIFEncoder(width, height);
      const path = __dirname + `/cache/hd_spy_${targetID}.gif`;

      if (!fs.existsSync(__dirname + "/cache"))
        fs.mkdirSync(__dirname + "/cache");

      const stream = fs.createWriteStream(path);
      encoder.createReadStream().pipe(stream);
      encoder.start();
      encoder.setRepeat(0);
      encoder.setDelay(90);
      encoder.setQuality(1); // 1 ржорж╛ржирзЗ рж╣рзБржмрж╣рзБ ржЖрж╕рж▓ ржХрзЛрзЯрж╛рж▓рж┐ржЯрж┐ (Highest Quality)

      // ржкрзНрж░рж┐ржорж┐рзЯрж╛ржо ржкрж╛рж░рзНржЯрж┐ржХрзЗрж▓рж╕
      const particles = Array.from({ length: 50 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 4 + 1,
      }));

      for (let i = 0; i < 12; i++) {
        // ржкрж┐ржУрж░ ржмрзНрж▓рзНржпрж╛ржХ ржмрзНржпрж╛ржХржЧрзНрж░рж╛ржЙржирзНржб ржпрж╛рждрзЗ ржкрзНрж░рзЛржлрж╛ржЗрж▓ ржлрзБржЯрзЗ ржУржарзЗ
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, width, height);

        // ржнрж╛рж╕ржорж╛ржи ржХржгрж╛ (HD Particles)
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        particles.forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, (p.y - i * p.speed) % height, p.size, 0, Math.PI * 2);
          ctx.fill();
        });

        // ржирж┐ржУржи рж▓рзБржк ржПржирж┐ржорзЗрж╢ржи
        const hue = (i * 30) % 360;
        ctx.strokeStyle = `hsla(${hue}, 100%, 50%, 1)`;
        ctx.lineWidth = 12;
        ctx.shadowBlur = 20;
        ctx.shadowColor = `hsla(${hue}, 100%, 50%, 1)`;
        ctx.strokeRect(20, 20, width - 40, height - 40);
        ctx.shadowBlur = 0;

        // ржкрзНрж░рзЛржлрж╛ржЗрж▓ ржкрж┐ржХржЪрж╛рж░ (HD Clear)
        ctx.save();
        ctx.beginPath();
        ctx.arc(width / 2, 160, 100, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(avatarImg, width / 2 - 100, 60, 200, 200); // рж╕рж╛ржЗржЬ ржмрж╛рзЬрж┐рзЯрзЗ ржбрзНрж░рзЯрж┐ржВ ржпрж╛рждрзЗ ржХрзНрж▓рж┐рзЯрж╛рж░ ржерж╛ржХрзЗ
        ctx.restore();

        // ржкрзНрж░рзЛржлрж╛ржЗрж▓ рж░рж┐ржВ
        ctx.beginPath();
        ctx.arc(width / 2, 160, 105, 0, Math.PI * 2);
        ctx.lineWidth = 6;
        ctx.strokeStyle = "#FFFFFF";
        ctx.stroke();

        // ржЧрзНрж▓рзЛрзЯрж┐ржВ ржирж╛ржо
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 45px Arial";
        ctx.textAlign = "center";
        ctx.shadowBlur = 15;
        ctx.shadowColor = `hsla(${hue}, 100%, 50%, 1)`;
        ctx.fillText(
          (userData.name || "Unknown").toUpperCase(),
          width / 2,
          310
        );
        ctx.shadowBlur = 0;

        // ржкрзНрж░рж┐ржорж┐рзЯрж╛ржо ржЗржиржлрзЛ ржбрж┐ржЯрзЗржЗрж▓рж╕
        const info = [
          { l: "ЁЯЖФ UID", v: targetID },
          { l: "ЁЯМР USERNAME", v: userData.vanity || "None" },
          { l: "ЁЯЪ╗ GENDER", v: userData.gender == 1 ? "Female" : "Male" },
          { l: "ЁЯТ░ MONEY", v: `$${userData.money || 0}` },
          { l: "тЪб EXP", v: userData.exp || 0 },
          { l: "ЁЯТм MESSAGES", v: memberData ? memberData.count || 0 : 0 },
          {
            l: "ЁЯПЖ GLOBAL RANK",
            v: `#${ allUsers .sort((a, b) => b.exp - a.exp) .findIndex((u) => u.userID == targetID) + 1 }`,
          },
        ];

        info.forEach((item, index) => {
          const yPos = 390 + index * 70;
          // ржкрзНрж░рж┐ржорж┐рзЯрж╛ржо ржЧрзНрж▓рж╛рж╕ ржХрж╛рж░рзНржб рж╕рзНржЯрж╛ржЗрж▓
          ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
          ctx.fillRect(60, yPos - 35, 580, 55);

          ctx.fillStyle = "#00FFFF";
          ctx.font = "bold 22px Arial";
          ctx.textAlign = "left";
          ctx.fillText(item.l, 80, yPos + 2);

          ctx.fillStyle = "#FFFFFF";
          ctx.font = "22px Arial";
          ctx.textAlign = "right";
          ctx.fillText(item.v, 620, yPos + 2);
        });

        encoder.addFrame(ctx);
      }

      encoder.finish();

      stream.on("finish", () => {
        api.unsendMessage(wait.messageID);
        message.reply(
          {
            body: " тЬи xhudling card hareЁЯРд!!",
            attachment: fs.createReadStream(path),
          },
          () => fs.unlinkSync(path)
        );
      });
    } catch (err) {
      console.error(err);
      message.reply(
        "тЭМ ржЬрж╛ржирзБ, ржлрж╛ржЗрж▓ рж╕рж╛ржЗржЬ ржмрзЬ рж╣ржУрзЯрж╛рзЯ ржкрзНрж░рж╕рзЗрж╕рж┐ржВ ржПрж░рж░ рж╣рзЯрзЗржЫрзЗред"
      );
    }
  },
};
