import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/axios';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [showResetForm, setShowResetForm] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const requestCode = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');
        try {
            const { data } = await api.post('/auth/forgot-password', { email });
            setShowResetForm(true);
            setMessage(data.message);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Could not send the reset code.');
        } finally {
            setLoading(false);
        }
    };

    const resetPassword = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');
        try {
            const { data } = await api.post('/auth/reset-password', { email, otp, password });
            setMessage(data.message);
            setOtp('');
            setPassword('');
            setShowResetForm(false);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Could not reset the password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-16 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Reset Password</h2>
                <p className="text-gray-500">We’ll help you get back into your Gatherly account</p>
            </div>

            {message && <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-5 text-center border border-green-200">{message}</div>}
            {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-5 text-center border border-red-100">{error}</div>}

            {!showResetForm ? (
                <form onSubmit={requestCode} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                        <input
                            type="email"
                            required
                            autoComplete="email"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-700 transition shadow-sm"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                        />
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-gray-900 text-white font-bold py-3 rounded-lg hover:bg-black disabled:opacity-60 transition shadow-md">
                        {loading ? 'Sending...' : 'Send reset code'}
                    </button>
                </form>
            ) : (
                <form onSubmit={resetPassword} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">6-digit reset code</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            pattern="[0-9]{6}"
                            maxLength="6"
                            required
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-700 transition shadow-sm font-bold tracking-widest text-center text-lg"
                            value={otp}
                            onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
                        <input
                            type="password"
                            minLength="8"
                            autoComplete="new-password"
                            required
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-700 transition shadow-sm"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                        />
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-gray-900 text-white font-bold py-3 rounded-lg hover:bg-black disabled:opacity-60 transition shadow-md">
                        {loading ? 'Updating...' : 'Reset password'}
                    </button>
                    <button type="button" onClick={() => { setShowResetForm(false); setMessage(''); setError(''); }} className="w-full text-sm font-semibold text-gray-600 hover:text-black">
                        Use a different email
                    </button>
                </form>
            )}

            <p className="text-center mt-6 text-gray-600">
                Remembered your password? <Link to="/login" className="font-bold text-gray-900 hover:underline">Sign in</Link>
            </p>
        </div>
    );
};

export default ForgotPassword;
