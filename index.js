require('dotenv').config();
const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Set up multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

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

app.listen(PORT, () => {
  console.log(`Mailer running on http://localhost:${PORT}`);
});
