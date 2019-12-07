import {Connection} from 'typeorm';
import Team from '../entity/Team'


var connection  = new Connection({
    "type": "postgres",
    "host": "localhost",
    "port": 5432,
    "username": "devilery",
    "password": "devilery",
    "database": "devilery",
    "synchronize": true,
    "logging": true,
    "entities": [
        Team
    ],
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