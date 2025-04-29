import React, { useState } from 'react';
import axios from 'axios';
import { Box, Typography, TextField, Button, Alert, useTheme } from '@mui/material';
import { tokens } from '../theme';
import { Link, useParams, useHistory } from 'react-router-dom';

const PasswordResetConfirm = () => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const { uidb64, token } = useParams();
    const history = useHistory();
    const [newPassword, setNewPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        try {
            const response = await axios.post(
                `https://vercel-dataflow.vercel.app/api/accounts/password-reset/${uidb64}/${token}/`,
                { new_password: newPassword }
            );
            setMessage(response.data.message);
            setTimeout(() => history.push('/login'), 3000); // Redirect to login after 3 seconds
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to reset password');
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: colors.primary[900],
                padding: '20px',
            }}
        >
            <Box
                sx={{
                    maxWidth: '400px',
                    width: '100%',
                    padding: '40px',
                    backgroundColor: colors.primary[800],
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                }}
            >
                <Typography variant="h3" sx={{ color: colors.grey[100], marginBottom: '20px', textAlign: 'center' }}>
                    Set New Password
                </Typography>
                {message && <Alert severity="success" sx={{ marginBottom: '20px' }}>{message}</Alert>}
                {error && <Alert severity="error" sx={{ marginBottom: '20px' }}>{error}</Alert>}
                <form onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        label="New Password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        sx={{ marginBottom: '20px', input: { color: colors.grey[100] } }}
                        InputLabelProps={{ style: { color: colors.grey[300] } }}
                    />
                    <Button
                        type="submit"
                        fullWidth
                        sx={{
                            backgroundColor: colors.greenAccent[500],
                            color: colors.grey[900],
                            padding: '12px',
                            marginBottom: '20px',
                            '&:hover': { backgroundColor: colors.greenAccent[600] },
                        }}
                    >
                        Reset Password
                    </Button>
                </form>
                <Typography sx={{ color: colors.grey[300], textAlign: 'center' }}>
                    Back to <Link to="/login" style={{ color: colors.greenAccent[500] }}>Sign In</Link>
                </Typography>
            </Box>
        </Box>
    );
};

export default PasswordResetConfirm;