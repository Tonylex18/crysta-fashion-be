import multer from 'multer';
import path from 'path';



// I'm using multer.memoryStorage so the file can be stored in memory for buffer to be generated for cloud uplaod
const storage = multer.memoryStorage()

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
