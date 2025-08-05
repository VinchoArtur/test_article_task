const { Client } = require('pg');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function setupDatabase() {
    console.log(' Setting up database...');

    console.log(' Waiting for container to start...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    try {
        console.log(' Trying to connect without password...');

        const { stdout } = await execPromise('docker exec articles-postgres psql -U postgres -d articles_db -c "SELECT 1"');
        console.log('✅ Connected without password, setting password...');

        await execPromise(`docker exec articles-postgres psql -U postgres -d articles_db -c "ALTER USER postgres PASSWORD 'password';"`);
        console.log('✅ Password set successfully!');

        console.log('🔄 Testing connection with password...');
        const client = new Client({
            host: 'localhost',
            port: 5433,
            user: 'postgres',
            password: 'password',
            database: 'articles_db',
            connectionTimeoutMillis: 5000,
        });

        await client.connect();
        console.log('✅ Password connection successful!');

        const result = await client.query('SELECT version()');
        console.log('📊 PostgreSQL version:', result.rows[0].version);

        await client.end();
        console.log(' Database setup completed!');

    } catch (error) {
        console.error(' Setup failed:', error.message);

        console.log('🔄 Trying alternative setup...');
        try {
            await execPromise('docker exec articles-postgres psql -U postgres -c "ALTER USER postgres PASSWORD \'password\';"');
            console.log(' Alternative password setup successful!');
        } catch (altError) {
            console.error(' Alternative setup also failed:', altError.message);
        }
    }
}

setupDatabase().catch(console.error);