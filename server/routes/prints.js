const express = require('express');
const router = express.Router();
const Print = require('../models/print');

// Get All Prints
router.get('/all', async (req, res, next) => {
    try {
        const allPrints = await Print.findAll();
        res.status(200).json(allPrints)
    } catch (error) {
        next(error)
    }
});


// Add a Print
router.post('/', async (req, res, next) => {
    try {
        const newPrint = await Print.create({
            catalog_number: req.body.catalog_number,
            artist: req.body.artist,
            image: req.body.image,
            date: req.body.date,
            location: req.body.location,
            size: req.body.size,
            instrument: req.body.instrument,
            status: req.body.status,
            notes: req.body.notes,
            date_sold: req.body.date_sold
        });
        res.status(200).json(newPrint);
    } catch (error) {
        next(error)
    }
});


// Delete a Print
router.delete('/:catalogNumber', async (req, res, next) => {
    try {
      const print = await Print.findOne({
        where: {
            catalog_number: req.params.catalogNumber
        }
      });

      if (!print) {
        res.status(404).json({ error: `No print found with catalog number ${req.params.catalogNumber}`})
      }

      await print.destroy();

      const allPrints = await Print.findAll();
      res.status(200).json({message: 'Print deleted successfully!', current_prints: allPrints});
    } catch (error) {
        next(error)
    }
})


// Update a Print
router.put('/update/:catalogNumber', async (req, res, next) => {
    try {
        const print = await Print.findOne({
            where: {
                catalog_number: req.params.catalogNumber
            }
        });

        if (!print) {
            res.status(401).json({ error: `No print found with catalog number: ${req.params.catalogNumber}`})
        }

        await print.update({
            catalog_number: req.body.catalog_number,
            artist: req.body.artist,
            image: req.body.image,
            date: req.body.date,
            location: req.body.location,
            size: req.body.size,
            instrument: req.body.instrument,
            status: req.body.status,
            notes: req.body.notes,
            date_sold: req.body.date_sold
        });

        res.status(200).json(print);
      } catch (error) {
        next(error)
    }
})


module.exports = router;