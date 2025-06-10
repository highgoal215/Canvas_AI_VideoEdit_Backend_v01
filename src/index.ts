import express from 'express';
import cors from 'cors';
import dotenv from "dotenv";
dotenv.config();
import ai_route from './routes/ai-generate';
import BackgroundEditRoutes from "./routes/background-edit";
import { connectDatabase, syncDatabase } from "./config/database";
import authRoutes from "./routes/user-route";

// app.use(express.urlencoded({ extended: true }));
const port = process.env.PORT;
const app = express();
app.use(cors({
  origin: "http://localhost:8080",
  credentials: true,
  exposedHeaders: ['Authorization'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use("/auth", authRoutes);
app.use("/ai", ai_route);
app.use("/ai/background-remove", BackgroundEditRoutes);
// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!'
  });
});
app.get('/', (req, res) => {
  res.send("Hello world");

});

// Initialize database and start server
const startServer = async () => {
  try {
    // Try to connect to database, but don't fail if it's not available
    try {
      await connectDatabase();
      await syncDatabase();
      console.log('MYSQL Database connected and synchronized successfully');
    } catch (dbError) {
      const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
      console.warn('Database connection failed, continuing without database:', errorMessage);
    }
    
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};
startServer();
// app.listen(port,()=> {
//   console.log(`server runnitn at http://localhost:${port}`);
// })
export default app;