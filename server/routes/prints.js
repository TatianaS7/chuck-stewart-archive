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
        const newPrint = await Print.create(req.body);
        res.status(200).json(newPrint);
    } catch (error) {
        next(error)
    }
});


// Delete a Print
router.delete('/:id', async (req, res, next) => {
    try {
      const print = await Print.findByPk(req.params.id);
      await print.destroy();
      
      res.status(200).json(Print.findAll());
    } catch (error) {
        next(error)
    }
})


// Update a Print
router.put('/update/:id', async (req, res, next) => {
    try {
        const print = await Print.findByPk(req.params.id);
        await print.update(req.body);

        res.status(200).json(print);
      } catch (error) {
        next(error)
    }
})


module.exports = router;