const nodemailer = require('nodemailer');
const { google } = require('googleapis');
require('dotenv').config();

const OAuth2 = google.auth.OAuth2;

const createTransporter = async () => {
    try {
        const oauth2Client = new OAuth2(
            process.env.GMAIL_OAUTH_CLIENT_ID,
            process.env.GMAIL_OAUTH_CLIENT_SECRET,
            "https://developers.google.com/oauthplayground"
        );

        oauth2Client.setCredentials({
            refresh_token: process.env.GMAIL_OAUTH_REFRESH_TOKEN
        });

        const accessToken = await new Promise((resolve, reject) => {
            oauth2Client.getAccessToken((err, token) => {
                if (err) {
                    console.error("Failed to create access token", err);
                    reject(err);
                }
                resolve(token);
            });
        });

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                type: "OAuth2",
                user: process.env.GMAIL_OAUTH_USER,
                accessToken,
                clientId: process.env.GMAIL_OAUTH_CLIENT_ID,
                clientSecret: process.env.GMAIL_OAUTH_CLIENT_SECRET,
                refreshToken: process.env.GMAIL_OAUTH_REFRESH_TOKEN
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        return transporter;
    } catch (error) {
        console.error("Error setting up email transporter:", error);
        return null;
    }
};

const sendEmailNotification = async (to, subject, htmlContent) => {
    try {
        const emailTransporter = await createTransporter();
        if (!emailTransporter) {
            console.error("Could not create email transporter");
            return;
        }

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: to,
            subject: subject,
            html: htmlContent
        };

        const info = await emailTransporter.sendMail(mailOptions);
        console.log("Email sent: %s", info.messageId);
    } catch (error) {
        console.error("Error sending email:", error);
    }
};

module.exports = {
    sendEmailNotification
};
