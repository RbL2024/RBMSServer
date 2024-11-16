const mongoose = require('mongoose');
const moment = require('moment-timezone');

const bike_reserve_schema = new mongoose.Schema({
    reservation_number: {
        type: String,
        default: makeResID(5)
    },
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
    totalReservationFee: {
        type: String,
        required: true
    },
    totalBikeRentPrice:{
        type: String,
        required: true
    },
    bikeStatus:{
        type: String,
        default: 'RESERVED'
    },
    lockState:{
        type: Boolean,
        default: false
    },
    alarmState: {
        type: Boolean,
        default: false
    },
    reservation_date:{
        type: Date,
        default: ()=> moment.tz(new Date(), "Asia/Manila").utc().toDate()
    }
})
// console.log(moment.tz(new Date(), "Asia/Manila").toDate())
const  bike_reserve = mongoose.model('bike_reserve', bike_reserve_schema);
module.exports = bike_reserve;


function makeResID(length) {
    let result = '';
    // const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    // const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const characters = '0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return 'RESID-' + result;
}