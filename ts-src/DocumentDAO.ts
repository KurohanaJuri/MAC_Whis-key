import {Collection, Db, MongoClient} from "mongodb";
import {Whiskey} from "./Model";

class DocumentDAO {

    private client: MongoClient;

    private db: Db;

    private collection: Collection;

    async init(): Promise<any> {
        return new Promise((resolve) => {
            MongoClient.connect(`mongodb://${process.env.DOCUMENTDB_USERNAME}:${process.env.DOCUMENTDB_PWD}@${process.env.DOCUMENTDB_HOST}`, (err, client) => {
                if (err !== null) throw err;
                this.client = client;
                this.db = client.db(process.env.DOCUMENTDB_NAME);
                this.collection = this.db.collection('whiskey-mac');
                resolve(null);
            });
        });
    }

    async close() {
        await this.client.close();
    }

    async insertWhiskey(whiskey: Partial<Whiskey>) {
        await this.collection.insertOne(whiskey)
    }

    async getWhiskeyByName(search: string): Promise<Whiskey[]> {
        return await this.collection.find({'name': new RegExp(search)}).limit(10).toArray();
    }

    async getWhiskeyById(id: string) {
        return await this.collection.findOne({_id: id})
    }

    async getAllWhiskies(): Promise<Whiskey[]> {
        return (await this.collection.find().toArray()).map((it) => ({
            ...it,
            _id: it._id.toString()
        }))
    }

}

export default DocumentDAO;
