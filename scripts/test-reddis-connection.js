const redis = require('redis');

async function testRedis() {
    console.log(' Тестируем подключение к Redis...');

    try {
        const client = redis.createClient({
            socket: {
                host: 'localhost',
                port: 6379
            }
        });

        client.on('error', (err) => console.log('Redis Client Error', err));

        await client.connect();
        console.log(' Подключение к Redis успешно!');

        await client.set('test_key', 'Hello Redis!');
        const value = await client.get('test_key');
        console.log('📊 Тестовое значение:', value);

        await client.del('test_key');
        await client.disconnect();

        console.log(' Redis работает корректно!');

    } catch (error) {
        console.log(' Ошибка Redis:', error.message);
    }
}

testRedis();