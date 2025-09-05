const FlashcardServerClient = class{
	constructor(baseUrl, password) {
		this.baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash
		this.password = password;
	}

	_generateSecret() {
		// Simple random 16-char hex string
		return [...crypto.getRandomValues(new Uint8Array(8))]
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
	}

	async _request(
		method,
		path,
		{ params = {}, body = null, responseType = "json" } = {}
	) {
		const secret = this._generateSecret();

		// Add password + secret to query params
		const query = new URLSearchParams({
			...params,
			password: this.password,
			secret,
		}).toString();

		const url = `${this.baseUrl}${path}?${query}`;

		const fetchOptions = {
			method,
			headers: { "Content-Type": "application/json" },
		};
		if (body) fetchOptions.body = JSON.stringify(body);

		console.log(body);

		const response = await fetch(url, fetchOptions);

		if (!response.ok) {
			const errorText = await response.text();
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
}
