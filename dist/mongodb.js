import { MongoClient } from 'mongodb';
const uri = 'mongodb+srv://moldovancsaba:togwa1-xyhcEp-mozceb@mongodb-sso.zf2o0ix.mongodb.net/?retryWrites=true&w=majority&appName=mongodb-sso';
const options = {};
let client;
let clientPromise;
if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
        client = new MongoClient(uri, options);
        global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
}
else {
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
}
export default clientPromise;
//# sourceMappingURL=mongodb.js.map