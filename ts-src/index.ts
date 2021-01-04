import * as dotenv from 'dotenv';

dotenv.config();

import { Telegraf } from 'telegraf';
import { InlineKeyboardMarkup, InlineQueryResultArticle } from 'telegraf/typings/telegram-types';

import DocumentDAO from './DocumentDAO';
import GraphDAO from './GraphDAO';
import { Liked, likedValues } from './Model';

const bot = new Telegraf(process.env.BOT_TOKEN);
const graphDAO = new GraphDAO();
const documentDAO = new DocumentDAO();

function stripMargin(template: TemplateStringsArray, ...expressions: any[]) {
  const result = template.reduce((accumulator, part, i) => {
      return accumulator + expressions[i - 1] + part;
  });
  return result.replace(/(\n|\r|\r\n)\s*\|/g, '$1');
}

function buildLikeKeyboard(movieId: string, currentLike?: Liked): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      likedValues.map((v) => ({
        text: currentLike && currentLike.rank === v ? "★".repeat(v) : "☆".repeat(v),
        callback_data: v + '__' + movieId, // payload that will be retrieved when button is pressed
      })),
    ],
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

bot.command('searchByPercentAlcohol', async (ctx) => {
  const msg = ctx.message.text;
  const regex = /searchByPercentAlcohol (\d+(.\d+)?)/;
  if (regex.test(msg)) {
    const val = msg.split(regex);
    const search = Number(val);

    ctx.reply('nio')
  }
})

bot.command('help', (ctx) => {
  ctx.reply(`
A demo for the project given in the MAC course at the HEIG-VD.

A user can display a whiskey and set a appreciation to this whiskey (like, dislike).
When asked, the bot will provide a recommendation based on the whiskeys he liked or disliked.

Use inline queries to display a whiskey, then use the inline keyboard of the resulting message to react.
Use the command /recommendactor to get a personalized recommendation.
  `);
});

bot.command('start', (ctx) => {
  ctx.reply(
      'A little about Whis-Key, we are students of the HEIG-VD who develop this project as part of the MAC ' +
      'course with the Pr. Fatemi Nastaran and the TA. Hochet Guillaume and Meier Christopher');
});


// Initialize mongo connexion
// before starting bot
documentDAO.init().then(() => {
  bot.startPolling();
});
