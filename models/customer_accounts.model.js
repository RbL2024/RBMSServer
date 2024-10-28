const mongoose = require('mongoose');

// const Fullname =  mongoose.model('Fullname', fullname_schema);

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
    c_gender: {
        type: String,
        default: ''
    },
    c_address: {
        type: String,
        default: ''
    },
    c_contactnum: {
        type: String,
        default: ''
    },
    c_email: {
        type: String,
        required: true,
        unique: true
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
    account_created: {
        type: Date,
        default: Date.now
    }
})

const customer_accounts = mongoose.model('customer_accounts', customer_accounts_schema);

module.exports = customer_accounts;
