require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASS,
	},
});

async function sendVoterPassword(email, password) {
	const mailOptions = {
		from: `"Blockchain Voting System" <${process.env.EMAIL_USER}>`,
		to: email,
		subject: "Your Voting System Password",
		html: `
            <p>Hello,</p>
            <p>Your voter registration has been <strong>approved</strong>.</p>
            <p><strong>Your login password:</strong> ${password}</p>
            <p>Please keep it safe. You will need this along with your MetaMask wallet to vote.</p>
            <br>
            <p>— Blockchain Voting System</p>
        `,
	};

	try {
		await transporter.sendMail(mailOptions);
		console.log(`Password sent to ${email}`);
	} catch (err) {
		console.error("Error sending email:", err);
	}
}

module.exports = { sendVoterPassword };
