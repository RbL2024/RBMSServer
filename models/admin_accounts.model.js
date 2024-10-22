const mongoose = require('mongoose');

// const Fullname =  mongoose.model('Fullname', fullname_schema);

const admin_accounts_schema = new mongoose.Schema({
    a_first_name: {
        type: String,
    },
    a_middle_name: {
        type: String,
    },
    a_last_name: {
        type: String
    },
    a_address: {
        type: String,
    },
    a_contactnum: {
        type: Number
    },
    a_email: {
        type: String
    },
    a_username: {
        type: String,
        required: true
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
