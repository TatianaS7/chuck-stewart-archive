const express = require('express');
const router = express.Router();
const Print = require('../models/print');
const { check, validationResult } = require('express-validator')

// Get All Prints
router.get('/all', async (req, res, next) => {
    try {
        const allPrints = await Print.findAndCountAll();
        res.status(200).json(allPrints)
    } catch (error) {
        next(error)
    }
});


// Add a Print
router.post('/', [
    check('catalog_number').not().isEmpty().trim().withMessage('Catalog # is Required'),
    check ('artist').not().isEmpty().trim().withMessage('Artist is Required'),
    check('date').not().isEmpty().trim().withMessage('Date is required')
], async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        res.status(400).json({ error: errors.array() })
    } else {
        try {
        const newPrint = await Print.create({
            status: req.body.status,
            catalog_number: req.body.catalog_number,
            artist: req.body.artist,
            image: req.body.image,
            date: req.body.date,
            size: req.body.size,
            location: req.body.location,
            instrument: req.body.instrument,
            notes: req.body.notes,
            date_sold: req.body.date_sold
        });
        res.status(200).json(newPrint);
        } catch (error) {
            console.error('Error adding print', error);
            next(error)
        }
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

      const allPrints = await Print.findAndCountAll();
      res.status(200).json({message: 'Print deleted successfully!', current_prints: allPrints});
    } catch (error) {
        console.error('Internal Server Error', error);
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
            status: req.body.status,
            catalog_number: req.body.catalog_number,
            artist: req.body.artist,
            image: req.body.image,
            date: req.body.date,
            size: req.body.size,
            location: req.body.location,
            instrument: req.body.instrument,
            notes: req.body.notes,
            date_sold: req.body.date_sold
        });

        res.status(200).json(print);
      } catch (error) {
        console.error('Internal Server Error', error);
        next(error)
    }
})


module.exports = router;