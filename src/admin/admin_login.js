import { connectWallet, registerAdmin, loginAdmin } from "../blockchain.js";

document.addEventListener("DOMContentLoaded", async () => {
	// Ensure login form exists before adding an event listener
	const loginForm = document.getElementById("loginForm");
	if (loginForm) {
		loginForm.addEventListener("submit", async (event) => {
			event.preventDefault();

			const usernameInput = document.querySelector(
				"#loginForm input[type='text']"
			);
			const passwordInput = document.querySelector(
				"#loginForm input[type='password']"
			);

			// Ensure input elements exist before accessing values
			if (!usernameInput || !passwordInput) {
				console.error("Login form inputs not found.");
				return;
			}

			const username = usernameInput.value.trim();
			const password = passwordInput.value.trim();

			if (!username || !password) {
				alert("Please enter both username and password.");
				return;
			}

			try {
				// Request MetaMask accounts and get the current address
				if (!window.ethereum) {
					alert("MetaMask is required for login.");
					return;
				}

				const accounts = await ethereum.request({
					method: "eth_requestAccounts",
				});
				const userAddress = accounts[0]; // Get selected MetaMask address

				// Attempt login
				const result = await loginAdmin(username, password);

				if (result && result[0]) {
					// result[0] is success (boolean)
					alert("Login successful!");
					window.location.href = "admin_dashboard.html"; // Redirect on success
				} else {
					alert("Invalid login credentials or MetaMask address mismatch.");
				}
			} catch (error) {
				console.error("Login error:", error);
				alert("Login failed. Please check the console for more details.");
			}
		});
	} else {
		console.error("Login form not found in the document.");
	}

	// Ensure register form exists before adding an event listener
	const registerForm = document.querySelector("#registerForm form");
	if (registerForm) {
		registerForm.addEventListener("submit", async (event) => {
			event.preventDefault();

			const usernameInput = document.querySelector(
				"#registerForm input[type='text']"
			);
			const passwordInputs = document.querySelectorAll(
				"#registerForm input[type='password']"
			);

			// Ensure input elements exist before accessing values
			if (!usernameInput || passwordInputs.length < 2) {
				console.error("Registration form inputs not found.");
				return;
			}

			const username = usernameInput.value.trim();
			const password = passwordInputs[0].value.trim();
			const confirmPassword = passwordInputs[1].value.trim();

			if (!username || !password || !confirmPassword) {
				alert("All fields are required!");
				return;
			}

			if (password !== confirmPassword) {
				alert("Passwords do not match!");
				return;
			}

			try {
				await registerAdmin(username, password);
			} catch (error) {
				console.error("Registration error:", error);
				alert("Registration failed. Check console for details.");
			}
		});
	} else {
		console.error("Register form not found in the document.");
	}
});
