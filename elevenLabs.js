const ElevenLabs = class {
	apiKey;
	streamingURL =
		"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream?optimize_streaming_latency=2";
	voiceURL = "https://api.elevenlabs.io/v1/voices";
	#_isStreaming = false;

	get isStreaming() {
		console.log(`🔍 [Getter] isStreaming is ${this.#_isStreaming}`);
		return this.#_isStreaming;
	}

	set isStreaming(value) {
		console.warn(
			`⚙️ [Setter] isStreaming changed from ${
				this.#_isStreaming
			} to ${value}`
		);
		this.#_isStreaming = value;
	}
	constructor(apiKey) {
		this.apiKey = apiKey;
	}

	async getVoices() {
		const req = new Request(this.voiceURL, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				"xi-api-key": this.apiKey,
			},
		});

		const response = await fetch(req);
		const data = await response.json();

		console.log("Voice Data is");
		console.log(data);
		return data;
	}

	async tts(text, voiceId, config) {
		console.log(`🎤 Requested TTS for "${text}" with voiceId "${voiceId}"`);

		if (!this.apiKey || this.apiKey.length === 0) {
			console.error("❌ Eleven labs API key not set. Skipping TTS");
			return;
		}
		if (this.isStreaming) {
			console.warn(
				`⚠️ Already streaming. Skipping new request for: "${text}"`
			);
			return;
		}

		this.isStreaming = true;

		const audioContext = new (window.AudioContext ||
			window.webkitAudioContext)();
		const request = new XMLHttpRequest();
		const url = this.streamingURL.replace("{voice_id}", voiceId);

		console.log(`➡️ Sending request to ${url}`);
		request.open("POST", url, true);
		request.responseType = "arraybuffer";
		request.setRequestHeader("Content-Type", "application/json");
		request.setRequestHeader("xi-api-key", this.apiKey);

		// Keep a reference to the source node on this instance
		const self = this;

		request.onload = () => {
			console.log("✅ Received audio response from ElevenLabs");
			const audioData = request.response;

			audioContext.decodeAudioData(
				audioData,
				(buffer) => {
					console.log("✅ Decoded audio data");

					// Create the source node and save it to prevent garbage collection
					self.currentSource = audioContext.createBufferSource();
					self.currentSource.buffer = buffer;
					self.currentSource.connect(audioContext.destination);

					self.currentSource.onended = () => {
						console.warn(
							"🎵 Audio finished playing. Resetting isStreaming flag."
						);
						self.isStreaming = false;
						self.currentSource = null; // Clear the reference
					};
                    // Fallback: Clear flag after buffer duration + 100ms
                    console.warn("⏱️ Setting streaming timoeut of " + (buffer.duration * 1000) + 100 + ' MS');

                    setTimeout(() => {
                        console.warn('⏱️ Timed reset of isStreaming flag');
                        this.isStreaming = false;
                        this.currentSource = null;
                    }, (buffer.duration * 1000) + 100);
					console.log("▶️ Starting audio playback");
					self.currentSource.start(0);


				},
				(error) => {
					console.error("❌ Error decoding audio data:", error);
					self.isStreaming = false;
				}
			);
		};

		request.onerror = (e) => {
			console.error("❌ Error during audio fetch:", e);
			this.isStreaming = false;
		};

		const payload = JSON.stringify(new this.TtsRequest(text, config));
		console.log(`📦 Sending TTS request payload: ${payload}`);
		request.send(payload);
	}

	TtsRequest = class {
		constructor(text, voiceSettings) {
			this.text = text;
			if (voiceSettings) this.voiceSettings = voiceSettings;
		}
		text = "";
		model = "eleven_turbo_v2";
		voice_settings = {
			similarity_boost: 0.5,
			stability: 0.25,
			style: 0,
			use_speaker_boost: false,
		};
	};
};