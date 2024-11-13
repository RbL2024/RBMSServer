require('./dbconn');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const moment = require('moment-timezone');
require('dotenv').config();

const app = express()
const PORT = process.env.LISTEN_PORT;

const admin_accounts = require('./models/admin_accounts.model');
const customer_accounts = require('./models/customer_accounts.model');
const bike_infos = require('./models/bike_infos.model');
const bike_reserve = require('./models/bikeReservation.model');

app.use(cors());
app.use(express.json());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));


//WEBSITE
app.get('/api/bikes', async (req, res) => {
    try {
        const adultBikes = await bike_infos
            .find({ bike_type: 'Adult_bicycle' })
            .limit(5)
            .sort({ someField: 1 }); // Replace 'someField' with the field you want to sort by, use 1 for ascending, -1 for descending

        const kidBikes = await bike_infos
            .find({ bike_type: 'Kid_bicycle' })
            .limit(5)
            .sort({ someField: 1 }); // Replace 'someField' with the field you want to sort by, use 1 for ascending, -1 for descending

        res.json({
            adultBikes,
            kidBikes
        });
    } catch (error) {
        console.error('Error fetching bikes:', error.message);
        res.status(500).json({ message: error.message });
    }
});

app.post('/send-question', (req, res) => {
    const { question, email } = req.body;

    if (!question || !email) {
        return res.status(400).json({ message: 'Both question and email are required.' });
    }

    // Nodemailer configuration
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.NODEMAILER_USER, // Your email
            pass: process.env.NODEMAILER_PASSWORD, // Your email password or an app password
        },
    });

    const mailOptions = {
        from: `"RBMS Support" <no-reply@yourdomain.com>`, // Ensure a valid email format
        to: "rbms.labanos2024@gmail.com", // Recipient email address
        subject: `New Question from ${email}`, // Clear and concise subject
        replyTo: email, // Enables direct replies to the user's email
        text: `
    Dear Team,
    
    We have received a new question from a user. Please find the details below:
    
    User Details:
    - Email: ${email}
    - Question: ${question}
    
    Please respond at your earliest convenience.
    
    Thank you for your attention to this matter.
    
    Best regards,
    The RBMS Support Team
    `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
            return res.status(500).json({ message: 'Failed to send email', error: error.toString() });
        }
        console.log('Email sent:', info.response);
        res.status(200).json({ message: 'Email sent successfully', info: info.response });
    });
});



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
app.get('/fetchUserAccounts', async (req, res) => {
    try {
        const fetchedAcc = await customer_accounts.find();
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





app.post('/uploadBikeInfo', async (req, res) => {
    try {
        const data = req.body;

        const bikeInfo = await bike_infos({
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
        const bikeInfo = await bike_infos.find()
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

app.get('/getReservations', async (req, res) => {
    try {
        // Check if the bike is already reserved for today
        const startOfDay = moment().startOf('day').utc().toDate();
        const endOfDay = moment().endOf('day').utc().toDate();

        // Fetch reservations for today that are not canceled
        const getReservations = await bike_reserve.find({
            reservation_date: {
                $gte: startOfDay,
                $lt: endOfDay,
            },
            $or: [
                { bikeStatus: 'RESERVED' },
                { bikeStatus: 'CANCELED' },
                { bikeStatus: 'RENTED' },
                { bikeStatus: 'DONE' },

            ]
        });

        if (getReservations.length === 0) {
            return res.send({ message: 'No reservations found for today.', records: [] });
        }

        // Extract bike_ids from the reservations
        const bikeIds = getReservations.map(reservation => reservation.bike_id);

        // Fetch bike information for the corresponding bike_ids
        const bikeInfo = await bike_infos.find({ bike_id: { $in: bikeIds } });

        // Create a mapping of bike_id to bike details for easy access
        const bikeDetailsMap = bikeInfo.reduce((map, bike) => {
            map[bike.bike_id] = bike;
            return map;
        }, {});

        // Combine reservations with their corresponding bike information
        const reservationsWithBikeInfo = getReservations.map(reservation => ({
            ...reservation.toObject(), // Convert mongoose document to plain object
            bikeInfo: bikeDetailsMap[reservation.bike_id] || null // Add bike info or null if not found
        }));

        res.send({ message: 'Reservations retrieved successfully.', records: reservationsWithBikeInfo });
    } catch (error) {
        console.error('Error getting reservations:', error);
        res.status(500).send({ message: 'Error getting reservations', error: error.message });
    }
});
app.get('/getReservationsALL', async (req, res) => {
    try {
        // Check if the bike is already reserved for today
        const startOfDay = moment().startOf('day').utc().toDate();
        const endOfDay = moment().endOf('day').utc().toDate();

        // Fetch reservations for today that are not canceled
        const getReservations = await bike_reserve.find();

        if (getReservations.length === 0) {
            return res.send({ message: 'Reservations is empty.', records: [] });
        }

        // Extract bike_ids from the reservations
        const bikeIds = getReservations.map(reservation => reservation.bike_id);

        // Fetch bike information for the corresponding bike_ids
        const bikeInfo = await bike_infos.find({ bike_id: { $in: bikeIds } });

        // Create a mapping of bike_id to bike details for easy access
        const bikeDetailsMap = bikeInfo.reduce((map, bike) => {
            map[bike.bike_id] = bike;
            return map;
        }, {});

        // Combine reservations with their corresponding bike information
        const reservationsWithBikeInfo = getReservations.map(reservation => ({
            ...reservation.toObject(), // Convert mongoose document to plain object
            bikeInfo: bikeDetailsMap[reservation.bike_id] || null // Add bike info or null if not found
        }));

        res.send({ message: 'Reservations retrieved successfully.', records: reservationsWithBikeInfo });
    } catch (error) {
        console.error('Error getting reservations:', error);
        res.status(500).send({ message: 'Error getting reservations', error: error.message });
    }
});
app.get('/getReservationsFIVE', async (req, res) => {
    try {
        // Check if the bike is already reserved for today
        const startOfDay = moment().startOf('day').utc().toDate();
        const endOfDay = moment().endOf('day').utc().toDate();

        // Fetch reservations for today that are not canceled
        const getReservations = await bike_reserve.find()
            .sort({ dateAdded: -1 })
            .limit(5);

        if (getReservations.length === 0) {
            return res.send({ message: 'Reservations is empty.', records: [] });
        }

        // Extract bike_ids from the reservations
        const bikeIds = getReservations.map(reservation => reservation.bike_id);

        // Fetch bike information for the corresponding bike_ids
        const bikeInfo = await bike_infos.find({ bike_id: { $in: bikeIds } });

        // Create a mapping of bike_id to bike details for easy access
        const bikeDetailsMap = bikeInfo.reduce((map, bike) => {
            map[bike.bike_id] = bike;
            return map;
        }, {});

        // Combine reservations with their corresponding bike information
        const reservationsWithBikeInfo = getReservations.map(reservation => ({
            ...reservation.toObject(), // Convert mongoose document to plain object
            bikeInfo: bikeDetailsMap[reservation.bike_id] || null // Add bike info or null if not found
        }));

        res.send({ message: 'Reservations retrieved successfully.', records: reservationsWithBikeInfo });
    } catch (error) {
        console.error('Error getting reservations:', error);
        res.status(500).send({ message: 'Error getting reservations', error: error.message });
    }
});
app.put('/updateBikeStatus/:reserveId', async (req, res) => {
    try {
        const reserveId = req.params.reserveId; // Get the reservation ID from the request parameters
        const { bikeStatus, bikeId } = req.body; // Expecting bikeStatus and bikeId in the request body

        // Update the bikeStatus in bike_reserve
        const updatedReserve = await bike_reserve.findByIdAndUpdate(
            reserveId,
            { bikeStatus: bikeStatus }, // Set the new bikeStatus
            { new: true } // Return the updated document
        );

        if (!updatedReserve) {
            return res.status(404).send({ message: 'Reservation not found' });
        }

        // Update the bike_status in bike_infos based on bike_id
        const updatedBike = await bike_infos.findOneAndUpdate(
            { bike_id: bikeId },
            { bike_status: bikeStatus }, // Set the new bike_status
            { new: true } // Return the updated document
        );

        if (!updatedBike) {
            return res.status(404).send({ message: 'Bike not found' });
        }

        res.send({
            message: 'Bike status updated successfully',
            updatedReserve,
            updatedBike
        });
    } catch (error) {
        console.error('Error updating bike status:', error);
        res.status(500).send({ message: 'Error updating bike status', error: error.message });
    }
});
app.put('/updateBikeStatusToVacant/:reserveId', async (req, res) => {
    try {
        const reserveId = req.params.reserveId; // Get the reservation ID from the request parameters
        const { bikeStatus, bikeId } = req.body; // Expecting bikeStatus and bikeId in the request body

        // Update the bikeStatus in bike_reserve
        const updatedReserve = await bike_reserve.findByIdAndUpdate(
            reserveId,
            { bikeStatus: "DONE" }, // Set the new bikeStatus
            { new: true } // Return the updated document
        );

        if (!updatedReserve) {
            return res.status(404).send({ message: 'Reservation not found' });
        }

        // Update the bike_status in bike_infos based on bike_id
        const updatedBike = await bike_infos.findOneAndUpdate(
            { bike_id: bikeId },
            { bike_status: bikeStatus }, // Set the new bike_status
            { new: true } // Return the updated document
        );

        if (!updatedBike) {
            return res.status(404).send({ message: 'Bike not found' });
        }

        res.send({
            message: 'Bike status updated successfully',
            updatedReserve,
            updatedBike
        });
    } catch (error) {
        console.error('Error updating bike status:', error);
        res.status(500).send({ message: 'Error updating bike status', error: error.message });
    }
});




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

app.get('/rbmsa/topBikes', async (req, res) => {
    try {
        const records = await bike_infos.find()
            .sort({ dateAdded: -1 })
            .limit(10);
        res.json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
app.post('/rbmsa/typeBikes', async (req, res) => {
    try {
        const bikeType = req.body;
        const records = await bike_infos.find({ bike_type: bikeType.bike_type });
        res.status(200).json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.put('/rbmsa/updateBikeStat/:bikeid', async (req, res) => {
    try {
        const bikeId = req.params.bikeid
        const bikeStat = req.body
        const updateBikeStat = await bike_infos.findByIdAndUpdate(bikeId, bikeStat);
        res.status(200).json({ message: 'Bike status updated successfully', data: updateBikeStat });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
})

app.post('/rbmsa/createUser', async (req, res) => {
    try {
        const data = req.body;

        const existingUser = await customer_accounts.findOne({
            $or: [
                { c_username: data.i_username },
                { c_email: data.i_email }
            ]
        });

        if (existingUser) {
            return res.send({
                message: 'Username or email already exists',
                isCreated: false
            });
        }
        const hashedPass = await bcrypt.hash(data.i_password, 10);

        const user = customer_accounts({
            c_first_name: data.i_first_name,
            c_middle_name: data.i_middle_name,
            c_last_name: data.i_last_name,
            c_age: data.i_age,
            c_bdate: data.i_bdate,
            c_gender: data.i_gender,
            c_username: data.i_username,
            c_password: hashedPass,
            c_full_address: {
                city: data.i_city,
                province: data.i_province,
                street: data.i_street,
                postalCode: data.i_postalCode
            },
            c_email: data.i_email,
            c_phone: data.i_phone,
        });

        await user.save();
        (user)
            ? (res.status(201).send({ message: 'Account created successfully', isCreated: true }))
            : (res.send({ message: 'Error creating account', isCreated: false }))

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
})


app.post('/rbmsa/loginAcc', async (req, res) => {
    try {
        const { i_username, i_password } = req.body;
        const findUser = await customer_accounts.findOne({ c_username: i_username });
        if (!findUser) {
            return res.send({ message: 'User not found, check for whitespaces.', isFound: false });
        } else {
            const isValidPassword = await bcrypt.compare(i_password, findUser.c_password);
            if (!isValidPassword) {
                return res.send({ message: 'Invalid password' });
            } else {
                return res.send({ message: 'Login successful', isFound: true, loginData: findUser });
            }
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
})


app.put('/rbmsa/UpdateReserve/:id', async (req, res) => {
    const id = req.params.id;
    const { bike_status, ...reserveData } = req.body; // Destructure bike_status and reserveData
    try {
        // Check if the bike exists
        const findBike = await bike_infos.findById(id);
        if (!findBike) {
            return res.send({ message: 'Bike not found' });
        }

        // Check if the bike is already reserved for today
        const startOfDay = moment().startOf('day').utc().toDate();
        const endOfDay = moment().endOf('day').utc().toDate();

        console.log(reserveData.email)

        // Check if the user has already reserved a bike today
        const existingReservationForEmail = await bike_reserve.findOne({
            email: reserveData.email,
            reservation_date: { $gte: startOfDay, $lte: endOfDay },
            bikeStatus: 'RESERVED' // Ensure no existing reservations for today
        });

        if (existingReservationForEmail) {
            return res.send({ message: 'You have already reserved a bike for today. You cannot reserve another one.' });
        }

        const existingReservation = await bike_reserve.findOne({
            bike_id: reserveData.bike_id,
            reservation_date: {
                $gte: startOfDay,
                $lt: endOfDay
            },
            bikeStatus: 'RESERVED'
        });

        if (existingReservation) {
            return res.send({ message: 'Bike is already reserved for today.' });
        }

        // Update bike status
        const updatedBikeStat = await bike_infos.findByIdAndUpdate(
            id,
            { bike_status },
            { new: true, runValidators: true } // Added runValidators to ensure data integrity
        );

        // Insert reservation data
        const insertReserve = new bike_reserve({ ...reserveData, bikeId: id }); // Include bikeId in reserve data
        const savedReserve = await insertReserve.save();

        // Check if the reservation was saved successfully
        if (savedReserve) {
            const userInfo = {
                ...reserveData
            };

            const nodemailer = require('nodemailer');

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                port: 587,
                secure: false,
                auth: {
                    user: process.env.NODEMAILER_USER,
                    pass: process.env.NODEMAILER_PASSWORD
                }
            });

            const mailOptions = {
                from: 'RBMS Labanos Team <rbms.labanos2024@gmail.com>',
                to: userInfo.email,
                subject: 'Bike Reservation',
                html: `
                    <p>Hello ${userInfo.name}, you reserved for ${userInfo.bike_id} </p>
                    <p>present this to the labanos team to confirm your reservation and to start your bike rental</p>
                `
            };

            await transporter.sendMail(mailOptions);
        } else {
            return res.send({ message: 'Error saving reservation, email not sent.', isReserved: false });
        }

        return res.send({
            message: 'Bike status reserved successfully',
            isReserved: true,
            data: updatedBikeStat
        });

    } catch (error) {
        console.error('Error updating bike status:', error);
        return res.send({
            message: 'Something went wrong',
            error: error.message,
            isReserved: false
        });
    }
});


app.post('/rbmsa/getReservations', async (req, res) => {
    try {
        const data = req.body;

        // Check if the bike is already reserved for today
        const startOfDay = moment().startOf('day').utc().toDate();
        const endOfDay = moment().endOf('day').utc().toDate();

        const getReservations = await bike_reserve.findOne({
            bike_id: data.bID,
            email: data.email,
            reservation_date: {
                $gte: startOfDay,
                $lt: endOfDay,
            },
            bikeStatus: 'RESERVED'
        })
        res.send(getReservations);
    } catch (error) {
        console.error('Error getting reservations:', error);
    }
})


app.post('/rbmsa/reservedBike', async (req, res) => {
    try {
        const data = req.body;
        const bikeId = data.bID;
        const userEmail = data.email; // Assuming the email is passed in the request body

        // Get the start and end of the day
        const startOfDay = moment().startOf('day').utc().toDate();
        const endOfDay = moment().endOf('day').utc().toDate();

        // Find reservations for the specified bike_id and email that are made today
        const reservationsToday = await bike_reserve.find({
            bike_id: bikeId,
            email: userEmail, // Filter by user email
            reservation_date: { $gte: startOfDay, $lte: endOfDay },
            bikeStatus: 'RESERVED'
        });

        // Check if reservationsToday is an array and its length
        if (!Array.isArray(reservationsToday) || reservationsToday.length === 0) {
            return res.send({ records: [], message: 'No reservations found for today for this email.' });
        }

        // Get bike information for the specified bike_id
        const bikeInfo = await bike_infos.find({ bike_id: bikeId });

        // Combine the results
        res.send({
            bikeInfo,
            reservationsToday
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/rbmsa/getAllUser-Reservations', async (req, res) => {
    try {
        const { email } = req.body; // Assuming the email is sent in the request body

        // Fetch all reservations for the logged-in user based on their email
        const userReservations = await bike_reserve.find({ email: email });

        if (userReservations.length === 0) {
            return res.send({ message: 'No reservations found for this user.', records: [] });
        }

        // Extract bike_ids from the reservations
        const bikeIds = userReservations.map(reservation => reservation.bike_id);

        // Fetch bike information for the corresponding bike_ids
        const bikeInfo = await bike_infos.find({ bike_id: { $in: bikeIds } });

        // Create a mapping of bike_id to bike details for easy access
        const bikeDetailsMap = bikeInfo.reduce((map, bike) => {
            map[bike.bike_id] = bike;
            return map;
        }, {});

        // Combine reservations with their corresponding bike information
        const reservationsWithBikeInfo = userReservations.map(reservation => ({
            ...reservation.toObject(), // Convert mongoose document to plain object
            bikeInfo: bikeDetailsMap[reservation.bike_id] || null // Add bike info or null if not found
        }));

        res.send({ message: 'Reservations retrieved successfully.', records: reservationsWithBikeInfo });
    } catch (error) {
        console.error('Error fetching user reservations:', error);
        res.status(500).send({ message: 'Error fetching reservations', error: error.message });
    }
});


app.put('/rbmsa/cancelReservation', async (req, res) => {
    try {
        const data = req.body; // Expecting bike_id and email in the request body
        const bID = data.bID;
        const email = data.email;

        // Get the start and end of the day
        const startOfDay = moment().startOf('day').utc().toDate();
        const endOfDay = moment().endOf('day').utc().toDate();

        // Find reservations for the specified bike_id and email that are made today
        const reservationsToday = await bike_reserve.find({
            bike_id: bID,
            email: email,
            reservation_date: { $gte: startOfDay, $lt: endOfDay },
            bikeStatus: 'RESERVED'
        });

        // Check if there are any reservations to cancel
        if (!Array.isArray(reservationsToday) || reservationsToday.length === 0) {
            return res.send({ records: [], message: 'No reservations found for today for this email.' });
        }

        // Update the isCancel field to true for all found reservations
        const updatePromises = reservationsToday.map(async (reservation) => {
            // Update reservation to be canceled
            await bike_reserve.findByIdAndUpdate(reservation._id, { bikeStatus: 'CANCELED', timeofuse: '00:00' }, { new: true });

            // Update the bike status to 'vacant'
            await bike_infos.findOneAndUpdate(
                { bike_id: bID },
                { bike_status: 'vacant' }, // Set status to 'vacant'
                { new: true }
            );
        });

        await Promise.all(updatePromises);

        res.send({ message: 'Reservations cancelled successfully.', bikeStatus: 'RESERVED' });
    } catch (error) {
        console.error('Error cancelling reservation:', error);
        res.status(500).send({ message: 'Error cancelling reservation', error: error.message });
    }
});












app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})


function makeid(length) {
    let result = '';
    // const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return 'BID-' + result;
}