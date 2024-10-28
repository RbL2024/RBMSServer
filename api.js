require('./dbconn');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express()
const PORT = process.env.LISTEN_PORT;

const admin_accounts = require('./models/admin_accounts.model');
const customer_accounts = require('./models/customer_accounts.model');

app.use(cors());
app.use(express.json());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

//DESKTOP QUERIES
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

app.get('/loggedInAcc/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const account = await admin_accounts.findById(id);
        if (!account) {
            res.status(404).send({ message: 'Error Loading Account' });
        } else {
            const accountInfo = {
                a_first_name: account.a_first_name,
                a_middle_name: account.a_middle_name,
                a_last_name: account.a_last_name,
                a_gender: account.a_gender,
                a_address: account.a_address,
                a_contactnum: account.a_contactnum,
                a_email: account.a_email,
                a_username: account.a_username
            };
            res.send(accountInfo);
        }
    } catch (error) {
        console.error('Error getting account:', error);
        res.status(500).send({ message: 'Error getting account' });
    }
})


app.post('/findAccount', async (req, res) => {
    try {
        const dataInp = req.body;
        const foundAcc = await admin_accounts.findOne({
            $or: [
                { a_username: dataInp.i_username },
                { a_email: dataInp.i_email }
            ]
        })
        console.log(foundAcc)
        if (foundAcc) {
            const match = await bcrypt.compare(dataInp.i_password, foundAcc.a_password);

            if (match) {
                res.send({ isFound: true, uName: foundAcc.a_first_name, isSAdmin: foundAcc.isSuperAdmin, userID: foundAcc._id });

            } else {
                res.send({ isFound: false })
            }
        } else {
            res.send({ isFound: false })
        }
    } catch (error) {
        console.error('Error finding user:', error);
        res.status(400).send({ message: 'Error finding user', error: error });
    }
})

app.post('/findDuplication', async (req, res) => {
    try {
        const dataInp = req.body;
        // console.log('Received:', dataInp.i_email, dataInp.i_username);
        const foundAcc = await admin_accounts.find({ $or: [{ a_email: dataInp.i_email }, { a_username: dataInp.i_username }] })

        console.log(foundAcc)
        if (foundAcc.length > 0) {
            res.send({ isFound: true })
        } else {
            res.send({ isFound: false })
        }
    } catch (error) {
        console.error('Error finding user:', error);
        res.status(400).send({ message: 'Error finding user', error: error });
    }
})
app.post('/createAccount', async (req, res) => {
    try {
        const data = req.body;

        const hashedPassword = await bcrypt.hash(data.i_password, 10);

        const createAcc = admin_accounts({
            a_first_name: data.i_first_name,
            a_middle_name: data.i_middle_name,
            a_last_name: data.i_last_name,
            a_address: data.i_address,
            a_contactnum: data.i_contactnum,
            a_email: data.i_email,
            a_username: data.i_username,
            a_password: hashedPassword
        })
        await createAcc.save();
        const nodemailer = require('nodemailer');

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            auth: {
                user: process.env.NODEMAILER_USER,
                pass: process.env.NODEMAILER_PASSWORD
            }
        })

        const mailOptions = {
            from: 'RBMS Labanos Team <rbms.labanos2024@gmail.com>',
            to: data.i_email,
            subject: 'RBMS Account',
            html: `
                <p>Hello ${data.i_first_name} ${data.i_last_name}, Here is your Credentials: </p>
                <p>Username: ${data.i_username}</p>
                <p>Password: ${data.i_password}</p>
                
            `
        }

        await transporter.sendMail(mailOptions)

        res.status(201).send({ message: 'User created successfully', created: true });
    } catch (error) {
        console.error('Error creating account:', error);
        res.status(500).send({ message: 'Error creating account', created: false });
    }
})


app.put('/updateAccount/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const updatedData = req.body; // Get the updated data from the request body
        console.log(updatedData);
        // Find the account by ID and update it
        const updatedAccount = await admin_accounts.findByIdAndUpdate(id, updatedData, { new: true });

        if (!updatedAccount) {
            return res.status(404).send({ message: 'Account not found' });
        }

        res.send({ message: 'Account updated successfully', account: updatedAccount, updated: true });
    } catch (error) {
        console.error('Error updating account:', error);
        res.status(500).send({ message: 'Error updating account' });
    }
});



const bike_info = require('./models/bike_info.model');

app.post('/uploadBikeInfo', async (req, res) => {
    try {
        const data = req.body;

        const bikeInfo = await bike_info({
            bike_id: data.i_bike_id,
            bike_name: data.i_bike_name,
            bike_type: data.i_bike_type,
            bike_rent_price: data.i_bike_rent_price,
            bike_desc: data.i_bike_desc,
            bike_image_url: data.i_bike_image_url
        });

        const savedBikeInfo = await bikeInfo.save();
        (savedBikeInfo)
            ? (res.status(201).send({ message: 'Bike uploaded successfully', isUploaded: true }))
            : (res.send({ message: 'Error uploading bike', isUploaded: false }))

        // res.status(201).send({ message: 'Bike uploaded successfully',  });
    } catch (error) {
        console.error('Error uploading bike:', error);
        res.status(500).send({ message: 'Error uploading bike' });
    }
})

app.get('/fetchAllBikes', async (req, res) => {
    try {
        const bikeInfo = await bike_info.find();

        res.status(200).send(bikeInfo);
    } catch (error) {
        console.error('Error fetching all bikes:', error);
    }
})



app.post('/sendEmailOTP', async (req, res) => {
    try {
        const data = req.body;
        const nodemailer = require('nodemailer');

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            auth: {
                user: process.env.NODEMAILER_USER,
                pass: process.env.NODEMAILER_PASSWORD
            }
        })

        const mailOptions = {
            from: 'RBMS Labanos Team, <rbms.labanos2024@gmail.com>',
            to: data.emailTo,
            subject: 'RBMS OTP',
            html: `
                <p>Hello ${data.emailTo}, Here is your OTP: ${data.myOTP}</p>
            `
        }

        transporter.sendMail(mailOptions, function (err, info) {
            if (err) {
                console.log('Error: ', err)
            } else {
                console.log('Email sent successfully!');
                res.status(200).json({ message: 'Email sent successfully' });
            }
        })

    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ message: 'Error sending email' });
    }
})

app.put('/updatePassword/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;

        const hashedPass = await bcrypt.hash(data.a_password, 10);
        const newPass = {
            a_password: hashedPass
        }
        const updatePass = await admin_accounts.findByIdAndUpdate(id, newPass, { new: true });

        if (updatePass) {
            res.status(200).json({ message: 'Password updated successfully', data: updatePass, pUpdated: true });

        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Error updating password:', error);
    }
})


//ANDROID QUERIES
app.get('/rbmsa/check-connection', async (req, res) => {
    try {
        // Perform a simple query to check the connection
        const result = await customer_accounts.findOne({});
        res.status(200).json({ message: 'MongoDB connection is healthy', result });
    } catch (error) {
        res.status(500).json({ message: 'MongoDB connection error', error });
    }
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})


function makeid(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return 'BID-' + result;
}