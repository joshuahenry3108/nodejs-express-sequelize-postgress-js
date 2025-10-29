// ----------------------
// Imports (CommonJS)
// ----------------------
const express = require("express");
const cors = require("cors");
const winston = require("winston");
const Redis = require("ioredis"); // Ensure you installed ioredis: npm install ioredis
const axios = require("axios");

// ----------------------
// App Setup
// ----------------------
const app = express();

const corsOptions = {
  origin: "http://localhost:8081",
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----------------------
// Logger Setup (Winston)
// ----------------------
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

// ----------------------
// Redis Setup
// ----------------------
const createRedisClient = () => {
  const redisHost = process.env.CACHE_HOST || "127.0.0.1";
  const redisPort = Number(process.env.CACHE_PORT) || 6379;
  const redisPassword = process.env.CACHE_PASSWORD || undefined;
  const redisMaxRetry = Number(process.env.REDIS_MAX_RETRY) || 5;

  if (!redisHost) {
    console.error("❌ CACHE_HOST environment variable is missing.");
    process.exit(1);
  }

  const redis = new Redis({
    host: redisHost,
    port: redisPort,
    password: redisPassword,
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
      if (times > redisMaxRetry) {
        console.error("❌ Failed connecting to Redis after max retries");
        process.exit(1);
      }
      console.log(`🔁 Retry Redis connection attempt #${times}`);
      return 1000; // retry after 1 second
    },
  });

  redis.on("connect", () => console.log("✅ Connected to Redis"));
  redis.on("error", (err) => console.error("Redis Error:", err));

  return redis;
};

const redisClient = createRedisClient();

// ----------------------
// Sequelize Setup
// ----------------------
const db = require("./app/models");

db.sequelize
  .sync()
  .then(() => console.log("✅ Synced db."))
  .catch((err) => console.error("❌ Failed to sync db:", err.message));

// ----------------------
// Routes
// ----------------------

// Health route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK check tests" });
});

// Redis test route
app.get("/cache-test", async (req, res) => {
  try {
    await redisClient.set("message", "Hello from Redis!");
    const msg = await redisClient.get("message");
    res.status(200).json({ success: true, message: msg });
  } catch (err) {
    console.error("Redis operation failed:", err);
    res.status(500).json({ success: false, error: "Redis failure" });
  }
});

// Dynamic base URL routes
const baseUrl = process.env.BASE_URL || "";

app.get(`${baseUrl}/users`, async (req, res) => {
  try {
    console.log("DB Models available:", Object.keys(db));
    console.log("User model:", db.User);

    const response = await axios.post(
      process.env.THIRD_PARTY_URL,
      "Hello World! testing third party",
      {
        headers: { "Content-Type": "text/plain" },
      }
    );

    const users = await db.User.findAll();
    res.status(200).json({ success: true, data: { users } });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

app.post(`${baseUrl}/user`, async (req, res) => {
  try {
    const { name, email } = req.body;
    const newUser = await db.User.create({ name, email });
    res.status(201).json({ success: true, data: newUser });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Simple welcome route
app.get("/", (req, res) => {
  logger.error("This is an ERROR log");
  logger.warn("This is a WARN log");
  logger.info("This is an INFO log");
  res.json({ message: "Welcome to the application." });
});

// Load tutorial routes if available
try {
  require("./app/routes/turorial.routes")(app);
} catch (err) {
  console.warn("⚠️ Warning: tutorial.routes not found or failed to load");
}

// ----------------------
// Graceful Redis Disconnect
// ----------------------
const disconnectRedis = async () => {
  console.log("🔌 Disconnecting Redis...");
  await redisClient.quit();
  console.log("✅ Redis disconnected");
  process.exit(0);
};

process.on("SIGINT", disconnectRedis);
process.on("SIGTERM", disconnectRedis);

// ----------------------
// Server Start
// ----------------------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}.`);
});
