const mongoose  = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.mongo_uri);
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open',  () => {
    console.log('Connected to MongoDB');
})
