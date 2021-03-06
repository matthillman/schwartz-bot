const { snapReplyForCompare, scrapeUser } = require('../util/snapshot');
const { getUserFromMention, getAllyCodeForUser } = require('../util/helpers');
const https = require('https');

exports.run = async (client, message, [scrape, ...allyCodes]) => {
    const doScrape = scrape == "--scrape" || scrape == "-s" || scrape == "—scrape" || scrape == "-scrape";

    if (!doScrape) {
        allyCodes.unshift(scrape);
    }

    allyCodes = allyCodes.map(c => c.replace(/\-/g, ''));

    let allyCodeNotFound = false;

    const realCodes = [];

    for (const code of allyCodes) {
        if (/^[0-9]{9}$/.test(code) || /^g[0-9]+$/.test(code)) {
            realCodes.push(code);
        } else if (/^<@.+>$/.test(code) || code === 'me') {
            const user = (!code || code === 'me') ? message.author : await getUserFromMention(client, code);
            if (user) {
                const realAllyCode = await getAllyCodeForUser(client, user, message);

                if (realAllyCode == null) {
                    allyCodeNotFound = true;
                    continue;
                }

                realCodes.push(realAllyCode);
            }
        } else if (code) {
            await message.react('🤔');
            await message.reply(`**${code}** does not appear to be a valid ally code 🤦🏻‍♂️`);
            allyCodeNotFound = true;
        }
    }

    if (allyCodeNotFound) {
        return message.reply(`Please correct the above errors and try again`);
    }

    allyCodes = realCodes;

    client.logger.log(`Starting compare for ally codes [${allyCodes.join(', ')}]`);

    await message.react('⏳');

    if (doScrape) {
        const scrapeMessage = await message.channel.send(`Trying to scrape some ally codes [${allyCodes.join(', ')}]…`);
        await scrapeMessage.react('⏳');
        let completeCount = 0;

        allyCodes.forEach(async code => {
            if (/^g[0-9]+$/.test(code)) {
                completeCount += 1;
                return;
            }
            await scrapeUser(client, code, async () => {
                completeCount += 1;

                if (allyCodes.length == completeCount) {
                    await scrapeMessage.react('🎉');
                    await scrapeMessage.delete();

                    await snapReplyForCompare(allyCodes, `member/compare`, message, client, 'members', null, true);
                } else {
                    await scrapeMessage.react('🍺');
                }
            });
        });
    } else {
        await snapReplyForCompare(allyCodes, `member/compare`, message, client, 'members', null, true);
    }

    await message.react('🎉');
    return;
};

exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: ['c'],
    permLevel: "User"
};

exports.help = {
    name: "compare",
    category: "SWGOH",
    description: "Compares some ally codes",
    usage: "compare [ally code]{1,}"
};
