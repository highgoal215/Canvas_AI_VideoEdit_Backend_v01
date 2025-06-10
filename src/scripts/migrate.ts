import { connectDatabase } from '../config/database';
import { User } from '../models/User';

const runMigrations = async () => {
  try {
    await connectDatabase();
    console.log('Database migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigrations();