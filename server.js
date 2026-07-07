require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');
require('./utils/cpmUpdater');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

// Initialize Express
const app = express();

// Connect Database
connectDB();
async function createDefaultAdmin() {
    try {
        const email = process.env.ADMIN_EMAIL?.toLowerCase();
        const password = process.env.ADMIN_PASSWORD;

        if (!email || !password) return;

        let admin = await User.findOne({ email });

        if (!admin) {
            const hash = await bcrypt.hash(password, 10);

            admin = await User.create({
                username: "admin",
                email,
                password: hash,
                role: "admin",
                isActive: true
            });

            console.log("✅ Default admin created");
        } else {
            let updated = false;

            if (admin.role !== "admin") {
                admin.role = "admin";
                updated = true;
            }

            if (admin.isActive === false) {
                admin.isActive = true;
                updated = true;
            }

            if (updated) {
                await admin.save();
                console.log("✅ Admin updated");
            }
        }
    } catch (err) {
        console.error("Admin initialization failed:", err);
    }
}

mongoose.connection.once("open", async () => {
    await createDefaultAdmin();
});


// Security & Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://challenges.cloudflare.com", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
            frameSrc: ["https://challenges.cloudflare.com"],
            connectSrc: ["'self'", "https://challenges.cloudflare.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "data:"],
            imgSrc: ["'self'", "data:", "https://api.dicebear.com", "https://flagcdn.com"],
        },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    frameguard: { action: 'SAMEORIGIN' },
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

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Smart Session (6 Hours Auto-Logout)
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: 'sessions',
        ttl: 6 * 60 * 60 // 6 hours
    }),
    cookie: {
    maxAge: 1000 * 60 * 60 * 6,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
}
}));

// server.js me is middleware ko update karein:
app.use(async (req, res, next) => {
    res.locals.siteName = process.env.SITE_NAME || 'ShortZlinks';
    res.locals.user = req.session.user || null;
    res.locals.path = req.path;
    res.locals.turnstileSiteKey = process.env.TURNSTILE_SITE_KEY;
    
    // YE NAYI LINE ADD KAREIN
    res.locals.supportEmail = process.env.SUPPORT_EMAIL || process.env.ADMIN_EMAIL;
    
    const Setting = require('./models/Setting');
    let settings = await Setting.findOne();
    if (!settings) {
        settings = await Setting.create({});
    }
    res.locals.settings = settings;
    next();
});

// Routes
app.use('/', require('./routes/indexRoutes'));
app.use('/auth', require('./routes/authRoutes'));
app.use('/user', require('./routes/userRoutes'));
app.use('/admin', require('./routes/adminRoutes'));
app.use('/l', require('./routes/linkRoutes'));

// 404 Handler
app.use((req, res) => {
    res.status(404).render('404', { title: 'Page Not Found' });
});

// Server Listen
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[+] Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});