const { MongoClient } = require('mongodb');
// or as an es module:
// import { MongoClient } from 'mongodb'

// Connection URL
const url = 'mongodb://testuser1:hogehoge@127.0.0.1:27018/?authSource=myproject';
const client = new MongoClient(url);

// Database Name
const dbName = 'myproject';

console.log('start');

async function main() {
  // Use connect method to connect to the server
  await client.connect();
  console.log('Connected successfully to server');
  const db = client.db(dbName);
  const collection = db.collection('syukketsu');

  // the following code examples can be pasted here...
  console.log('Connected successfully to server 2');

  const findResult = await collection.find({}).toArray();
  console.log('Found documents =>', findResult);
  
  return 'done.';
}

main()
  .then(console.log)
  .catch(console.error)
  .finally(() => client.close());