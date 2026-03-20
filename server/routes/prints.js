const express = require("express");
const router = express.Router();
const Print = require("../models/print");
const { check, validationResult } = require("express-validator");
const { uploadToAzure, deleteBlob, generateSasUrl } = require("../azure-blob");
const { v4: uuidv4 } = require("uuid");

// Helper function to resolve container name based on size
function resolveContainer(size) {
  const map = {
    "11x14": "11x14-images",
    "11x14C": "11x14c-images",
    "16x20": "16x20-images",
  };
  return map[size] || null;
}

function getBlobExtension(base64Data) {
    if (base64Data.startsWith('data:image/png')) return 'png';
    if (base64Data.startsWith('data:image/webp')) return 'webp';
    return 'jpg';
}

// Get All Prints
router.get("/all", async (req, res, next) => {
  try {
    const allPrints = await Print.findAll();
    const count = await Print.count();

    // Attach SAS URLs to prints with images
    const printsWithSas = allPrints.map((print) => {
        if (print.blob_name) {
          const containerName = resolveContainer(print.size);
          return {
            ...print.toJSON(),
            image: generateSasUrl(containerName, print.blob_name),
          }
        }
        return print.toJSON();
      });

    res.status(200).json({ count, allPrints: printsWithSas });
  } catch (error) {
    console.error('Error fetching prints:', error.message || error);
    next(error);
  }
});

// Add a Print
router.post(
  "/",
  [
    check("catalog_number")
      .not()
      .isEmpty()
      .trim()
      .withMessage("Catalog # is Required"),
    check("artist").not().isEmpty().trim().withMessage("Artist is Required"),
    check("date").not().isEmpty().trim().withMessage("Date is required"),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty())
      return res.status(400).json({ error: errors.array() });

    try {
      let imageUrl = null;
      let blobName = null;

      if (req.body.image) {
        const containerName = resolveContainer(req.body.size);
        if (!containerName)
          return res.status(400).json({ error: "Invalid image size" });

        const ext = getBlobExtension(req.body.image);
        blobName = `${uuidv4()}.${ext}`;
        imageUrl = await uploadToAzure(containerName, blobName, req.body.image);
      }

      const newPrint = await Print.create({
        status: req.body.status,
        catalog_number: req.body.catalog_number,
        artist: req.body.artist,
        image: imageUrl ? imageUrl : null,
        blob_name: blobName,
        date: req.body.date,
        size: req.body.size,
        location: req.body.location,
        instrument: req.body.instrument,
        notes: req.body.notes,
        date_sold: req.body.date_sold,
      });

      res.status(200).json(newPrint);
    } catch (error) {
      console.error("Error adding print", error);
      next(error);
    }
  },
);

// Delete a Print
router.delete("/:catalogNumber", async (req, res, next) => {
  try {
    const print = await Print.findOne({
      where: {
        catalog_number: req.params.catalogNumber,
      },
    });

    if (!print) {
      return res.status(404).json({
        error: `No print found with catalog number ${req.params.catalogNumber}`,
      });
    }

    // If print had image, delete from Azure Blob Storage
    if (print.image) {
      const imageUrl = new URL(print.image);
      const containerName = imageUrl.pathname.split("/")[1];
      await deleteBlob(containerName, print.blob_name);
    }

    await print.destroy();

    const allPrints = await Print.findAll();
    const count = await Print.count();
    res.status(200).json({
      message: "Print deleted successfully!",
      current_prints: { count, allPrints },
    });
  } catch (error) {
    console.error("Internal Server Error", error);
    next(error);
  }
});

// Update a Print
router.put("/update/:catalogNumber", async (req, res, next) => {
  try {
    const print = await Print.findOne({
      where: {
        catalog_number: req.params.catalogNumber,
      },
    });

    if (!print) {
      res.status(404).json({
        error: `No print found with catalog number: ${req.params.catalogNumber}`,
      });
    }

    let imageUrl = print.image;
    let blobName = print.blob_name;

    const isNewImage = req.body.image && req.body.image.startsWith('data:image');

    if (req.body.removeImage && print.blob_name) {
      // User explicitly removed the image in the edit form
      const containerName = resolveContainer(print.size);
      if (containerName) {
        await deleteBlob(containerName, print.blob_name);
      }
      imageUrl = null;
      blobName = null;
    } else if (isNewImage) {
      const containerName = resolveContainer(req.body.size || print.size);
      if (!containerName) {
        return res.status(400).json({ error: "Invalid image size" });
      }

      const ext = getBlobExtension(req.body.image);
      const newBlobName = `${uuidv4()}.${ext}`;
      imageUrl = await uploadToAzure(
        containerName,
        newBlobName,
        req.body.image,
      );
      blobName = newBlobName;

      // Delete Old Image
      if (print.blob_name) {
        const oldContainerName = resolveContainer(print.size);
        if (oldContainerName) {
          await deleteBlob(oldContainerName, print.blob_name);
        }
      }
    }

    await print.update({
      status: req.body.status,
      catalog_number: req.body.catalog_number,
      artist: req.body.artist,
      image: imageUrl,
      blob_name: blobName,
      date: req.body.date,
      size: req.body.size,
      location: req.body.location,
      instrument: req.body.instrument,
      notes: req.body.notes,
      date_sold: req.body.date_sold,
    });
    

    res.status(200).json(print);
  } catch (error) {
    console.error("Error updating print", error);
    next(error);
  }
});

module.exports = router;
