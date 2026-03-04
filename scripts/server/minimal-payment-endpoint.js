// Add this single endpoint to your existing backend
// File: routes/payments.js (or wherever your payment routes are)

// POST /api/payments/verify - Solana Payment Verification
const verifySolanaPayment = async (req, res) => {
    try {
        const { signature, bookingId, expected } = req.body;
        
        // Log the payment attempt
        console.log('Solana payment verification:', { signature, bookingId });
        
        // For MVP: Accept all test signatures
        // TODO: Add actual Solana blockchain verification
        
        // Use your existing points award endpoint internally
        let pointsResult = null;
        if (expected.caregiverId) {
            try {
                // Call your existing points award logic
                pointsResult = await awardPoints(expected.caregiverId, expected.rating || 5);
            } catch (error) {
                console.log('Points award failed:', error.message);
            }
        }
        
        res.json({
            success: true,
            status: 'confirmed',
            signature,
            points: pointsResult,
            message: 'Solana payment verified'
        });
        
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({
            success: false,
            error: 'Payment verification failed'
        });
    }
};

// Add this route to your existing router:
// router.post('/payments/verify', verifySolanaPayment);

module.exports = { verifySolanaPayment };