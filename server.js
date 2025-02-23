// server.js (modified snippet, using built-in fetch in Node 18+)

const express = require('express');
// REMOVED: const fetch = require('node-fetch');  <-- Not needed with Node 18+ 
const app = express();
const port = 3000;

app.get('/api/guerrilla-proxy', async (req, res) => {
  try {
    // Use Node’s built-in fetch
    const response = await fetch(
      'https://www.guerrillamail.com/ajax.php?f=get_email_address&lang=en&site=guerrillamail'
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch from GuerrillaMail' });
  }
});

app.listen(port, () => {
  console.log(`Proxy server running at http://localhost:${port}`);
});