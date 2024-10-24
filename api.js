require('./dbconn');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express()
const PORT = process.env.LISTEN_PORT;

const admin_accounts = require('./models/admin_accounts.model');

app.use(cors());
app.use(express.json());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

//API HERE
app.get('/fetchAdminAccounts', async (req, res) => {
    try {
        const fetchedAcc = await admin_accounts.find({ isSuperAdmin: { $ne: true } });
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
                res.send({ isFound: true, uName: foundAcc.a_first_name, isSAdmin: foundAcc.isSuperAdmin });

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
        const data = req.body;
        console.log(data.i_username);
        const createAcc = admin_accounts({
            a_first_name: data.i_firstname,
            a_middle_name: data.i_middle,
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


const bike_info = require('./models/bike_info.model');

app.post('/uploadBikeInfo', async (req, res) => {
    try {
        const data = req.body;

        const bikeInfo = await bike_info({
            bike_number: data.i_bike_number,
            bike_name: data.i_bike_name,
            bike_type: data.i_bike_type,
            bike_rent_price: data.i_bike_rent_price,
            bike_desc: data.i_bike_desc,
            bike_image_url: data.i_bike_image_url
        });
        
        const savedBikeInfo = await bikeInfo.save();
        (savedBikeInfo)
        ?( res.status(201).send({ message: 'Bike uploaded successfully', isUploaded:true }))
        :( res.send({ message: 'Error uploading bike', isUploaded:false }))

        // res.status(201).send({ message: 'Bike uploaded successfully',  });
    } catch (error) {
        console.error('Error uploading bike:', error);
        res.status(500).send({ message: 'Error uploading bike' });
    }
})


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})


