const nodemailer = require('nodemailer');

// Brevo (Sendinblue) SDK
let brevoClient = null;
let brevoApiInstance = null;

// Determine which email service to use
const usesBrevo = () => !!process.env.BREVO_API_KEY;

// Initialize Brevo if API key is available
if (process.env.BREVO_API_KEY) {
    const brevo = require('@getbrevo/brevo');
    brevoClient = brevo;
    brevoApiInstance = new brevo.TransactionalEmailsApi();
    brevoApiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY.trim());
    console.log('[EmailService] Using Brevo for emails. Key starts with:', process.env.BREVO_API_KEY.substring(0, 10) + '...');
} else {
    console.log('[EmailService] Using Nodemailer/Gmail for emails');
}

// Create transporter once and reuse across all emails (avoids opening a new SMTP connection per email)
let transporter = null;
const getTransporter = () => {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE || 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    }
    return transporter;
};

const sendEmail = async (to, subject, text, html) => {
    try {
        // Use Brevo if available (works on Render free tier)
        if (usesBrevo() && brevoApiInstance) {
            const sendSmtpEmail = new brevoClient.SendSmtpEmail();
            sendSmtpEmail.subject = subject;
            sendSmtpEmail.htmlContent = html || `<p>${text}</p>`;
            sendSmtpEmail.sender = { 
                email: process.env.EMAIL_FROM || 'noreply@example.com',
                name: process.env.STORE_NAME || 'POS System'
            };
            sendSmtpEmail.to = [{ email: to }];
            
            await brevoApiInstance.sendTransacEmail(sendSmtpEmail);
            console.log('[EmailService] Email sent via Brevo to:', to);
            return { success: true };
        }
        
        // Fallback to Nodemailer/Gmail (for local development)
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to,
            subject,
            text,
            html
        };

        const info = await getTransporter().sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
        return { success: true, info };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error };
    }
};

module.exports = { sendEmail, usesBrevo };
