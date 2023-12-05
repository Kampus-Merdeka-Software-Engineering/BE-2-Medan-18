import express from "express";
import cors from "cors";
import { Sequelize } from "sequelize";
import { DataTypes } from "sequelize";
import bcrypt from "bcrypt"; // Import bcrypt

const app = express();
const port = process.env.PORT;
const db = new Sequelize(
    process.env.DATABSE_NAME,
    process.env.DATABSE_USERNAME,
    process.env.DATABSE_PASSWORD, {
        host: process.env.DATABASE_HOST,
        dialect: "mysql",
        port: process.env.DATABASE_PORT,
});

const User = db.define("user", {
    userID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING },
    password: { type: DataTypes.STRING },
});

const History = db.define("history", {
    historyID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    userID: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    phoneNumber: { type: DataTypes.STRING, allowNull: false },
    address: { type: DataTypes.STRING, allowNull: false },
    accountNumber: { type: DataTypes.STRING, allowNull: false },
    pinOrCvv: { type: DataTypes.STRING, allowNull: false },
    listCart: { type: DataTypes.JSON, allowNull: false },
});

User.hasMany(History, { foreignKey: 'userID' });
History.belongsTo(User, { foreignKey: 'userID' });

const signUpUser = async (req, res) => {
    try { // Check if the email already exists
        const existingUser = await User.findOne({
            where: {
                email: req.body.email,
            },
        });

        if (existingUser) { // Email already exists, send a response indicating that
            res.status(400).json({ error: "Email is already in use" });
        } else { // Email doesn't exist, create a new user
            // Hash the password before storing it
            const hashedPassword = await bcrypt.hash(req.body.password, 10);
            const user = await User.create({
                name: req.body.name,
                email: req.body.email,
                password: hashedPassword, // Store hashed password
            });
            res.status(201).json({ msg: "User Created" });
        }
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const signInUser = async (req, res) => {
    try {
        const user = await User.findOne({
            // Find the user by email
            where: {
                email: req.body.email,
            },
        });

        if (!user) {
            // User not found
            res.status(401).json({ error: "Invalid Email" });
            return;
        }

        // Compare the entered password with the hashed password in the database
        const isPasswordValid = await bcrypt.compare(req.body.password, user.password);

        if (!isPasswordValid) {
            res.status(401).json({ error: "Invalid Password" });
            return;
        }

        // If email and password are valid, consider the user as authenticated
        res.status(200).json({ userID: user.userID });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const addToHistory = async (req, res) => {
    try {
        const userID = req.body.userID;
        const user = await User.findByPk(userID);

        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        const { name, phoneNumber, address, accountNumber, pinOrCvv, listCart } = req.body;
        const hashedPinOrCvv = await bcrypt.hash(pinOrCvv, 10); // Hash the PIN or CVV

        await History.create({
            userID,
            name,
            phoneNumber,
            address,
            accountNumber,
            pinOrCvv: hashedPinOrCvv,
            listCart,
        });

        res.status(201).json({ msg: "History Added Successfully" });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// Add a new endpoint to retrieve history details based on userID
const getHistoryByUserID = async (req, res) => {
    try {
        const userID = req.body.userID;

        // Check if the user exists
        const user = await User.findByPk(userID);
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        // Retrieve all history details for the given user
        const historyDetails = await History.findAll({
            where: { userID },
            attributes: ['historyID', 'date', 'name', 'phoneNumber', 'address', 'listCart'],
            order: [['date', 'DESC']], // Order by date in descending order (latest first)
        });

        // Map the array of history records to extract relevant details
        const formattedHistory = historyDetails.map(history => ({
            historyID: history.historyID,
            date: history.date,
            name: history.name,
            phoneNumber: history.phoneNumber,
            address: history.address,
            listCart: history.listCart,
        }));

        res.status(200).json(formattedHistory);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const router = express.Router();

router.post('/users/signup/', signUpUser);
router.post('/users/register/', signUpUser); // Alternative
router.get('/users/signin', signInUser);
router.get('/users/login', signInUser); // Alternative
router.post('/users/checkout', addToHistory);
router.get('/users/history', getHistoryByUserID);

app.use(express.json()); // For getting data from Front-End
app.use(cors()); // For CORS Policy
app.use(router);

// Connection to Database & Server
db.sync({ alter: true })
    .then(() => {
        console.log("Database connected")
        app.listen(port, () => {
            console.log(`Example app listening on port ${port}`)
        })
    }).catch((error) => { console.log('Unable to connect to database: ${error}'); });