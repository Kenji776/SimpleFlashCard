const FlashcardServerClient = class {
	constructor(baseUrl, password, { uploadToken = null } = {}) {
		this.baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash
		this.password = password;
		this.uploadToken = uploadToken; // optional default for uploads
	}

	setUploadToken(token) {
		this.uploadToken = token || null;
	}

	_generateSecret() {
		// Simple random 16-char hex string
		return [...crypto.getRandomValues(new Uint8Array(8))]
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
	}

	_buildHeaders(custom = {}) {
		// Default JSON, allow overrides/merges
		return { "Content-Type": "application/json", ...custom };
	}

	async _request(
		method,
		path,
		{ params = {}, body = null, responseType = "json", headers = {} } = {}
	) {
		const secret = this._generateSecret();

		// Add password + secret to query params
		const query = new URLSearchParams({
			...params,
			password: this.password,
			secret,
		}).toString();

		const url = `${this.baseUrl}${path}?${query}`;

		// Merge headers and auto-inject upload token for the upload endpoint
		const isUpload =
			path === "/api/decks/upload" ||
			path.startsWith("/api/decks/upload");
		const finalHeaders = this._buildHeaders(headers);

		// If caller didn't explicitly provide an upload token header, attach the instance token
		if (
			isUpload &&
			!(
				"x-upload-token" in
				Object.fromEntries(
					Object.entries(finalHeaders).map(([k, v]) => [
						k.toLowerCase(),
						v,
					])
				)
			) &&
			this.uploadToken
		) {
			finalHeaders["x-upload-token"] = this.uploadToken;
		}

		const fetchOptions = { method, headers: finalHeaders };
		if (body != null) fetchOptions.body = JSON.stringify(body);

		const response = await fetch(url, fetchOptions);

		if (!response.ok) {
			let errorText;
			try {
				errorText = await response.text();
			} catch {
				errorText = response.statusText;
			}
			throw new Error(`Request failed: ${response.status} ${errorText}`);
		}

		return responseType === "arraybuffer"
			? response.arrayBuffer()
			: response.json();
	}

	// --- API Functions ---

	announce(username) {
		return this._request("GET", "/api/announce", { params: { username } });
	}

	getDeck(slug) {
		return this._request("GET", "/api/deck", { params: { slug } });
	}

	submitScore({
		deckId,
		performanceRecordId,
		player = "Anonymous",
		correctPercent = 0,
	}) {
		return this._request("POST", "/api/score", {
			body: { deckId, performanceRecordId, player, correctPercent },
		});
	}

	getScores(deck) {
		return this._request("GET", "/api/scores", { params: { deck } });
	}

	textToSpeech({ text, voiceId = "EXAVITQu4vr4xnSDxMaL" }) {
		return this._request("POST", "/api/text-to-speech", {
			body: { text, voiceId },
			responseType: "arraybuffer",
		});
	}

	chat(prompt) {
		return this._request("GET", "/api/chat", { params: { prompt } });
	}

	listMascots() {
		return this._request("GET", "/api/mascots");
	}

	listDecks() {
		return this._request("GET", "/api/decks");
	}

	getMascotSettings(folderName) {
		return this._request(
			"GET",
			`/mascots/${encodeURIComponent(folderName)}`
		);
	}

	getMascotMedia(mascotName, mediaType, mediaName) {
		return this._request(
			"GET",
			`/mascot-media/${encodeURIComponent(
				mascotName
			)}/${encodeURIComponent(mediaType)}/${encodeURIComponent(
				mediaName
			)}`,
			{ responseType: "arraybuffer" }
		);
	}

	/**
	 * Upload a .cards deck file to the server.
	 * @param {Object} opts
	 * @param {string} opts.category - Category folder (e.g., "IntroToPharmacy1")
	 * @param {string} opts.deckName - Deck base name without extension (e.g., "GroupE")
	 * @param {string|Object} [opts.content] - Deck JSON as a string (plain text)
	 * @param {Object} [opts.json] - If provided instead of content, will be JSON.stringified
	 * @param {boolean} [opts.overwrite=false] - Overwrite an existing deck
	 * @param {string} [opts.token] - Optional per-call shared secret for x-upload-token header (overrides instance token)
	 */
	uploadDeck({
		category,
		deckName,
		content,
		json,
		overwrite = false,
		token,
	} = {}) {
		if (!category || !deckName) {
			throw new Error("uploadDeck requires category and deckName.");
		}

		// Accept either pre-stringified content or a JSON object
		let payloadContent = content;
		if (payloadContent == null) {
			if (json == null)
				throw new Error(
					"Provide either content (string) or json (object)."
				);
			try {
				payloadContent = JSON.stringify(json, null, 2);
			} catch {
				throw new Error("Failed to stringify provided json.");
			}
		}
		if (typeof payloadContent !== "string") {
			throw new Error("content must be a string after processing.");
		}
		// Quick client-side guard against binary-ish payloads
		if (/\u0000/.test(payloadContent)) {
			throw new Error(
				"Deck content contains NUL characters; expected plain text JSON."
			);
		}

		// If a one-off token is provided, pass it; otherwise _request will inject instance token automatically.
		// This feature doesn't really do anything yet. Will probably be used in the future.
		const headers = token
			? { "x-upload-token": token }
			: { "x-upload-token": this._generateSecret() };

		return this._request("POST", "/api/decks/upload", {
			body: {
				category,
				deckName,
				content: payloadContent,
				overwrite: !!overwrite,
			},
			headers,
		});
	}
};
