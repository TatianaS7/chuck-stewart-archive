const express = require("express");
const app = express();
const cors = require('cors');

const printsRouter = require('../routes/prints');
const authRouter = require('../routes/auth');
const searchRouter = require('../routes/search');

app.use(cors());
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded


app.use('/prints', printsRouter);
app.use('/auth', authRouter);
app.use('/search', searchRouter);


module.exports = app;
