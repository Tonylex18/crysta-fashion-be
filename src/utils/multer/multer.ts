import multer from 'multer';
import path from 'path';
import fs from 'fs';



// Ensure uploads directory exists (backend/uploads)
const uploadsDir = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Use disk storage to save files under uploads with a safe filename
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const safeOriginal = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, `${timestamp}-${safeOriginal}`);
  }
});

// File filter to ensure only image files are uploaded
const fileFilter = (req: any, file: any, cb: any) => {


  try {
    const fileTypes = /jpeg|jpg|png/;
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = fileTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only images are allowed (jpeg, jpg, png)'));
    }
  } catch (error: any) {
    console.log("Error:", error);
    throw new Error(error)
  }

};

const limits = { fileSize: 5 * 1024 * 1024 } // Limit file size to 5MB

const upload = multer({
  storage,
  fileFilter,
  limits
});

const uploadFiles = multer({
  storage,
  fileFilter,
  limits
})

export default { upload, uploadFiles };
