const express = require('express');
const router = express.Router();
const Print = require('../models/print');
const { check, validationResult } = require('express-validator')
const { uploadToAzure, deleteBlob } = require('../azure-blob')
const { v1: uuidv1 } = require('uuid');


// Get All Prints
router.get('/all', async (req, res, next) => {
    try {
        const allPrints = await Print.findAll();
        const count = await Print.count();
        res.status(200).json({ count, allPrints})
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
        return res.status(400).json({ error: errors.array() });
    }

        try {
            let imageUrl = null;
            if (req.body.image) {
                let containerName;
                if (req.body.size === '11x14') {
                    containerName = '11x14-images';
                } else if (req.body.size === '11x14C') {
                    containerName = '11x14c-images';
                } else if (req.body.size === '16x20') {
                    containerName = '16x20-images';
                } else {
                    return res.status(400).json({ error: 'Invalid image size' });
                }

                // Replace spaces with dashes and make lowercase
                const artistName = req.body.artist.replace(/\s+/g, '-').toLowerCase();

                // Make size lowercase
                const size = req.body.size.toLowerCase();
            
                const blobName = `${req.body.catalog_number}-${artistName}-${size}-${uuidv1()}.jpg`;
                imageUrl = await uploadToAzure(containerName, blobName, req.body.image);
            }

        const newPrint = await Print.create({
            status: req.body.status,
            catalog_number: req.body.catalog_number,
            artist: req.body.artist,
            image: imageUrl ? imageUrl : null,
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
        return res.status(404).json({ error: `No print found with catalog number ${req.params.catalogNumber}`})
      }

      // If print had image, delete from Azure Blob Storage
        if (print.image) {
            const imageUrl = new URL(print.image);
            const containerName = imageUrl.pathname.split('/')[1];
            const blobName = imageUrl.pathname.split('/').pop();
            await deleteBlob(containerName, blobName);
        }

      await print.destroy();

      const allPrints = await Print.findAll();
      const count = await Print.count();
      res.status(200).json({message: 'Print deleted successfully!', current_prints: { count, allPrints }});
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

        let imageUrl = null;

        if (req.body.image) {
            let containerName;
            if (req.body.size === '11x14') {
                containerName = '11x14-images';
            } else if (req.body.size === '11x14C') {
                containerName = '11x14c-images';
            } else if (req.body.size === '16x20') {
                containerName = '16x20-images';
            } else {
                return res.status(400).json({ error: 'Invalid image size' });
            }
            
            // Replace spaces with dashes and make lowercase
            const artistName = print.artist.replace(/\s+/g, '-').toLowerCase();

            // Make size lowercase
            const size = print.size.toLowerCase();
                        
            const blobName = `${print.catalog_number}-${artistName}-${size}-${uuidv1()}.jpg`;
            imageUrl = await uploadToAzure(containerName, blobName, req.body.image);

            // Delete Old Image
            if (print.image) {
                const oldImageUrl = new URL(print.image);
                const oldContainerName = oldImageUrl.pathname.split('/')[1];
                const oldBlobName = oldImageUrl.pathname.split('/')[2];
                await deleteBlob(oldContainerName, oldBlobName);
            }
        }

        await print.update({
            status: req.body.status,
            catalog_number: req.body.catalog_number,
            artist: req.body.artist,
            image: imageUrl ? imageUrl : print.image,
            date: req.body.date,
            size: req.body.size,
            location: req.body.location,
            instrument: req.body.instrument,
            notes: req.body.notes,
            date_sold: req.body.date_sold
        });

        res.status(200).json(print);
      } catch (error) {
        console.error('Error updating print', error);
        next(error)
    }
})


module.exports = router;