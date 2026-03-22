const express = require("express");
const router = express.Router();
const Print = require("../models/print");
const { Op } = require("sequelize");
const { generateSasUrl } = require("../azure-blob");

const CERTIFICATE_CONTAINER = "print-certificates";

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
          { category: { [Op.like]: `%${searchQuery}%` } },
        ],
      },
    });

    if (searchResults.count === 0) {
      return res.status(404).json({ error: "No Prints Found." });
    }

    const rowsWithSas = searchResults.rows.map((print) => {
      const payload = print.toJSON();

      if (print.blob_name) {
        const containerName = resolveContainer(print.size);
        if (containerName) {
          payload.image = generateSasUrl(containerName, print.blob_name);
        }
      }

      if (print.certificate_blob_name) {
        payload.certificate = generateSasUrl(
          CERTIFICATE_CONTAINER,
          print.certificate_blob_name,
        );
      }

      return payload;
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
