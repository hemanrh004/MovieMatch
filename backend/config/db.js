const mongoose = require('mongoose');

const connectDB = async () => {
  mongoose.set('strictQuery', true);
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.error(`MongoDB connection failed: ${err.message}`);
    console.error('Is MongoDB running, and is MONGO_URI correct in your .env file?');
    process.exit(1);
  }
  mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
};

module.exports = connectDB;
