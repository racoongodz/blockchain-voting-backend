require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");
const { Pool } = require("pg"); // Use Postgres client for Supabase DB

const app = express();
app.use(express.json());
app.use(cors());

// Initialize Supabase
const supabase = createClient(
	process.env.SUPABASE_URL,
	process.env.SUPABASE_KEY
);

// Postgres connection (Supabase)
const db = new Pool({
	connectionString: process.env.DATABASE_URL,
	ssl: { rejectUnauthorized: false },
});

// Multer setup for in-memory storage
const upload = multer({ storage: multer.memoryStorage() });

// ======================
// Voter Registration
// ======================
app.post("/register-voter", upload.single("id_photo"), async (req, res) => {
	try {
		const { ballot_id, full_name, email, metamask_address } = req.body;
		const file = req.file;

		// Validate input
		if (!ballot_id || !full_name || !email || !metamask_address || !file) {
			return res.status(400).json({ error: "All fields are required." });
		}

		// Upload photo to Supabase Storage
		const filePath = `voter-photos/${Date.now()}-${file.originalname}`;
		const { data, error: uploadError } = await supabase.storage
			.from("voter-photos")
			.upload(filePath, file.buffer, { contentType: file.mimetype });

		if (uploadError) {
			console.error("Supabase upload error:", uploadError);
			return res.status(500).json({ error: "Failed to upload photo." });
		}

		// Get public URL of uploaded photo
		const { data: publicUrlData } = supabase.storage
			.from("voter-photos")
			.getPublicUrl(filePath);

		if (!publicUrlData || !publicUrlData.publicUrl) {
			return res.status(500).json({ error: "Failed to get public URL." });
		}

		const id_photo_url = publicUrlData.publicUrl;

		// Insert voter into pending_voters table
		const sql = `
      INSERT INTO pending_voters (ballot_id, full_name, email, metamask_address, id_photo)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
		const { rows } = await db.query(sql, [
			ballot_id,
			full_name,
			email,
			metamask_address,
			id_photo_url,
		]);

		res.json({
			success: true,
			message: "Voter registered successfully",
			voter: rows[0],
		});
	} catch (err) {
		console.error("Error in /register-voter:", err);
		res.status(500).json({ error: "Internal server error" });
	}
});

// ======================
// Fetch Pending Voters
// ======================
app.post("/pending-voters", async (req, res) => {
	const { ballot_ids } = req.body;
	if (!Array.isArray(ballot_ids) || ballot_ids.length === 0)
		return res.status(400).json({ error: "Ballot IDs are required." });

	const placeholders = ballot_ids.map((_, i) => `$${i + 1}`).join(",");
	const sql = `SELECT * FROM pending_voters WHERE ballot_id IN (${placeholders})`;
	try {
		const { rows } = await db.query(sql, ballot_ids);
		res.json(rows);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Failed to fetch pending voters." });
	}
});

// ======================
// Approve Voter
// ======================
app.post("/approve-voter", async (req, res) => {
	const { voter_id } = req.body;
	if (!voter_id)
		return res.status(400).json({ error: "Voter ID is required." });

	try {
		// Fetch voter from pending
		const { rows } = await db.query(
			"SELECT * FROM pending_voters WHERE id=$1",
			[voter_id]
		);
		if (rows.length === 0)
			return res.status(404).json({ error: "Voter not found." });

		const voter = rows[0];

		// Generate password
		const voter_password = Math.random().toString(36).slice(-8);

		// Check duplicates
		const dupCheck = await db.query(
			"SELECT * FROM approved_voters WHERE full_name=$1 OR metamask_address=$2",
			[voter.full_name, voter.metamask_address]
		);
		if (dupCheck.rows.length > 0)
			return res.status(400).json({ error: "Voter already approved." });

		// Insert into approved_voters
		await db.query(
			`INSERT INTO approved_voters 
      (ballot_id, full_name, email, metamask_address, id_photo, voter_password)
      VALUES ($1,$2,$3,$4,$5,$6)`,
			[
				voter.ballot_id,
				voter.full_name,
				voter.email,
				voter.metamask_address,
				voter.id_photo,
				voter_password,
			]
		);

		// Delete from pending
		await db.query("DELETE FROM pending_voters WHERE id=$1", [voter_id]);

		res.json({ success: true, message: "Voter approved successfully!" });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Error approving voter." });
	}
});

// ======================
// Reject Voter
// ======================
app.post("/reject-voter", async (req, res) => {
	const { voter_id } = req.body;
	if (!voter_id)
		return res.status(400).json({ error: "Voter ID is required." });
	try {
		await db.query("DELETE FROM pending_voters WHERE id=$1", [voter_id]);
		res.json({ success: true, message: "Voter rejected successfully" });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Failed to reject voter." });
	}
});

// ======================
// Fetch Approved Voters (Grouped by Ballot ID)
// ======================
app.post("/approved-voters", async (req, res) => {
	try {
		const { ballot_ids } = req.body;

		if (!Array.isArray(ballot_ids) || ballot_ids.length === 0) {
			return res.status(400).json({ error: "Ballot IDs are required." });
		}

		// Create placeholders for SQL query
		const placeholders = ballot_ids.map((_, i) => `$${i + 1}`).join(",");
		const sql = `
      SELECT id, ballot_id, full_name, email, metamask_address, voter_password
      FROM approved_voters
      WHERE ballot_id IN (${placeholders})
      ORDER BY ballot_id, id
    `;

		const { rows } = await db.query(sql, ballot_ids);

		// Group voters by ballot_id
		const groupedVoters = {};
		ballot_ids.forEach((id) => (groupedVoters[id] = [])); // initialize empty arrays

		rows.forEach((voter) => {
			if (!groupedVoters[voter.ballot_id]) groupedVoters[voter.ballot_id] = [];
			groupedVoters[voter.ballot_id].push(voter);
		});

		res.json(groupedVoters);
	} catch (err) {
		console.error("Error fetching approved voters:", err);
		res.status(500).json({ error: "Failed to fetch approved voters." });
	}
});

// ======================
// Search Approved Voters
// ======================
app.get("/search-approved-voters", async (req, res) => {
	const { query } = req.query;
	if (!query) return res.status(400).json({ error: "Query is required." });

	const sql = `SELECT * FROM approved_voters WHERE full_name ILIKE $1 OR metamask_address ILIKE $2`;
	const param = `%${query}%`;
	try {
		const { rows } = await db.query(sql, [param, param]);
		res.json(rows);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Search failed." });
	}
});

// ======================
// Manually Add Approved Voter
// ======================
app.post("/addApprovedVoter", async (req, res) => {
	const { full_name, email, metamask_address, ballot_id } = req.body;
	if (!full_name || !email || !metamask_address || !ballot_id)
		return res.status(400).json({ error: "All fields are required." });

	try {
		const dupCheck = await db.query(
			"SELECT * FROM approved_voters WHERE ballot_id=$1 AND (full_name=$2 OR metamask_address=$3)",
			[ballot_id, full_name, metamask_address]
		);
		if (dupCheck.rows.length > 0)
			return res.status(400).json({ error: "Voter already exists." });

		const voter_password = Math.random().toString(36).slice(-8);

		await db.query(
			`INSERT INTO approved_voters (ballot_id, full_name, email, metamask_address, voter_password)
       VALUES ($1,$2,$3,$4,$5)`,
			[ballot_id, full_name, email, metamask_address, voter_password]
		);

		res.json({ success: true, message: "Voter manually added successfully!" });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Failed to add voter." });
	}
});

// ======================
// Fetch Approved Voters for Blockchain
// ======================
app.get("/api/getApprovedVoters", async (req, res) => {
	try {
		const { rows } = await db.query(
			"SELECT metamask_address, voter_password, ballot_id FROM approved_voters"
		);
		res.json(rows);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Failed to fetch approved voters." });
	}
});

// ======================
// Test Endpoint
// ======================
app.get("/ping", (req, res) => {
	res.json({ success: true, message: "Server is alive!" });
});

// ======================
// Start Server
// ======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
