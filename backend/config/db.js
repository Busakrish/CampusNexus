const mongoose = require('mongoose');

let memoryServerInstance = null;

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campusnexus';
    
    // Attempt connecting to specified or local URI first with a fast timeout
    try {
      await mongoose.connect(mongoURI, {
        serverSelectionTimeoutMS: 2000
      });
      console.log(`[MongoDB] Connected to database at: ${mongoURI}`);
      return;
    } catch (localErr) {
      console.log(`[MongoDB] Local/configured connection failed (${localErr.message}). Booting embedded In-Memory MongoDB Server...`);
      
      const { MongoMemoryServer } = require('mongodb-memory-server');
      memoryServerInstance = await MongoMemoryServer.create();
      const inMemoryUri = memoryServerInstance.getUri();
      
      await mongoose.connect(inMemoryUri);
      console.log(`[MongoDB] Connected successfully to In-Memory MongoDB at: ${inMemoryUri}`);
    }
  } catch (error) {
    console.error(`[MongoDB Error] Failed to connect: ${error.message}`);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (memoryServerInstance) {
      await memoryServerInstance.stop();
    }
    console.log('[MongoDB] Disconnected safely.');
  } catch (err) {
    console.error('[MongoDB Error] Disconnect error:', err.message);
  }
};

module.exports = { connectDB, disconnectDB };
