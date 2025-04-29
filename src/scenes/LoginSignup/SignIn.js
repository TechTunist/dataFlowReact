import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Box, Typography, TextField, Button, Alert, useTheme } from '@mui/material';
import { tokens } from '../../theme';
import { Link, useNavigate } from 'react-router-dom';

const SignIn = () => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const result = await login(username, password);
        if (result.success) {
            navigate('/dashboard'); // Redirect to dashboard after login
        } else {
            setError(result.error);
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
                    Sign In
                </Typography>
                {error && <Alert severity="error" sx={{ marginBottom: '20px' }}>{error}</Alert>}
                <form onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        label="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        sx={{ marginBottom: '20px', input: { color: colors.grey[100] } }}
                        InputLabelProps={{ style: { color: colors.grey[300] } }}
                    />
                    <TextField
                        fullWidth
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
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
                        Sign In
                    </Button>
                </form>
                <Typography sx={{ color: colors.grey[300], textAlign: 'center' }}>
                    Forgot your <Link to="/password-reset" style={{ color: colors.greenAccent[500] }}>password</Link> or{' '}
                    <Link to="/account-recovery" style={{ color: colors.greenAccent[500] }}>username</Link>?
                </Typography>
                <Typography sx={{ color: colors.grey[300], textAlign: 'center', marginTop: '10px' }}>
                    Don't have an account? <Link to="/register" style={{ color: colors.greenAccent[500] }}>Register</Link>
                </Typography>
            </Box>
        </Box>
    );
};

export default SignIn;