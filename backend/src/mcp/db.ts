import mongoose from 'mongoose';

let isConnected = false;

export async function connectDB(): Promise<void> {
  if (isConnected) return;

  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/cms_erp';

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.error(`[MCP-DB] MongoDB connected: ${mongoose.connection.host}`);
  } catch (error: any) {
    console.error(`[MCP-DB] Connection failed: ${error.message}`);
    process.exit(1);
  }
}

export async function disconnectDB(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  console.error('[MCP-DB] MongoDB disconnected');
}
