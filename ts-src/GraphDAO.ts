import neo4j, {Driver, types, int} from 'neo4j-driver';
import {Actor, User} from "./Old/Model";
import {Body, Color, Finish, Nose, Palate} from "./Model";


class GraphDAO {

    private driver: Driver;

    constructor() {
        this.driver = neo4j.driver(`bolt://${process.env.GRAPHDB_HOST}`, neo4j.auth.basic('neo4j', process.env.GRAPHDB_PASSWORD));
    }

    async prepare() {
        await this.run("CREATE CONSTRAINT ON (w:Whiskey) ASSERT w.id IS UNIQUE", {});
        await this.run("CREATE CONSTRAINT ON (u:User) ASSERT u.id IS UNIQUE", {});
    }

    async close() {
        await this.driver.close();
    }

    async upsertWhiskey(whiskeyId: string, whiskeyName: string, whiskeyPer: number) {
      return await this.run(
          'MERGE (w:Whiskey{id: $whiskeyId, percent: $whiskeyPer}) ON CREATE SET w.name = $whiskeyName RETURN w', {
              whiskeyId,
              whiskeyPer,
              whiskeyName,
          })
  }

    async upsertColor(whiskeyId: string, color: Color) {
        return await this.run(`
      MATCH (w:Whiskey{ id: $whiskeyId })
      MERGE (c:Color{id: $colorId})
        ON CREATE SET c.name = $colorName
      MERGE (w)-[r:IS]->(c)
    `, {
            whiskeyId,
            colorId: color.id,
            colorName: color.name,
        })
    }

    async upsertNose(whiskeyId: string, nose: Nose) {
        return await this.run(`
      MATCH (w:Whiskey{ id: $whiskeyId })
      MERGE (n:Nose{id: $noseId})
        ON CREATE SET n.name = $noseName
      MERGE (w)-[r:SMELL_LIKE]->(n)
    `, {
            whiskeyId,
            noseId: nose.id,
            noseName: nose.name,
        })
    }

    async upsertBody(whiskeyId: string, body: Body) {
        return await this.run(`
      MATCH (w:Whiskey{ id: $whiskeyId })
      MERGE (b:Body{id: $bodyId})
        ON CREATE SET b.name = $bodyName
      MERGE (w)-[r:IS]->(b)
    `, {
            whiskeyId,
            bodyId: body.id,
            bodyName: body.name,
        })
    }

    async upsertPalate(whiskeyId: string, palate: Palate) {
        return await this.run(`
      MATCH (w:Whiskey{ id: $whiskeyId })
      MERGE (p:Palate{id: $palateId})
        ON CREATE SET p.name = $palateName
      MERGE (w)-[r:TASTE]->(p)
    `, {
            whiskeyId,
            palateId: palate.id,
            palateName: palate.name,
        })
    }

    async upsertFinish(whiskeyId: string, finish: Finish) {
        return await this.run(`
      MATCH (w:Whiskey{ id: $whiskeyId })
      MERGE (f:Finish{id: $finishId})
        ON CREATE SET f.name = $finishName
      MERGE (w)-[r:HAS_AS_FINISH]->(f)
    `, {
            whiskeyId,
            finishId: finish.id,
            finishName: finish.name,
        })
    }

    async upsertUser(user: User) {
        return await this.run(`
      MERGE (u:User {id: $userId})
      ON CREATE SET u.isBot = $isBot,
                    u.firstName = $firstName,
                    u.lastName = $lastName,
                    u.username = $username,
                    u.languageCode = $languageCode
      ON MATCH SET  u.isBot = $isBot,
                    u.firstName = $firstName,
                    u.lastName = $lastName,
                    u.username = $username,
                    u.languageCode = $languageCode
    `, {
            userId: this.toInt(user.id),
            firstName: user.first_name,
            lastName: user.last_name,
            username: user.username,
            languageCode: user.language_code,
            isBot: user.is_bot,
        });
    }

    async getTopPercentage() {
      return await this.run(`
        MATCH (w:Whiskey)
        RETURN w
        ORDER BY w.percent
        LIMIT 10
      `, {}).then((result) => result.records);
    }

    private toInt(value: number | string) {
        return int(value);
    }


    private async run(query: string, params: any) {
        const session = this.driver.session();
        const result = await session.run(query, params);
        await session.close();
        return result;
    }

}

export default GraphDAO;
