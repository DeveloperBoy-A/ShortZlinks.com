const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

exports.sendEmail = async (to, subject, htmlContent) => {
    try {
        const mailOptions = {
            from: `"${process.env.SITE_NAME}" <${process.env.SMTP_USER}>`,
            to,
            subject,
            html: htmlContent
        };
        const info = await transporter.sendMail(mailOptions);
        console.log(`[+] Email sent to ${to}: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error(`[-] SMTP Error:`, error);
        return false;
    }
};
