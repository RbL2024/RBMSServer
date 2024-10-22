require('./dbconn');
const express = require('express');
const cors = require('cors');

const app = express()
const PORT = process.env.port;

const admin_accounts = require('./models/admin_accounts.model');

app.use(cors());
app.use(express.json());

//API HERE
app.get('/fetchAdminAccounts', async (req, res) => {
    try {
        const fetchedAcc = await admin_accounts.find({isSuperAdmin:{$ne: true}});
        // res.json(fetchedAcc);
        res.send(fetchedAcc);
    } catch (error) {
        console.error('Error fetching users:', err);
        res.status(500).send({ message: 'Error fetching users' });
    }
})

app.post('/findAccount', async (req, res) => {
    try {
        const dataInp = req.body;
        const foundAcc = await admin_accounts.findOne({ a_username: dataInp.i_username })
        if (foundAcc) {
            if (dataInp.i_password === foundAcc.a_password) {
                res.send({ isFound: true, uName:  foundAcc.a_first_name, isSAdmin: foundAcc.isSuperAdmin });

            } else {
                res.send({ isFound: false })
            }
        } else {
            res.send({ isFound: false })
        }
    } catch (error) {
        onsole.error('Error finding user:', error);
        res.status(400).send({ message: 'Error finding user', error: error });
    }
})

app.post('/createAccount', async (req, res) => {
    try {
        const data = req.body
        console.log(data.i_username);
        const createAcc = admin_accounts({
            a_first_name: data.i_firstname,
            a_middle_name: data.i_mniddle,
            a_last_name: data.i_lastname,
            a_address: data.i_address,
            a_contactnum: data.i_contactnum,
            a_email: data.i_email,
            a_username: data.i_username,
            a_password: data.i_password
        })
        await createAcc.save();
        res.status(201).send({ message: 'User created successfully' });
    } catch (error) {
        console.error('Error creating account:', err);
        res.status(500).send({ message: 'Error creating account' });
    }
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})


