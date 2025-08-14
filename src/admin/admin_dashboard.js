import {
	createBallot,
	getMyBallots,
	getBallotDetails,
	registerMultipleVoters,
	getVotersForBallot,
	getVotingResults,
	endVoting,
	isBallotClosed,
} from "../blockchain.js";
window.fetchApprovedVoters = fetchApprovedVoters;

async function displayBallots() {
	const ballotsList = document.getElementById("ballotsList");
	ballotsList.innerHTML = ""; // Clear previous list

	try {
		const result = await getMyBallots();

		// Check if result is null, undefined, or empty
		if (!result || !result.ballotIds || result.ballotIds.length === 0) {
			ballotsList.innerHTML =
				"<tr><td colspan='3' class='text-center'>No ballots found.</td></tr>";
			return;
		}

		const { ballotIds, ballotTitles } = result;

		for (let index = 0; index < ballotIds.length; index++) {
			const id = ballotIds[index];
			const title = ballotTitles[index];
			const row = document.createElement("tr");

			// Check if the ballot is closed using the provided isBallotClosed function
			const closed = await isBallotClosed(id);

			row.innerHTML = `
                <td>${id}</td> <!-- Display the actual ballot ID -->
                <td>${title}</td>
                <td>
                    <button class="btn btn-primary" onclick="viewResults('${id}')">View Results</button>
                    <button class="btn btn-danger" onclick="handleEndVoting('${id}')"
                        ${closed ? "disabled" : ""}>${
				closed ? "Voting Ended" : "End Voting"
			}</button>
                </td>
            `;

			ballotsList.appendChild(row);
		}
	} catch (error) {
		console.error("Error displaying ballots:", error);
		ballotsList.innerHTML =
			"<tr><td colspan='3' class='text-center text-danger'>Error loading ballots.</td></tr>";
	}
}

// Call the function when the page loads
document.addEventListener("DOMContentLoaded", displayBallots);

// // Placeholder functions for action buttons
// function viewResults(ballotId) {
// 	alert(`Viewing results for ballot ID: ${ballotId}`);
// }

//END VOTING
async function handleEndVoting(ballotId) {
	const confirmEnd = confirm(
		"Are you sure you want to end the voting for this ballot?"
	);
	if (!confirmEnd) return;

	const success = await endVoting(ballotId);
	if (success) {
		alert(`✅ Voting ended successfully for Ballot ID: ${ballotId}`);
		// Optionally, refresh the page or update UI
		location.reload();
	} else {
		alert("❌ Failed to end voting. Please try again.");
	}
}
window.handleEndVoting = handleEndVoting;

// Function to add a new candidate input field
function addCandidateInput(candidateList) {
	const candidateDiv = document.createElement("div");
	candidateDiv.className = "candidate-item d-flex align-items-center mb-2";

	const newInput = document.createElement("input");
	newInput.type = "text";
	newInput.className = "form-control candidate-input";
	newInput.placeholder = "Enter Candidate Name";
	newInput.required = true;

	// Remove Candidate Button
	const removeBtn = document.createElement("button");
	removeBtn.type = "button";
	removeBtn.className = "btn btn-danger btn-sm ms-2";
	removeBtn.textContent = "✖";
	removeBtn.onclick = () => candidateDiv.remove();

	candidateDiv.appendChild(newInput);
	candidateDiv.appendChild(removeBtn);
	candidateList.appendChild(candidateDiv);
}

// Function to add a new position group
function addPosition() {
	const container = document.getElementById("positionsContainer");

	const positionGroup = document.createElement("div");
	positionGroup.classList.add(
		"position-group",
		"mt-3",
		"p-3",
		"border",
		"rounded"
	);

	positionGroup.innerHTML = `
        <input type="text" class="form-control positionName mb-2" placeholder="Position Name" required />
        <div class="candidate-list"></div>
        <button type="button" class="btn btn-sm btn-outline-primary addCandidate">+ Add Candidate</button>
        <button type="button" class="btn btn-sm btn-outline-danger removePosition ms-2">Remove Position</button>
    `;

	container.appendChild(positionGroup);

	// Add event listener for adding candidates
	const candidateList = positionGroup.querySelector(".candidate-list");
	positionGroup
		.querySelector(".addCandidate")
		.addEventListener("click", () => addCandidateInput(candidateList));

	// Add event listener to remove position
	positionGroup
		.querySelector(".removePosition")
		.addEventListener("click", () => positionGroup.remove());

	// Ensure at least one candidate field is present
	addCandidateInput(candidateList);
}

// Handle Ballot Creation
document
	.getElementById("submitBallot")
	.addEventListener("click", async function () {
		const title = document.getElementById("ballotTitle").value.trim();
		const positions = [];
		const candidates = [];

		if (!title) {
			alert("Please enter a ballot title.");
			return;
		}

		// Get Positions & Candidates
		document.querySelectorAll(".position-group").forEach((group) => {
			const positionName = group.querySelector(".positionName").value.trim();
			const candidateInputs = group.querySelectorAll(
				".candidate-list .candidate-input"
			);
			const candidateNames = [];

			candidateInputs.forEach((input) => {
				if (input.value.trim() !== "") {
					candidateNames.push(input.value.trim());
				}
			});

			if (positionName && candidateNames.length > 0) {
				positions.push(positionName);
				candidates.push(candidateNames);
			}
		});

		if (positions.length === 0) {
			alert("Please add at least one position with candidates.");
			return;
		}

		// Generate Unique Ballot ID
		const ballotId =
			"B-" + Math.random().toString(36).substr(2, 6).toUpperCase();

		// Log the data before sending it to the blockchain
		console.log("Formatted Ballot Data:", {
			ballotId,
			title,
			positions,
			candidates,
		});

		try {
			await createBallot(ballotId, title, positions, candidates);
			document.getElementById("ballotForm").reset();
			document.querySelector(".btn-close").click(); // Close Modal
			document.getElementById("positionsContainer").innerHTML = ""; // Clear Positions
			addPosition(); // Ensure at least one position exists

			setTimeout(() => {
				location.reload();
			}, 1000);
		} catch (error) {
			console.error("Error creating ballot:", error);
			alert("Failed to create ballot. Check console for details.");
		}
	});

// Initialize with one position on load
document.getElementById("addPosition").addEventListener("click", addPosition);
addPosition();

//-----------------------------------------------------------

//ballot report
document.addEventListener("DOMContentLoaded", function () {
	const openBallotReportBtn = document.getElementById("openBallotReportModal");
	const fetchBallotDetailsBtn = document.getElementById("fetchBallotDetails");
	const ballotIdSelect = document.getElementById("ballotIdSelect");
	const downloadBallotPdfBtn = document.createElement("button");

	if (!openBallotReportBtn || !fetchBallotDetailsBtn || !ballotIdSelect) {
		console.error(
			"❌ Some elements are missing in admin_dashboard.html. Check your IDs."
		);
		return;
	}

	// Load ballots when modal is opened
	openBallotReportBtn.addEventListener("click", async function () {
		await loadAdminBallots();
	});

	async function loadAdminBallots() {
		ballotIdSelect.innerHTML = "<option value=''>Loading ballots...</option>";
		try {
			const { ballotIds, ballotTitles } = await getMyBallots();
			ballotIdSelect.innerHTML = "";

			if (ballotIds.length === 0) {
				ballotIdSelect.innerHTML = "<option value=''>No ballots found</option>";
				return;
			}

			ballotIds.forEach((id, index) => {
				const option = document.createElement("option");
				option.value = id;
				option.textContent = `${ballotTitles[index]} (ID: ${id})`;
				ballotIdSelect.appendChild(option);
			});
		} catch (error) {
			console.error("❌ Error loading ballots:", error);
			ballotIdSelect.innerHTML =
				"<option value=''>Error loading ballots</option>";
		}
	}

	fetchBallotDetailsBtn.addEventListener("click", async function () {
		const ballotId = ballotIdSelect.value;
		if (!ballotId) {
			alert("Please select a ballot.");
			return;
		}

		try {
			const ballotDetails = await getBallotDetails(ballotId);
			if (!ballotDetails) {
				alert("Ballot details not found.");
				return;
			}
			displayBallotDetails(ballotDetails);
		} catch (error) {
			console.error("❌ Error fetching ballot details:", error);
			alert("Error fetching ballot details. Please try again.");
		}
	});

	function displayBallotDetails(details) {
		const modalBody = document.querySelector("#ballotReportModal .modal-body");

		modalBody.innerHTML = `
            <h3>Ballot Details</h3>
            <p><strong>Title:</strong> ${details.title}</p>
            <p><strong>Ballot ID:</strong> ${details.ballotId}</p>
            <h4>Positions & Candidates:</h4>
            <ul>
                ${details.positions
									.map(
										(position) => `
                            <li><strong>${position.name}</strong>
                                <ul>
                                    ${position.candidates
																			.map(
																				(candidate) => `<li>${candidate}</li>`
																			)
																			.join("")}
                                </ul>
                            </li>
                        `
									)
									.join("")}
            </ul>
        `;

		// Add Download PDF button if not already added
		downloadBallotPdfBtn.textContent = "Download as PDF";
		downloadBallotPdfBtn.classList.add("btn", "btn-success", "mt-3");
		downloadBallotPdfBtn.addEventListener("click", function () {
			downloadBallotDetailsAsPDF(details);
		});

		modalBody.appendChild(downloadBallotPdfBtn);
	}

	function downloadBallotDetailsAsPDF(details) {
		const pdfContent = `
            <div>
                <h2>Ballot Details</h2>
                <p><strong>Ballot ID:</strong> ${details.ballotId}</p>
                <p><strong>Ballot Title:</strong> ${details.title}</p>
                <hr>
                <h4>Positions & Candidates:</h4>
                <ul>
                    ${details.positions
											.map(
												(position) => `
                                <li><strong>${position.name}</strong>
                                    <ul>
                                        ${position.candidates
																					.map(
																						(candidate) =>
																							`<li>${candidate}</li>`
																					)
																					.join("")}
                                    </ul>
                                </li>
                            `
											)
											.join("")}
                </ul>
            </div>
        `;

		const opt = {
			margin: 10,
			filename: `Ballot_Details_${details.ballotId}.pdf`,
			image: { type: "jpeg", quality: 0.98 },
			html2canvas: { scale: 2 },
			jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
		};

		html2pdf().from(pdfContent).set(opt).save();
	}
});

// document.addEventListener("DOMContentLoaded", function () {
// 	fetchPendingVoters();
// });
//---------------------------------------------------------------------------------------
async function fetchPendingVoters() {
	try {
		const { ballotIds } = await getMyBallots();
		const tableBody = document.getElementById("pendingVotersTable");
		tableBody.innerHTML = "";

		if (!Array.isArray(ballotIds) || ballotIds.length === 0) {
			tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No ballots assigned to you.</td></tr>`;
			return;
		}

		const response = await fetch(
			"https://blockchain-voting-backend.onrender.com/pending-voters",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ballot_ids: ballotIds }),
			}
		);

		if (!response.ok) {
			throw new Error("Server returned an error");
		}

		let data = await response.json();

		// ✅ Deduplicate by voter.id
		const uniqueVotersMap = new Map();
		data.forEach((voter) => {
			if (!uniqueVotersMap.has(voter.id)) {
				uniqueVotersMap.set(voter.id, voter);
			}
		});
		data = Array.from(uniqueVotersMap.values());

		if (!data || data.length === 0) {
			tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No pending voter applications.</td></tr>`;
			return;
		}

		data.forEach((voter) => {
			const row = document.createElement("tr");
			row.innerHTML = `
				<td>${voter.id}</td>
				<td>${voter.ballot_id}</td>
				<td>${voter.full_name}</td>
				<td>${voter.email}</td>
				<td>${voter.metamask_address}</td>
				<td>
					<a href="https://blockchain-voting-backend.onrender.com/uploads/${voter.id_photo}" target="_blank">
						<img src="https://blockchain-voting-backend.onrender.com/uploads/${voter.id_photo}" alt="ID Photo" width="100">
					</a>
				</td>
				<td>
					<button onclick="approveVoter(${voter.id})" class="btn btn-success">Approve</button>
					<button onclick="rejectVoter(${voter.id})" class="btn btn-danger">Reject</button>
				</td>
			`;
			tableBody.appendChild(row);
		});
	} catch (error) {
		console.error("❌ Error fetching pending voters:", error);
		const tableBody = document.getElementById("pendingVotersTable");
		tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error fetching pending voters.</td></tr>`;
	}
}
// // ✅ Prevent multiple runs on page load
// window.onload = () => {
// 	if (!window.fetchPendingVotersLoaded) {
// 		window.fetchPendingVotersLoaded = true;
// 		fetchPendingVoters();
// 	}
// };

// window.onload = fetchPendingVoters;

// Approve Voter
async function approveVoter(voterId) {
	try {
		const response = await fetch(
			"https://blockchain-voting-backend.onrender.com/approve-voter",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ voter_id: voterId }),
			}
		);

		const data = await response.json();

		if (!response.ok) {
			alert(data.error); // Display error message (duplicate name or address)
			return;
		}

		fetchPendingVoters(); // Refresh pending voters list
		fetchApprovedVoters();
	} catch (error) {
		console.error("❌ Error approving voter:", error);
		alert("Something went wrong! Please try again.");
	}
}

// Reject Voter
async function rejectVoter(voterId) {
	try {
		const response = await fetch(
			"https://blockchain-voting-backend.onrender.com/reject-voter",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ voter_id: voterId }),
			}
		);

		const data = await response.json();
		alert(data.message);
		fetchPendingVoters(); // Refresh list
	} catch (error) {
		console.error("Error rejecting voter:", error);
	}
}

// Expose functions globally

window.approveVoter = approveVoter;
window.rejectVoter = rejectVoter;
window.deleteVoter = deleteVoter;
window.openRegisterVoterModal = openRegisterVoterModal;

// Load pending voters on page load
document.addEventListener("DOMContentLoaded", fetchPendingVoters);

// Load Approved Voters
async function fetchApprovedVoters() {
	try {
		const { ballotIds } = await getMyBallots();
		const section = document.getElementById("approvedVotersSection");
		const listContainer = document.getElementById("approvedVoterList");

		listContainer.innerHTML = ""; // Clear previous list
		section.style.display = "block"; // Show section

		if (!Array.isArray(ballotIds) || ballotIds.length === 0) {
			listContainer.innerHTML = `<p class="text-center text-muted">No ballots assigned to you.</p>`;
			return;
		}

		// Fetch approved voters from backend
		const response = await fetch(
			"https://blockchain-voting-backend.onrender.com/approved-voters",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ballot_ids: ballotIds }),
			}
		);

		if (!response.ok)
			throw new Error(`Failed to fetch approved voters: ${response.status}`);

		const groupedVoters = await response.json();

		// Check if any voters exist
		const hasVoters = Object.values(groupedVoters).some(
			(voters) => Array.isArray(voters) && voters.length > 0
		);
		if (!hasVoters) {
			listContainer.innerHTML = `<p class="text-center text-muted">No approved voters found for any ballots.</p>`;
			return;
		}

		// Display voters grouped by ballot
		Object.entries(groupedVoters).forEach(([ballotId, voters]) => {
			if (!Array.isArray(voters) || voters.length === 0) return;

			const ballotContainer = document.createElement("div");
			ballotContainer.classList.add("mb-4");

			// Ballot Title
			const ballotTitle = document.createElement("h4");
			ballotTitle.textContent = `Ballot ID: ${ballotId}`;
			ballotContainer.appendChild(ballotTitle);

			// Add to Blockchain Button
			const addButton = document.createElement("button");
			addButton.textContent = "Add to Blockchain";
			addButton.classList.add("btn", "btn-primary", "mb-2");
			addButton.onclick = () => registerApprovedVoters(ballotId);
			ballotContainer.appendChild(addButton);

			// Table
			const table = document.createElement("table");
			table.classList.add("table", "table-striped");
			table.innerHTML = `
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Full Name</th>
                        <th>Email</th>
                        <th>MetaMask Address</th>
                        <th>Voter Password</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;

			const tbody = table.querySelector("tbody");

			voters.forEach((voter, index) => {
				const passwordId = `password-${ballotId}-${index}`;
				const row = document.createElement("tr");
				row.innerHTML = `
                    <td>${voter.id}</td>
                    <td>${voter.full_name}</td>
                    <td>${voter.email}</td>
                    <td>${voter.metamask_address}</td>
                    <td>
                        <span id="${passwordId}" class="password-hidden">******</span>
                        <button class="btn btn-sm btn-secondary" onclick="window.togglePassword('${passwordId}', '${voter.voter_password}')">Show</button>
                    </td>
                `;
				tbody.appendChild(row);
			});

			ballotContainer.appendChild(table);
			listContainer.appendChild(ballotContainer);
		});
	} catch (error) {
		console.error("❌ Error fetching approved voters:", error);
		const listContainer = document.getElementById("approvedVoterList");
		listContainer.innerHTML = `<p class="text-center text-danger">Error fetching approved voters.</p>`;
	}
}

// 🔹 Function to toggle password visibility (attach to global window)
window.togglePassword = function (passwordId, actualPassword) {
	const passwordElement = document.getElementById(passwordId);

	if (passwordElement.textContent === "******") {
		passwordElement.textContent = actualPassword;
	} else {
		passwordElement.textContent = "******";
	}
};

// // ✅ Call this function when the admin dashboard loads
// window.onload = fetchApprovedVoters;

// Import Web3 if not already imported
if (typeof Web3 === "undefined") {
	console.error("Web3 is not loaded. Ensure Web3.js is included.");
}

// ✅ Function to hash passwords and register voters
async function registerApprovedVoters() {
	try {
		// ✅ Ensure Web3 is initialized
		const web3Instance = new Web3(window.ethereum);

		// ✅ Check if web3.utils is available
		if (!web3Instance.utils) {
			console.error("❌ Web3 utils not available!");
			return;
		}

		// Fetch approved voters from MySQL
		const response = await fetch(
			"https://blockchain-voting-backend.onrender.com/api/getApprovedVoters"
		);
		const voters = await response.json();

		if (voters.length === 0) {
			alert("No approved voters to register.");
			return;
		}

		// Extract voter details
		const voterAddresses = voters.map((voter) => voter.metamask_address);
		const hashedPasswords = voters.map(
			(voter) => web3Instance.utils.keccak256(voter.voter_password) // 🔹 Hash passwords off-chain
		);
		const ballotId = voters[0].ballot_id; // Assuming all voters belong to the same ballot

		// ✅ Call blockchain function (already handles MetaMask)
		await registerMultipleVoters(voterAddresses, ballotId, hashedPasswords);
	} catch (error) {
		console.error("❌ Error registering voters:", error);
	}
}

// Search filter function
function filterTables() {
	const searchValue = document
		.getElementById("searchInput")
		.value.toLowerCase();
	const tables = document.querySelectorAll("tbody");

	tables.forEach((tbody) => {
		Array.from(tbody.getElementsByTagName("tr")).forEach((row) => {
			const text = row.innerText.toLowerCase();
			row.style.display = text.includes(searchValue) ? "" : "none";
		});
	});
}

// Function to delete voter from database
async function deleteVoter(voterId, ballotId, button) {
	if (!confirm("Are you sure you want to delete this voter?")) return;

	try {
		const response = await fetch(
			`https://blockchain-voting-backend.onrender.com/delete-voter/${voterId}`,
			{
				method: "DELETE",
			}
		);

		if (!response.ok) {
			throw new Error("Failed to delete voter");
		}

		// Remove row from table upon successful deletion
		const row = button.closest("tr");
		row.remove();

		alert("Voter deleted successfully!");
	} catch (error) {
		console.error("Error deleting voter:", error);
		alert("Error deleting voter. Please try again.");
	}
}

function openRegisterVoterModal() {
	let modal = new bootstrap.Modal(
		document.getElementById("addApprovedVoterModal")
	);
	modal.show();
}

document
	.getElementById("addVoterButton")
	.addEventListener("click", async function () {
		const fullName = document.getElementById("voterName").value.trim();
		const email = document.getElementById("voterEmail").value.trim();
		const metamaskAddress = document
			.getElementById("voterAddress")
			.value.trim();
		const ballotId = document.getElementById("voterBallotId").value.trim();

		if (!fullName || !email || !metamaskAddress || !ballotId) {
			alert("❌ All fields are required.");
			return;
		}

		try {
			const response = await fetch(
				"https://blockchain-voting-backend.onrender.com/addApprovedVoter",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						full_name: fullName,
						email: email,
						metamask_address: metamaskAddress,
						ballot_id: ballotId,
					}),
				}
			);

			const data = await response.json();

			if (response.ok) {
				alert("✅ Voter added successfully!");

				// Reset form and close modal properly
				document.getElementById("addApprovedVoterForm").reset();

				let modalElement = document.getElementById("addApprovedVoterModal");
				let addVoterModal = bootstrap.Modal.getInstance(modalElement);
				if (addVoterModal) {
					addVoterModal.hide();
				}

				// Ensure aria-hidden is properly removed
				modalElement.removeAttribute("aria-hidden");

				fetchApprovedVoters(); // Refresh voter list
			}
		} catch (error) {
			console.error("❌ Error adding voter:", error);
			alert("❌ Failed to add voter. Please try again.");
		}
	});

//Voter reports
document.addEventListener("DOMContentLoaded", function () {
	const registeredVotersModal = document.getElementById(
		"registeredVotersModal"
	);
	const fetchRegisteredVotersBtn = document.getElementById(
		"fetchRegisteredVoters"
	);
	const ballotSelect = document.getElementById("ballotIdVoterSelect");
	const voterDetailsContent = document.getElementById("voterDetailsContent");
	const downloadVoterPdf = document.getElementById("downloadVoterPdf");

	// Check if all necessary elements are available
	if (
		!registeredVotersModal ||
		!fetchRegisteredVotersBtn ||
		!ballotSelect ||
		!voterDetailsContent ||
		!downloadVoterPdf
	) {
		console.error(
			"❌ Some elements are missing in the HTML. Please check your IDs."
		);
		return;
	}

	// Open modal and load ballots
	registeredVotersModal.addEventListener("click", async function () {
		await loadAdminBallots();
	});

	// Function to load Ballot IDs into the dropdown
	async function loadAdminBallots() {
		ballotSelect.innerHTML = "<option value=''>Loading...</option>"; // Show loading text
		try {
			const { ballotIds, ballotTitles } = await getMyBallots(); // Fetch ballot data
			ballotSelect.innerHTML = ""; // Clear the dropdown

			if (ballotIds.length === 0) {
				ballotSelect.innerHTML = "<option value=''>No ballots found</option>";
				return;
			}

			ballotIds.forEach((id, index) => {
				const option = document.createElement("option");
				option.value = id;
				option.textContent = ballotTitles[index];
				ballotSelect.appendChild(option);
			});
		} catch (error) {
			console.error("Error loading ballots:", error);
			ballotSelect.innerHTML =
				"<option value=''>Error loading ballots</option>";
		}
	}

	// Fetch registered voters when the button is clicked
	fetchRegisteredVotersBtn.addEventListener("click", async function () {
		const ballotId = ballotSelect.value.trim(); // Get selected Ballot ID from dropdown
		if (!ballotId) {
			alert("Please select a valid Ballot ID.");
			return;
		}

		const voters = await getVotersForBallot(ballotId); // Fetch voters for the selected ballot

		// Display voter details
		voterDetailsContent.innerHTML = `<p><strong>Ballot ID:</strong> ${ballotId}</p>`;

		if (voters.length === 0) {
			voterDetailsContent.innerHTML +=
				"<p>No registered voters for this ballot.</p>";
			return;
		}

		let voterListHtml = "<h5>Registered Voters:</h5><ul>";
		voters.forEach((voter) => {
			voterListHtml += `<li>${voter}</li>`;
		});
		voterListHtml += "</ul>";

		voterDetailsContent.innerHTML += voterListHtml;
	});

	// Download the voter details as a PDF
	downloadVoterPdf.addEventListener("click", () => {
		const voterDetails = voterDetailsContent.innerHTML;
		if (!voterDetails) {
			alert("No data available to download.");
			return;
		}

		const pdfContent = `<div>${voterDetails}</div>`;

		const opt = {
			margin: 10,
			filename: `Registered_Voters_${new Date().toISOString()}.pdf`,
			image: { type: "jpeg", quality: 0.98 },
			html2canvas: { scale: 2 },
			jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
		};

		html2pdf().from(pdfContent).set(opt).save();
	});
});

//live results
window.viewResults = viewResults; // Make function accessible globally
async function viewResults(ballotId) {
	try {
		// Fetch voting results from blockchain.js
		const result = await getVotingResults(ballotId);

		// Check if results exist
		if (!result || result.positions.length === 0) {
			alert("No results available for this ballot.");
			return;
		}

		// Get the modal elements
		const resultsModal = document.getElementById("resultsModal1");
		const resultsBody = document.getElementById("resultsBody");

		// Clear previous results
		resultsBody.innerHTML = "";

		// Build results table dynamically
		result.positions.forEach((position, index) => {
			let positionRow = `<tr>
                <td colspan="3" class="fw-bold text-primary">${position}</td>
            </tr>`;

			resultsBody.innerHTML += positionRow;

			result.candidates[index].forEach((candidate, cIndex) => {
				let candidateRow = `<tr>
                    <td>${candidate}</td>
                    <td>${result.voteCounts[index][cIndex]}</td>
                </tr>`;

				resultsBody.innerHTML += candidateRow;
			});
		});

		// Show the results modal
		let modal = new bootstrap.Modal(resultsModal);
		modal.show();
	} catch (error) {
		console.error("Error fetching results:", error);
		alert("Failed to load results. Please try again.");
	}
}

//results report
document.addEventListener("DOMContentLoaded", function () {
	const resultsModal = document.getElementById("resultsModal");
	const openResultsBtn = document.getElementById("openResultsModal");
	const closeBtn = document.querySelector(".btn-close");
	const ballotSelect = document.getElementById("ballotSelect");
	const fetchResultsBtn = document.getElementById("fetchResultsBtn");
	const resultsDisplay = document.getElementById("resultsDisplay");
	const downloadResultsPdf = document.getElementById("downloadResultsPdf"); // ✅ Added download button

	if (
		!resultsModal ||
		!openResultsBtn ||
		!closeBtn ||
		!ballotSelect ||
		!fetchResultsBtn ||
		!resultsDisplay ||
		!downloadResultsPdf
	) {
		console.error(
			"❌ Some elements are missing in admin_dashboard.html. Check your IDs."
		);
		return;
	}

	// Open modal and load ballots
	openResultsBtn.addEventListener("click", async function () {
		await loadAdminBallots();
	});

	async function loadAdminBallots() {
		ballotSelect.innerHTML = "<option value=''>Loading...</option>";
		try {
			const { ballotIds, ballotTitles } = await getMyBallots();
			ballotSelect.innerHTML = "";

			if (ballotIds.length === 0) {
				ballotSelect.innerHTML = "<option value=''>No ballots found</option>";
				return;
			}

			ballotIds.forEach((id, index) => {
				const option = document.createElement("option");
				option.value = id;
				option.textContent = ballotTitles[index];
				ballotSelect.appendChild(option);
			});
		} catch (error) {
			console.error("Error loading ballots:", error);
			ballotSelect.innerHTML =
				"<option value=''>Error loading ballots</option>";
		}
	}

	fetchResultsBtn.addEventListener("click", async function () {
		const ballotId = ballotSelect.value;
		if (!ballotId) {
			alert("Please select a ballot.");
			return;
		}

		try {
			const isClosed = await isBallotClosed(ballotId);
			if (!isClosed) {
				resultsDisplay.innerHTML = "<p>Voting is still ongoing.</p>";
				return;
			}

			const results = await getVotingResults(ballotId);
			displayResults(results);
		} catch (error) {
			console.error("Error fetching results:", error);
			resultsDisplay.innerHTML = "<p>Error fetching results.</p>";
		}
	});

	function displayResults(results) {
		resultsDisplay.innerHTML = "<h3>Election Results:</h3>";

		if (results.positions.length === 0) {
			resultsDisplay.innerHTML += "<p>No results available.</p>";
			return;
		}

		results.positions.forEach((position, index) => {
			resultsDisplay.innerHTML += `<h4>${position}</h4><ul>`;
			results.candidates[index].forEach((candidate, i) => {
				resultsDisplay.innerHTML += `<li>${candidate}: ${results.voteCounts[index][i]} votes</li>`;
			});
			resultsDisplay.innerHTML += "</ul>";
		});
	}

	// ✅ Download Results as PDF
	downloadResultsPdf.addEventListener("click", () => {
		const ballotId = ballotSelect.value;
		const ballotTitle = ballotSelect.options[ballotSelect.selectedIndex].text;

		if (!ballotId) {
			alert("Please select a ballot before downloading.");
			return;
		}

		const pdfContent = `
			<div>
				<h2>Election Results</h2>
				<p><strong>Ballot ID:</strong> ${ballotId}</p>
				<p><strong>Ballot Title:</strong> ${ballotTitle}</p>
				<hr>
				${resultsDisplay.innerHTML}
			</div>
		`;

		const opt = {
			margin: 10,
			filename: `Election_Results_${ballotTitle}_${new Date().toISOString()}.pdf`,
			image: { type: "jpeg", quality: 0.98 },
			html2canvas: { scale: 2 },
			jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
		};

		html2pdf().from(pdfContent).set(opt).save();
	});
});
