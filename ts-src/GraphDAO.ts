import neo4j, {Driver, types, int} from 'neo4j-driver';
import {Body, Color, Finish, Liked, Nose, Palate, User, Whiskey} from "./Model";


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

    async upsertWhiskeyLiked(user: User, whiskeyId: string, liked: Liked) {
        await this.run(`
        MATCH (w:Whiskey {id: $whiskeyId})
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
            MERGE (u)-[l:LIKED]->(w)
              ON CREATE SET l.rank = $likedRank,
                            l.at = $likedAt
              ON MATCH SET  l.rank = $likedRank,
                            l.at = $likedAt
        `, {
            whiskeyId,
            isBot: user.is_bot,
            firstName: user.first_name,
            lastName: user.last_name,
            languageCode: user.language_code,
            username: user.username,
            userId: this.toInt(user.id),
            likedRank: liked.rank,
            likedAt: this.toDate(liked.at),
        })
    }

    async getWhiskeyLiked(userId: number, whiskeyId: string): Promise<Liked | null> {
        return await this.run('MATCH (:User{id: $userId})-[l:LIKED]-(:Whiskey{id: $whiskeyId}) RETURN l', {
            userId,
            whiskeyId,
        }).then((res) => {
            if (res.records.length === 0) return null;
            else {
                const record = res.records[0].get('l');
                return {
                    rank: record.properties.rank,
                    at: record.properties.at,
                }
            }
        });
    }

    async getWhiskiesLikedByUser(userId: number) {
        return await this.run(`
           match (:User{id: $userId})-[l:LIKED]-(w:Whiskey) return w, l.rank as rank 
        `, {
            userId
        }).then((res) =>
            res.records
        )
    }

    /**
     * create a request by taste categories, wait that all promises resolved and return the list of all result
     * @param userId
     */
    async getUserTaste(userId: number) {
        let palateRes
        let palate = this.run('MATCH (:User{id : $userId})-[l:LIKED]-(w:Whiskey)-[:TASTE]-(p:Palate)\n' +
            'with p, count(*) * l.rank as c\n' +
            'with p, sum(c) as total\n' +
            'with max(total) as maxValue\n' +
            'Match (:User{id : $userId})-[l:LIKED]-(w:Whiskey)-[:TASTE]-(p:Palate)\n' +
            'with p, count(*) * l.rank as c, maxValue\n' +
            'with p, sum(c) as total, maxValue\n' +
            'where total >= maxValue\n' +
            'return p as n', {
            userId
        }).then((res) => {
            palateRes = res.records
        })

        let noseRes
        let nose = this.run('MATCH (:User{id : $userId})-[l:LIKED]-(w:Whiskey)-[:SMELL_LIKE]-(n:Nose)\n' +
            'with n, count(*) * l.rank as c\n' +
            'with n, sum(c) as total\n' +
            'with max(total) as maxValue\n' +
            'Match (:User{id : $userId})-[l:LIKED]-(w:Whiskey)-[:SMELL_LIKE]-(n:Nose)\n' +
            'with n, count(*) * l.rank as c, maxValue\n' +
            'with n, sum(c) as total, maxValue\n' +
            'where total >= maxValue\n' +
            'return n as n', {
            userId
        }).then((res) => {
            noseRes = res.records
        })

        let bodyRes
        let body = this.run('  MATCH (:User{id : $userId})-[l:LIKED]-(w:Whiskey)-[:HAS_AS_BODY]-(b:Body)\n' +
            '  with b, count(*) * l.rank as c\n' +
            '  with b, sum(c) as total\n' +
            '  with max(total) as maxValue\n' +
            '  Match (:User{id : $userId})-[l:LIKED]-(w:Whiskey)-[:HAS_AS_BODY]-(b:Body)\n' +
            '  with b, count(*) * l.rank as c, maxValue\n' +
            '  with b, sum(c) as total, maxValue\n' +
            '  where total >= maxValue\n' +
            '  return b as n', {
            userId
        }).then((res) => {
            bodyRes = res.records
        })

        let finishRes
        let finish = this.run('  MATCH (:User{id : 470575552})-[l:LIKED]-(w:Whiskey)-[:HAS_AS_FINISH]-(f:Finish)\n' +
            '  with f, count(*) * l.rank as c\n' +
            '  with f, sum(c) as total\n' +
            '  with max(total) as maxValue\n' +
            '  Match (:User{id : 470575552})-[l:LIKED]-(w:Whiskey)-[:HAS_AS_FINISH]-(f:Finish)\n' +
            '  with f, count(*) * l.rank as c, maxValue\n' +
            '  with f, sum(c) as total, maxValue\n' +
            '  where total >= maxValue\n' +
            '  return f as n', {
            userId
        }).then((res) => {
            finishRes = res.records
        })


        return Promise.all([palate, nose, body, finish]).then(() => {
            return palateRes.concat(noseRes, bodyRes, finishRes)
        })

    }

    /**
     * Return a list of recommended whiskey based on the user (dis)likes
     * @param userId
     */
    async recommendWhiskies(userId: number) {
        return await this.run('MATCH (:User{id:$userId})-[:LIKED]-(:Whiskey)-[]-(c)-[]-(w:Whiskey) \n' +
            // add rand to create a return a list of random whiskies based on the result
            'return c,w, rand() as r \n' +
            'ORDER BY r \n' +
            'limit 10', {
            userId
        }).then((res) => res.records)
    }

    async upsertColor(whiskeyId: string, color: Color) {
        return await this.run(`
      MATCH (w:Whiskey{ id: $whiskeyId })
      MERGE (c:Color{id: $colorId})
        ON CREATE SET c.name = $colorName
      MERGE (w)-[r:IS_COLORED]->(c)
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
      MERGE (w)-[r:HAS_AS_BODY]->(b)
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
        RETURN w, w.percent as perc
        ORDER BY w.percent
        LIMIT 10
      `, {}).then((result) => result.records);
    }

    private toInt(value: number | string) {
        return int(value);
    }

    private toDate(value: Date) {
        return types.DateTime.fromStandardDate(value);
    }

    private async run(query: string, params: any) {
        const session = this.driver.session();
        const result = await session.run(query, params);
        await session.close();
        return result;
    }

}

export default GraphDAO;
