import express from 'express';
import cors from 'cors';
import dotenv from "dotenv";
dotenv.config();
import ai_route from './routes/ai-generate';
import BackgroundEditRoutes from "./routes/background-edit";

const port = process.env.PORT || 5000;
const app = express();
app.use(cors());
app.use(express.json());
app.use("/ai", ai_route);
app.use("/ai/background-remove", BackgroundEditRoutes);
app.get('/', (req, res) => {
  res.send("Hello world");

});
app.listen(port,()=> {
  console.log(`server runnitn at http://localhost:${port}`);
})