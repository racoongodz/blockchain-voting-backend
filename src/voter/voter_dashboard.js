import { getBallotDetails, voteMultiple } from "../blockchain.js";

document.addEventListener("DOMContentLoaded", async () => {
	const ballotId = localStorage.getItem("ballotId");
	if (!ballotId) {
		alert("No ballot selected.");
		window.location.href = "voter_login.html";
		return;
	}

	try {
		// ✅ Fetch ballot details
		const ballotDetails = await getBallotDetails(ballotId);
		if (!ballotDetails) throw new Error("Failed to load ballot details.");

		// ✅ Update ballot UI
		document.getElementById("ballot-title").innerText = ballotDetails.title;
		document.getElementById("ballot-id").innerText = ballotDetails.ballotId;
		const ballotDetailsElem = document.getElementById("ballot-details");
		const submitVoteBtn = document.getElementById("submit-vote");

		ballotDetailsElem.innerHTML = ""; // Clear any previous content
		let selectedVotes = {}; // { positionIndex: candidateIndex }

		// ✅ Populate ballot positions and candidates
		ballotDetails.positions.forEach((position, positionIndex) => {
			const positionDiv = document.createElement("div");
			positionDiv.classList.add("position", "mt-3", "text-center");

			// Add position title
			const positionTitle = document.createElement("h4");
			positionTitle.innerText = position.name;
			positionDiv.appendChild(positionTitle);

			if (!position.candidates || position.candidates.length === 0) {
				const noCandidates = document.createElement("p");
				noCandidates.innerText = "No candidates available for this position.";
				positionDiv.appendChild(noCandidates);
			} else {
				// Create candidate radio buttons
				const candidateList = document.createElement("div");
				candidateList.classList.add(
					"d-flex",
					"flex-column",
					"align-items-center"
				);

				position.candidates.forEach((candidate, candidateIndex) => {
					const candidateDiv = document.createElement("div");
					candidateDiv.classList.add(
						"form-check",
						"d-flex",
						"align-items-center",
						"justify-content-center",
						"mb-2"
					);

					const candidateInput = document.createElement("input");
					candidateInput.type = "radio";
					candidateInput.name = `position-${positionIndex}`;
					candidateInput.value = candidateIndex;
					candidateInput.classList.add("form-check-input", "me-2");

					const candidateLabel = document.createElement("label");
					candidateLabel.classList.add(
						"form-check-label",
						"fw-bold",
						"text-dark"
					);
					candidateLabel.innerText = candidate;

					// Store selected votes
					candidateInput.addEventListener("change", () => {
						selectedVotes[positionIndex] = candidateIndex;
						checkAllPositionsSelected();
					});

					candidateDiv.appendChild(candidateInput);
					candidateDiv.appendChild(candidateLabel);
					candidateList.appendChild(candidateDiv);
				});

				positionDiv.appendChild(candidateList);
			}

			ballotDetailsElem.appendChild(positionDiv);
		});

		// ✅ Disable submit button initially
		submitVoteBtn.disabled = true;
		submitVoteBtn.classList.remove("hidden");

		// ✅ Check if all positions have been selected
		function checkAllPositionsSelected() {
			submitVoteBtn.disabled =
				Object.keys(selectedVotes).length !== ballotDetails.positions.length;
		}

		// ✅ Handle vote submission
		submitVoteBtn.addEventListener("click", async () => {
			const positionIndexes = Object.keys(selectedVotes).map(Number);
			const candidateIndexes = Object.values(selectedVotes);

			try {
				await voteMultiple(ballotId, positionIndexes, candidateIndexes);
				alert("Voting completed successfully!");
				window.location.href = "thank_you.html"; // Redirect after voting
			} catch (error) {
				console.error("Error submitting vote:", error);
				alert(
					"An error occurred while submitting your vote. Please try again."
				);
			}
		});
	} catch (error) {
		console.error("Error loading ballot:", error);
		alert("Error loading ballot. Check the console for details.");
	}
});
