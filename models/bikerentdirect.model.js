const mongoose = require('mongoose');
const moment = require('moment-timezone');

const bike_rented_schema = new mongoose.Schema({
    rent_number: {
        type: String,
        required: true,
    },
    name:{
        type:String,
        required:true
    },
    phone: {
        type: String,
        required: true
    },
    email:{
        type: String,
        required:true
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
    returnTime:{
        type: String,
        default: '00:00'
    },
    totalBikeRentPrice:{
        type: String,
        required: true
    },
    bikeStatus:{
        type: String,
        default: 'RENTED'
    },
    lockState:{
        type: Boolean,
        default: true
    },
    alarmState: {
        type: Boolean,
        default: false
    },
    rented_date:{
        type: Date,
        default: ()=> moment.tz(new Date(), "Asia/Manila").utc().toDate()
    }
})
// console.log(moment.tz(new Date(), "Asia/Manila").toDate())
const  bike_rented = mongoose.model('bike_rented', bike_rented_schema);
module.exports = bike_rented;


