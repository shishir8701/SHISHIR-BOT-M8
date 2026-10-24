const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const GIFEncoder = require("gifencoder");
const os = require("os");

module.exports = {
  config: {
    name: "up3",
    version: "14.0",
    author: "Ariyan ",
    countDown: 5,
    role: 0,
    description: "Premium Animated Bot System Status",
    category: "system",
  },

  onStart: async function ({ api, event, message, usersData }) {
    // তোমার ফিক্সড আইডি যাতে সবসময় তোমার প্রোফাইল শো করে
    const ownerID = "61593785589368";

    try {
      const wait = await message.reply(
        "⚙️ apnr dirim puron hobe wait korun 🐤!"
      );

      const avatarUrl = await usersData.getAvatarUrl(ownerID);
      const avatarImg = await loadImage(avatarUrl);

      // সিস্টেম ডাটা ক্যালকুলেশন
      const uptime = process.uptime();
      const hours = Math.floor(uptime / 3600);
      const mins = Math.floor((uptime % 3600) / 60);
      const secs = Math.floor(uptime % 60);

      const totalRAM = (os.totalmem() / 1024 ** 3).toFixed(2);
      const usedRAM = ((os.totalmem() - os.freemem()) / 1024 ** 3).toFixed(2);

      const width = 800,
        height = 800;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");
      const encoder = new GIFEncoder(width, height);
      const path = __dirname + `/cache/up_premium_${ownerID}.gif`;

      if (!fs.existsSync(__dirname + "/cache"))
        fs.mkdirSync(__dirname + "/cache");

      const stream = fs.createWriteStream(path);
      encoder.createReadStream().pipe(stream);
      encoder.start();
      encoder.setRepeat(0);
      encoder.setDelay(80);
      encoder.setQuality(1);

      // ৮০টি প্রিমিয়াম ভাসমান পার্টিকেলস
      const particles = Array.from({ length: 80 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2.5 + 0.5,
        speed: Math.random() * 5 + 2,
      }));

      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, width, height);

        // পার্টিকেলস এনিমেশন
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        particles.forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, (p.y - i * p.speed) % height, p.size, 0, Math.PI * 2);
          ctx.fill();
        });

        // নিওন বর্ডার লুপ
        const hue = (i * 30) % 360;
        ctx.strokeStyle = `hsla(${hue}, 100%, 50%, 1)`;
        ctx.lineWidth = 15;
        ctx.shadowBlur = 25;
        ctx.shadowColor = `hsla(${hue}, 100%, 50%, 1)`;
        ctx.strokeRect(30, 30, width - 60, height - 60);
        ctx.shadowBlur = 0;

        // টাইটেল (নতুন নাম দেওয়া হয়েছে)
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 55px Arial";
        ctx.textAlign = "left";
        ctx.fillText("CORE ENGINE", 70, 110);
        ctx.fillStyle = "#00FFFF";
        ctx.fillText("MONITOR", 70, 175);

        // ওনার প্রোফাইল (HD Circle - Right Top)
        ctx.save();
        ctx.beginPath();
        ctx.arc(630, 140, 90, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(avatarImg, 540, 50, 180, 180);
        ctx.restore();

        ctx.beginPath();
        ctx.arc(630, 140, 95, 0, Math.PI * 2);
        ctx.lineWidth = 5;
        ctx.strokeStyle = "#FFFFFF";
        ctx.stroke();

        // ওনার নাম
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 22px Arial";
        ctx.textAlign = "center";
        ctx.fillText("AhmeD'z shishir", 630, 260);

        // সিস্টেম ইনফো লিস্ট
        const stats = [
          { l: "⏱️ UPTIME", v: `${hours}h ${mins}m ${secs}s` },
          { l: "💾 USED RAM", v: `${usedRAM} GB` },
          { l: "🔋 TOTAL RAM", v: `${totalRAM} GB` },
          { l: "🖥️ PLATFORM", v: os.platform().toUpperCase() },
          { l: "📡 ARCHITECTURE", v: os.arch() },
          { l: "⚙️ CPU CORES", v: os.cpus().length },
        ];

        stats.forEach((s, idx) => {
          const y = 350 + idx * 65;
          ctx.fillStyle = "rgba(0, 255, 255, 0.1)";
          ctx.fillRect(70, y - 40, 660, 55);

          ctx.fillStyle = "#00FFFF";
          ctx.font = "bold 26px Arial";
          ctx.textAlign = "left";
          ctx.fillText(`>> ${s.l}`, 90, y);

          ctx.fillStyle = "#FFFFFF";
          ctx.font = "26px Arial";
          ctx.textAlign = "right";
          ctx.fillText(s.v, 710, y);
        });

        encoder.addFrame(ctx);
      }

      encoder.finish();

      stream.on("finish", () => {
        api.unsendMessage(wait.messageID);
        message.reply(
          {
            body: "🚀 999+din up hobe dirim 😞🥀!",
            attachment: fs.createReadStream(path),
          },
          () => fs.unlinkSync(path)
        );
      });
    } catch (err) {
      console.error(err);
      message.reply("❌ জানু, সিস্টেম ডাটা লোড করতে সমস্যা হয়েছে।");
    }
  },
};
