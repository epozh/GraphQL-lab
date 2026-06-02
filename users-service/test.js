const { Client } = require('pg');
const client = new Client({
  host: 'localhost', port: 5432, user: 'postgres',
  password: 'admin', database: 'users_db'
});
client.connect().then(() => {
  console.log('Пароль верный!');
  client.end();
}).catch(e => {
  console.log('Пароль неверный:', e.message);
  client.end();
});