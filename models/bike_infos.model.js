const mongoose = require('mongoose');

const bike_infos_schema = new mongoose.Schema({
    bike_id: {
        type: String,
        required: true
    },
    bike_name: {
        type: String,
        required: true
    },
    bike_type: {
        type: String,
        required: true
    },
    bike_rent_price: {
        type: String,
        required: true
    },
    bike_desc: {
        type: String,
    },
    bike_image_url: {
        type: String
    },
    bike_status: {
        type: String,
        default: 'VACANT'
    },
    locked:{
        type: Boolean,
        default: true
    },
    alarmTriggered: {
        type: Number,
        default: 0
    },
    dateAdded: {
        type: Date,
        default: Date.now
    }
    
})

const  bike_infos = mongoose.model('bike_infos', bike_infos_schema);
module.exports = bike_infos;

// const generateRandomID = (length) => {
//     const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; // Possible characters
//     let result = '';
//     let length = '';
//     // Generate a random string of the specified length
//     for (let i = 0; i < length; i++) {
//         const randomIndex = Math.floor(Math.random() * characters.length);
//         result += characters[randomIndex];
//     }

//     return `BID-${result}`; // Return the ID with a prefix
// };