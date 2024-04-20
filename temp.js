const express = require('express');
const { Client } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Generate a random secret key
const secretKey = crypto.randomBytes(32).toString('hex');


// We can use the .env config  to set up our database connection information.
const client = new Client({
    host: "localhost",
    user: "postgres",
    port: 5432,
    password: "Sharan@2004",
    database: "postgres"
});

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


function verifyToken(req, res, next) {
    const token = req.headers['authorization'];
    

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: Token is required' });
    }
    const t=token.split(" ")[1];
    console.log(t);
    jwt.verify(t, secretKey, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }

        // Attach decoded user information to the request object

        req.user = {...decoded}; // Adjust property name if needed
        console.log(decoded)

        // Proceed to the next middleware or route handler
        next();
    });
    
    
}

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

// Teacher-only routes
app.use('/api/assignments',verifyToken,  (req, res, next) => {
    const user = req.user; // Assuming you've middleware that sets req.user after JWT verification
    if (user && user.type === 'teacher') {
        next();
    } else {
        return res.status(403).json({ error: 'Forbidden: Only teachers can access this endpoint' });
    }
});


app.post('/api/assignments/:id', (req, res) => {
    const { studentid, teacherid, task, submit, score } = req.body; // Changed to studentid and teacherid
    const assignmentId = parseInt(req.params.id); // Extract assignment ID from request parameters
    console.log(studentid);
    console.log(teacherid);
    console.log(task);
    console.log(submit);
    console.log(score);

    // Validate required fields
    if (!studentid || !teacherid || !task || !submit || !score) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // Perform database insertion
    client.query('INSERT INTO assignments(ass_id, studentid, teacherid, task, sumbit, score) VALUES ($1, $2, $3, $4, $5, $6)', 
        [assignmentId, studentid, teacherid, task, submit, score], 
        (err) => {
            if (err) {
                console.error('Error inserting assignment:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            res.status(201).json({ message: 'Assignment created successfully' });
        }
    );
});

// Endpoint to delete assignments (only accessible to teachers)
app.delete('/api/assignments/:id', (req, res) => {
    
    const assignmentId = parseInt(req.params.id);
    // Perform database deletion
    client.query(
        'DELETE FROM assignments WHERE ass_id = $1',
        [assignmentId],
        (err, result) => {
            if (err) {
                console.error('Error deleting assignment:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            
            // Check if any assignment was deleted
            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Assignment not found' });
            }

            res.status(200).json({ message: 'Assignment deleted successfully' });
        }
    );
});


// Endpoint to update assignments (only accessible to teachers)
app.put('/api/assignments/:id', (req, res) => {
    const assignmentId = parseInt(req.params.id);
    console.log(assignmentId);
    const { studentid, teacherid, task, submit, score } = req.body;

    // Validate required fields
    if (!studentid || !teacherid || !task || !submit || !score) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // Perform database update
    client.query(
        'UPDATE assignments SET studentid = $1, teacherid = $2, task = $3, sumbit = $4, score = $5 WHERE ass_id = $6',
        [studentid, teacherid, task, submit, score, assignmentId],
        (err, result) => {
            if (err) {
                console.error('Error updating assignment:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            
            // Check if any assignment was updated
            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Assignment not found' });
            }

            res.status(200).json({ message: 'Assignment updated successfully' });
        }
    );
});


// Endpoint to get assignments (accessible to both teachers and students)
app.get('/api/assignments', (req, res) => {
    // Query the database to fetch assignments
    client.query('SELECT * FROM assignments', (err, result) => {
        if (err) {
            console.error('Error fetching assignments:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        // Extract assignments from the query result
        const assignments = result.rows;

        // Send assignments as response
        res.status(200).json(assignments);
    });
});


// Student-only routes
app.use('/api/student', verifyToken, (req, res, next) => {
    const user = req.user; // Assuming you've middleware that sets req.user after JWT verification
    if (user && user.type === 'student') {
        next();
    } else {
        return res.status(403).json({ error: 'Forbidden: Only students can access this endpoint' });
    }
});


//Sort & get based on the student id : 
app.get('/api/student/assignments/:id', (req, res) => {
    const studentId = req.params.id;

    // Query the database to fetch assignments for the specified student
    client.query('SELECT * FROM assignments WHERE studentid = $1', [studentId], (err, result) => {
        if (err) {
            console.error('Error fetching assignments:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        // Extract assignments from the query result
        const assignments = result.rows;

        // Send assignments as response
        res.status(200).json(assignments);
    });
});
// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});



