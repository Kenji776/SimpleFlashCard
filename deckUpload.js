/**
 * Read, validate, and upload a deck selected in the UI.
 * - File:    #upload-deck-file
 * - Name:    #upload-deck-name
 * - Category:#upload-existing-category
 *
 * @param {Object} opts
 * @param {Object} opts.uploader - Object exposing uploader.uploadDeck({...})
 * @param {boolean} [opts.overwrite=false]
 * @param {string}  [opts.token] - Optional shared secret for x-upload-token header
 * @returns {Promise<any>} The result of uploader.uploadDeck(...)
 */
async function uploadDeckFromInputs({
	uploader,
	overwrite = false,
	token,
} = {}) {
	if (!uploader || typeof uploader.uploadDeck !== "function") {
		throw new Error(
			"uploadDeckFromInputs: 'uploader' with uploadDeck(...) is required."
		);
	}

	const fileInput = document.getElementById("upload-deck-file");
	const nameInput = document.getElementById("upload-deck-name");
	const categorySel = document.getElementById("upload-existing-category");

	if (!fileInput) throw new Error("#upload-deck-file not found.");
	if (!nameInput) throw new Error("#upload-deck-name not found.");
	if (!categorySel) throw new Error("#upload-existing-category not found.");

	const file = fileInput.files && fileInput.files[0];
	if (!file) throw new Error("Please choose a file to upload.");

	// Validate size (< 1 MiB)
	const ONE_MIB = 1024 * 1024;
	if (file.size >= ONE_MIB) {
		throw new Error("File must be smaller than 1 MB.");
	}

	// Basic MIME / extension sanity (browsers sometimes omit type, so allow .json/.cards)
	const lowerName = (file.name || "").toLowerCase();
	const mime = (file.type || "").toLowerCase();
	const looksJson =
		mime.includes("application/json") ||
		mime.includes("text/plain") ||
		lowerName.endsWith(".json") ||
		lowerName.endsWith(".cards");

	if (!looksJson) {
		throw new Error(
			"Please select a plain-text JSON (.json or .cards) file."
		);
	}

	// Read text and ensure it's plain text (no NULs)
	const text = await file.text();
	if (/\u0000/.test(text)) {
		throw new Error("File appears binary; expected plain-text JSON.");
	}

	// Parse & validate structure
	let parsed;
	try {
		parsed = JSON.parse(text);
	} catch {
		throw new Error("File is not valid JSON.");
	}

	if (!parsed || typeof parsed !== "object") {
		throw new Error("JSON root must be an object.");
	}
	if (!Object.prototype.hasOwnProperty.call(parsed, "config")) {
		throw new Error('JSON must contain a top-level "config" property.');
	}
	if (!Object.prototype.hasOwnProperty.call(parsed, "cards")) {
		throw new Error('JSON must contain a top-level "cards" property.');
	}
	if (!Array.isArray(parsed.cards)) {
		throw new Error('"cards" must be an array.');
	}

	// Collect form values
	const rawDeckName = (nameInput.value || "").trim();
	const category = (categorySel.value || "").trim();

	if (!rawDeckName) throw new Error("Please enter a deck name.");
	if (!category) throw new Error("Please choose a category.");

	// Sanitize deck name: strip extension, collapse spaces, allow [A-Za-z0-9_-]
	const deckName = sanitizeDeckName(rawDeckName);
	if (!deckName) {
		throw new Error("Deck name is invalid after sanitization.");
	}

	// Invoke your provided uploader
	return uploader.uploadDeck({
		category,
		deckName,
		json: parsed,
		overwrite: !!overwrite,
		token,
	});
}

/** Remove common extensions, trim, and restrict to safe characters. */
function sanitizeDeckName(name) {
	let n = name.replace(/\.(json|cards)$/i, "").trim();
	// Replace whitespace with underscores
	n = n.replace(/\s+/g, "_");
	// Remove disallowed characters
	n = n.replace(/[^A-Za-z0-9_-]/g, "-");
	// Prevent leading/trailing separators
	n = n.replace(/^[-_]+|[-_]+$/g, "");
	return n;
}
