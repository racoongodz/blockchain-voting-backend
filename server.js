require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(express.json());
app.use(cors());

// ------------------- Supabase Client -------------------
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ------------------- Multer Setup -------------------
const storage = multer.diskStorage({
	destination: "./temp/", // temp folder
	filename: (req, file, cb) => {
		cb(null, Date.now() + "-" + file.originalname);
	},
});
const upload = multer({ storage });

// ------------------- Helper: Generate Password -------------------
function generatePassword() {
	const chars =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let password = "";
	for (let i = 0; i < 8; i++) {
		password += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return password;
}

// ------------------- Helper: Delete file from Supabase Storage -------------------
async function deleteFileFromStorage(fileUrl) {
	if (!fileUrl) return;
	try {
		const bucket = "voter-photos";
		const filePath = fileUrl.split(`${bucket}/`)[1]; // extract path after bucket
		if (!filePath) return;
		const { error } = await supabase.storage.from(bucket).remove([filePath]);
		if (error) console.error("❌ Error deleting file from storage:", error);
	} catch (err) {
		console.error("❌ Unexpected storage delete error:", err);
	}
}

// ------------------- Register Voter -------------------
app.post("/register-voter", upload.single("id_photo"), async (req, res) => {
	try {
		const { ballot_id, full_name, email, metamask_address } = req.body;
		if (!req.file)
			return res.status(400).json({ error: "ID photo is required." });

		const filePath = path.join(__dirname, "temp", req.file.filename);
		const fileStream = fs.createReadStream(filePath);

		const { data, error: uploadError } = await supabase.storage
			.from("voter-photos")
			.upload(req.file.filename, fileStream, {
				cacheControl: "3600",
				upsert: false,
			});

		fs.unlinkSync(filePath);

		if (uploadError) {
			console.error("❌ Storage upload error:", uploadError);
			return res.status(500).json({ error: "Failed to upload ID photo" });
		}

		const { publicURL } = supabase.storage
			.from("voter-photos")
			.getPublicUrl(req.file.filename);

		const { error } = await supabase
			.from("pending_voters")
			.insert([
				{ ballot_id, full_name, email, metamask_address, id_photo: publicURL },
			]);

		if (error) throw error;

		res.json({ success: true, message: "Voter registered successfully!" });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

// ------------------- Fetch Pending Voters -------------------
app.post("/pending-voters", async (req, res) => {
	try {
		const { ballot_ids } = req.body;
		if (!Array.isArray(ballot_ids) || ballot_ids.length === 0)
			return res.status(400).json({ error: "Ballot IDs required." });

		const { data, error } = await supabase
			.from("pending_voters")
			.select("*")
			.in("ballot_id", ballot_ids);

		if (error) throw error;
		res.json(data || []);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

// ------------------- Approve Voter -------------------
app.post("/approve-voter", async (req, res) => {
	try {
		const { voter_id } = req.body;
		if (!voter_id) return res.status(400).json({ error: "Voter ID required" });

		const { data: pendingVoter, error: fetchError } = await supabase
			.from("pending_voters")
			.select("*")
			.eq("id", voter_id)
			.single();

		if (fetchError || !pendingVoter)
			return res.status(404).json({ error: "Pending voter not found" });

		const { ballot_id, full_name, metamask_address, email, id_photo } =
			pendingVoter;

		const { data: existing, error: checkError } = await supabase
			.from("approved_voters")
			.select("*")
			.or(`full_name.eq.${full_name},metamask_address.eq.${metamask_address}`);

		if (checkError) throw checkError;
		if (existing.length > 0)
			return res.status(400).json({ error: "❌ Voter already exists." });

		const voter_password = generatePassword();
		const { error: insertError } = await supabase
			.from("approved_voters")
			.insert([
				{
					ballot_id,
					full_name,
					email,
					metamask_address,
					id_photo,
					voter_password,
				},
			]);

		if (insertError) throw insertError;

		const { error: deleteError } = await supabase
			.from("pending_voters")
			.delete()
			.eq("id", voter_id);

		if (deleteError) throw deleteError;

		res.json({ success: true, message: "✅ Voter approved successfully!" });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

// ------------------- Reject Voter -------------------
app.post("/reject-voter", async (req, res) => {
	try {
		const { voter_id } = req.body;
		if (!voter_id) return res.status(400).json({ error: "Voter ID required" });

		const { data: pendingVoter, error: fetchError } = await supabase
			.from("pending_voters")
			.select("id_photo")
			.eq("id", voter_id)
			.single();

		if (fetchError || !pendingVoter)
			return res.status(404).json({ error: "Pending voter not found" });

		await deleteFileFromStorage(pendingVoter.id_photo);

		const { error } = await supabase
			.from("pending_voters")
			.delete()
			.eq("id", voter_id);
		if (error) throw error;

		res.json({ success: true, message: "Voter rejected successfully" });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

// ------------------- Fetch Approved Voters -------------------
app.post("/approved-voters", async (req, res) => {
	try {
		const { ballot_ids } = req.body;
		if (!Array.isArray(ballot_ids) || ballot_ids.length === 0)
			return res.status(400).json({ error: "Ballot IDs required." });

		const { data: voters, error } = await supabase
			.from("approved_voters")
			.select("*")
			.in("ballot_id", ballot_ids);

		if (error) throw error;

		const groupedVoters = {};
		ballot_ids.forEach((id) => (groupedVoters[id] = []));
		voters.forEach((voter) => groupedVoters[voter.ballot_id].push(voter));

		res.json(groupedVoters);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

// ------------------- Search Approved Voters -------------------
app.get("/search-approved-voters", async (req, res) => {
	try {
		const { query } = req.query;
		if (!query)
			return res.status(400).json({ error: "Search query required." });

		const { data, error } = await supabase
			.from("approved_voters")
			.select("*")
			.ilike("full_name", `%${query}%`)
			.or(`metamask_address.ilike.%${query}%`);

		if (error) throw error;
		res.json(data);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

// ------------------- Delete Approved Voter -------------------
app.delete("/delete-voter/:id", async (req, res) => {
	try {
		const voterId = req.params.id;

		const { data: voter, error: fetchError } = await supabase
			.from("approved_voters")
			.select("id_photo")
			.eq("id", voterId)
			.single();

		if (fetchError || !voter)
			return res.status(404).json({ error: "Voter not found" });

		await deleteFileFromStorage(voter.id_photo);

		const { error } = await supabase
			.from("approved_voters")
			.delete()
			.eq("id", voterId);
		if (error) throw error;

		res.json({ message: "Voter deleted successfully" });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Failed to delete voter" });
	}
});

// ------------------- Manually Add Approved Voter -------------------
app.post("/addApprovedVoter", async (req, res) => {
	try {
		const { full_name, email, metamask_address, ballot_id, id_photo_url } =
			req.body;
		if (!full_name || !email || !metamask_address || !ballot_id)
			return res.status(400).json({ error: "All fields are required." });

		const { data: existing, error: checkError } = await supabase
			.from("approved_voters")
			.select("*")
			.eq("ballot_id", ballot_id)
			.or(`full_name.eq.${full_name},metamask_address.eq.${metamask_address}`);

		if (checkError) throw checkError;
		if (existing.length > 0)
			return res.status(400).json({ error: "❌ Voter already registered." });

		const voter_password = generatePassword();
		const { error: insertError } = await supabase
			.from("approved_voters")
			.insert([
				{
					ballot_id,
					full_name,
					email,
					metamask_address,
					id_photo: id_photo_url || null,
					voter_password,
				},
			]);

		if (insertError) throw insertError;

		res.json({
			success: true,
			message: "✅ Voter manually added successfully!",
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

// ------------------- Get Approved Voters for Blockchain -------------------
app.get("/api/getApprovedVoters", async (req, res) => {
	try {
		const { data, error } = await supabase
			.from("approved_voters")
			.select("metamask_address,voter_password,ballot_id");

		if (error) throw error;
		res.json(data);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

// ------------------- Start Server -------------------
const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
