const mongoose = require('mongoose');

const bike_info_schema = new mongoose.Schema({
    bike_number: {
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
        type: Number,
        required: true
    },
    bike_desc: {
        type: String,
    },
    bike_image_url: {
        type: String
    },
    isRented: {
        type: Boolean,
        default: false
    },
    isReserved: {
        type: Boolean,
        default: false
    }
})

const  bike_info = mongoose.model('bike_info', bike_info_schema);
module.exports = bike_info;

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