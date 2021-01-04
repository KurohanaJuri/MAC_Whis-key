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

bot.command('help', (ctx) => {
  ctx.reply(`
A demo for the project given in the MAC course at the HEIG-VD.

A user can display a movie and set a reaction to this movie (like, dislike).
When asked, the bot will provide a recommendation based on the movies he liked or disliked.

Use inline queries to display a movie, then use the inline keyboard of the resulting message to react.
Use the command /recommendactor to get a personalized recommendation.
  `);
});

bot.command('start', (ctx) => {
  ctx.reply('HEIG-VD Mac project example bot in javascript');
});

bot.command('Top10HighestPercentage', (ctx) => {

  graphDAO.getTopPercentage().then((records) => {
    if (records.length === 0) ctx.reply("There is no records available.");
    else {
      const whiskeyList = records.map((record) => {
        const name = record.get('w').properties.name;
        const percent = record.get('w').properties.percent;

        return `${name}` + ` (${percent}%)`;
      }).join("\n\t");

      ctx.reply(`====== TOP 10 ======\nHIGHEST % WHISKEYS\n====================\n${whiskeyList}`);
    }
  });
});

// Initialize mongo connexion
// before starting bot
documentDAO.init().then(() => {
  bot.startPolling();
});
