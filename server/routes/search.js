const express = require("express");
const router = express.Router();
const Print = require("../models/print");
const { Op } = require('sequelize');



router.get("/", async (req, res, next) => {
  try {
    const searchQuery = req.query.query;

    const searchResults = await Print.findAndCountAll({
      where: {
        [Op.or]: [
          { catalog_number: searchQuery },
          { artist: searchQuery },
          { date: searchQuery },
          { location: searchQuery },
          { size: searchQuery },
          { instrument: searchQuery },
          { status: searchQuery },
          { notes: searchQuery },
          { date_sold: searchQuery },
        ],
      },
    });

    if (searchResults.count === 0) {
      res.status(404).json({ error: "No Prints Found." });
    }

    res.status(200).json(searchResults);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
