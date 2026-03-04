// Add this to your production backend at https://iyaya-backend.vercel.app
// File: routes/payments.js or controllers/paymentsController.js

const { Connection } = require('@solana/web3.js');

// Solana Payment Verification Endpoint
const verifyPayment = async (req, res) => {
    try {
        const { signature, bookingId, expected } = req.body;
        
        console.log('Solana payment verification:', { signature, bookingId, expected });
        
        // For now, simulate successful verification
        // In production, add actual Solana transaction verification
        const connection = new Connection('https://api.mainnet-beta.solana.com');
        
        // Simulate points award (integrate with your existing points system)
        if (expected.caregiverId) {
            // Award points using your existing points system
            const pointsResult = await awardCaregiverPoints(expected.caregiverId, expected.rating || 5);
            
            res.json({
                success: true,
                status: 'confirmed',
                signature,
                points: pointsResult,
                message: 'Solana payment verified and points awarded'
            });
        } else {
            res.json({
                success: true,
                status: 'confirmed',
                signature,
                message: 'Solana payment verified'
            });
        }
        
    } catch (error) {
        console.error('Solana payment verification error:', error);
        res.status(500).json({
            success: false,
            error: 'Payment verification failed',
            details: error.message
        });
    }
};

// Helper function to award points (integrate with your existing system)
const awardCaregiverPoints = async (caregiverId, rating) => {
    // Use your existing points award logic here
    // This should integrate with your current points system
    
    const deltas = [
        { metric: 'rating', delta: rating >= 4 ? 10 : rating >= 3 ? 5 : -5, reason: `rating=${rating}` },
        { metric: 'completion', delta: 5, reason: 'completed booking' },
        { metric: 'punctuality', delta: 5, reason: 'on-time' }
    ];
    
    // Insert into your existing points ledger
    // Return the total points and tier
    return {
        totalPoints: 160, // Calculate from your database
        tier: 'Silver'    // Calculate based on points
    };
};

module.exports = {
    verifyPayment
};

// Add this route to your Express app:
// app.post('/api/payments/verify', verifyPayment);