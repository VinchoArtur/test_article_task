const { Client } = require('pg');

async function quickTest() {
    console.log(' Быстрый тест подключения...');

    const config = {
        host: 'localhost',
        port: 5433,
        user: 'postgres',
        password: 'password',
        database: 'articles_db',
        ssl: false,
        connectionTimeoutMillis: 10000,
    };

    try {
        console.log(' Подключаемся к PostgreSQL на порту 5433...');
        console.log('Конфигурация:', JSON.stringify(config, null, 2));

        const client = new Client(config);
        await client.connect();

        const result = await client.query('SELECT current_database(), version(), current_user');
        console.log(' УСПЕХ!');
        console.log(' База:', result.rows[0].current_database);
        console.log(' Пользователь:', result.rows[0].current_user);
        console.log(' Версия:', result.rows[0].version.split(' ').slice(0, 2).join(' '));

        await client.end();

        return true;

    } catch (error) {
        console.log(' Ошибка подключения:', error.message);
        console.log('Код ошибки:', error.code);
        return false;
    }
}

quickTest();