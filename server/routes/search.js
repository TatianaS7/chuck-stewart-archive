const express = require("express");
const router = express.Router();
const Print = require("../models/print");
const { Op } = require("sequelize");
const { generateSasUrl } = require("../azure-blob");

function resolveContainer(size) {
  const map = {
    "11x14": "11x14-images",
    "11x14C": "11x14c-images",
    "16x20": "16x20-images",
  };
  return map[size] || null;
}

router.get("/", async (req, res, next) => {
  try {
    const searchQuery = req.query.query;

    const searchResults = await Print.findAndCountAll({
      where: {
        [Op.or]: [
          { catalog_number: searchQuery },
          { artist: { [Op.like]: `%${searchQuery}%` } },
          { date: { [Op.like]: `%${searchQuery}%` } },
          { location: { [Op.like]: `%${searchQuery}%` } },
          { size: searchQuery },
          { instrument: searchQuery },
          { status: searchQuery },
          { notes: { [Op.like]: `%${searchQuery}%` } },
          { date_sold: { [Op.like]: `%${searchQuery}%` } },
        ],
      },
    });

    if (searchResults.count === 0) {
      return res.status(404).json({ error: "No Prints Found." });
    }

    const rowsWithSas = searchResults.rows.map((print) => {
      if (print.blob_name) {
        const containerName = resolveContainer(print.size);
        if (containerName) {
          return {
            ...print.toJSON(),
            image: generateSasUrl(containerName, print.blob_name),
          };
        }
      }

      return print.toJSON();
    });

    res.status(200).json({
      ...searchResults,
      rows: rowsWithSas,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
