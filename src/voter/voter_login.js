import { authenticateVoter, isBallotClosed } from "../blockchain.js";

// Base URL for backend API
const API_BASE = "https://blockchain-voting-backend.onrender.com";

// Toggle between Login and Registration Forms
document.getElementById("toggleRegister")?.addEventListener("click", (e) => {
	e.preventDefault();
	document.getElementById("loginForm").style.display = "none";
	document.getElementById("registerForm").style.display = "block";
	document.getElementById("registerToggle").style.display = "none";
	document.getElementById("loginHeader").style.display = "none";
});

document.getElementById("toggleLogin")?.addEventListener("click", (e) => {
	e.preventDefault();
	document.getElementById("registerForm").style.display = "none";
	document.getElementById("loginForm").style.display = "block";
	document.getElementById("registerToggle").style.display = "block";
	document.getElementById("loginHeader").style.display = "block";
});

// Handle Voter Registration
document
	.getElementById("registrationForm")
	?.addEventListener("submit", async (event) => {
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
			const response = await fetch(`${API_BASE}/register-voter`, {
				method: "POST",
				body: formData,
			});
			const result = await response.json();

			if (response.ok) {
				document.getElementById("registrationForm").reset();
				alert("Registration successful!");
				window.location.href = "confirm_reg.html";
			} else {
				alert("Registration failed: " + result.error);
			}
		} catch (error) {
			console.error("Error registering voter:", error);
			alert("Registration failed. Check console for details.");
		}
	});

// Voter Login
document
	.getElementById("loginForm")
	?.addEventListener("submit", async (event) => {
		event.preventDefault();

		const ballotId = document.getElementById("ballot_id")?.value.trim();
		const password = document.getElementById("password")?.value.trim();

		if (!ballotId || !password) {
			alert("Please fill in all fields.");
			return;
		}

		if (!window.ethereum) {
			alert("MetaMask is required for login.");
			return;
		}

		try {
			const accounts = await ethereum.request({
				method: "eth_requestAccounts",
			});
			const connectedAddress = accounts[0];

			const {
				isAuthenticated,
				hasVoted,
				ballotId: voterBallotId,
			} = await authenticateVoter(ballotId, password);

			if (!isAuthenticated) {
				alert("Invalid Ballot ID or password.");
				return;
			}

			const closed = await isBallotClosed(voterBallotId);
			if (closed === true) {
				alert("Voting has ended for this ballot. Redirecting to results...");
				window.location.href = `results.html?ballotId=${voterBallotId}`;
				return;
			} else if (closed === null) {
				alert("Error checking ballot status. Please try again.");
				return;
			}

			if (hasVoted) {
				alert("You have already voted. Redirecting to results...");
				window.location.href = `results.html?ballotId=${voterBallotId}`;
				return;
			}

			localStorage.setItem("ballotId", voterBallotId);
			localStorage.setItem("voterAddress", connectedAddress);

			alert("Login successful! Redirecting to voting page...");
			window.location.href = "voter_dashboard.html";
		} catch (error) {
			console.error("Voter login error:", error);
			alert("Login failed. Check console for details.");
		}
	});

// Detect MetaMask account changes
if (window.ethereum) {
	ethereum.on("accountsChanged", () => {
		alert("MetaMask account changed. Please log in again.");
		window.location.reload();
	});
}

// Example fetch for other API endpoints:

async function fetchPendingVoters(ballotIds) {
	const response = await fetch(`${API_BASE}/pending-voters`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ ballot_ids: ballotIds }),
	});
	return response.json();
}

async function fetchApprovedVoters(ballotIds) {
	const response = await fetch(`${API_BASE}/approved-voters`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ ballot_ids: ballotIds }),
	});
	return response.json();
}

async function approveVoter(voterId) {
	const response = await fetch(`${API_BASE}/approve-voter`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ voter_id: voterId }),
	});
	return response.json();
}

async function rejectVoter(voterId) {
	const response = await fetch(`${API_BASE}/reject-voter`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ voter_id: voterId }),
	});
	return response.json();
}

async function searchApprovedVoters(query) {
	const response = await fetch(
		`${API_BASE}/search-approved-voters?query=${encodeURIComponent(query)}`
	);
	return response.json();
}

async function addApprovedVoter(voterData) {
	const response = await fetch(`${API_BASE}/addApprovedVoter`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(voterData),
	});
	return response.json();
}
