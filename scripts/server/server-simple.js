// Week 2: Ultra Simple Payment Server
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Ultra simple payment verification
app.post('/api/payments/verify', async (req, res) => {
    try {
        const { signature, bookingId, expected } = req.body;
        
        console.log('Payment request:', { signature, bookingId, expected });
        
        // Just return success for Week 2
        res.json({ 
            status: 'confirmed', 
            signature,
            message: 'Week 2: Payment logged successfully' 
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Week 2 server running on port ${PORT}`);
});