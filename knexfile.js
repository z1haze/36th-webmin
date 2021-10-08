require('dotenv').config();

const config = {
    client    : 'pg',
    connection: {
        host    : process.env.DB_HOST,
        user    : process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    },
    pool: {
        min: 2,
        max: 10
    },
    migrations: {
        tableName: 'migrations',
        directory: './db/migrations'
    },
};

module.exports = {
    development: config
};