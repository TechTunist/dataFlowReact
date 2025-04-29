import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Box, Typography, TextField, Button, Alert, useTheme } from '@mui/material';
import { tokens } from '../../theme';
import { Link, useNavigate } from 'react-router-dom';

const Register = () => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const { signup } = useContext(AuthContext);
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const result = await signup(username, email, password);
        if (result.success) {
            navigate('/login'); // Redirect to login after signup
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
                    Register
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
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
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
                        Register
                    </Button>
                </form>
                <Typography sx={{ color: colors.grey[300], textAlign: 'center' }}>
                    Already have an account? <Link to="/login" style={{ color: colors.greenAccent[500] }}>Sign In</Link>
                </Typography>
            </Box>
        </Box>
    );
};

export default Register;