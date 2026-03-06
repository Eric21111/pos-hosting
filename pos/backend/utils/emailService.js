const nodemailer = require('nodemailer');

// Determine which email service to use
const usesBrevo = () => !!process.env.BREVO_API_KEY;

// Create Brevo SMTP transporter
let brevoTransporter = null;
const getBrevoTransporter = () => {
    if (!brevoTransporter) {
        brevoTransporter = nodemailer.createTransport({
            host: 'smtp-relay.brevo.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_FROM || process.env.BREVO_SMTP_USER,
                pass: process.env.BREVO_API_KEY
            }
        });
        console.log('[EmailService] Using Brevo SMTP for emails');
    }
    return brevoTransporter;
};

// Create Gmail transporter (fallback for local dev)
let gmailTransporter = null;
const getGmailTransporter = () => {
    if (!gmailTransporter) {
        gmailTransporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE || 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        console.log('[EmailService] Using Gmail for emails');
    }
    return gmailTransporter;
};

const sendEmail = async (to, subject, text, html) => {
    try {
        const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
        const storeName = process.env.STORE_NAME || 'POS System';
        
        const mailOptions = {
            from: `"${storeName}" <${fromEmail}>`,
            to,
            subject,
            text,
            html
        };

        // Use Brevo if API key is available
        if (usesBrevo()) {
            const info = await getBrevoTransporter().sendMail(mailOptions);
            console.log('[EmailService] Email sent via Brevo to:', to);
            return { success: true, info };
        }
        
        // Fallback to Gmail (for local development)
        const info = await getGmailTransporter().sendMail(mailOptions);
        console.log('[EmailService] Email sent via Gmail to:', to);
        return { success: true, info };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error };
    }
};

module.exports = { sendEmail, usesBrevo };
