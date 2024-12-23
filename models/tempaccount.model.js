const mongoose = require('mongoose');

const temporary_accounts_schema = new mongoose.Schema({
    t_name: {
        type: String,
        default: ''
    },
    t_age: {
        type: String,
        default: ''
    },
    t_username: {
        type: String,
        required: true,
        unique: true
    },
    t_password: {
        type: String,
        required: true
    },
    t_email: {
        type: String,
        required: true,
        unique: true
    },
    t_phone:{
        type: String,
        default: ''
    },
    account_created: {
        type: Date,
        default: Date.now
    },
    tokenExp: {
        type: String,
        default: null
    }
})

const temporary_accounts = mongoose.model('temporary_accounts', temporary_accounts_schema);

module.exports = temporary_accounts;


