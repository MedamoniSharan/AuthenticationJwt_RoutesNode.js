const jwt = require('jsonwebtoken');
const secretKey = "apipad$212";

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

module.exports={verifyToken};