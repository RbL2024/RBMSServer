require("./dbconn");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const moment = require("moment-timezone");
const axios = require("axios");
const jwt = require('jsonwebtoken');

require("dotenv").config();

const app = express();
const PORT = process.env.LISTEN_PORT;

const admin_accounts = require("./models/admin_accounts.model");
const customer_accounts = require("./models/customer_accounts.model");
const bike_infos = require("./models/bike_infos.model");
const bike_reserve = require("./models/bikeReservation.model");
const temporary_accounts = require("./models/tempaccount.model");
const bike_rented = require("./models/bikerentdirect.model");
const bikeloc = require("./models/bikeloc.model");

app.use(cors());
app.use(express.json());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(bodyParser.json());

//WEBSITE
app.get("/api/bikes", async (req, res) => {
  try {
    const adultBikes = await bike_infos
      .find({ bike_type: "Adult_bicycle" })
      .limit(5)
      .sort({ someField: 1 }); // Replace 'someField' with the field you want to sort by, use 1 for ascending, -1 for descending

    const kidBikes = await bike_infos
      .find({ bike_type: "Kid_bicycle" })
      .limit(5)
      .sort({ someField: 1 }); // Replace 'someField' with the field you want to sort by, use 1 for ascending, -1 for descending

    res.json({
      adultBikes,
      kidBikes,
    });
  } catch (error) {
    console.error("Error fetching bikes:", error.message);
    res.status(500).json({ message: error.message });
  }
});

app.post("/send-question", (req, res) => {
  const { question, email } = req.body;
  const nodemailer = require("nodemailer");

  if (!question || !email) {
    return res
      .status(400)
      .json({ message: "Both question and email are required." });
  }

  // Nodemailer configuration
  const transporter = nodemailer.createTransport({
    service: "gmail",
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
      console.error("Error sending email:", error);
      return res
        .status(500)
        .json({ message: "Failed to send email", error: error.toString() });
    }
    console.log("Email sent:", info.response);
    res
      .status(200)
      .json({ message: "Email sent successfully", info: info.response });
  });
});

//DESKTOP QUERIES
app.get("/getAnalyticsData", async (req, res) => {
  try {
    const bikesWithReservations = await bike_infos.aggregate([
      {
        $lookup: {
          from: "bike_reserves", // The name of the bike_reserve collection
          localField: "bike_id", // Field from bike_infos collection
          foreignField: "bike_id", // Field from bike_reserve collection
          as: "reservations", // The name of the new array field to add
        },
      },
      {
        $project: {
          bike_type: 1,
          reservations: {
            $filter: {
              input: "$reservations", // The array to filter
              as: "reservation", // Variable name for each element
              cond: {
                $or: [
                  { $eq: ["$$reservation.bikeStatus", "COMPLETE"] },
                  { $ne: ["$$reservation.bikeStatus", "RESERVED"] },
                ],
              },
            },
          },
        },
      },
      {
        $unwind: {
          path: "$reservations", // Unwind to flatten the reservations array
          preserveNullAndEmptyArrays: false, // Keep bikes without reservations
        },
      },
    ]);

    res.status(200).send(bikesWithReservations);
  } catch (error) {
    console.error("Error fetching bikes with reservations:", error);
    res
      .status(500)
      .send({
        message: "Error fetching bikes with reservations",
        error: error.message,
      });
  }
});

app.get("/fetchAdminAccounts", async (req, res) => {
  try {
    const fetchedAcc = await admin_accounts.find({
      isSuperAdmin: { $ne: true },
    });
    // res.json(fetchedAcc);
    res.send(fetchedAcc);
  } catch (error) {
    console.error("Error fetching users:", err);
    res.status(500).send({ message: "Error fetching users" });
  }
});
app.get("/fetchUserAccounts", async (req, res) => {
  try {
    const fetchedAcc = await customer_accounts.find();
    // res.json(fetchedAcc);
    res.send(fetchedAcc);
  } catch (error) {
    console.error("Error fetching users:", err);
    res.status(500).send({ message: "Error fetching users" });
  }
});

app.get("/loggedInAcc/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const account = await admin_accounts.findById(id);
    if (!account) {
      res.status(404).send({ message: "Error Loading Account" });
    } else {
      const accountInfo = {
        a_first_name: account.a_first_name,
        a_middle_name: account.a_middle_name,
        a_last_name: account.a_last_name,
        a_gender: account.a_gender,
        a_address: account.a_address,
        a_contactnum: account.a_contactnum,
        a_email: account.a_email,
        a_username: account.a_username,
      };
      res.send(accountInfo);
    }
  } catch (error) {
    console.error("Error getting account:", error);
    res.status(500).send({ message: "Error getting account" });
  }
});

app.post("/findAccount", async (req, res) => {
  try {
    const dataInp = req.body;
    const foundAcc = await admin_accounts.findOne({
      $or: [{ a_username: dataInp.i_username }, { a_email: dataInp.i_email }],
    });
    if (foundAcc) {
      const match = await bcrypt.compare(
        dataInp.i_password,
        foundAcc.a_password
      );

      if (match) {
        res.send({
          isFound: true,
          uName: foundAcc.a_first_name,
          isSAdmin: foundAcc.isSuperAdmin,
          userID: foundAcc._id,
        });
      } else {
        res.send({ isFound: false });
      }
    } else {
      res.send({ isFound: false });
    }
  } catch (error) {
    console.error("Error finding user:", error);
    res.status(400).send({ message: "Error finding user", error: error });
  }
});

app.post("/findDuplication", async (req, res) => {
  try {
    const dataInp = req.body;
    // console.log('Received:', dataInp.i_email, dataInp.i_username);
    const foundAcc = await admin_accounts.find({
      $or: [{ a_email: dataInp.i_email }, { a_username: dataInp.i_username }],
    });

    console.log(foundAcc);
    if (foundAcc.length > 0) {
      res.send({ isFound: true });
    } else {
      res.send({ isFound: false });
    }
  } catch (error) {
    console.error("Error finding user:", error);
    res.status(400).send({ message: "Error finding user", error: error });
  }
});
app.post("/createAccount", async (req, res) => {
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
      a_password: hashedPassword,
    });
    await createAcc.save();
    const nodemailer = require("nodemailer");

    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      auth: {
        user: process.env.NODEMAILER_USER,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const mailOptions = {
      from: "RBMS Labanos Team <rbms.labanos2024@gmail.com>",
      to: data.i_email,
      subject: "RBMS Account",
      html: `
                <p>Hello ${data.i_first_name} ${data.i_last_name}, Here is your Credentials: </p>
                <p>Username: ${data.i_username}</p>
                <p>Password: ${data.i_password}</p>
                
            `,
    };

    await transporter.sendMail(mailOptions);

    res
      .status(201)
      .send({ message: "User created successfully", created: true });
  } catch (error) {
    console.error("Error creating account:", error);
    res.status(500).send({ message: "Error creating account", created: false });
  }
});

app.put("/updateAccount/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const updatedData = req.body; // Get the updated data from the request body

    // Find the account by ID and update it
    const updatedAccount = await admin_accounts.findByIdAndUpdate(
      id,
      updatedData,
      { new: true }
    );

    if (!updatedAccount) {
      return res.status(404).send({ message: "Account not found" });
    }

    res.send({
      message: "Account updated successfully",
      account: updatedAccount,
      updated: true,
    });
  } catch (error) {
    console.error("Error updating account:", error);
    res.status(500).send({ message: "Error updating account" });
  }
});

app.post("/uploadBikeInfo", async (req, res) => {
  try {
    const data = req.body;

    const bikeInfo = await bike_infos({
      bike_id: data.i_bike_id,
      bike_name: data.i_bike_name,
      bike_type: data.i_bike_type,
      bike_rent_price: data.i_bike_rent_price,
      bike_desc: data.i_bike_desc,
      bike_image_url: data.i_bike_image_url,
    });

    const savedBikeInfo = await bikeInfo.save();
    savedBikeInfo
      ? res
        .status(201)
        .send({ message: "Bike uploaded successfully", isUploaded: true })
      : res.send({ message: "Error uploading bike", isUploaded: false });

    // res.status(201).send({ message: 'Bike uploaded successfully',  });
  } catch (error) {
    console.error("Error uploading bike:", error);
    res.status(500).send({ message: "Error uploading bike" });
  }
});

// app.get("/fetchAllBikes", async (req, res) => {
//   try {
//     const bikeInfo = await bike_infos.find();
//     res.status(200).send(bikeInfo);
//   } catch (error) {
//     console.error("Error fetching all bikes:", error);
//   }
// });
app.get("/fetchAllBikes", async (req, res) => {
  try {
    const bikeInfo = await bike_infos.aggregate([
      {
        $lookup: {
          from: "bike_reserves", // Name of the bike_reserve collection
          localField: "bike_id", // Field from bike_infos collection
          foreignField: "bike_id", // Field from bike_reserve collection
          as: "reservations", // Name of the new array field to add
        },
      },
      {
        $addFields: {
          reservations: {
            $filter: {
              input: "$reservations", // The array to filter
              as: "reservation", // Variable name for each element
              cond: {
                $or: [
                  { $eq: ["$$reservation.bikeStatus", "RENTED"] }, // Condition for RENTED
                  { $eq: ["$$reservation.bikeStatus", "RESERVED"] }, // Condition for RESERVED
                ],
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: "customer_accounts", // Name of the customer_accounts collection
          localField: "reservations.email", // Field from reservations
          foreignField: "c_email", // Field from customer_accounts collection
          as: "customerInfo", // Name of the new array field to add
        },
      },
      {
        $addFields: {
          customerInfo: { $arrayElemAt: ["$customerInfo", 0] }, // Get the first element if multiple matches
        },
      },
      {
        $lookup: {
          from: "bike_renteds", // Name of the bike_rented collection
          localField: "bike_id", // Field from bike_infos collection
          foreignField: "bike_id", // Field from bike_rented collection
          as: "rentedInfo", // Name of the new array field to add
        },
      },
      {
        $addFields: {
          rentedInfo: { 
            $filter: {
              input: "$rentedInfo", // The array to filter
              as: "rental", // Variable name for each element
              cond: {
                $eq: ["$$rental.bikeStatus", "RENTED"], // Condition for RENTED
              },
            },
          }, // Get the first rented info if multiple matches
        },
      },
      {
        $lookup: {
          from: "temporary_accounts", // Name of the temporary_accounts collection
          localField: "rentedInfo.rent_number", // Field from reservations
          foreignField: "rent_number", // Field from temporary_accounts collection
          as: "temporaryInfo", // Name of the new array field to add
        },
      },
      {
        $addFields: {
          temporaryInfo: { $arrayElemAt: ["$temporaryInfo", 0] }, // Get the first temporary account info if multiple matches
        },
      },
    ]);

    res.status(200).send(bikeInfo);
  } catch (error) {
    console.error("Error fetching all bikes:", error);
    res
      .status(500)
      .send({ message: "Error fetching all bikes", error: error.message });
  }
});

app.post("/sendEmailOTP", async (req, res) => {
  try {
    const data = req.body;
    const nodemailer = require("nodemailer");

    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      auth: {
        user: process.env.NODEMAILER_USER,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const mailOptions = {
      from: "RBMS Labanos Team, <rbms.labanos2024@gmail.com>",
      to: data.emailTo,
      subject: "RBMS OTP",
      html: `
                <p>Hello ${data.emailTo}, Here is your OTP: ${data.myOTP}</p>
            `,
    };

    transporter.sendMail(mailOptions, function (err, info) {
      if (err) {
        console.log("Error: ", err);
      } else {
        console.log("Email sent successfully!");
        res.status(200).json({ message: "Email sent successfully" });
      }
    });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ message: "Error sending email" });
  }
});

app.put("/updatePassword/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;

    const hashedPass = await bcrypt.hash(data.a_password, 10);
    const newPass = {
      a_password: hashedPass,
    };
    const updatePass = await admin_accounts.findByIdAndUpdate(id, newPass, {
      new: true,
    });

    if (updatePass) {
      res.status(200).json({
        message: "Password updated successfully",
        data: updatePass,
        pUpdated: true,
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("Error updating password:", error);
  }
});

app.get("/getReservations", async (req, res) => {
  try {
    // Check if the bike is already reserved for today
    const startOfDay = moment().startOf("day").utc().toDate();
    const endOfDay = moment().endOf("day").utc().toDate();

    // Fetch reservations for today that are not canceled
    const getReservations = await bike_reserve.find({
      reservation_date: {
        $gte: startOfDay,
        $lt: endOfDay,
      },
      $or: [
        { bikeStatus: "RESERVED" },
        { bikeStatus: "CANCELED" },
        { bikeStatus: "RENTED" },
        { bikeStatus: "COMPLETE" },
      ],
    });

    if (getReservations.length === 0) {
      return res.send({
        message: "No reservations found for today.",
        records: [],
      });
    }

    // Extract bike_ids from the reservations
    const bikeIds = getReservations.map((reservation) => reservation.bike_id);

    // Fetch bike information for the corresponding bike_ids
    const bikeInfo = await bike_infos.find({ bike_id: { $in: bikeIds } });

    // Create a mapping of bike_id to bike details for easy access
    const bikeDetailsMap = bikeInfo.reduce((map, bike) => {
      map[bike.bike_id] = bike;
      return map;
    }, {});

    // Combine reservations with their corresponding bike information
    const reservationsWithBikeInfo = getReservations.map((reservation) => ({
      ...reservation.toObject(), // Convert mongoose document to plain object
      bikeInfo: bikeDetailsMap[reservation.bike_id] || null, // Add bike info or null if not found
    }));

    res.send({
      message: "Reservations retrieved successfully.",
      records: reservationsWithBikeInfo,
    });
  } catch (error) {
    console.error("Error getting reservations:", error);
    res
      .status(500)
      .send({ message: "Error getting reservations", error: error.message });
  }
});
app.get("/getReservationsAndRentedBikes", async (req, res) => {
  try {
    // Check the date range for today
    const startOfDay = moment().startOf("day").utc().toDate();
    const endOfDay = moment().endOf("day").utc().toDate();

    // Fetch reservations for today
    const getReservations = await bike_reserve.find({
      reservation_date: {
        $gte: startOfDay,
        $lt: endOfDay,
      },
      $or: [
        { bikeStatus: "RESERVED" },
        { bikeStatus: "CANCELED" },
        { bikeStatus: "RENTED" },
        { bikeStatus: "COMPLETE" },
      ],
    });

    // Fetch rented bikes for today
    const rentedBikes = await bike_rented.find({
      // rented_date: {
      //   $gte: startOfDay,
      //   $lt: endOfDay,
      // },
      bikeStatus: "RENTED",
    });

    // Prepare response data
    const response = {
      reservations: [],
      rentedBikes: [],
    };

    // Process reservations
    if (getReservations.length > 0) {
      const bikeIds = getReservations.map((reservation) => reservation.bike_id);
      const bikeInfo = await bike_infos.find({ bike_id: { $in: bikeIds } });
      const bikeDetailsMap = bikeInfo.reduce((map, bike) => {
        map[bike.bike_id] = bike;
        return map;
      }, {});

      response.reservations = getReservations.map((reservation) => ({
        ...reservation.toObject(),
        bikeInfo: bikeDetailsMap[reservation.bike_id] || null,
      }));
    }

    // Process rented bikes
    if (rentedBikes.length > 0) {
      const bikeIds = rentedBikes.map((rental) => rental.bike_id);
      const bikeInfo = await bike_infos.find({ bike_id: { $in: bikeIds } });
      const bikeDetailsMap = bikeInfo.reduce((map, bike) => {
        map[bike.bike_id] = bike;
        return map;
      }, {});

      response.rentedBikes = rentedBikes.map((rental) => ({
        ...rental.toObject(),
        bikeInfo: bikeDetailsMap[rental.bike_id] || null,
      }));
    }

    res.send({
      message: "Reservations and rented bikes retrieved successfully.",
      records: response,
    });
  } catch (error) {
    console.error("Error getting reservations and rented bikes:", error);
    res
      .status(500)
      .send({ message: "Error getting reservations and rented bikes", error: error.message });
  }
});
// app.get("/getReservationsALL", async (req, res) => {
//   try {
//     // Check if the bike is already reserved for today
//     const startOfDay = moment().startOf("day").utc().toDate();
//     const endOfDay = moment().endOf("day").utc().toDate();

//     // Fetch reservations for today that are not canceled
//     const getReservations = await bike_reserve.find({
//       $or: [{ bikeStatus: "CANCELED" }, { bikeStatus: "COMPLETE" }],
//     });

//     if (getReservations.length === 0) {
//       return res.send({ message: "Reservations is empty.", records: [] });
//     }

//     // Extract bike_ids from the reservations
//     const bikeIds = getReservations.map((reservation) => reservation.bike_id);

//     // Fetch bike information for the corresponding bike_ids
//     const bikeInfo = await bike_infos.find({ bike_id: { $in: bikeIds } });

//     // Create a mapping of bike_id to bike details for easy access
//     const bikeDetailsMap = bikeInfo.reduce((map, bike) => {
//       map[bike.bike_id] = bike;
//       return map;
//     }, {});

//     // Combine reservations with their corresponding bike information
//     const reservationsWithBikeInfo = getReservations.map((reservation) => ({
//       ...reservation.toObject(), // Convert mongoose document to plain object
//       bikeInfo: bikeDetailsMap[reservation.bike_id] || null, // Add bike info or null if not found
//     }));

//     res.send({
//       message: "Reservations retrieved successfully.",
//       records: reservationsWithBikeInfo,
//     });
//   } catch (error) {
//     console.error("Error getting reservations:", error);
//     res
//       .status(500)
//       .send({ message: "Error getting reservations", error: error.message });
//   }
// });
app.get("/getReservationsALL", async (req, res) => {
  try {
    // Check if the bike is already reserved for today
    const startOfDay = moment().startOf("day").utc().toDate();
    const endOfDay = moment().endOf("day").utc().toDate();

    // Fetch reservations for today that are not canceled
    const getReservations = await bike_reserve.find({
      $or: [{ bikeStatus: "CANCELED" }, { bikeStatus: "COMPLETE" }],
    });

    // Fetch rented bikes for today
    const getRentedBikes = await bike_rented.find({
      bikeStatus: "COMPLETE", // Assuming you want only active rentals
    });

    // Combine both reservations and rented bikes
    const combinedRecords = [...getReservations, ...getRentedBikes];

    if (combinedRecords.length === 0) {
      return res.send({ message: "No reservations or rentals found.", records: [] });
    }

    // Extract bike_ids from the combined records
    const bikeIds = combinedRecords.map((record) => record.bike_id);

    // Fetch bike information for the corresponding bike_ids
    const bikeInfo = await bike_infos.find({ bike_id: { $in: bikeIds } });

    // Create a mapping of bike_id to bike details for easy access
    const bikeDetailsMap = bikeInfo.reduce((map, bike) => {
      map[bike.bike_id] = bike;
      return map;
    }, {});

    // Combine records with their corresponding bike information
    const recordsWithBikeInfo = combinedRecords.map((record) => ({
      ...record.toObject(), // Convert mongoose document to plain object
      bikeInfo: bikeDetailsMap[record.bike_id] || null, // Add bike info or null if not found
    }));

    res.send({
      message: "Reservations and rentals retrieved successfully.",
      records: recordsWithBikeInfo,
    });
  } catch (error) {
    console.error("Error getting reservations and rentals:", error);
    res
      .status(500)
      .send({ message: "Error getting reservations and rentals", error: error.message });
  }
});
app.get("/getReservationsFIVE", async (req, res) => {
  try {
    // Check if the bike is already reserved for today
    const startOfDay = moment().startOf("day").utc().toDate();
    const endOfDay = moment().endOf("day").utc().toDate();

    // Fetch reservations for today that are not canceled
    const getReservations = await bike_reserve
      .find({
        reservation_date: { $gte: startOfDay, $lte: endOfDay },
      })
      .sort({ reservation_date: -1 })
      .limit(5);

    if (getReservations.length === 0) {
      return res.send({ message: "Reservations is empty.", records: [] });
    }

    // Extract bike_ids from the reservations
    const bikeIds = getReservations.map((reservation) => reservation.bike_id);

    // Fetch bike information for the corresponding bike_ids
    const bikeInfo = await bike_infos.find({ bike_id: { $in: bikeIds } });

    // Create a mapping of bike_id to bike details for easy access
    const bikeDetailsMap = bikeInfo.reduce((map, bike) => {
      map[bike.bike_id] = bike;
      return map;
    }, {});

    // Combine reservations with their corresponding bike information
    const reservationsWithBikeInfo = getReservations.map((reservation) => ({
      ...reservation.toObject(), // Convert mongoose document to plain object
      bikeInfo: bikeDetailsMap[reservation.bike_id] || null, // Add bike info or null if not found
    }));

    res.send({
      message: "Reservations retrieved successfully.",
      records: reservationsWithBikeInfo,
    });
  } catch (error) {
    console.error("Error getting reservations:", error);
    res
      .status(500)
      .send({ message: "Error getting reservations", error: error.message });
  }
});
app.put("/updateBikeStatus/:reserveId", async (req, res) => {
  try {
    const reserveId = req.params.reserveId; // Get the reservation ID from the request parameters
    const { bikeStatus, bikeId, returnTime } = req.body; // Expecting bikeStatus and bikeId in the request body
    const currentTime = moment().format("LT").toString(); // Output: 12:00 AM
    // Update the bikeStatus in bike_reserve
    // console.log(currentTime);
    const updatedReserve = await bike_reserve.findByIdAndUpdate(
      reserveId,
      {
        bikeStatus: bikeStatus,
        timeofuse: currentTime,
        returnTime: returnTime,
      },
      { new: true } // Return the updated document
    );

    if (!updatedReserve) {
      return res.status(404).send({ message: "Reservation not found" });
    }

    // Update the bike_status in bike_infos based on bike_id
    const updatedBike = await bike_infos.findOneAndUpdate(
      { bike_id: bikeId },
      { bike_status: bikeStatus }, // Set the new bike_status
      { new: true } // Return the updated document
    );

    if (!updatedBike) {
      return res.status(404).send({ message: "Bike not found" });
    }

    res.send({
      message: "Bike status updated successfully",
      updatedReserve,
      updatedBike,
    });
  } catch (error) {
    console.error("Error updating bike status:", error);
    res
      .status(500)
      .send({ message: "Error updating bike status", error: error.message });
  }
});
app.put("/updateBikeStatusToVacant/:reserveId", async (req, res) => {
  try {
    const reserveId = req.params.reserveId; // Get the reservation ID from the request parameters
    const { bikeStatus, bikeId } = req.body; // Expecting bikeStatus and bikeId in the request body

    // Update the bikeStatus in bike_reserve
    const updatedReserve = await bike_reserve.findByIdAndUpdate(
      reserveId,
      { bikeStatus: "COMPLETE" }, // Set the new bikeStatus
      { new: true } // Return the updated document
    );

    if (!updatedReserve) {
      return res.status(404).send({ message: "Reservation not found" });
    }

    // Update the bike_status in bike_infos based on bike_id
    const updatedBike = await bike_infos.findOneAndUpdate(
      { bike_id: bikeId },
      { bike_status: bikeStatus }, // Set the new bike_status
      { new: true } // Return the updated document
    );

    if (!updatedBike) {
      return res.status(404).send({ message: "Bike not found" });
    }

    res.send({
      message: "Bike status updated successfully",
      updatedReserve,
      updatedBike,
    });
  } catch (error) {
    console.error("Error updating bike status:", error);
    res
      .status(500)
      .send({ message: "Error updating bike status", error: error.message });
  }
});
app.put("/updateRentedBikeStatusToVacant/:rentId", async (req, res) => {
  try {
    const rentId = req.params.rentId; // Get the reservation ID from the request parameters
    const { bikeStatus, bikeId } = req.body; // Expecting bikeStatus and bikeId in the request body

    // Update the bikeStatus in bike_reserve
    const updatedRent = await bike_rented.findByIdAndUpdate(
      rentId,
      { bikeStatus: "COMPLETE" }, // Set the new bikeStatus
      { new: true } // Return the updated document
    );

    if (!updatedRent) {
      return res.status(404).send({ message: "Rent not found" });
    }

    // Update the bike_status in bike_infos based on bike_id
    const updatedBike = await bike_infos.findOneAndUpdate(
      { bike_id: bikeId },
      { bike_status: bikeStatus }, // Set the new bike_status
      { new: true } // Return the updated document
    );

    if (!updatedBike) {
      return res.status(404).send({ message: "Bike not found" });
    }

    res.send({
      message: "Bike status updated successfully",
      updatedRent,
      updatedBike,
    });
  } catch (error) {
    console.error("Error updating bike status:", error);
    res
      .status(500)
      .send({ message: "Error updating bike status", error: error.message });
  }
});
app.delete("/deleteBike/:bikeId", async (req, res) => {
  try {
    const bikeId = req.params.bikeId; // Get the bike_id from the request parameters

    // Attempt to find and delete the bike info by bike_id
    const deletedBike = await bike_infos.findOneAndDelete({ bike_id: bikeId });

    if (!deletedBike) {
      return res
        .status(404)
        .send({ message: "Bike not found", success: false });
    }

    res.send({
      message: "Bike deleted successfully",
      deletedBike,
      success: true,
    });
  } catch (error) {
    console.error("Error deleting bike:", error);
    res
      .status(500)
      .send({ message: "Error deleting bike", error: error.message });
  }
});

app.post("/createTemp", async (req, res) => {
  try {
    const data = req.body;
    const tokenExp = data.tExp + 1

    const existingAccount = await temporary_accounts.findOne({
      $or: [{ t_username: data.username }]
    });

    if (existingAccount) {
      return res.send({ message: "Username  already exists", isCreated: false });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const createTAcc = temporary_accounts({
      rent_number: data.rent_number,
      t_name: data.name,
      t_phone: data.phone,
      t_email: data.email,
      t_username: data.username,
      t_password: hashedPassword,
      t_age: data.age
    });
    
    // Generate JWT token
    const token = jwt.sign(
      { id: createTAcc._id, username: createTAcc.t_username, email: createTAcc.t_email, phone: createTAcc.t_phone },
      process.env.JWT_SECRET,
      { expiresIn: `${tokenExp}h` }
    );
    createTAcc.tokenExp = token;
    await createTAcc.save();


    res.status(201).send({ message: "Account created successfully", isCreated: true })

    const nodemailer = require("nodemailer");

    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      auth: {
        user: process.env.NODEMAILER_USER,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const mailOptions = {
      from: "RBMS Labanos Team, <rbms.labanos2024@gmail.com>",
      to: data.email,
      subject: "RBMS Temporary Account",
      html: `
                <p>Hello ${createTAcc.t_name}, Here is your credentials of your Temporary Account:</p>
                <p>Username: ${createTAcc.t_username}</p>
                <p>Password: ${data.password}</p>
                <p>Don't share your account</p>
            `,
    };

    transporter.sendMail(mailOptions, function (err, info) {
      if (err) {
        console.log("Error: ", err);
      } else {
        console.log("Email sent successfully!");
        res.status(200).json({ message: "Email sent successfully" });
      }
    });


  } catch (error) {
    console.error("Error creating temporary account:", error);
    res.send({ message: "Error creating account", isCreated: false });
  }
})
app.post("/insertRent", async (req, res) => {
  try {
    const data = req.body;
    const rent = bike_rented({
      rent_number: data.rent_number,
      name: data.name,
      phone: data.phone,
      email: data.email,
      bike_id: data.bike_id,
      duration: data.duration,
      timeofuse: data.timeofuse,
      returnTime: data.returnTime,
      totalBikeRentPrice: data.totalBikeRentPrice
    })
    await rent.save();
    // Update bikeStatus to RENTED in Bike_infos
    const bikeUpdate = await bike_infos.findOneAndUpdate(
      { bike_id: data.bike_id },
      { bike_status: 'RENTED' },
      { new: true } // This option returns the updated document
    );

    if (bikeUpdate) {
      return res.status(201).send({ message: "Bike is now rented.", isRented: true });
    } else {
      return res.status(400).send({ message: "Error updating bike status.", isRented: false });
    }
  } catch (error) {
    console.error("Error renting bike:", error);
    return res.status(500).send({ message: "Internal server error.", isRented: false });
  }
})
app.get("/getReservationData", async (req, res) => {
  try {
    const reservations = await bike_reserve.aggregate([
      {
        $lookup: {
          from: "bike_infos", // The name of the bike_infos collection
          localField: "bike_id", // Field from bike_reserve collection
          foreignField: "bike_id", // Field from bike_infos collection
          as: "bike_info", // The name of the new array field to add
        },
      },
      {
        $unwind: "$bike_info", // Unwind to flatten the bike_info array
      },
      {
        $project: {
          bike_id: 1,
          totalReservationFee: 1,
          totalBikeRentPrice: 1,
          date_gathered: "$reservation_date",
          bike_type: "$bike_info.bike_type", // Include bike_type from bike_infos
        },
      },
    ]);

    res.status(200).send(reservations);
  } catch (error) {
    console.error("Error fetching reservation data:", error);
    res.status(500).send({ message: "Error fetching reservation data", error: error.message });
  }
});
app.get("/getRentData", async (req, res) => {
  try {
    const rentData = await bike_rented.aggregate([
      {
        $match: {
          bikeStatus: "COMPLETE"
        }
      },
      {
        $lookup: {
          from: 'bike_infos',
          localField: 'bike_id',
          foreignField: 'bike_id',
          as: 'bike_info'
        }
      },
      {
        $unwind: "$bike_info"
      },
      {
        $project: {
          bike_id: 1,
          totalBikeRentPrice: 1,
          date_gathered: "$rented_date",
          bike_type: "$bike_info.bike_type"
        }
      }
    ]);

    res.status(200).send(rentData);
  } catch (error) {
    console.error("Error fetching rent data:", error);
    res.status(500).send({ message: "Error fetching rent data", error: error.message });
  }
});

app.get("/bikeCoords", async (req, res) => {
  try {
    const bikeCoords = await bikeloc.find();
    const bikeIds = bikeCoords.map((coord) => coord.bike_id);
    const bikeInfos = await bike_infos.find({ bike_id: { $in: bikeIds } });
    const combinedData = bikeCoords.map((coord) => {
      const bikeInfo = bikeInfos.find((info) => info.bike_id === coord.bike_id);
      return { ...coord.toObject(), bikeInfo };
    });
    res.status(200).send(combinedData);
  } catch (error) {
    console.error("Error fetching bike coordinates:", error);
    res.status(500).send({ message: "Error fetching bike coordinates", error: error.message });
  }
});





//ANDROID QUERIES
app.get('/rbmsa/getToken/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const gettoken = await temporary_accounts.findById(id);
    res.send({myToken: gettoken.tokenExp});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/rbmsa/check-connection", async (req, res) => {
  try {
    // Perform a simple query to check the connection
    const result = await customer_accounts.findOne({});
    res.status(200).json({ message: "MongoDB connection is healthy", result });
  } catch (error) {
    res.status(500).json({ message: "MongoDB connection error", error });
  }
});

app.get("/rbmsa/topBikes", async (req, res) => {
  try {
    const records = await bike_infos.find().sort({ dateAdded: -1 }).limit(10);
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.post("/rbmsa/typeBikes", async (req, res) => {
  try {
    const bikeType = req.body;
    const records = await bike_infos.find({ bike_type: bikeType.bike_type });
    res.status(200).json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put("/rbmsa/updateBikeStat/:bikeid", async (req, res) => {
  try {
    const bikeId = req.params.bikeid;
    const bikeStat = req.body;
    const updateBikeStat = await bike_infos.findByIdAndUpdate(bikeId, bikeStat);
    res.status(200).json({
      message: "Bike status updated successfully",
      data: updateBikeStat,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/rbmsa/createUser", async (req, res) => {
  try {
    const data = req.body;

    const existingUser = await customer_accounts.findOne({
      $or: [{ c_username: data.i_username }, { c_email: data.i_email }],
    });

    if (existingUser) {
      return res.send({
        message: "Username or email already exists",
        isCreated: false,
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
        postalCode: data.i_postalCode,
      },
      c_email: data.i_email,
      c_phone: data.i_phone,
    });

    await user.save();
    user
      ? res
        .status(201)
        .send({ message: "Account created successfully", isCreated: true })
      : res.send({ message: "Error creating account", isCreated: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/rbmsa/loginAcc", async (req, res) => {
  try {
    const { i_username, i_password } = req.body;
    const findUser = await customer_accounts.findOne({
      c_username: i_username,
    });
    if (!findUser) {
      return res.send({
        message: "User not found, check for whitespaces.",
        isFound: false,
      });
    } else {
      const isValidPassword = await bcrypt.compare(
        i_password,
        findUser.c_password
      );
      if (!isValidPassword) {
        return res.send({ message: "Invalid password" });
      } else {
        return res.send({
          message: "Login successful",
          isFound: true,
          loginData: findUser,
        });
      }
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.post("/rbmsa/loginTempAcc", async (req, res) => {
  try {
    const { i_username, i_password } = req.body;
    const findUser = await temporary_accounts.findOne({
      t_username: i_username,
    });
    if (!findUser) {
      return res.send({
        message: "User not found, check for whitespaces.",
        isFound: false,
      });
    } else {
      const isValidPassword = await bcrypt.compare(
        i_password,
        findUser.t_password
      );
      if (!isValidPassword) {
        return res.send({ message: "Invalid password" });
      } else {
        return res.send({
          message: "Login successful",
          isFound: true,
          loginData: findUser,
        });
      }
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put("/rbmsa/UpdateReserve/:id", async (req, res) => {
  const id = req.params.id;
  const { bike_status, ...reserveData } = req.body; // Destructure bike_status and reserveData
  try {
    // Check if the bike exists
    const findBike = await bike_infos.findById(id);
    if (!findBike) {
      return res.send({ message: "Bike not found" });
    }

    // Check if the bike is already reserved for today
    const startOfDay = moment().startOf("day").utc().toDate();
    const endOfDay = moment().endOf("day").utc().toDate();

    // console.log(reserveData.email);

    // Check if the user has already reserved a bike today
    const existingReservationForEmail = await bike_reserve.findOne({
      email: reserveData.email,
      reservation_date: { $gte: startOfDay, $lte: endOfDay },
      $or: [{ bikeStatus: "RESERVED" }, { bikeStatus: "RENTED" }], // Ensure no existing reservations for today
    });

    if (existingReservationForEmail) {
      return res.send({
        message:
          "You have already reserved a bike for today. You cannot reserve another one. or Bike is rented",
      });
    }

    const existingReservation = await bike_reserve.findOne({
      bike_id: reserveData.bike_id,
      reservation_date: {
        $gte: startOfDay,
        $lt: endOfDay,
      },
      bikeStatus: "RESERVED",
    });

    if (existingReservation) {
      return res.send({ message: "Bike is already reserved for today." });
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
        ...reserveData,
      };

      const nodemailer = require("nodemailer");

      const transporter = nodemailer.createTransport({
        service: "gmail",
        port: 587,
        secure: false,
        auth: {
          user: process.env.NODEMAILER_USER,
          pass: process.env.NODEMAILER_PASSWORD,
        },
      });

      const mailOptions = {
        from: "RBMS Labanos Team <rbms.labanos2024@gmail.com>",
        to: userInfo.email,
        subject: "Bike Reservation",
        html: `
                    <p>Hello ${userInfo.name}, you reserved for ${userInfo.bike_id} </p>
                    <p>present this to the labanos team to confirm your reservation and to start your bike rental</p>
                `,
      };

      await transporter.sendMail(mailOptions);
    } else {
      return res.send({
        message: "Error saving reservation, email not sent.",
        isReserved: false,
      });
    }

    return res.send({
      message: "Bike status reserved successfully",
      isReserved: true,
      data: updatedBikeStat,
    });
  } catch (error) {
    console.error("Error updating bike status:", error);
    return res.send({
      message: "Something went wrong",
      error: error.message,
      isReserved: false,
    });
  }
});

app.post("/rbmsa/getReservations", async (req, res) => {
  try {
    const data = req.body;
    const getbid = data.bID;
    const getemail = data.email;
    // Check if the bike is already reserved for today
    const startOfDay = moment().startOf("day").utc().toDate();
    const endOfDay = moment().endOf("day").utc().toDate();

    const getReservations = await bike_reserve.findOne({
      bike_id: getbid,
      email: getemail,
      reservation_date: {
        $gte: startOfDay,
        $lt: endOfDay,
      },
      bikeStatus: "RESERVED",
    });
    res.send(getReservations);
  } catch (error) {
    console.error("Error getting reservations:", error);
  }
});

app.get("/rbmsa/getReservationsviaEmail/:email", async (req, res) => {
  try {
    const email = req.params.email;
    // Check if the bike is already reserved for today
    const startOfDay = moment().startOf("day").utc().toDate();
    const endOfDay = moment().endOf("day").utc().toDate();

    const getReservations = await bike_reserve.findOne({
      email: email,
      reservation_date: {
        $gte: startOfDay,
        $lt: endOfDay,
      },
      $or: [{ bikeStatus: "RESERVED" }, { bikeStatus: "RENTED" }],
    });
    res.send(getReservations);
  } catch (error) {
    console.error("Error getting reservations:", error);
  }
});

app.get("/rbmsa/getRentedsviaEmail/:email", async (req, res) => {
  try {
    const email = req.params.email;
    // Check if the bike is already reserved for today
    const startOfDay = moment().startOf("day").utc().toDate();
    const endOfDay = moment().endOf("day").utc().toDate();

    const getRented = await bike_rented.findOne({
      email: email,
      rented_date: {
        $gte: startOfDay,
        $lt: endOfDay,
      },
      bikeStatus: "RENTED",
    });
    res.send(getRented);
  } catch (error) {
    console.error("Error getting reservations:", error);
  }
});

app.post("/rbmsa/reservedBike", async (req, res) => {
  try {
    const data = req.body;
    const bikeId = data.bID;
    const userEmail = data.email; // Assuming the email is passed in the request body

    // Get the start and end of the day
    const startOfDay = moment().startOf("day").utc().toDate();
    const endOfDay = moment().endOf("day").utc().toDate();

    // Find reservations for the specified bike_id and email that are made today
    const reservationsToday = await bike_reserve.find({
      bike_id: bikeId,
      email: userEmail, // Filter by user email
      reservation_date: { $gte: startOfDay, $lte: endOfDay },
      bikeStatus: "RESERVED",
    });

    // Check if reservationsToday is an array and its length
    if (!Array.isArray(reservationsToday) || reservationsToday.length === 0) {
      return res.send({
        records: [],
        message: "No reservations found for today for this email.",
      });
    }

    // Get bike information for the specified bike_id
    const bikeInfo = await bike_infos.find({ bike_id: bikeId });

    // Combine the results
    res.send({
      bikeInfo,
      reservationsToday,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.post("/rbmsa/checkBStat", async (req, res) => {
  try {
    const data = req.body;
    const bikeId = data.bID;
    const userEmail = data.email; // Assuming the email is passed in the request body

    // Get the start and end of the day
    const startOfDay = moment().startOf("day").utc().toDate();
    const endOfDay = moment().endOf("day").utc().toDate();

    // Find reservations for the specified bike_id and email that are made today
    const reservationsToday = await bike_reserve.find({
      bike_id: bikeId,
      email: userEmail, // Filter by user email
      reservation_date: { $gte: startOfDay, $lte: endOfDay },
      $or: [{ bikeStatus: "RESERVED" }, { bikeStatus: "RENTED" }],
    });

    // Check if reservationsToday is an array and its length
    if (!Array.isArray(reservationsToday) || reservationsToday.length === 0) {
      return res.send({
        records: [],
        message: "No reservations found for today for this email.",
      });
    }

    // Get bike information for the specified bike_id
    const bikeInfo = await bike_infos.find({ bike_id: bikeId });

    // Combine the results
    res.send({
      bikeInfo,
      reservationsToday,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.post("/rbmsa/getRentedBike", async (req, res) => {
  try {
    const data = req.body;
    const bikeId = data.bID;
    const userEmail = data.email; // Assuming the email is passed in the request body

    // Get the start and end of the day
    const startOfDay = moment().startOf("day").utc().toDate();
    const endOfDay = moment().endOf("day").utc().toDate();

    // Find reservations for the specified bike_id and email that are made today
    const reservationsToday = await bike_reserve.find({
      bike_id: bikeId,
      email: userEmail, // Filter by user email
      reservation_date: { $gte: startOfDay, $lte: endOfDay },
      bikeStatus: "RENTED",
    });

    // Check if reservationsToday is an array and its length
    if (!Array.isArray(reservationsToday) || reservationsToday.length === 0) {
      return res.send({
        records: [],
        message: "No reservations found for today for this email.",
      });
    }

    // Get bike information for the specified bike_id
    const bikeInfo = await bike_infos.find({ bike_id: bikeId });

    // Combine the results
    res.send({
      bikeInfo,
      reservationsToday,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/rbmsa/getAllUser-Reservations", async (req, res) => {
  try {
    const { email } = req.body; // Assuming the email is sent in the request body

    // Fetch all reservations for the logged-in user based on their email
    const userReservations = await bike_reserve.find({ email: email });

    if (userReservations.length === 0) {
      return res.send({
        message: "No reservations found for this user.",
        records: [],
      });
    }

    // Extract bike_ids from the reservations
    const bikeIds = userReservations.map((reservation) => reservation.bike_id);

    // Fetch bike information for the corresponding bike_ids
    const bikeInfo = await bike_infos.find({ bike_id: { $in: bikeIds } });

    // Create a mapping of bike_id to bike details for easy access
    const bikeDetailsMap = bikeInfo.reduce((map, bike) => {
      map[bike.bike_id] = bike;
      return map;
    }, {});

    // Combine reservations with their corresponding bike information
    const reservationsWithBikeInfo = userReservations.map((reservation) => ({
      ...reservation.toObject(), // Convert mongoose document to plain object
      bikeInfo: bikeDetailsMap[reservation.bike_id] || null, // Add bike info or null if not found
    }));

    res.send({
      message: "Reservations retrieved successfully.",
      records: reservationsWithBikeInfo,
    });
  } catch (error) {
    console.error("Error fetching user reservations:", error);
    res
      .status(500)
      .send({ message: "Error fetching reservations", error: error.message });
  }
});

app.put("/rbmsa/cancelReservation", async (req, res) => {
  try {
    const data = req.body; // Expecting bike_id and email in the request body
    const bID = data.bID;
    const email = data.email;

    // Get the start and end of the day
    const startOfDay = moment().startOf("day").utc().toDate();
    const endOfDay = moment().endOf("day").utc().toDate();

    // Find reservations for the specified bike_id and email that are made today
    const reservationsToday = await bike_reserve.find({
      bike_id: bID,
      email: email,
      reservation_date: { $gte: startOfDay, $lt: endOfDay },
      bikeStatus: "RESERVED",
    });

    // Check if there are any reservations to cancel
    if (!Array.isArray(reservationsToday) || reservationsToday.length === 0) {
      return res.send({
        records: [],
        message: "No reservations found for today for this email.",
      });
    }

    // Update the isCancel field to true for all found reservations
    const updatePromises = reservationsToday.map(async (reservation) => {
      // Update reservation to be canceled
      await bike_reserve.findByIdAndUpdate(
        reservation._id,
        { bikeStatus: "CANCELED", timeofuse: "00:00" },
        { new: true }
      );

      // Update the bike status to 'vacant'
      await bike_infos.findOneAndUpdate(
        { bike_id: bID },
        { bike_status: "VACANT" }, // Set status to 'vacant'
        { new: true }
      );
    });

    await Promise.all(updatePromises);

    res.send({
      message: "Reservations cancelled successfully.",
      bikeStatus: "VACANT",
    });
  } catch (error) {
    console.error("Error cancelling reservation:", error);
    res
      .status(500)
      .send({ message: "Error cancelling reservation", error: error.message });
  }
});

app.post("/rbmsa/create-transaction", async (req, res) => {
  const { amount, mobile_phone } = req.body;

  try {
    // Create a payment link with PayMongo
    const paymentResponse = await axios.get(
      "https://pm.link/rbms-com/test/qMPeW1t",
      {
        data: {
          attributes: {
            amount: amount,
            currency: "PHP",
            description: "Bike Reservation",
            payment_method_types: ["gcash"],
            metadata: {
              mobile_phone: mobile_phone,
            },
          },
        },
      },
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${process.env.PAYMONGO_SECRET_KEY}:`
          ).toString("base64")}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.status(200).json(paymentResponse.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Payment creation failed" });
  }
});
app.put('/rbmsa/resetPassword/:id', async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  try {
    const user = await customer_accounts.findOne({ _id: id });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    user.c_password = hashedPassword;
    await user.save();
    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Password update failed" });
  }
})

app.post('/rbmsa/sendPassResetCode', async (req, res) => {
  const { email, code } = req.body;
  try {
    const user = await customer_accounts.findOne({ c_email: email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const nodemailer = require("nodemailer");

    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      auth: {
        user: process.env.NODEMAILER_USER,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const mailOptions = {
      from: "RBMS Labanos Team <rbms.labanos2024@gmail.com>",
      to: email,
      subject: "RBMS Reset Code",
      html: `
                <p>Hello ${user.c_first_name} ${user.c_last_name}, Here is your Reset Code: </p>
                <p style='font-size:24;font-weight:bold;'>${code}</p>
                
            `,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Password reset code sent successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Password reset code failed" });
  }
})
app.put('/rbmsa/setNewPass/:email', async (req, res) => {
  const { password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    // Check if user exists
    const user = await customer_accounts.findOne({ c_email: req.params.email });
    if (!user) {
      return res.status(404).json({ error: "User  not found" });
    }

    // Update password
    await customer_accounts.updateOne({ c_email: req.params.email }, {
      $set: { c_password: hashedPassword }
    });

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Password update failed" });
  }
})


//ESP32
app.get("/esp32/getRentedBikeReserve/:email/:bike_id", async (req, res) => {
  try {
    const { bike_id, email } = req.params; // Expecting bike_id and email as query parameters

    // Fetch bike reserves where bike_id, email match and bikeStatus is RENTED
    const rentedReserves = await bike_reserve.find({
      bike_id: bike_id,
      email: email,
      bikeStatus: "RENTED", // Condition for bikeStatus
    });

    if (rentedReserves.length === 0) {
      return res.status(404).send({ message: "No rented bike reserves found" });
    }

    res.send({
      message: "Rented bike reserves retrieved successfully",
      records: rentedReserves,
    });
  } catch (error) {
    console.error("Error fetching rented bike reserves:", error);
    res
      .status(500)
      .send({
        message: "Error fetching rented bike reserves",
        error: error.message,
      });
  }
});
app.get("/esp32/getRentedBike/:email/:bike_id", async (req, res) => {
  try {
    const { bike_id, email } = req.params; // Expecting bike_id and email as query parameters

    // Fetch bike reserves where bike_id, email match and bikeStatus is RENTED
    const rentedBike = await bike_rented.find({
      bike_id: bike_id,
      email: email,
      bikeStatus: "RENTED", // Condition for bikeStatus
    });

    if (rentedBike.length === 0) {
      return res.status(404).send({ message: "No rented bike found" });
    }

    res.send({
      message: "Rented bike retrieved successfully",
      records: rentedBike,
    });
  } catch (error) {
    console.error("Error fetching rented bike:", error);
    res
      .status(500)
      .send({
        message: "Error fetching rented bike",
        error: error.message,
      });
  }
});

app.put("/esp32/updateLockState", async (req, res) => {
  try {
    const { bike_id, email, lockState } = req.body; // Expecting bike_id, email, and lockstate in the request body

    // Update the lockstate in bike_reserve where bike_id and email match
    const updatedReserve = await bike_reserve.findOneAndUpdate(
      { bike_id: bike_id, email: email, bikeStatus:'RENTED' }, // Query to find the reservation
      { lockState: lockState }, // Set the new lockstate
      { new: true } // Return the updated document
    );

    if (!updatedReserve) {
      return res.status(404).send({ message: "Reservation not found" });
    }

    res.send({
      message: "Lockstate updated successfully",
      updatedReserve,
    });
  } catch (error) {
    console.error("Error updating lockstate:", error);
    res
      .status(500)
      .send({ message: "Error updating lockstate", error: error.message });
  }
});
app.put("/esp32/updateAlarmState", async (req, res) => {
  try {
    const { bike_id, email, alarmState } = req.body; // Expecting bike_id, email, and lockstate in the request body

    // Update the lockstate in bike_reserve where bike_id and email match
    const updatedReserve = await bike_reserve.findOneAndUpdate(
      { bike_id: bike_id, email: email, bikeStatus:'RENTED' }, // Query to find the reservation
      { alarmState: alarmState }, // Set the new lockstate
      { new: true } // Return the updated document
    );

    if (!updatedReserve) {
      return res.status(404).send({ message: "Reservation not found" });
    }

    res.send({
      message: "alarm state updated successfully",
      updatedReserve,
    });
  } catch (error) {
    console.error("Error updating lockstate:", error);
    res
      .status(500)
      .send({ message: "Error updating lockstate", error: error.message });
  }
});

app.put("/esp32/updateTempLockState", async (req, res) => {
  try {
    const { bike_id, email, lockState } = req.body; // Expecting bike_id, email, and lockstate in the request body

    // Update the lockstate in bike_reserve where bike_id and email match
    const updatedReserve = await bike_rented.findOneAndUpdate(
      { bike_id: bike_id, email: email, bikeStatus:'RENTED' }, // Query to find the reservation
      { lockState: lockState }, // Set the new lockstate

      { new: true } // Return the updated document
    );

    if (!updatedReserve) {
      return res.status(404).send({ message: "Rent not found" });
    }

    res.send({
      message: "Lockstate updated successfully",
      updatedReserve,
    });
  } catch (error) {
    console.error("Error updating lockstate:", error);
    res
      .status(500)
      .send({ message: "Error updating lockstate", error: error.message });
  }
});
app.put("/esp32/updateTempAlarmState", async (req, res) => {
  try {
    const { bike_id, email, alarmState } = req.body; // Expecting bike_id, email, and lockstate in the request body

    // Update the lockstate in bike_reserve where bike_id and email match
    const updatedReserve = await bike_rented.findOneAndUpdate(
      { bike_id: bike_id, email: email, bikeStatus:'RENTED' }, // Query to find the reservation
      { alarmState: alarmState }, // Set the new lockstate
      { new: true } // Return the updated document
    );

    if (!updatedReserve) {
      return res.status(404).send({ message: "Rent not found" });
    }

    res.send({
      message: "alarm state updated successfully",
      updatedReserve,
    });
  } catch (error) {
    console.error("Error updating lockstate:", error);
    res
      .status(500)
      .send({ message: "Error updating lockstate", error: error.message });
  }
});

app.post("/esp32/insertLoc", async (req, res) => {
  try {
    const data = req.body;

    // Check if the bike_id exists
    const existingBike = await bikeloc.findOne({ bike_id: data.bike_id });

    if (existingBike) {
      // If bike_id exists, update lat and lng
      existingBike.lat = data.lat;
      existingBike.lng = data.lng;
      await existingBike.save(); // Save the updated document
      res.status(200).send({ message: "Location updated successfully", bikeloc:existingBike });
    } else {
      // If bike_id does not exist, create a new entry
      const newLoc = await bikeloc.create({
        bike_id: data.bike_id,
        lat: data.lat,
        lng: data.lng,
      });
      res.status(201).send({ message: "New location created successfully", bikeloc:newLoc });
    }
  } catch (error) {
    console.error("Error inserting/updating location:", error);
    res.status(500).send({ error: "Internal server error" });
  }
});

app.get("/getRentedBikes/:bike_id", async (req, res) => {
  try {
    const data = req.params;
    // Fetch rented bikes from bike_renteds
    const rentedBikesFromRenteds = await bike_rented.find({
      bikeStatus: "RENTED",
      bike_id: data.bike_id,
    });

    // Fetch rented bikes from bike_reserves
    const rentedBikesFromReserves = await bike_reserve.find({
      bikeStatus: "RENTED",
      bike_id: data.bike_id,
    });

    // Combine the results
    const rentedBikes = [...rentedBikesFromRenteds, ...rentedBikesFromReserves];

    // Extract bike_ids from the combined results
    const bikeIds = rentedBikes.map((bike) => bike.bike_id);

    // Fetch bike information for the corresponding bike_ids
    const bikeInfo = await bike_infos.find({ bike_id: { $in: bikeIds } });

    // Create a mapping of bike_id to bike details for easy access
    const bikeDetailsMap = bikeInfo.reduce((map, bike) => {
      map[bike.bike_id] = bike;
      return map;
    }, {});

    // Combine rented bikes with their corresponding bike information
    const rentedBikesWithInfo = rentedBikes.map((bike) => ({
      ...bike.toObject(), // Convert mongoose document to plain object
      bikeInfo: bikeDetailsMap[bike.bike_id] || null, // Add bike info or null if not found
    }));

    res.send({
      message: "Rented bikes retrieved successfully.",
      records: rentedBikesWithInfo,
    });
  } catch (error) {
    console.error("Error fetching rented bikes:", error);
    res.status(500).send({
      message: "Error fetching rented bikes",
      error: error.message,
    });
  }
});





app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

function makeid(length) {
  let result = "";
  // const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return "BID-" + result;
}

function gcashID(length) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  // const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return "RBMS-" + result;
}

