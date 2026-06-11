const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const MAX_FILE_SIZE = (parseInt(process.env.MAX_FILE_SIZE_MB) || 50) * 1024 * 1024; // Convert MB to bytes

/**
 * Multer configuration for WhatsApp chat file uploads
 * - Only accepts .txt files
 * - Max file size from env (default 50MB)
 * - Files saved to uploads/ with unique names
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    // Generate unique filename to prevent collisions
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

/**
 * File filter: only accept .txt files
 */
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === '.txt') {
    cb(null, true);
  } else {
    const error = new Error('Only .txt files are allowed. Please export your WhatsApp chat as a text file.');
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

module.exports = upload;
