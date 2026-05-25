const express = require('express');
const router = express.Router();
const { chatWithGroq } = require('../controller/chatbotController');
const { authmiddleware } = require("../middleware/Authmiddleware");

// Defines the main POST route for the chatbot.
// We apply authmiddleware to ensure only logged-in users can talk to the bot.
router.post('/', authmiddleware, chatWithGroq);

module.exports = router;
