const express=require("express");
const app2=express.Router();
const {verifyToken}=require("./tokenVerify");
const {client} = require('./db');

// Student-only routes
app2.use('/api/student', verifyToken, (req, res, next) => {
    const user = req.user; // Assuming you've middleware that sets req.user after JWT verification
    if (user && user.type === 'student') {
        next();
    } else {
        return res.status(403).json({ error: 'Forbidden: Only students can access this endpoint' });
    }
});


//Sort & get based on the student id : 
app2.get('/api/student/assignments/:id', (req, res) => {
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


module.exports=app2;