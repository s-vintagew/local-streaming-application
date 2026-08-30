import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { scanMedia } from './utils/scanner.js';
import streamRouter from './routes/stream.js';
import apiRouter from './routes/api.js';

dotenv.config({ path: path.join(process.cwd(), '..', '.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 6000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRouter);
app.use('/stream', streamRouter);

// Serve static frontend in production
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend not built yet. Use Vite dev server on port 3200.');
  }
});

// Start server immediately
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Run initial scan in the background
  scanMedia().then(() => {
    // Auto-scan every 60 seconds
    setInterval(() => {
      console.log('Running background auto-scan...');
      scanMedia();
    }, 5 * 60 * 1000);
  }).catch(err => {
    console.error("Failed to scan media on startup:", err);
  });
});
