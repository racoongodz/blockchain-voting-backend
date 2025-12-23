import { getVotingResults } from "../blockchain.js";

document.addEventListener("DOMContentLoaded", async () => {
	const resultsContainer = document.getElementById("results-content");

	if (!resultsContainer) {
		console.error("Error: Element with id 'results-content' not found.");
		return;
	}

	const urlParams = new URLSearchParams(window.location.search);
	const ballotId = urlParams.get("ballotId");

	if (!ballotId) {
		resultsContainer.innerHTML = "<p>Error: No ballot ID provided.</p>";
		return;
	}

	const results = await getVotingResults(ballotId);

	if (!results || results.positions.length === 0) {
		resultsContainer.innerHTML = "<p>No results found for this ballot.</p>";
		return;
	}

	// Display Ballot ID as title
	const ballotTitle = `Ballot ID: ${ballotId}`;
	let resultsHTML = `<h4>${ballotTitle}</h4>`;

	results.positions.forEach((position, index) => {
		// Convert vote counts to BigInt safely
		const voteCounts = results.voteCounts[index].map((v) => BigInt(v));
		const maxVotes = voteCounts.reduce((a, b) => (a > b ? a : b), 0n);

		resultsHTML += `<h5 class="mt-3">${position}</h5><ul class="list-group">`;

		results.candidates[index].forEach((candidate, cIndex) => {
			const candidateVotes = voteCounts[cIndex];
			const isWinner = candidateVotes === maxVotes; // all with maxVotes are winners

			resultsHTML += `<li class="list-group-item d-flex justify-content-between ${
				isWinner ? "list-group-item-success fw-bold" : ""
			}">
				${candidate} ${isWinner ? '<span class="badge bg-success">WINNER</span>' : ""}
				<span class="badge bg-primary">${candidateVotes} votes</span>
			</li>`;
		});

		resultsHTML += "</ul><br>";
	});

	resultsContainer.innerHTML = resultsHTML;
});
