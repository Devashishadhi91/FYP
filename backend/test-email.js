require('dotenv').config();
const { sendEmailNotification } = require('./libs/emailService');

async function test() {
    console.log("Testing email...");
    await sendEmailNotification(process.env.EMAIL_FROM, "Test Subject", "Test Body");
    console.log("Test finished.");
}

test();
