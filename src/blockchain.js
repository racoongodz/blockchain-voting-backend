const web3 = new Web3(window.ethereum);

// Smart contract ABI (Replace with your actual ABI after deployment)
const contractABI = [
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: "string",
				name: "username",
				type: "string",
			},
			{
				indexed: false,
				internalType: "address",
				name: "adminAddress",
				type: "address",
			},
		],
		name: "AdminRegistered",
		type: "event",
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: "string",
				name: "ballotId",
				type: "string",
			},
			{
				indexed: false,
				internalType: "string",
				name: "title",
				type: "string",
			},
			{
				indexed: true,
				internalType: "address",
				name: "admin",
				type: "address",
			},
		],
		name: "BallotCreated",
		type: "event",
	},
	{
		inputs: [
			{
				internalType: "string",
				name: "_ballotId",
				type: "string",
			},
			{
				internalType: "string",
				name: "_title",
				type: "string",
			},
			{
				internalType: "string[]",
				name: "_positionNames",
				type: "string[]",
			},
			{
				internalType: "string[][]",
				name: "_candidateNames",
				type: "string[][]",
			},
		],
		name: "createBallot",
		outputs: [],
		stateMutability: "nonpayable",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "string",
				name: "_ballotId",
				type: "string",
			},
		],
		name: "endVoting",
		outputs: [],
		stateMutability: "nonpayable",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "string",
				name: "_username",
				type: "string",
			},
			{
				internalType: "string",
				name: "_password",
				type: "string",
			},
		],
		name: "registerAdmin",
		outputs: [],
		stateMutability: "nonpayable",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "address[]",
				name: "_voterAddresses",
				type: "address[]",
			},
			{
				internalType: "string",
				name: "_ballotId",
				type: "string",
			},
			{
				internalType: "bytes32[]",
				name: "_hashedPasswords",
				type: "bytes32[]",
			},
		],
		name: "registerMultipleVoters",
		outputs: [],
		stateMutability: "nonpayable",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "_voter",
				type: "address",
			},
			{
				internalType: "string",
				name: "_ballotId",
				type: "string",
			},
			{
				internalType: "bytes32",
				name: "_hashedPassword",
				type: "bytes32",
			},
		],
		name: "registerVoter",
		outputs: [],
		stateMutability: "nonpayable",
		type: "function",
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: "address",
				name: "voter",
				type: "address",
			},
			{
				indexed: false,
				internalType: "string",
				name: "ballotId",
				type: "string",
			},
			{
				indexed: false,
				internalType: "uint256",
				name: "positionIndex",
				type: "uint256",
			},
			{
				indexed: false,
				internalType: "uint256",
				name: "candidateIndex",
				type: "uint256",
			},
		],
		name: "VoteCasted",
		type: "event",
	},
	{
		inputs: [
			{
				internalType: "string",
				name: "_ballotId",
				type: "string",
			},
			{
				internalType: "uint256[]",
				name: "_positionIndexes",
				type: "uint256[]",
			},
			{
				internalType: "uint256[]",
				name: "_candidateIndexes",
				type: "uint256[]",
			},
		],
		name: "voteMultiple",
		outputs: [],
		stateMutability: "nonpayable",
		type: "function",
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: "address",
				name: "voter",
				type: "address",
			},
			{
				indexed: false,
				internalType: "string",
				name: "ballotId",
				type: "string",
			},
		],
		name: "VoterRegistered",
		type: "event",
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: "string",
				name: "ballotId",
				type: "string",
			},
			{
				indexed: false,
				internalType: "address",
				name: "admin",
				type: "address",
			},
		],
		name: "VotingEnded",
		type: "event",
	},
	{
		inputs: [
			{
				internalType: "string",
				name: "_username",
				type: "string",
			},
			{
				internalType: "string",
				name: "_password",
				type: "string",
			},
		],
		name: "adminLogin",
		outputs: [
			{
				internalType: "bool",
				name: "",
				type: "bool",
			},
			{
				internalType: "string[]",
				name: "",
				type: "string[]",
			},
			{
				internalType: "string[]",
				name: "",
				type: "string[]",
			},
		],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "string",
				name: "_ballotId",
				type: "string",
			},
			{
				internalType: "string",
				name: "_password",
				type: "string",
			},
		],
		name: "authenticateVoter",
		outputs: [
			{
				internalType: "bool",
				name: "isAuthenticated",
				type: "bool",
			},
			{
				internalType: "bool",
				name: "hasVoted",
				type: "bool",
			},
			{
				internalType: "string",
				name: "ballotId",
				type: "string",
			},
		],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "string",
				name: "",
				type: "string",
			},
		],
		name: "ballots",
		outputs: [
			{
				internalType: "string",
				name: "id",
				type: "string",
			},
			{
				internalType: "string",
				name: "title",
				type: "string",
			},
			{
				internalType: "address",
				name: "adminAddress",
				type: "address",
			},
			{
				internalType: "bool",
				name: "isClosed",
				type: "bool",
			},
		],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "string",
				name: "_ballotId",
				type: "string",
			},
		],
		name: "getBallotDetails",
		outputs: [
			{
				internalType: "string",
				name: "",
				type: "string",
			},
			{
				internalType: "string",
				name: "",
				type: "string",
			},
			{
				internalType: "string[]",
				name: "",
				type: "string[]",
			},
			{
				internalType: "string[][]",
				name: "",
				type: "string[][]",
			},
		],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [],
		name: "getMyBallots",
		outputs: [
			{
				internalType: "string[]",
				name: "",
				type: "string[]",
			},
			{
				internalType: "string[]",
				name: "",
				type: "string[]",
			},
		],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "string",
				name: "_ballotId",
				type: "string",
			},
		],
		name: "getResults",
		outputs: [
			{
				internalType: "string[]",
				name: "",
				type: "string[]",
			},
			{
				internalType: "string[][]",
				name: "",
				type: "string[][]",
			},
			{
				internalType: "uint256[][]",
				name: "",
				type: "uint256[][]",
			},
		],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "string",
				name: "_ballotId",
				type: "string",
			},
		],
		name: "getVotersForBallot",
		outputs: [
			{
				internalType: "address[]",
				name: "",
				type: "address[]",
			},
		],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "",
				type: "address",
			},
		],
		name: "isAdminRegistered",
		outputs: [
			{
				internalType: "bool",
				name: "",
				type: "bool",
			},
		],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "string",
				name: "_ballotId",
				type: "string",
			},
		],
		name: "isBallotClosed",
		outputs: [
			{
				internalType: "bool",
				name: "",
				type: "bool",
			},
		],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "string",
				name: "",
				type: "string",
			},
			{
				internalType: "address",
				name: "",
				type: "address",
			},
		],
		name: "registeredVoters",
		outputs: [
			{
				internalType: "bytes32",
				name: "hashedPassword",
				type: "bytes32",
			},
			{
				internalType: "string",
				name: "ballotId",
				type: "string",
			},
			{
				internalType: "bool",
				name: "isRegistered",
				type: "bool",
			},
			{
				internalType: "bool",
				name: "hasVoted",
				type: "bool",
			},
		],
		stateMutability: "view",
		type: "function",
	},
];

// Smart contract address (Update after deployment)
const contractAddress = "0x6Ee79B223f2645f6514362269f8f67715a7b0a9c";

// Initialize contract
const contract = new web3.eth.Contract(contractABI, contractAddress);

/**
 * Connect to MetaMask
 */
export async function connectWallet() {
	if (window.ethereum) {
		try {
			const accounts = await window.ethereum.request({
				method: "eth_requestAccounts",
			});
			return accounts[0]; // Return connected wallet address
		} catch (error) {
			console.error("User denied account access");
			return null;
		}
	} else {
		alert("Please install MetaMask!");
		return null;
	}
}

/**
 * Register an Admin
 */
export async function registerAdmin(username, password) {
	const account = await connectWallet();
	if (!account) {
		alert("MetaMask connection required.");
		return;
	}

	if (!username || !password) {
		alert("Please enter both username and password.");
		return;
	}

	try {
		console.log("Registering admin with address:", account);

		const tx = await contract.methods
			.registerAdmin(username, password)
			.send({ from: account, gas: 3000000 });

		console.log("Transaction successful:", tx);
		alert("Admin registered successfully!");
	} catch (error) {
		console.error("Error registering admin:", error);
		alert("Admin registration failed. Check console for details.");
	}
}

// //Ballot details
// export async function getBallotDetails(ballotId) {
// 	const account = await connectWallet();
// 	if (!account) {
// 		alert("MetaMask connection required.");
// 		return;
// 	}

// 	if (!ballotId) {
// 		alert("Invalid Ballot ID.");
// 		return;
// 	}

// 	try {
// 		console.log("Fetching ballot details for ID:", ballotId);

// 		const result = await contract.methods.getBallotDetails(ballotId).call();

// 		const ballotDetails = {
// 			ballotId: result[0],
// 			title: result[1],
// 			positions: result[2], // Array of position names
// 			candidates: result[3], // 2D array of candidates per position
// 		};

// 		console.log("Ballot details fetched:", ballotDetails);
// 		return ballotDetails;
// 	} catch (error) {
// 		console.error("Error fetching ballot details:", error);
// 		alert("Failed to retrieve ballot details. Check console for details.");
// 		return null;
// 	}
// }

/**
 * Admin Login
 */
export async function loginAdmin(username, password) {
	try {
		const accounts = await ethereum.request({ method: "eth_requestAccounts" });
		const userAddress = accounts[0]; // Get the currently selected MetaMask address

		// Call the smart contract function
		const result = await contract.methods
			.adminLogin(username, password)
			.call({ from: userAddress });

		return result; // Returns (success, ballotIds, ballotTitles)
	} catch (error) {
		console.error("Login failed:", error);
		return null;
	}
}

/**
 * Create a Ballot
 */
export async function createBallot(ballotId, title, positions, candidates) {
	const account = await connectWallet();
	if (!account) return;

	try {
		await contract.methods
			.createBallot(ballotId, title, positions, candidates)
			.send({ from: account });
		alert("Ballot created successfully!");
	} catch (error) {
		console.error("Error creating ballot:", error);
	}
}

/**
 * Register a Voter
 */
export async function registerVoter(voterAddress, ballotId, hashedPassword) {
	const account = await connectWallet();
	if (!account) return;

	try {
		await contract.methods
			.registerVoter(voterAddress, ballotId, hashedPassword)
			.send({ from: account });
		alert("Voter registered successfully!");
	} catch (error) {
		console.error("Error registering voter:", error);
	}
}

/**
 * Authenticate Voter
 */
export async function authenticateVoter(ballotId, password) {
	try {
		const voterAddress = window.ethereum.selectedAddress; // Get the voter's MetaMask address
		const result = await contract.methods
			.authenticateVoter(ballotId, password)
			.call({ from: voterAddress });

		return {
			isAuthenticated: result[0],
			hasVoted: result[1],
			ballotId: result[2], // ✅ Return ballot ID for frontend handling
		};
	} catch (error) {
		console.error("Authentication error:", error);
		return { isAuthenticated: false, hasVoted: false, ballotId: null };
	}
}

/**
 * Cast multiple votes in one transaction
 */
export async function voteMultiple(
	ballotId,
	positionIndexes,
	candidateIndexes
) {
	const account = await connectWallet();
	if (!account) return;

	try {
		await contract.methods
			.voteMultiple(ballotId, positionIndexes, candidateIndexes)
			.send({ from: account });

		alert("All votes cast successfully!");
	} catch (error) {
		console.error("Error casting votes:", error);
		alert("Voting failed. Check console for details.");
	}
}

//Balots by admin
export async function getMyBallots() {
	try {
		const accounts = await web3.eth.getAccounts();
		const sender = accounts[0];

		const result = await contract.methods.getMyBallots().call({ from: sender });

		if (!result[0] || result[0].length === 0) {
			return { ballotIds: [], ballotTitles: [] }; // ✅ No ballots found
		}

		return {
			ballotIds: result[0],
			ballotTitles: result[1],
		};
	} catch (error) {
		console.error("Error fetching ballots:", error);
		return { ballotIds: [], ballotTitles: [] };
	}
}

//for report
export async function getBallotDetails(ballotId) {
	try {
		const result = await contract.methods.getBallotDetails(ballotId).call();

		return {
			ballotId: result[0],
			title: result[1],
			positions: result[2].map((position, index) => ({
				name: position,
				candidates: result[3][index], // Array of candidate names
			})),
		};
	} catch (error) {
		console.error("Error fetching ballot details:", error);
		return null;
	}
}

export async function registerMultipleVoters(
	voterAddresses,
	ballotId,
	hashedPasswords
) {
	try {
		const account = await connectWallet();
		if (!account) {
			console.error("❌ No wallet connected.");
			alert("Please connect your wallet first.");
			return null;
		}

		// Pre-checks
		if (!Array.isArray(voterAddresses) || voterAddresses.length === 0) {
			console.error(
				"❌ voterAddresses array is empty or invalid:",
				voterAddresses
			);
			alert("No voters selected to register.");
			return null;
		}

		if (
			!Array.isArray(hashedPasswords) ||
			hashedPasswords.length !== voterAddresses.length
		) {
			console.error(
				"❌ hashedPasswords array is invalid or does not match voterAddresses length:",
				hashedPasswords
			);
			alert("Password array is invalid or does not match voter list.");
			return null;
		}

		if (!ballotId) {
			console.error("❌ ballotId is missing or invalid:", ballotId);
			alert("Ballot ID is invalid.");
			return null;
		}

		console.log("➡ Attempting to register voters:");
		console.log("Account:", account);
		console.log("Ballot ID:", ballotId);
		console.log("Voter addresses:", voterAddresses);
		console.log("Hashed passwords:", hashedPasswords);

		// Send transaction
		const receipt = await contract.methods
			.registerMultipleVoters(voterAddresses, ballotId, hashedPasswords)
			.send({ from: account });

		console.log("✅ Transaction receipt:", receipt);
		return receipt; // Return the receipt so the caller can check receipt.status
	} catch (error) {
		console.error("❌ Error registering voters:", error);
		if (error?.message) {
			alert("Transaction failed: " + error.message);
		} else {
			alert("Transaction failed. Check console for details.");
		}
		return null; // Return null on failure
	}
}

export async function getVotersForBallot(ballotId) {
	const account = await connectWallet();
	if (!account) return [];

	try {
		const voters = await contract.methods
			.getVotersForBallot(ballotId)
			.call({ from: account });

		return voters;
	} catch (error) {
		console.error("❌ Error fetching registered voters:", error);
		return [];
	}
}

// Get voting results for a ballot
export async function getVotingResults(ballotId) {
	try {
		const accounts = await web3.eth.getAccounts();
		const sender = accounts[0];

		const result = await contract.methods
			.getResults(ballotId)
			.call({ from: sender });

		if (!result || result.length === 0) {
			return { positions: [], candidates: [], voteCounts: [] }; // ✅ No results found
		}

		return {
			positions: result[0], // Position names
			candidates: result[1], // Candidate names per position
			voteCounts: result[2], // Vote counts per candidate
		};
	} catch (error) {
		console.error("Error fetching voting results:", error);
		return { positions: [], candidates: [], voteCounts: [] };
	}
}

export async function endVoting(ballotId) {
	const account = await connectWallet();
	if (!account) return false;

	try {
		await contract.methods.endVoting(ballotId).send({ from: account });

		console.log(`✅ Voting ended for ballot ID: ${ballotId}`);
		return true;
	} catch (error) {
		console.error("❌ Error ending voting:", error);
		return false;
	}
}

export async function isBallotClosed(ballotId) {
	const account = await connectWallet();
	if (!account) return null;

	try {
		const isClosed = await contract.methods
			.isBallotClosed(ballotId)
			.call({ from: account });
		return isClosed;
	} catch (error) {
		console.error("❌ Error checking ballot status:", error);
		return null;
	}
}
