const mongoose = require('mongoose');


const fAddress_schema = new mongoose.Schema({
    city: {
        type: String,
        required: true
    },
    province: {
        type: String,
        required: true

    },
    street: {
        type: String,
        required: true
    },
    postalCode: {
        type: String,
        required: true
    }
},{_id:false})

const customer_accounts_schema = new mongoose.Schema({
    c_first_name: {
        type: String,
        default: ''
    },
    c_middle_name: {
        type: String,
        default: ''
    },
    c_last_name: {
        type: String,
        default: ''
    },
    c_age: {
        type: String,
        default: ''
    },
    c_bdate: {
        type: String,
        default: ''
    },
    c_gender: {
        type: String,
        default: ''
    },
    c_username: {
        type: String,
        required: true,
        unique: true
    },
    c_password: {
        type: String,
        required: true
    },
    c_full_address: fAddress_schema,
    c_email: {
        type: String,
        required: true,
        unique: true
    },
    c_phone:{
        type: String,
        default: ''
    },
    account_created: {
        type: Date,
        default: Date.now
    }
})

const customer_accounts = mongoose.model('customer_accounts', customer_accounts_schema);

module.exports = customer_accounts;
