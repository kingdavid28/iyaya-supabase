// Re-export from points-calculation.service for compatibility
const { awardPoints, getCaregiverPoints, calculatePoints, determineTier } = require('./points-calculation.service');

module.exports = { awardPoints, getCaregiverPoints, calculatePoints, determineTier };
