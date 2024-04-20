const express=require("express");
const app1=express.Router();
const {verifyToken}=require("./tokenVerify");
const {client} = require('./db');
// Teacher-only routes
app1.use('/api/assignments',verifyToken,  (req, res, next) => {
    const user = req.user; // Assuming you've middleware that sets req.user after JWT verification
    if (user && user.type === 'teacher') {
        next();
    } else {
        return res.status(403).json({ error: 'Forbidden: Only teachers can access this endpoint' });
    }
});

//post assignment
app1.post('/api/assignments/:id', (req, res) => {
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
app1.delete('/api/assignments/:id', (req, res) => {
    
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
app1.put('/api/assignments/:id', (req, res) => {
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
app1.get('/api/assignments', (req, res) => {
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


module.exports=app1;