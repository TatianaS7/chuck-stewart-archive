const express = require("express");
const app = express();
const printsRouter = require('../routes/prints');
const authRouter = require('../routes/auth');


app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded


app.use('/prints', printsRouter);
app.use('/auth', authRouter);


module.exports = app;
