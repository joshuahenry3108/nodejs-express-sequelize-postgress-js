const express = require("express");
const cors = require("cors");
const winston = require("winston");

const app = express();

var corsOptions = {
  origin: "http://localhost:8081"
};

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
  //console.log({level: "emerg", "info", "error", "warn"});
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
