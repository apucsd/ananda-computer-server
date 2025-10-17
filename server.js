require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer with Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'anando-computer',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
  },
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const safeUpload = (req, res, next) => {
  // Use multer's single file upload
  const uploadSingle = upload.single('image');
  
  uploadSingle(req, res, function (err) {
    if (err) {
      if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'File too large. Maximum 5MB allowed.' });
        }
        return res.status(400).json({ message: err.message });
      }
      // An unknown error occurred
      console.error('Upload error:', err);
      return res.status(500).json({ message: 'Error uploading file' });
    }
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image' });
    }
    
    // File uploaded successfully, proceed to route handler
    next();
  });
};



const sendResponse = (res, status, data) => {
  return {
    status,
    result: data,
    message: data.message
  }
};

const seedAdmin = async () => {
  try {

    const admin = await db.collection('users').findOne({ email: 'admin@admin.com' });
    if (admin) {
      console.log('Admin already exists');
      return;
    }
    const result = await db.collection('users').insertOne({
      email: 'admin@admin.com',
      password: 'admin',
    });
    console.log('Admin seeded successfully:', result);
  } catch (err) {
    console.error('Admin seeding error:', err);
  }
};



// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
let db;
const client = new MongoClient(process.env.MONGODB_URI);

async function connectToMongo() {
  try {
    await client.connect();
    db = client.db();
    console.log('Connected to MongoDB');
    seedAdmin();
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
}

connectToMongo();

// Routes
app.get('/', (req, res) => {
  res.send('Server is running successfully!');
});


// ========================== SERVICE START ==========================

//
app.post('/api/services', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image' });
    }

    const item = {
      ...req.body,
      image: req.file.path,
      createdAt: new Date()
    };
  
    console.log(req.body);
    const result = await db.collection('services').insertOne(item);
    console.log(result);
    res.status(201).json(sendResponse(res, 201, result));
  } catch (err) {
    // If there's an error, delete the uploaded file from Cloudinary
    if (req.file && req.file.filename) {
      await cloudinary.uploader.destroy(req.file.filename);
    }
    res.status(400).json(sendResponse(res, 400, { message: err.message }));
  }
});

app.get('/api/services', async (req, res) => {
  try {
    const result = await db.collection('services').find({}).toArray();
    res.status(200).json(sendResponse(res, 200, result));
  } catch (err) {
    res.status(400).json(sendResponse(res, 400, { message: err.message }));
  }
});
// Get service by ID
app.get('/api/services/:id', async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid service ID' });
    }
    
    const service = await db.collection('services').findOne({ _id: new ObjectId(req.params.id) });
    
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    res.status(200).json(sendResponse(res, 200, service));
  } catch (err) {
    res.status(500).json(sendResponse(res, 500, { message: err.message }));
  }
})
app.delete('/api/services/:id', async (req, res) => {
  try {
    const result = await db.collection('services').deleteOne({ _id: new ObjectId(req.params.id) });
    res.status(200).json(sendResponse(res, 200, result));
  } catch (err) {
    res.status(400).json(sendResponse(res, 400, { message: err.message }));
  }
});


// ========================== SERVICE END ==========================

// ========================== BANNER START ==========================
app.post('/api/banners', safeUpload, async (req, res) => {
  try {

    const item = {
      ...req.body,
      image: req.file.path,
      createdAt: new Date()
    };
  
    const result = await db.collection('banners').insertOne(item);
    res.status(201).json(sendResponse(res, 201, result));
  } catch (err) {
    // If there's an error, delete the uploaded file from Cloudinary
    if (req.file && req.file.filename) {
      await cloudinary.uploader.destroy(req.file.filename);
    }
    res.status(400).json(sendResponse(res, 400, { message: err.message }));
  }
});

app.get('/api/banners', async (req, res) => {
  try {
    const result = await db.collection('banners').find({}).toArray();
    res.status(200).json(sendResponse(res, 200, result));
  } catch (err) {
    res.status(400).json(sendResponse(res, 400, { message: err.message }));
  }
});
app.delete('/api/banners/:id', async (req, res) => {
  try {
    const result = await db.collection('banners').deleteOne({ _id: new ObjectId(req.params.id) });
    res.status(200).json(sendResponse(res, 200, result));
  } catch (err) {
    res.status(400).json(sendResponse(res, 400, { message: err.message }));
  }
});



// ========================== BANNER END ==========================

// ========================== FAQ START ==========================

app.post('/api/faqs', async (req, res) => {
  try {
    const item = {
      ...req.body,
      createdAt: new Date()
    };
  
    const result = await db.collection('faqs').insertOne(item);
    res.status(201).json(sendResponse(res, 201, result));
  } catch (err) {
    res.status(400).json(sendResponse(res, 400, { message: err.message }));
  }
});

app.get('/api/faqs', async (req, res) => {
  try {
    const result = await db.collection('faqs').find({}).toArray();
    res.status(200).json(sendResponse(res, 200, result));
  } catch (err) {
    res.status(400).json(sendResponse(res, 400, { message: err.message }));
  }
});
app.delete('/api/faqs/:id', async (req, res) => {
  try {
    const result = await db.collection('faqs').deleteOne({ _id: new ObjectId(req.params.id) });
    res.status(200).json(sendResponse(res, 200, result));
  } catch (err) {
    res.status(400).json(sendResponse(res, 400, { message: err.message }));
  }
});



// ========================== FAQ END ==========================


// ========================== GALLERY START ==========================

app.post('/api/galleries', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image' });
    }

    const item = {
      ...req.body,
      image: req.file.path,
      createdAt: new Date()
    };
  
    const result = await db.collection('galleries').insertOne(item);
    res.status(201).json(sendResponse(res, 201, result));
  } catch (err) {
    // If there's an error, delete the uploaded file from Cloudinary
    if (req.file && req.file.filename) {
      await cloudinary.uploader.destroy(req.file.filename);
    }
    res.status(400).json(sendResponse(res, 400, { message: err.message }));
  }
});


app.get('/api/galleries', async (req, res) => {
  try {
    const result = await db.collection('galleries').find({}).toArray();
    res.status(200).json(sendResponse(res, 200, result));
  } catch (err) {
    res.status(400).json(sendResponse(res, 400, { message: err.message }));
  }
});
app.delete('/api/galleries/:id', async (req, res) => {
  try {
    const result = await db.collection('galleries').deleteOne({ _id: new ObjectId(req.params.id) });
    res.status(200).json(sendResponse(res, 200, result));
  } catch (err) {
    res.status(400).json(sendResponse(res, 400, { message: err.message }));
  }
});

// ========================== GALLERY END ==========================



// ========================== DASHBOARD STATS START ==========================

app.get('/api/dashboard-stats', async (req, res) => {
  try {
  const totalServices = await db.collection('services').countDocuments();
  const totalBanners = await db.collection('banners').countDocuments();
  const totalFaqs = await db.collection('faqs').countDocuments();
  const totalGalleries = await db.collection('galleries').countDocuments();
  const result = {
    totalServices,
    totalBanners,
    totalFaqs,
    totalGalleries
  };
  
    res.status(200).json(sendResponse(res, 200, result));
  } catch (err) {
    res.status(400).json(sendResponse(res, 400, { message: err.message }));
  }
});

// ========================== DASHBOARD STATS END ==========================


// ========================== AUTH START ==========================

app.post('/api/login', async (req, res) => {
  try {

    const { email, password } = req.body;
    const user = await db.collection('users').findOne({ email });
    const token = jwt.sign({ email: user.email }, "jwt-secret", { expiresIn: '100d' });
    if (!user) {
      return res.status(401).json(sendResponse(res, 401, { message: 'Invalid email address' }));
    }
    if (user.password !== password) {
      return res.status(401).json(sendResponse(res, 401, { message: 'Invalid password' }));
    }
    res.status(200).json(sendResponse(res, 200, { user, token }));
  } catch (err) {
    res.status(400).json(sendResponse(res, 400, { message: err.message }));
  }
});



// ========================== AUTH END ==========================

// Add error handling for unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Close server & exit process
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

// Start the server with better error handling
const startServer = (port = 3000) => {
  const server = app.listen(port, '0.0.0.0')
    .on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is in use, trying port ${port + 1}...`);
        startServer(port + 1);
      } else {
        console.error('Server error:', err);
        process.exit(1);
      }
    })
    .on('listening', () => {
      console.log(`Server is running on http://localhost:${port}`);
      console.log('Press CTRL+C to stop the server');
    });

  // Handle graceful shutdown
  const shutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });

    // Force shutdown after 10 seconds if server doesn't close gracefully
    setTimeout(() => {
      console.error('Forcing shutdown...');
      process.exit(1);
    }, 10000);
  };

  // Handle different shutdown signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Consider whether to exit the process here
    // process.exit(1);
  });
};

// Start the server with the default port or the one from environment
const PORT = parseInt(process.env.PORT, 10) || 3000;
startServer(PORT);
