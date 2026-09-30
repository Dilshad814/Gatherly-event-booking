const User = require('../models/User');
const OTP = require('../models/OTP');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendOTPEmail } = require('../utils/email');

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

exports.register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const normalizedEmail = email?.trim().toLowerCase();
        let user = await User.findOne({ email: normalizedEmail });
        if (user) {
            if (user.isVerified) {
                return res.status(409).json({ message: 'This account is already verified. Please sign in.' });
            }

            const passwordMatches = await bcrypt.compare(password, user.password);
            if (!passwordMatches) {
                return res.status(409).json({ message: 'An unverified account already uses this email. Enter the password used when you signed up.' });
            }

            const otp = generateOTP();
            await OTP.findOneAndDelete({ email: normalizedEmail, action: 'account_verification' });
            await OTP.create({ email: normalizedEmail, otp, action: 'account_verification' });
            await sendOTPEmail(normalizedEmail, otp, 'account_verification');

            return res.status(200).json({
                message: 'A fresh OTP was sent to your email.',
                email: normalizedEmail
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = await User.create({
            name,
            email: normalizedEmail,
            password: hashedPassword,
            role: 'user', // Hardcoded to prevent frontend passing role
            isVerified: false
        });

        const otp = generateOTP();
        await OTP.create({ email: normalizedEmail, otp, action: 'account_verification' });
        await sendOTPEmail(normalizedEmail, otp, 'account_verification');

        res.status(201).json({
            message: 'OTP sent to email. Please verify.',
            email: user.email
        });
    } catch (error) {
        console.error('Registration error:', error);
        const message = error.message?.startsWith('Email ')
            ? error.message
            : error.code === 11000
                ? 'This email is already registered. Please sign in.'
                : process.env.NODE_ENV === 'development'
                    ? error.message
                    : 'Server Error';
        res.status(500).json({ message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = email?.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        if (!user.isVerified && user.role !== 'admin') {
            const otp = generateOTP();
            await OTP.findOneAndDelete({ email: user.email, action: 'account_verification' });
            await OTP.create({ email: user.email, otp, action: 'account_verification' });
            await sendOTPEmail(user.email, otp, 'account_verification');
            return res.status(403).json({
                message: 'Account not verified. OTP sent by email.',
                needsVerification: true,
                email: user.email
            });
        }

        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user.id, user.role)
        });
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).json({
            message: error.message.startsWith('Email ') ? error.message : 'Server Error'
        });
    }
};

exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const normalizedEmail = email?.trim().toLowerCase();
        const validOTP = await OTP.findOne({ email: normalizedEmail, otp, action: 'account_verification' });

        if (!validOTP) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        const user = await User.findOneAndUpdate({ email: normalizedEmail }, { isVerified: true }, { new: true });
        await OTP.deleteOne({ _id: validOTP._id }); // Delete OTP after usage

        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user.id, user.role)
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
}

exports.requestPasswordReset = async (req, res) => {
    try {
        const normalizedEmail = req.body.email?.trim().toLowerCase();
        if (!normalizedEmail) return res.status(400).json({ message: 'Enter your email address.' });

        const user = await User.findOne({ email: normalizedEmail });
        // Return the same response for unknown emails to avoid exposing registered accounts.
        if (!user) {
            return res.json({ message: 'If an account exists for this email, a reset code has been sent.' });
        }

        const otp = generateOTP();
        await OTP.findOneAndDelete({ email: normalizedEmail, action: 'password_reset' });
        await OTP.create({ email: normalizedEmail, otp, action: 'password_reset' });
        await sendOTPEmail(normalizedEmail, otp, 'password_reset');

        return res.json({
            message: 'Reset code sent. Check your email inbox and Spam/Junk folder.'
        });
    } catch (error) {
        console.error('Password reset request error:', error.message);
        return res.status(500).json({ message: 'Could not send a reset code. Please try again.' });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const normalizedEmail = req.body.email?.trim().toLowerCase();
        const { otp, password } = req.body;
        if (!normalizedEmail || !otp || !password) {
            return res.status(400).json({ message: 'Email, reset code, and new password are required.' });
        }
        if (password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters.' });
        }

        const validOTP = await OTP.findOne({ email: normalizedEmail, otp, action: 'password_reset' });
        if (!validOTP) return res.status(400).json({ message: 'Reset code is invalid or expired. Request a new one.' });

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            await OTP.deleteOne({ _id: validOTP._id });
            return res.status(400).json({ message: 'No account found for this email.' });
        }

        user.password = await bcrypt.hash(password, 10);
        await user.save();
        await OTP.deleteOne({ _id: validOTP._id });
        return res.json({ message: 'Password reset successfully. You can now sign in with your new password.' });
    } catch (error) {
        console.error('Password reset error:', error.message);
        return res.status(500).json({ message: 'Could not reset password. Please try again.' });
    }
};
