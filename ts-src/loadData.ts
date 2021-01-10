import * as dotenv from 'dotenv';
import parse from 'csv-parse';
import {promises as fs} from 'fs';
import cliProgress from 'cli-progress';
import {join} from 'path';

import DocumentDAO from "./DocumentDAO";
import GraphDAO from "./GraphDAO";
import {User} from "./Model";


dotenv.config();

const buildUser = (id: number, username: string, first_name: string, last_name: string, language_code: string, is_bot: boolean): User => ({
    id,
    username,
    first_name,
    last_name,
    language_code,
    is_bot
});

const shuffle = (array: any[]): any[] => {

    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * i);
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }

    return array;
};


const parseWhiskies = async (): Promise<any[]> => new Promise((resolve) => {
    fs.readFile(join(__dirname, '../data/python/cleanDataSet.csv')).then((baseWhiskey) => {
        parse(baseWhiskey, (err, data) => {
            console.log(data)
            resolve(data);
        });
    });
});

const users: User[] = [
    buildUser(220987852, 'ovesco', 'guillaume', '', 'fr', false),
    buildUser(136451861, 'thrudhvangr', 'christopher', '', 'fr', false),
    buildUser(136451862, 'NukedFace', 'marcus', '', 'fr', false),
    buildUser(136451863, 'lauralol', 'laura', '', 'fr', false),
    buildUser(136451864, 'Saumonlecitron', 'jean-michel', '', 'fr', false),
];

const graphDAO = new GraphDAO();
const documentDAO = new DocumentDAO();

(async () => {
    console.log('Starting mongo');
    await documentDAO.init();
    console.log('Preparing Neo4j');
    await graphDAO.prepare();

    console.log('Writing users to neo4j');
    await Promise.all(users.map((user) => graphDAO.upsertUser(user)));

    // Write movies in mongo
    console.log('Parsing CSV and writing movies to mongo');
    const parseWhiskiesBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    const parsedWhiskies = await parseWhiskies();
    parseWhiskiesBar.start(parsedWhiskies.length, 0);
    await Promise.all(parsedWhiskies.map(async (it: any) => {
        const [
            name, color, nose, body, palate, finish, percent, region, district
        ] = it;
        await documentDAO.insertWhiskey({
            name, color, noses: nose, bodies: body, palates: palate, finishes: finish, percent, region, district
        })
        parseWhiskiesBar.increment();
    }))
    parseWhiskiesBar.stop();

    // Load them back to get their id along
    console.log('Loading whiskies back in memory');
    const whiskies = await documentDAO.getAllWhiskies();

    // Retrieve all  color, nose, body, palate and finish from all whiskies, split them and assign a numeric id
    console.log('Calculating color, nose, body, palate and finish');
    const color = [...new Set(whiskies.flatMap((it) =>
        it.color.split(',').map(it => it.trim())))].map((it, i) => [i, it]);
    const noses = [...new Set(whiskies.flatMap((it) =>
        it.noses.split(',').map(it => it.trim())))].map((it, i) => [i, it]);
    const bodies = [...new Set(whiskies.flatMap((it) =>
        it.bodies.split(',').map(it => it.trim())))].map((it, i) => [i, it]);
    const palates = [...new Set(whiskies.flatMap((it) =>
        it.palates.split(',').map(it => it.trim())))].map((it, i) => [i, it]);
    const finishes = [...new Set(whiskies.flatMap((it) =>
        it.finishes.split(',').map(it => it.trim())))].map((it, i) => [i, it]);

    console.log('Handling whiskey insertion in Neo4j');
    const whiskiesBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    whiskiesBar.start(whiskies.length, 0);
    for (let whiskey of whiskies) {
        const whiskeyNose = whiskey.noses.split(',').map(i => i.trim());
        const whiskeyBody = whiskey.bodies.split(',').map(i => i.trim());
        const whiskeyPalates = whiskey.palates.split(',').map(i => i.trim());
        const whiskeyFinishes = whiskey.finishes.split(',').map(i => i.trim());

        await graphDAO.upsertWhiskey(whiskey._id, whiskey.name, whiskey.percent);

        // Update whiskey <-> color links
        let colorId = color.find((it) => it[1] === whiskey.color)[0] as number;
        await graphDAO.upsertColor(whiskey._id, {id: colorId, name: whiskey.color})

        // Update whiskey <-> nose links
        await Promise.all(whiskeyNose.map((name) => {
            const id = noses.find((it) => it[1] === name)[0] as number;
            return graphDAO.upsertNose(whiskey._id, {id, name})
        }))

        // Update whiskey <-> body links
        await Promise.all(whiskeyBody.map((name) => {
            const id = bodies.find((it) => it[1] === name)[0] as number;
            return graphDAO.upsertBody(whiskey._id, {id, name})
        }))

        // Update whiskey <-> palate links
        await Promise.all(whiskeyPalates.map((name) => {
            const id = palates.find((it) => it[1] === name)[0] as number;
            return graphDAO.upsertPalate(whiskey._id, {id, name})
        }))

        // Update whiskey <-> finish links
        await Promise.all(whiskeyFinishes.map((name) => {
            const id = finishes.find((it) => it[1] === name)[0] as number;
            return graphDAO.upsertFinish(whiskey._id, {id, name})
        }))
        whiskiesBar.increment();
    }
    whiskiesBar.stop();


    console.log('Done, closing sockets');
    await Promise.all([
        documentDAO.close(),
        graphDAO.close()
    ]);
})();
