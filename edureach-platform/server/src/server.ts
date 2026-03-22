import "dotenv/config";
import app from "./app.js";
import connectDB from "./config/database.config.js";
import { initializeKnowledgeBase } from "./services/rag.services.js";

const PORT = process.env.PORT || 5000;

const start = async (): Promise<void> => {
  try {
    // ✅ Connect DB first
    await connectDB();
    console.log("MongoDB Connected ✅");

    // ✅ Initialize KB
    await initializeKnowledgeBase();
    console.log("Knowledge Base Ready ✅");

    // ✅ Root route
    app.get("/", (_req, res) => {
      res.send("EduReach Backend Running 🚀");
    });

    // ✅ Start server ONLY ONCE
    app.listen(PORT, () => {
      console.log(`EduReach Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

start();