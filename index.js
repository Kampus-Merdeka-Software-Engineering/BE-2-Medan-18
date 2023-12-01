import express from "express";
import cors from "cors";
import { Sequelize } from "sequelize";
import { DataTypes } from "sequelize";
import bcrypt from "bcrypt"; // Import bcrypt

const app = express();
const port = 3000;
const db = new Sequelize("dirac", "root", "G43r0W3s5!", {
    host: "localhost",
    dialect: "mysql",
    port: 3306,
});

const User = db.define("user", {
    userID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING },
    password: { type: DataTypes.STRING },
});

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
            // Find the user by email // and password
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

const router = express.Router();

router.post('/users/signup/', signUpUser);
router.post('/users/register/', signUpUser); // Alternative
router.get('/users/signin', signInUser);
router.get('/users/login', signInUser); // Alternative
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