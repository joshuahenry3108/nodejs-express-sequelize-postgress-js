/*import express from "express";
import cors from "cors";
import winston from "winston";
import { createClient } from "redis";*/

const express = require("express");
const cors = require("cors");
const winston = require("winston");
const { createClient } = require("redis");

const app = express();

var corsOptions = {
  origin: "http://localhost:8081"
};

// ✅ Redis Connection
const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err) => console.error("❌ Redis Error:", err));
redisClient.on("connect", () => console.log("✅ Connected to Redis"));

(async () => {
  await redisClient.connect();
})();

// Example Route - with caching
app.get("/data", async (req, res) => {
  try {
    const cacheKey = "someData";

    // 1️⃣ Check cache
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      console.log("📦 Returning data from cache");
      return res.json(JSON.parse(cached));
    }

    // 2️⃣ Fetch or compute data
    const data = { time: new Date().toISOString(), message: "Fresh data" };

    // 3️⃣ Save to cache (with expiry)
    await redisClient.set(cacheKey, JSON.stringify(data), { EX: 60 }); // expires in 60s

    console.log("🆕 Cached new data");
    res.json(data);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Create logger instance
const logger = winston.createLogger({
  level: "info", // default minimum level
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(), // prints to console
  ],
});

app.use(cors(corsOptions));

// parse requests of content-type - application/json
app.use(express.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

const db = require("./app/models");

db.sequelize.sync()
  .then(() => {
    console.log("Synced db.");
  })
  .catch((err) => {
    console.log("Failed to sync db: " + err.message);
  });

// // drop the table if it already exists
// db.sequelize.sync({ force: true }).then(() => {
//   console.log("Drop and re-sync db.");
// });

// simple route
app.get("/", (req, res) => {
  logger.error("This is an ERROR log");
  logger.warn("This is a WARN log");
  logger.info("This is an INFO log");
  logger.debug("This is a DEBUG log");
  res.json({ message: "Welcome to bezkoder application." });
});

require("./app/routes/turorial.routes")(app);

// set port, listen for requests
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
