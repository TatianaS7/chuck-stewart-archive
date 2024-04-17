const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { check, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');


// Create Account
router.post('/', async (req, res, next) => {
    try {
        const userData = {
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            email: req.body.email,
        }
        const userPassword = req.body.password;

        const checkExistingUser = await User.findAll({
            where: {
                email: userData.email
            }
        })

        if (checkExistingUser.length > 0) {
            return res.status(409).json({error: 'User with that email exists'})
        }

        const hashedPassword = await bcrypt.hash(userPassword, 10);

        const newUser = await User.create({
            ...userData,
            password: hashedPassword
        });

        res.status(201).json(newUser);
    } catch (error) {
        console.error('Internal Server Error', error);
        next(error)
    }
});


// Sign In
router.post('/login', [
    check ('email').not().isEmpty().trim().isEmail(),
    check ('password').not().isEmpty().trim().withMessage('Password cannot be empty')
], async (req, res, next) => {
    const errors = validationResult(req);

    if(!errors.isEmpty()) {
        res.json({ error: errors.array() })
    } else {
        try {
            const { email, password } = req.body;

            const getUser = await User.findOne({
                where: {
                    email: email
                }
            })

            if (!getUser) {
                return res.status(401).json({ error: 'User not found' })
            }

            const validatePassword = await bcrypt.compare(password, getUser.password);

            if (!validatePassword) {
                return res.status(401).json({ error: 'Incorrect Password' })
            }
            res.status(200).json(getUser);
        } catch (error) {
            console.error('Internal Server Error', error);
            next(error);
        }
    }
});


// Sign Out
router.get('/logout', async(req, res, next) => {
    try {
        res.status(200).json({ message: 'Logout Successful' })
    } catch (error) {
        console.error('Internal Server Error', error);
        next(error)
    }
});


// Get User Profile 
router.get('/profile/:email', async(req, res, next) => {
    try {
        const user = await User.findOne({
            where: {
                email: req.params.email
            }
        })

        if(!user) {
            return res.status(401).json({ error: 'No user found'})
        }

        res.status(200).json(user);
    } catch (error) {
        console.error('Internal Server Error', error);
        next(error)
    }
})


module.exports = router;