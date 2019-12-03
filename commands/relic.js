const https = require('https');
const { snapshot } = require('../util/snapshot');
const { Attachment } = require('discord.js');

const getUserFromMention = async (client, mention) => {
	if (!mention) return;

	if (mention.startsWith('<@') && mention.endsWith('>')) {
		mention = mention.slice(2, -1);

		if (mention.startsWith('!')) {
			mention = mention.slice(1);
		}

        client.logger.log(`Fetching user ${mention} from mention`);
		return await client.fetchUser(mention);
	}
};

exports.run = async (client, message, [allyCode]) => {
    if (allyCode) {
        allyCode = allyCode.replace(/\-/g, '');
    }

    let realAllyCode = null;
    if (/^[0-9]{9}$/.test(allyCode)) {
        realAllyCode = allyCode;
    } else if (/^<@.+>$/.test(allyCode) || allyCode === 'me') {
        const user = (!allyCode || allyCode === 'me') ? message.author : await getUserFromMention(client, allyCode);
        if (user) {
            const response = await client.axios.get(`/api/registration/${user.id}`, {
                httpsAgent: new https.Agent({
                    rejectUnauthorized: false
                })
            });
            realAllyCode = response.data.get.filter(obj => obj.discordId === user.id).map(obj => obj.allyCode);
            client.logger.log(`Got ally code ${JSON.stringify(realAllyCode)} from user ${user.id}`);

            if (!realAllyCode.length) {
                await message.react('🤔');
                return message.reply(`"${user.username}" does not have an associated ally code. Register one with
\`\`\`
${message.settings.prefix}register {ally code}
\`\`\``);
            }
        }
    } else if (allyCode) {
        await message.react('🤔');
        return message.reply(`${allyCode} does not appear to be a valid ally code`);
    }

    await message.react('⏳');

    if (realAllyCode === null) {
        const URL = `${client.config.client.base_url}/relics`;
        const buffer = await snapshot(URL);
        await message.channel.send(new Attachment(buffer, `relics.png`));
    } else {
        if (!Array.isArray(realAllyCode)) {
            realAllyCode = [realAllyCode];
        }

        for (const code of realAllyCode) {
            const URL = `${client.config.client.base_url}/relics/${code}`;
            const buffer = await snapshot(URL);
            await message.channel.send(new Attachment(buffer, `${code}.png`));
        }
    }

    await message.react('🎉');
    return;
};

exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: ['r'],
    permLevel: "User"
};

exports.help = {
    name: "relic",
    category: "SWGOH",
    description: "Shows relic recommendations or compares a user's roster to the recommendations. If no ally code (or 'me') is given, the recommendation list is returned",
    usage: "relic [ally code?]"
};
