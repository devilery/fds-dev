import {Connection} from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import * as entities from '../entity'


var connection  = new Connection({
    'namingStrategy': new SnakeNamingStrategy(),
    "type": "postgres",
    "host": "localhost",
    "port": 5432,
    "username": "devilery",
    "password": "devilery",
    "database": "devilery",
    "synchronize": true,
    "logging": true,
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

export default connection
