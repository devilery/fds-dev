import {createConnection} from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import * as entities from '../entity'

const config = {
    'name': 'default',
    'namingStrategy': new SnakeNamingStrategy(),
    "type": 'postgres',
    "synchronize": Boolean(process.env.PG_AUTO_DROP_DB),
    "logging": process.env.TYPEORM_LOG == 'true',
    "entities": Object.values(entities),
    "migrations": [
        "../migration/**/*.ts"
    ],
    "subscribers": [
        "../subscriber/**/*.ts"
    ],
    "cli": {
        "entitiesDir": "../entity",
        "migrationsDir": "../migration",
        "subscribersDir": "../subscriber"
    }
};

if (process.env.DATABASE_URL) {
    config['url'] = process.env.DATABASE_URL;
} else {
    config["host"] = process.env.TYPEORM_CONNECTION;
    config["port"] = parseInt(process.env.PG_PORT);
    config["username"] = process.env.PG_USERNAME;
    config["password"] = process.env.PG_PASSWORD;
    config["database"] = process.env.PG_DATABASE;
}

async function dbConnect() {
    return createConnection(config)
}

export default dbConnect
