import mongoose from 'mongoose';

export async function connectDatabase() {
  const mongoUri = Bun.env.MONGODB_URI;
  
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  // Use NODE_ENV to determine database name
  const dbName = Bun.env.NODE_ENV === 'production' ? 'prod' : Bun.env.NODE_ENV === 'test' ? 'test' : 'dev';
  
  // Insert database name in URI 
  const finalUri = mongoUri.replace(/\/(\?|$)/, `/${dbName}$1`);

  console.log(`Connecting to MongoDB Atlas - Database: ${dbName}`);
  
  try {
    await mongoose.connect(finalUri);
    console.log(`Connected to MongoDB Atlas - Database: ${dbName}`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

export async function disconnectDatabase() {
  try {
    await mongoose.disconnect();
  } catch (error) {
    // Silently handle disconnection errors
  }
}

