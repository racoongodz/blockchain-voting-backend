import { authenticateVoter, isBallotClosed } from "../blockchain.js";

document
	.getElementById("toggleRegister")
	.addEventListener("click", function (event) {
		event.preventDefault();
		document.getElementById("loginForm").style.display = "none";
		document.getElementById("registerForm").style.display = "block";
		document.getElementById("registerToggle").style.display = "none";
		document.getElementById("loginHeader").style.display = "none";
	});

document
	.getElementById("toggleLogin")
	.addEventListener("click", function (event) {
		event.preventDefault();
		document.getElementById("registerForm").style.display = "none";
		document.getElementById("loginForm").style.display = "block";
		document.getElementById("registerToggle").style.display = "block";
		document.getElementById("loginHeader").style.display = "block";
	});

// Handle Voter Registration
document
	.getElementById("registrationForm")
	.addEventListener("submit", async function (event) {
		event.preventDefault();

		const formData = new FormData();
		formData.append(
			"ballot_id",
			document.getElementById("reg_ballot_id").value
		);
		formData.append("full_name", document.getElementById("full_name").value);
		formData.append("email", document.getElementById("email").value);
		formData.append(
			"metamask_address",
			document.getElementById("metamask_address").value
		);
		formData.append(
			"id_photo",
			document.getElementById("credentialUpload").files[0]
		);

		try {
			const response = await fetch(
				"https://blockchain-voting-backend.onrender.com/register-voter",
				{
					method: "POST",
					body: formData,
				}
			);

			const result = await response.json();
			if (response.ok) {
				document.getElementById("registrationForm").reset();
				// Redirect to the confirmation page
				window.location.href = "confirm_reg.html";
			} else {
				alert("Registration failed: " + result.error);
			}
		} catch (error) {
			console.error("Error registering voter:", error);
		}
	});

document.addEventListener("DOMContentLoaded", () => {
	const loginForm = document.getElementById("loginForm");

	if (loginForm) {
		loginForm.addEventListener("submit", async (event) => {
			event.preventDefault();

			const ballotIdInput = document.getElementById("ballot_id");
			const passwordInput = document.getElementById("password");

			// Ensure input elements exist before accessing values
			if (!ballotIdInput || !passwordInput) {
				console.error("Voter login form inputs not found.");
				return;
			}

			const ballotId = ballotIdInput.value.trim();
			const password = passwordInput.value.trim();

			if (!ballotId || !password) {
				alert("Please fill in all fields.");
				return;
			}

			try {
				// ✅ Ensure MetaMask is installed
				if (!window.ethereum) {
					alert("MetaMask is required for login.");
					return;
				}

				// Request MetaMask accounts and get the current address
				const accounts = await ethereum.request({
					method: "eth_requestAccounts",
				});
				const connectedAddress = accounts[0]; // Get selected MetaMask address

				// ✅ Authenticate voter
				const {
					isAuthenticated,
					hasVoted,
					ballotId: voterBallotId,
				} = await authenticateVoter(ballotId, password);

				if (!isAuthenticated) {
					alert("Invalid Ballot ID or password.");
					return;
				}

				// ✅ After successful authentication, check if the ballot is closed
				const closed = await isBallotClosed(voterBallotId);
				if (closed === true) {
					alert("Voting has ended for this ballot. Redirecting to results...");
					window.location.href = `results.html?ballotId=${voterBallotId}`;
					return;
				} else if (closed === null) {
					alert("Error checking ballot status. Please try again.");
					return;
				}

				// ✅ If ballot is still open, check if voter has already voted
				if (hasVoted) {
					alert("You have already voted. Redirecting to results...");
					window.location.href = `results.html?ballotId=${voterBallotId}`;
					return;
				}

				// ✅ Store voter details in localStorage before redirecting
				localStorage.setItem("ballotId", voterBallotId);
				localStorage.setItem("voterAddress", connectedAddress);

				alert("Login successful! Redirecting to voting page...");
				window.location.href = "voter_dashboard.html"; // Redirect voter to dashboard
			} catch (error) {
				console.error("Voter login error:", error);
				alert("Login failed. Please check the console for details.");
			}
		});
	} else {
		console.error("Voter login form not found in the document.");
	}

	// Handle MetaMask account changes
	ethereum.on("accountsChanged", () => {
		alert("MetaMask account changed. Please log in again.");
		window.location.reload();
	});
});
