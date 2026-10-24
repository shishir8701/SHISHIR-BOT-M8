const activeFights = {};

module.exports = {
  config: {
    name: "son",
    version: "1.0.0",
    author: "ARIYAN",
    countDown: 5,
    role: 2,
    category: "fight",
    shortDescription: { en: "Automated insults for a mentioned user" },
    guide: { en: "{pn} @mention | {pn} off" },
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, messageID, mentions, senderID } = event;

    if (args[0] === "off") {
      if (!activeFights[threadID]) {
        return message.reply(" age on kor chdna ЁЯШЮ");
      }
      delete activeFights[threadID];
      return message.reply("chdn off korlam ja muri kha ! ЁЯЧ┐");
    }

    const mention = Object.keys(mentions)[0];
    if (!mention) {
      return message.reply("mention den boss ore cde dei aktu.ЁЯШЮ");
    }

    if (activeFights[threadID]) {
      return message.reply("ager Jon er cdn off kor age ЁЯЩВЁЯЩП");
    }

    api.getUserInfo(mention, (err, userInfo) => {
      if (err) return message.reply("user info err !oy Sala akta gay..!┬б");

      let genderText;
      switch (userInfo[mention].gender) {
        case 1:
          genderText = "ржорж╛ржЗржпрж╝рж╛";
          break;
        case 2:
          genderText = "ржкрзЛрж▓рж╛";
          break;
        default:
          genderText = "рж╣рж┐ржЬржбрж╝рж╛";
      }

      activeFights[threadID] = {
        targetID: mention,
        index: 0,
        gender: genderText,
      };

      return message.reply(
        `ЁЯШЖ ржХрж┐рж░рзЗ ${mentions[mention].replace( "@", "" )}! ржХрзЗржоржи ржЖржЫрж┐рж╕..тА╜`
      );
    });
  },

  onChat: async function ({ api, event, message }) {
    const { threadID, senderID } = event;

    if (!activeFights[threadID]) return;

    const fight = activeFights[threadID];

    if (senderID == fight.targetID) {
      const insults = [
        `ржЦрж╛ржВржХрж┐рж░ ${fight.gender}, рждрзЛрж░ ржорж╛рж░ ржнрзЛржжрж╛ рждрзЗ ржЧрж╛ржзрж╛рж░ ржорж╛рж▓ ржлрж╛рж▓рж╛ржмрзЛ! ЁЯШИ`,
        `рждрзЛрж░ ржорж╛ ржХрзЗ ржЪрзБржжрзЗ ржЪрзБржжрзЗ ржкрж▓рзНржЯрж┐ ржорж╛рж░ржмрзЛ, ржЧрж╛ржзрж╛рж░ ${fight.gender}! ЁЯШб`,
        `ржмрж╛ржбрж╝рж┐рж░ ржкрж╛рж╢рзЗ ржЖржорж╛рж░ ржорж╛рж▓ ржлрзЗрж▓рзЗ ржжрж┐ржпрж╝рзЗ рждрзЛрж░ ржорж╛ ржХрзЗ ржЪрзБржжрждрзЗ ржЪрж╛ржЗ! ЁЯФе`,
        `ржЪрзБржжрж╛ ржЦрж╛ржУржпрж╝рж╛ рждрзЛрж░ ржорж╛рж░, ржЖржорж┐ рждрзЛрж░ ржорж╛рж░ ржнрзЛржжрж╛ржпрж╝ ржЯрж╛ржи ржжрж┐ржмрзЛ! ЁЯТг`,
        `рждрзЛрж░ ржорж╛рж░ ржЧрзБржжрзЗ ржлрзБрж▓ ржЯрзНржпрж╛ржмрж▓рзЗржЯ ржкрзБрж╢ ржХрж░рзЗ, ржЧрж╛ржзрж╛рж░ ${fight.gender}! ЁЯШЫ`,
        `рждрзЛрж░ ржмрзЛржирзЗрж░ ржорзБржЦрзЗ ржорж╛рж▓ ржлрж╛рж▓рж╛ржирзЛрж░ ржХржерж╛ ржнрж╛ржмрж┐, ржорж╛ржЧрзА ${fight.gender}!`,
        `рждрзЛрж░ ржорж╛ржХрзЗ ржЧрж╛ржзрж╛рж░ ржорждрзЛ ржЪрзБржжрзЗ рждрзЛрж░ ржорж╛ ржмрж▓ржм "ржПржЯрж╛ ржХрж╛рж░ ржорж╛рж▓?"`,
        `рждрзЛрж░ ржорж╛рж░ ржЧрзБржжрзЗ ржЗржиржкрзБржЯ ржжрж┐ржпрж╝рзЗ ржЖржЙржЯржкрзБржЯ ржирзЗржмрзЛ, ржкрзЛрж▓рж╛ржкрж╛ржЗржи ${fight.gender}!`,
        `рждрзЛрж░ ржорж╛рж░ ржнрзЛржжрж╛ржпрж╝ ржЧрж╛ржзрж╛рж░ ржорждрзЛ ржорж╛рж▓ ржлрж╛рж▓рж┐ржпрж╝рзЗ ржжрзЗржмрзЛ, ржЖржЬржХрзЗрж░ рж░рж╛рждрзЗржЗ! ЁЯФе`,
        `ржПржЦржи ржорж╛ржЧрзАрж░ ${fight.gender} рждрзЛрж░ ржорж╛рж░ ржнрзЛржжрж╛ ржЪрзБржжрзЗ, ржПржХ ржЯрзБржХрж░рж╛ ржжрзЗржмрзЛ! ЁЯШа`,
        `рждрзЛрж░ ржорж╛ ржХрзЗ ржЪрзБржжрзЗ ржкрж▓рзНржЯрж┐ ржорж╛рж░ржмрзЛ, ржЧрж╛ржзрж╛рж░ ${fight.gender}! ЁЯдб`,
      ];

      const currentInsult = insults[fight.index % insults.length];
      fight.index++;

      return message.reply(currentInsult);
    }
  },
};
