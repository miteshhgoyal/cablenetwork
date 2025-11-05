import jwt from 'jsonwebtoken';
import User from '../models/User.js';


export const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];


        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }


        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');


        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }


        // NEW: Check if user account is Active
        if (user.status !== 'Active') {
            return res.status(403).json({
                success: false,
                message: 'Your account has been deactivated. Contact administrator.'
            });
        }


        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};


export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions.'
            });
        }
        next();
    };
};
