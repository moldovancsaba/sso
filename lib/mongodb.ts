import { MongoClient } from 'mongodb';

const uri = 'mongodb+srv://moldovancsaba:togwa1-xyhcEp-mozceb@mongodb-sso.zf2o0ix.mongodb.net/?retryWrites=true&w=majority&appName=mongodb-sso';
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  if (!('_mongoClientPromise' in global)) {
    (global as any)._mongoClientPromise = undefined;
  }

  if (!(global as any)._mongoClientPromise) {
    client = new MongoClient(uri, options);
    (global as any)._mongoClientPromise = client.connect();
  }
  clientPromise = (global as any)._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;
