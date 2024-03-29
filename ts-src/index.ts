import * as dotenv from 'dotenv';

dotenv.config();

import { Telegraf } from 'telegraf';
import { InlineKeyboardMarkup, InlineQueryResultArticle } from 'telegraf/typings/telegram-types';

import DocumentDAO from './DocumentDAO';
import GraphDAO from './GraphDAO';
import { Liked, likedValues, Whiskey } from './Model';
import {TelegrafContext} from "telegraf/typings/context";

const bot = new Telegraf(process.env.BOT_TOKEN);
const graphDAO = new GraphDAO();
const documentDAO = new DocumentDAO();

function stripMargin(template: TemplateStringsArray, ...expressions: any[]) {
    const result = template.reduce((accumulator, part, i) => {
        return accumulator + expressions[i - 1] + part;
    });
    return result.replace(/(\n|\r|\r\n)\s*\|/g, '$1');
}

function buildLikeKeyboard(whiskeyId: string, currentLike?: Liked): InlineKeyboardMarkup {
    return {
        inline_keyboard: [
            likedValues.map((v) => ({
                text: currentLike && currentLike.rank === v ? "★".repeat(v) : "☆".repeat(v),
                callback_data: v + '__' + whiskeyId, // payload that will be retrieved when button is pressed
            })),
        ],
    }
}

async function replyWithCtxStarKeyboard(whiskey: Whiskey, ctx: TelegrafContext) {

    const msg = stripMargin`
                  |Name: ${whiskey.name}
                  |Color: ${whiskey.color}
                  |Nose: ${whiskey.noses}
                  |Body: ${whiskey.bodies}
                  |Palate: ${whiskey.palates}
                  |Finish : ${whiskey.finishes}
                  |Percent: ${whiskey.percent}
                  |Region: ${whiskey.region}
                  |District: ${whiskey.district}
                `

    const id = whiskey._id.toString()

    const liked = await graphDAO.getWhiskeyLiked(ctx.from.id, id);

    if (liked !== null) {
        await ctx.reply(msg, {
            reply_markup: buildLikeKeyboard(whiskey._id, liked)
        })
    } else {
        await ctx.reply(msg, {
            reply_markup: buildLikeKeyboard(whiskey._id)
        })
    }
}

// User is using the inline query mode on the bot
bot.on('inline_query', async (ctx) => {
  const query = ctx.inlineQuery;
  if (query) {
    const whiskies = await documentDAO.getWhiskeyByName(query.query);
    const answer: InlineQueryResultArticle[] = whiskies.map((whiskey) => ({
      id: whiskey._id,
      type: 'article',
      title: whiskey.name,
      description: '',
      reply_markup: buildLikeKeyboard(whiskey._id),
      input_message_content: {
        message_text: stripMargin`
          |Name: ${whiskey.name}
          |Color: ${whiskey.color}
          |Nose: ${whiskey.noses}
          |Body: ${whiskey.bodies}
          |Palate: ${whiskey.palates}
          |Finish : ${whiskey.finishes}
          |Percent: ${whiskey.percent}
          |Region: ${whiskey.region}
          |District: ${whiskey.district}
        `
      },
    }));
    ctx.answerInlineQuery(answer);
  }
});

bot.command('searchbypercentalcohol', async (ctx) => {
    const msg = ctx.message.text;
    const regex = /searchbypercentalcohol (\d+(.\d+)?) (\d+(.\d+)?)/;
    if (regex.test(msg)) {
        const val = msg.split(regex);

        // index defined by the array returned by split

        let minPercent: number = +val[1]
        let maxPercent: number = +val[3]

        graphDAO.findByPercentAlchol(minPercent, maxPercent).then((whiskies) => {
            let answer: string = ''

            if (whiskies.records.length > 0) {
                whiskies.records.map(async (record) => {
                    const found = record.get('n')
                    const whiskiesByName = await documentDAO.getWhiskeyByName(found.properties.name)
                    const whiskey = whiskiesByName[0]

                    await replyWithCtxStarKeyboard(whiskey, ctx)
                });
            } else {
                ctx.reply('No whiskies found')
            }
        }).catch((error) => {
            console.log(error)
        })

    }
})

// User chose a whiskey from the list displayed in the inline query
// Used to update the keyboard and show filled stars if user already liked it
bot.on('chosen_inline_result', async (ctx) => {
    if (ctx.from && ctx.chosenInlineResult) {
        const liked = await graphDAO.getWhiskeyLiked(ctx.from.id, ctx.chosenInlineResult.result_id);
        if (liked !== null) {
            ctx.editMessageReplyMarkup(buildLikeKeyboard(ctx.chosenInlineResult.result_id, liked));
        }
    }
});

bot.on('callback_query', async (ctx) => {
    if (ctx.callbackQuery && ctx.from) {
        const [rank, whiskeyId] = ctx.callbackQuery.data.split('__');
        console.log(rank, whiskeyId);
        const liked: Liked = {
            rank: parseInt(rank, 10),
            at: new Date()
        };
        await graphDAO.upsertWhiskeyLiked({
            first_name: 'unknown',
            last_name: 'unknown',
            language_code: 'fr',
            is_bot: false,
            username: 'unknown',
            ...ctx.from,
        }, whiskeyId, liked);
        ctx.editMessageReplyMarkup(buildLikeKeyboard(whiskeyId, liked));
    }
});

bot.command('help', (ctx) => {
    ctx.reply(`
This project is developed in as part of MAC course at the HEIG-VD.

A user can display a whiskey with a inline query and give a note to this whiskey. 
We can recommend whiskies based on the likes and we can show which tastes the user likes the most.

Available command :

/help - List all the commands below and describe this project.
/top10highestpercentage - List the whiskeys with the highest percentage of alcohol.
/taste - Shows the user's taste grouped by nose, body, palate and finish.
/liked - List all whiskeys liked by the current user.
/top10liked - List the top 10 whiskey liked by ours users
/recommendwhiskies - List whiskeys recommended depending on the user's likes
/searchbypercentalcohol - List whiskeys with an alcohol percentage between the range ]min, max[
  `);
});

bot.command('start', (ctx) => {
    ctx.reply('HEIG-VD Mac project');
});

bot.command('top10highestpercentage', (ctx) => {

    graphDAO.getTopPercentage().then((records) => {
        if (records.length === 0) ctx.reply("There is no records available.");
        else {

            records.map(async (record) => {
                const found = record.get('w')
                const whiskies = await documentDAO.getWhiskeyByName(found.properties.name)
                const whiskey = whiskies[0]

                await replyWithCtxStarKeyboard(whiskey, ctx)
            })
        }
    });
});

bot.command('top10liked', (ctx) => {
    graphDAO.getTop10Liked().then((records) => {
        if (records.length === 0)
            ctx.reply("There is no records available.");
        else {
            records.map(async (record) => {
                const name = record.get('name');
                const whiskies = await documentDAO.getWhiskeyByName(name)
                const whiskey = whiskies[0]

                await replyWithCtxStarKeyboard(whiskey, ctx)
            })
        }
    });
});


bot.command('liked', (ctx) => {
    graphDAO.getWhiskiesLikedByUser(ctx.from.id).then((records) => {

        if (records.length === 0) ctx.reply("You don't put any liked to a whiskey :(\n" +
            "You can search a whiskey with an inline query and add a like\n");
        else {
            records.map(async (record) => {
                const found = record.get('w')
                const whiskies = await documentDAO.getWhiskeyByName(found.properties.name)
                const whiskey = whiskies[0]

                await replyWithCtxStarKeyboard(whiskey, ctx)
            })
        }
    })
})

bot.command('taste', (ctx) => {
    graphDAO.getUserTaste(ctx.from.id).then((records) => {

        if (records.length === 0) {
            ctx.reply(`We can't find your taste, did you liked any whiskey ?`)
        } else {

            let noseList = []
            let bodyList = []
            let palateList = []
            let finishList = []


        records.map((record) => {
            const label = record.get('n').labels[0]
            const name = record.get('n').properties.name

            switch (label) {
                case "Nose" :
                    noseList.push(name)
                    break
                case "Body":
                    bodyList.push(name)
                    break
                case "Palate":
                    palateList.push(name)
                    break
                case "Finish" :
                    finishList.push(name)
                    break
            }
        });

            ctx.reply(`We found what your prefer in your whiskies : \n\tNose: ${noseList}\n\tBody: ${bodyList}\n\tPalate: ${palateList}\n\tFinish: ${finishList}`)
        }
    })
})

bot.command('recommendwhiskies', (ctx) => {
        graphDAO.recommendWhiskies(ctx.from.id).then((records) => {
            if(records.length === 0){
                ctx.reply("You haven't liked enough whiskies to have recommendations")
            }else{
                const whiskiesList = records.map((record) => {
                    return record.get('w').properties.name
                }).join("\n\t")

                ctx.reply(`Based your liked and dislike we found the following whiskies:\n\t${whiskiesList}`)
            }
        })
    }
)

// Initialize mongo connexion
// before starting bot
documentDAO.init().then(() => {
  bot.startPolling();
});
