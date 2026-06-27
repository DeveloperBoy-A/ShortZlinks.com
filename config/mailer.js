const nodemailer = require('nodemailer');
const fetch = require('node-fetch');

// Primary SMTP Transporter Setup
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT == 465,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

exports.sendEmail = async (to, subject, htmlContent) => {
    try {
        // ATTEMPT 1: Primary SMTP Method
        const mailOptions = {
            from: `"${process.env.SITE_NAME}" <${process.env.SMTP_USER}>`,
            to,
            subject,
            html: htmlContent
        };
        const info = await transporter.sendMail(mailOptions);
        console.log(`[+] Email sent successfully via SMTP to ${to}: ${info.messageId}`);
        return true;
        
    } catch (smtpError) {
        console.error(`[-] SMTP Failed for ${to}. Error: ${smtpError.message}`);
        console.log(`[*] Switching to Fallback API Key Method...`);

        // ATTEMPT 2: Fallback API Method (Using Brevo REST API as standard)
        try {
            // Agar aap Brevo ki jagah SendGrid ya MailerSend use karte hain, toh bas URL aur JSON body update karni hogi.
            const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'api-key': process.env.EMAIL_API_KEY,
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    sender: { 
                        name: process.env.SITE_NAME || 'ShortZlinks', 
                        email: process.env.SMTP_USER 
                    },
                    to: [{ email: to }],
                    subject: subject,
                    htmlContent: htmlContent
                })
            });

            if (response.ok) {
                console.log(`[+] Email sent successfully via Fallback API to ${to}`);
                return true;
            } else {
                const errorData = await response.json();
                console.error(`[-] API Fallback also Failed:`, errorData);
                return false;
            }
            
        } catch (apiError) {
            console.error(`[-] CRITICAL: Both SMTP and API Failed. Error:`, apiError.message);
            return false;
        }
    }
};
