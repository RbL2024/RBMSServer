const mongoose = require('mongoose');

const bikeloc_schema = new mongoose.Schema({
    bike_id: {
        type: String,
        required: true
    },
    lat: {
        type: Number,
        required: true
    },
    lng: {
        type: Number,
        required: true
    }
})

const bikeloc = mongoose.model('bikeloc', bikeloc_schema);

module.exports = bikeloc;