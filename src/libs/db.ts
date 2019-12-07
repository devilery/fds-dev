import {createConnection} from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import * as entities from '../entity'

async function dbConnect() {
    return createConnection({
        'name': 'default',
        'namingStrategy': new SnakeNamingStrategy(),
        "type": 'postgres',
        "host": process.env.TYPEORM_CONNECTION,
        "port": parseInt(process.env.PG_PORT),
        "username": process.env.PG_USERNAME,
        "password": process.env.PG_PASSWORD,
        "database": process.env.PG_DATABASE,
        "synchronize": Boolean(process.env.PG_AUTO_DROP_DB),
        "logging": Boolean(process.env.TYPEORM_LOG),
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
    })
}

export default dbConnect
