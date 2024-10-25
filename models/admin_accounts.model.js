const mongoose = require('mongoose');

// const Fullname =  mongoose.model('Fullname', fullname_schema);

const admin_accounts_schema = new mongoose.Schema({
    a_first_name: {
        type: String,
        default: ''
    },
    a_middle_name: {
        type: String,
        default: ''
    },
    a_last_name: {
        type: String,
        default: ''
    },
    a_gender: {
        type: String,
        default: ''
    },
    a_address: {
        type: String,
        default: ''
    },
    a_contactnum: {
        type: String,
        default: ''
    },
    a_email: {
        type: String,
        required: true,
        unique: true
    },
    a_username: {
        type: String,
        required: true,
        unique: true
    },
    a_password: {
        type: String,
        required: true
    },
    isSuperAdmin: {
        type: Boolean,
        default: false
    }
})

const admin_accounts = mongoose.model('admin_accounts', admin_accounts_schema);

module.exports = admin_accounts;
