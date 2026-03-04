// Simple web server for main app
const express = require('express');
const path = require('path');
const app = express();

// Serve static files
app.use(express.static(path.join(__dirname, 'web-build')));

// Serve the app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'web-build', 'index.html'));
});

const PORT = process.env.PORT || 8085;
app.listen(PORT, () => {
  console.log(`Main app running on http://localhost:${PORT}`);
  console.log('Parent/Caregiver features available');
});