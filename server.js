const express = require('express');
const {client} = require('./db');
const jwt = require('jsonwebtoken');

const studentApi=require("./student");
const teacherApi=require("./teacher");

// Generate a random secret key
const secretKey = "apipad$212";


// // We can use the .env config  to set up our database connection information.
// const client = new Client({
//     host: "localhost",
//     user: "postgres",
//     port: 5432,
//     password: "Sharan@2004",
//     database: "postgres"
// });

client.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
    } else {
        console.log('Connected to database');
    }
});

client.query('SELECT * FROM users', (err, result) => {
    if (err) {
        console.error('Error fetching table data:', err);
    } else {
        console.log('Table data:');
        console.table(result.rows);
    }
});

const app = express();

app.use(express.json());

app.use("/student",studentApi);
app.use("/teacher",teacherApi);


// Define route to create a new user
// Define a route for creating a new user
app.post('/api/newuser', async (req, res) => {
    try {
        // Extract user data from request body
        const { id, username, password, type } = req.body;
        console.log(id);
        console.log(username);
        console.log(password);
        console.log(type);

        // Check if username, password, or type is missing
        if (!username || !password || !type) {
            return res.status(400).json({ error: 'Username, password, and type are required' });
        }

        // Check if the user already exists
        const existingUser = await client.query('SELECT * FROM users WHERE username = $1', [username]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'User with the provided username already exists' });
        }

        // Insert the user into the database
        const result = await client.query('INSERT INTO users (id,username, password, type) VALUES ($1, $2, $3, $4) RETURNING *', [id, username, password, type]);

        // Extract the inserted user from the query result
        const newUser = result.rows[0];

        // Return the inserted user
        res.status(201).json({ message: 'User created successfully', user: newUser });
    } catch (err) {
        console.error('Error creating user:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    // Validate username and password
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        // Fetch user from database by username
        const result = await client.query('SELECT * FROM users WHERE username @> $1', [[username]]);
        const user = result.rows[0];
      
        // Check if user exists
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Check if the provided password matches any of the passwords associated with the username
        const validPasswordIndex = user.username.indexOf(username); // Find index of provided username

        if (validPasswordIndex === -1 ) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Generate JWT
        const token = await jwt.sign({ id: user.id, username, type: user.type[0] }, secretKey, { expiresIn: '60d' });

        // Send JWT as response
        res.status(200).json({ token });
    } catch (err) {
        console.error("Error logging in:", err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});




// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

