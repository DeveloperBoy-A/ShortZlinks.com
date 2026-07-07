require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');

// Models
const User = require('./models/User');
const Setting = require('./models/Setting');
const connectDB = require('./config/db');

// Utils
require('./utils/cpmUpdater');

const app = express();

// 1. Render Proxy Trust (Zaroori hai session/cookies ke liye)
app.set('trust proxy', 1);

// Connect Database
connectDB();

// 2. Default Admin Logic
async function createDefaultAdmin() {
    try {
        const email = process.env.ADMIN_EMAIL?.toLowerCase();
        const password = process.env.ADMIN_PASSWORD;
        if (!email || !password) return;

        let admin = await User.findOne({ email });
        if (!admin) {
            const hash = await bcrypt.hash(password, 10);
            await User.create({ username: "admin", email, password: hash, role: "admin", isActive: true });
            console.log("✅ Default admin created");
        }
    } catch (err) { console.error("Admin init failed:", err); }
}
mongoose.connection.once("open", createDefaultAdmin);

// 3. Security & Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https://api.dicebear.com"],
        },
    }
}));

app.use(cors({
    origin: process.env.BASE_URL || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// 4. Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: 'sessions'
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 6, // 6 hours
        httpOnly: true,
        // Render/Production pe 'secure' true hona chahiye
        secure: process.env.NODE_ENV === 'production', 
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
}));

// 5. Global Locals Middleware
app.use(async (req, res, next) => {
    res.locals.siteName = process.env.SITE_NAME || 'ShortZlinks';
    res.locals.user = req.session.user || null;
    res.locals.path = req.path;
    res.locals.supportEmail = process.env.SUPPORT_EMAIL;

    try {
        let settings = await Setting.findOne();
        res.locals.settings = settings || {};
    } catch (e) { res.locals.settings = {}; }
    next();
});

// 6. Routes
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/', require('./routes/indexRoutes'));
app.use('/auth', require('./routes/authRoutes'));
app.use('/user', require('./routes/userRoutes'));
app.use('/admin', require('./routes/adminRoutes'));
app.use('/l', require('./routes/linkRoutes'));

// 404 Handler
app.use((req, res) => {
    res.status(404).render('404', { title: 'Page Not Found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[+] Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
