import { createClient } from 'redis';

const client = createClient({ url: 'redis://127.0.0.1:6379' });

client.on('error', (err) => console.log('Redis Error:', err));
client.on('connect', () => console.log('✅ Connected to Redis'));

await client.connect();
await client.set('test', 'hello');
console.log('Value:', await client.get('test'));
await client.disconnect();