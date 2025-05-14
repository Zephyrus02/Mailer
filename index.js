require('dotenv').config();
const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const http = require('http');
const cors = require('cors'); // Add CORS package

const app = express();
const PORT = 3000;

// Set up multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Enable CORS for specific origin
app.use(cors({
  origin: 'https://aneeshraskar.is-a.dev', // Replace with your frontend URL
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());

// Email transporter setup
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date(),
    service: 'mailer',
  });
});

// API endpoint to receive form data and attachments
app.post('/send-mail', upload.array('attachments'), async (req, res) => {
  const { name, email, message } = req.body;
  const attachments = req.files.map(file => ({
    filename: file.originalname,
    content: file.buffer,
    contentType: file.mimetype,
  }));

  try {
    await transporter.sendMail({
      from: `"${name}" <${email}>`,
      to: process.env.RECEIVER_EMAIL,
      subject: `New message from ${name}`,
      text: message,
      attachments,
    });

    res.json({ success: true, message: 'Email sent successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Email failed to send.' });
  }
});

// Function to periodically call health check
const scheduleHealthCheck = () => {
  const healthCheckInterval = 10 * 60 * 1000; // 10 minutes in milliseconds
  
  setInterval(() => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: '/health',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Health check at ${new Date().toISOString()} - Status: ${res.statusCode}`);
        if (res.statusCode === 200) {
          console.log('Service is healthy');
        } else {
          console.error('Service health check failed with status:', res.statusCode);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Health check failed:', error.message);
    });
    
    req.end();
  }, healthCheckInterval);
  
  console.log('Health check monitoring started - running every 10 minutes');
};

app.listen(PORT, () => {
  console.log(`Mailer running on http://localhost:${PORT}`);
  scheduleHealthCheck(); // Start the health check monitoring after server is running
});
