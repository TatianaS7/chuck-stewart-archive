const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const cors = require("cors");
require("dotenv").config();

const printsRouter = require("../routes/prints");
const bulkUploadRouter = require("../routes/bulkUpload");
const authRouter = require("../routes/auth");
const searchRouter = require("../routes/search");

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json({ limit: "50mb" })); // For parsing application/json
app.use(express.urlencoded({ limit: "50mb", extended: true })); // For parsing application/x-www-form-urlencoded

app.use("/api/prints", printsRouter);
app.use("/api/prints", bulkUploadRouter);
app.use("/api/auth", authRouter);
app.use("/api/search", searchRouter);

module.exports = app;
