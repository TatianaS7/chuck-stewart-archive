const pool = require("../dbConfig");
const dotenv = require("dotenv");
dotenv.config({ path: "env.default"});
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");

const app = express();

app.use(cors());
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});


//Get Record from Databae
app.get("/api/database/search", async (req, res) => {
    const { q } = req.query;

    try {
        const searchSql = `
        SELECT * FROM prints 
        WHERE catalog_number LIKE ? 
        OR artist LIKE ? 
        OR year LIKE ? 
        OR location LIKE ? 
        OR size LIKE ?
        OR instrument LIKE ?
        OR status LIKE ?
        OR notes LIKE ?`;
        const [search] = await pool.query(searchSql, [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`]);

    res.status(200).json({ search });           
    } catch (error) {
        console.error("Error fetching results:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

//Add Record to Database
app.post("/api/database/new", async (req,res) => {
    const { catalog_number, artist, year, location, size, instrument, status, notes, date_sold, image } = req.body;

    try {
        const checkExistingRecord =
        `SELECT * FROM prints 
        WHERE catalog_number LIKE ?`;

        [check] = await pool.query(checkExistingRecord, [catalog_number]);

        if (check.length > 0) {
            res.status(400).json({ message: "This is a Duplicate Entry" })

        } else {
        const insertRecord = 
        `INSERT INTO prints (catalog_number, artist, image, year, location, size, instrument, status, notes, date_sold)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        await pool.query(insertRecord, [
            catalog_number,
            artist,
            image,
            year,
            location,
            size,
            instrument,
            status,
            notes,
            date_sold,
        ]);
        res.status(200).json({ message: "Record Added!"});
        }
    } catch (error) {
        console.error("Error adding record:", error);
        res.status(500).json({ error: "Internal Server Error" })
    }
});

//Update Record
app.put("/api/database/update/:id", async (req, res) => {
    const printId = req.params.idprints;

    const { catalog_number, artist, image, year, location, size, instrument, status, notes, date_sold } = req.body;

    try {
        updateRecord = `
        "UPDATE prints 
        SET catalog_number = ?, 
            artist = ?, 
            image = ?, 
            year = ?, 
            location = ?, 
            size = ?, 
            instrument = ?, 
            status = ?, 
            notes = ?, 
            date_sold = ? 
        WHERE idprints = ?`;

        await pool.query(updateRecord, [catalog_number, artist, image, year, location, size, instrument, status, notes, date_sold, printId]);
        
        res.status(200).json({ message: "Record updated!" });
    } catch (error) {
      console.error("Error updating record:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });





// Start the server
const PORT = 5501;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

