
const { MongoClient } = require("mongodb");
const { mongoUri } = require("./config");

const DATABASE = 'events'


async function saveEventsToDB(contract, events) {
    const options = { upsert: true }
    for (let i = 0; i < events.length; i++) {
        const event = events[i];
        if (event.hasOwnProperty('_id')) {
            continue
        }
        const query = {
            commitmentHex: event.commitmentHex
        }
        const update = {
            $set: {
                commitmentHex: event.commitmentHex,
                leafIndex: event.leafIndex
            }
        }
        await updateOne(
            DATABASE, contract, update, query, options
        )
    }
}

async function loadEventsFromDB(contract) {
    const events = [];
    const callback = (doc) =>{
        console.log(doc)
        events.push(doc)
    } 
    await findMany(
        DATABASE, contract, {}, callback
    )
    return events;
}



module.exports = {
    saveEventsToDB: saveEventsToDB,
    loadEventsFromDB: loadEventsFromDB,
}


const client = new MongoClient(mongoUri);

async function findOne(db, table, query, options={}, default_value=null) {
    let document = default_value;
    try {
        await client.connect();
        const database = client.db(db);
        const collection = database.collection(table);
        document = await collection.findOne(query, options);
        console.log(document);
    } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
    }
    return document;
}


async function findMany(db, table, query, callback, options={}) {
    try {
        await client.connect();
        const database = client.db(db);
        const collection = database.collection(table);
        const cursor = await collection.find(query, options);
        // print a message if no documents were found
        if ((await cursor.count()) === 0) {
            console.log("No documents found!");
        }
        // replace console.dir with your callback to access individual elements
        await cursor.forEach(callback);
    } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
    }
}


async function insertOne(db, table, doc) {
    try {
        await client.connect();
        const database = client.db(db);
        const collection = database.collection(table);
        const result = await collection.insertOne(doc);
        console.log(`A document was inserted with the _id: ${result.insertedId}`);
    } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
    }
}


async function insertMany(db, table, docs) {
    try {
        await client.connect();
        const database = client.db(db);
        const collection = database.collection(table);
        const options = { ordered: true };
        const result = await collection.insertMany(docs, options);
        console.log(`${result.insertedCount} documents were inserted`);
    } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
    }
}


async function updateOne(db, table, updateDoc, filter, options={}) {
    try {
        await client.connect();
        const database = client.db(db);
        const collection = database.collection(table);
        const result = await collection.updateOne(filter, updateDoc, options);
        console.log(`${result.matchedCount} document(s) matched the filter, updated ${result.modifiedCount} document(s)`);        
    } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
    }
}

async function replaceOne(db, table, doc, query, options={}) {
    try {
        await client.connect();
        const database = client.db(db);
        const collection = database.collection(table);
        const result = await collection.replaceOne(query, doc, options);
        console.log(`Modified ${result.modifiedCount} document(s)`);        
    } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
    }
}