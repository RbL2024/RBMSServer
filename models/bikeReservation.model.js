const mongoose = require('mongoose');

const bike_reserve_schema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    address: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    bike_id:  {
        type: String,
        required: true
    },
    duration:{
        type: String,
        required: true
    },
    timeofuse:{
        type: String,
        required: true
    },
    paymentTotal: {
        type: String,
        required: true
    },
    reservation_date:{
        type:Date,
        default:Date.now
    }
})

const  bike_reserve = mongoose.model('bike_reserve', bike_reserve_schema);
module.exports = bike_reserve;