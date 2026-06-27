const User = require('../models/User');
const bcrypt = require('bcryptjs');

exports.register = async (req, res) => {
    try {
        const { email, password, confirmPassword } = req.body;
        
        if (password !== confirmPassword) {
            return res.status(400).send('Passwords do not match');
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).send('Email already in use');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Auto-assign admin if it matches the env email
        const role = email === process.env.ADMIN_EMAIL ? 'admin' : 'user';

        const newUser = new User({
            email,
            password: hashedPassword,
            role
        });

        await newUser.save();
        
        req.session.user = { id: newUser._id, role: newUser.role, email: newUser.email };
        res.redirect('/user/dashboard');
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email, isActive: true });
        if (!user) {
            return res.status(401).send('Invalid credentials or account disabled');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).send('Invalid credentials');
        }

        req.session.user = { id: user._id, role: user.role, email: user.email };
        
        if (user.role === 'admin') {
            return res.redirect('/admin/dashboard');
        }
        res.redirect('/user/dashboard');
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error('Logout Error:', err);
        res.redirect('/login');
    });
};
      
