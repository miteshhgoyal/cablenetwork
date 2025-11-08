import express from 'express';
import cors from 'cors';
import connectDB from './config/database.js';
import dotenv from 'dotenv';
dotenv.config();

// Import routes
import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import categoryRoutes from './routes/categories.routes.js';
import channelRoutes from './routes/channels.routes.js';
import subscriberRoutes from './routes/subscribers.routes.js';
import packageRoutes from './routes/packages.routes.js';
import resellerRoutes from './routes/resellers.routes.js';
import distributorRoutes from './routes/distributors.routes.js';
import ottRoutes from './routes/ott.routes.js';
import creditRoutes from './routes/credit.routes.js';
import profileRoutes from './routes/profile.routes.js';
import customerRoutes from './routes/customer.routes.js';
import proxyRoutes from './routes/proxy.routes.js';

const app = express();
const PORT = process.env.PORT || 8000;

// Connect to database
connectDB();

// Middleware
const corsOptions = {
    // origin: process.env.CORS_ORIGIN,
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'PATCH', 'PUT', 'OPTIONS'],
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/subscribers', subscriberRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/resellers', resellerRoutes);
app.use('/api/distributors', distributorRoutes);
app.use('/api/ott', ottRoutes);
app.use('/api/credit', creditRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/proxy', proxyRoutes);

// Health check route
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
