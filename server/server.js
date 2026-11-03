
const express = require("express");
const cors = require("cors");
const path = require("path");

require("./db");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Make uploaded profile photos accessible
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

// API routes
const routes = require("./routes");
app.use("/api", routes);

// Server health check
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to Umuturage.rw API!",
    status: "Server is running",
  });
});

app.listen(PORT, () => {
  console.log(`Umuturage.rw server running at http://localhost:${PORT}`);
});
