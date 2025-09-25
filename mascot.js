const Mascot = class {
	// --- Config / state ---
	name = "Default Mascot";
	containerName = "mascot-container";
	defaultMascotClass = "happy";
	speechBubbleFadeDelay = 1;

	words = {}; // populated from this.speech
	mute = false;
	isActive = true; // <-- use this flag consistently
	canReactivate = true;
	mood = 50;
	uncensoredMode = false;
	apiClient;

	urls = {
		sounds: {
			fart: ["fart1.wav", "fart2.wav", "fart3.wav", "fart4.wav", "fart5.wav"],
			bark: ["bark1.wav"],
			hit: ["punch-1.mp3"],
			explode: ["explode-1.mp3"], // added for KO
		},
	};
	audio = [];

	// --- TTS concurrency control ---
	currentTTSAudio = null;
	currentTTSUrl = null;
	currentTTSInterruptible = true;
	currentSpeechBubbleId = null;

	chatGPTLoaded = false;
	speechBubbleDiv;
	useTTS = true;

	moodImages = {
		angry: "shibaAngry.png",
		confused: "shibaConfused.png",
		fart: "shibaFart.png",
		happy: "shibaHappy.png",
		sad: "shibaSad.png",
		think: "shibaThink.png",
	};

	miscImages = {
		fart: "fart.png",
		explosion: "explosion.gif", // added for KO
	};

	// elevenlabs TTS settings
	TTS = { voice_id: "QzTKubutNn9TjrB7Xb2Q" };

	// DOM refs
	container; // outer container
	mascotDiv; // mascot image div

	// Idle / random chat state
	idleSeconds = 0;
	idleTimer = null; // setInterval handle
	idleChatInterval = null; // setInterval handle
	idleThesholdSeconds = 20;
	idleChatCooldownSeconds = 10;
	idleChatRandomChance = 10;
	lastIdleChatSent = 0;
	userIsIdle = false;
	maxIdleEvents = 15;
	numRunIdleEvents = 0;
	uninterruptableMessageDisplayed = false;

	randomEventLoop = null; // setInterval handle
	randomEventLoopIntervalMS = 5000;

	actions = {
		fart: {
			enabled: false,
			functionToCall: "fart",
			name: "Fart",
			lastRun: null, // normalized name
			cooldownSeconds: 5,
			trigger: { type: "random", chance: 5 },
		},
	};

	currentStatus = {
		mood: { type: "neutral", sadness: 0, anger: 0, confusion: 0, happiness: 50 },
		value: "",
		lastIdleChatSent: null,
		clickedTimes: 0,
		clickLimit: 10,
	};

	speech = {};
	elements = {
		snacks: [
			{
				image: "porkBelly.png", // goes in /mascot-media/<name>/img/
				sound: "munch1.mp3", // goes in /mascot-media/<name>/sfx/
				health: 12, // heals mascot by this amount
			},
			{
				image: "ramen.png",
				sound: "munch2.mp3",
				health: 20,
			},
			{
				image: "bone.png",
				sound: "munch3.mp3",
				health: 8,
			},
		],
	};
	// Combat / HP
	maxHealth = 100;
	health = 100;
	_healthBarHideTimer = null;
	_exploded = false;

	// internal listener refs
	_mascotClickHandlerAttached = false;
	_punchFXBound = false;
	_activityHandler = null;
	_activityEvents = null;
	_hotkeyHandler = null;
	_punchFXTimeout = null;

	// ---- Physics / Throwing ----
	// ---- Physics / Throwing / Gestures ----
	_phEnabled = false;
	_dragging = false;
	_dragCandidate = false;
	_throwPointerId = null;
	_throwRAF = null;

	_pos = { x: 0, y: 0 }; // container top-left (px)
	_vel = { x: 0, y: 0 }; // px/sec
	_acc = { x: 0, y: 1400 }; // gravity (px/sec^2)
	_air = 0.996; // air drag per frame
	_restitution = 0.65; // bounciness
	_groundFriction = 0.85; // X damping when we hit floor
	_size = { w: 150, h: 150 }; // keep in sync with CSS

	// Rotation/tumble
	_angle = 0; // radians
	_angVel = 0; // rad/sec
	_angAir = 0.995; // angular drag
	_angRestitution = 0.6; // angular bounce damping

	// Gesture sampling (for throw velocity / spin)
	_samples = []; // {t,x,y}
	_lastPhysicsT = 0;
	_dragOffsetX = 0;
	_dragOffsetY = 0;

	// Gesture thresholds
	_CLICK_MS = 160; // max press time to count as "click"
	_CLICK_MOVE_PX = 6; // max move during click

	_lastImpactSfx = 0;
	_impactSfxCooldownMs = 120; // min gap between impact sounds

	// ---- Pain reactions ----
	_lastPainAt = 0;
	_painCooldownMs = 900; // min time between pain lines

	// ---- TTS cache ----
	ttsCache = new Map(); // key -> { voice_id, text, blob, type, lastUsed }
	ttsCacheMaxEntries = 40;
	currentTTSAudio = null;
	// ---- IndexedDB persistence for TTS ----
	_ttsDB = null;

	// ---- Off-screen watchdog ----
	_origin = { x: 20, y: 20 }; // will be set from first on-screen position
	_offscreenInterval = null;
	_offscreenCheckMs = 3000; // check every 3s; tweak as you like
	_offscreenMargin = 64; // allow some slack beyond the edges
	constructor(constructorData, serverConnection) {
		try {
			if (!ui) {
				console.error("UI Library not loaded. Cannot init Mascot");
				return;
			}
			if (!serverConnection) {
				console.error("No server/client connection object passed in!");
				return;
			}

			this.apiClient = serverConnection;

			// set object properties from constructorData
			if (typeof constructorData === "object") {
				for (var k in this) if (constructorData[k] != undefined) this[k] = constructorData[k];
			}

			console.log("New instance of Mascot class initiated.");
			//this.initMascot();
			console.log(this);
		} catch (ex) {
			console.log(ex);
		}
	}

	async initMascot() {
		this.container = document.getElementById(this.containerName);
		this.mascotDiv = this.createMascotImageContainer();
		this.words = await this.loadMascotWords();

		this.registerMascotEventHandlers();
		this.preloadMascotImages();
		this.registerMascotRandomEventTimer();
		this.registerMascotIdleTimer();
		this.registerMascotIdleChat();
		this.registerMascotHotkeys();

		this.setMood("happy");
		this.sayRandom("greeting");

		this.createHealthBar();
		this.enableThrowPhysics(); // NEW: makes the mascot draggable + throwable
		this.preloadSpeech(this.words.pain);
		this.startOffscreenWatcher(); // NEW
	}

	async askQuestion(questionString) {
		this.uninterruptableMessageDisplayed = false;

		this.setMood("think");
		this.say("Alright.... gimme a second....");

		let chatGPTResponse = await this.apiClient.chat(questionString);
		setTimeout(
			function(scope) {
				scope.setMood("happy");
				scope.say(chatGPTResponse.data.choices[0].message.content, true, false, false);
			},
			2000,
			this
		);
	}

	async loadMascotWords() {
		return this.speech;
	}

	// ---- Idle / Activity ----
	registerMascotIdleTimer() {
		const events = ["load", "mousemove", "mousedown", "click", "touchstart", "keydown"];

		if (!this._activityHandler) {
			this._activityHandler = () => this.resetIdleTimer();
			this._activityEvents = events.slice();
			this._activityEvents.forEach((evt) => document.addEventListener(evt, this._activityHandler));
		}

		this.resetIdleTimer();
	}

	resetIdleTimer() {
		if (!this.isActive) return;

		if (this.userIsIdle) {
			this.setMood("happy");
			this.sayRandom("idle_stop");
			this.numRunIdleEvents = 0;
		}

		this.idleSeconds = 0;
		this.userIsIdle = false;

		if (this.idleTimer) clearInterval(this.idleTimer);
		this.idleTimer = setInterval(
			function(scope) {
				scope.idleSeconds++;
				if (scope.idleSeconds > scope.idleThesholdSeconds) {
					if (!scope.userIsIdle) {
						console.log("User Went Idle!");
						scope.setMood("confused");
						scope.sayRandom("idle_start");
					}
					scope.userIsIdle = true;
				}
			},
			1000,
			this
		);
	}

	registerMascotRandomEventTimer() {
		if (this.randomEventLoop) clearInterval(this.randomEventLoop);
		this.randomEventLoop = setInterval(
			function(scope) {
				scope.randomEvent();
			},
			this.randomEventLoopIntervalMS,
			this
		);
	}

	// ---- Input Handlers ----
	registerMascotEventHandlers() {
		// Prevent double-binding old click handler
		if (this._mascotClickHandlerAttached) {
			if (this._mascotClickHandler) this.mascotDiv.removeEventListener("click", this._mascotClickHandler);
			this._mascotClickHandlerAttached = false;
		}

		// Press FX helper (only used for quick-click punch)
		this._startPunchFX = () => {
			if (!this.isActive || this._exploded) return;
			// hit SFX + visuals
			this.playRandomSound("hit");
			this.mascotDiv.classList.add("punching");
			// jolt the IMAGE (not the container) so it doesn't fight rotation transforms
			this.mascotDiv.classList.add("hitshake");
			// damage
			this.takePunchDamage(10);
			// clear
			clearTimeout(this._punchFXTimeout);
			this._punchFXTimeout = setTimeout(() => {
				this.mascotDiv.classList.remove("punching");
				this.mascotDiv.classList.remove("hitshake");
			}, 160);

			// preserve your old click flavor text/bark
			this.setMood("angry");
			this.playRandomSound("bark");
			ui.addClass([this.mascotDiv], "hit-impact");
			setTimeout(() => ui.removeClass([this.mascotDiv], "hit-impact"), 100);

			this.currentStatus.clickedTimes++;
			if (this.currentStatus.clickedTimes + 1 === this.currentStatus.clickLimit) {
				this.sayRandom("click_leave_warning");
			} else if (this.currentStatus.clickedTimes === this.currentStatus.clickLimit) {
				this.rageQuit("rage_leave");
			} else {
				this.sayRandom("clicked");
			}
		};
	}

	// optional helper if you ever need to detach
	unregisterMascotEventHandlers() {
		if (this._mascotClickHandlerAttached && this._mascotClickHandler) {
			this.mascotDiv.removeEventListener("click", this._mascotClickHandler);
			this._mascotClickHandlerAttached = false;
		}

		if (this._punchFXBound) {
			const img = this.mascotDiv;
			if (img) {
				img.removeEventListener("mousedown", this._onMouseDownPunch);
				img.removeEventListener("touchstart", this._onTouchStartPunch);
				img.removeEventListener("mouseup", this._onMouseUpPunch);
				img.removeEventListener("mouseleave", this._onMouseLeavePunch);
				img.removeEventListener("touchend", this._onTouchEndPunch);
			}
			clearTimeout(this._punchFXTimeout);
			this._punchFXBound = false;
		}
	}

	registerMascotHotkeys() {
		if (!this._hotkeyHandler) {
			this._hotkeyHandler = (e) => {
				e = e || window.event;
				if ((e.key && e.key.toLowerCase() === "f") || e.keyCode == 70) {
					let prevSetting = this.mute;
					this.mute = false;
					this.fart();
					this.mute = prevSetting;
					e.preventDefault();
				}
				if (e.key && e.key.toLowerCase() === "s") {
					let prevSetting = this.mute;
					this.mute = false;
					this.feed();
					this.mute = prevSetting;
					e.preventDefault();
				}
				if (e.key && e.key.toLowerCase() === "=") {
					let prevSetting = this.mute;
					this.mute = false;
					this.reportStats();
					this.mute = prevSetting;
					e.preventDefault();
				}
				if (e.key && e.key.toLowerCase() === "b") {
					let prevSetting = this.mute;
					this.mute = false;
					this.summonBus();
					this.mute = prevSetting;
					e.preventDefault();
				}
			};
			document.addEventListener("keydown", this._hotkeyHandler);
		}
	}

	// ---- HP / KO ----
	createHealthBar() {
		if (this._lifeBar) return;

		const bar = document.createElement("div");
		bar.className = "life-bar";
		const fill = document.createElement("div");
		fill.className = "life-fill";
		bar.appendChild(fill);

		this.container.appendChild(bar);
		this._lifeBar = bar;
		this._lifeFill = fill;
	}

	updateHealthBar() {
		if (!this._lifeBar || !this._lifeFill) return;
		const pct = Math.max(0, Math.min(100, this.health));
		this._lifeFill.style.width = pct + "%";

		this._lifeFill.classList.remove("low", "crit");
		if (pct <= 30) this._lifeFill.classList.add("crit");
		else if (pct <= 60) this._lifeFill.classList.add("low");
	}

	showHealthBarTemporarily(ms = 1500) {
		if (!this._lifeBar) return;
		this._lifeBar.classList.add("visible");
		clearTimeout(this._healthBarHideTimer);
		this._healthBarHideTimer = setTimeout(() => {
			this._lifeBar.classList.remove("visible");
		}, ms);
	}

	takePunchDamage(amount = 10) {
		if (this._exploded) return;

		if (!this._lifeBar) {
			this.createHealthBar();
			this.updateHealthBar();
		}

		this.health = Math.max(0, this.health - amount);
		this.updateHealthBar();
		this.showHealthBarTemporarily();

		if (this.health <= 0) {
			this.explode();
		}
	}

	explode() {
		if (this._exploded) return;
		this._exploded = true;

		// Sound + visuals
		this.playRandomSound("explode");

		if (this.mascotDiv) this.mascotDiv.classList.add("ko");

		const boom = document.createElement("div");
		boom.className = "explosion-sprite";
		const boomUrl = this.buildMascotMediaUrl(this.miscImages.explosion, "img");
		boom.style.backgroundImage = `url(${boomUrl})`;
		this.container.appendChild(boom);

		this.container.classList.add("hitshake");
		setTimeout(() => this.container.classList.remove("hitshake"), 200);

		// Optional VO right before KO (remove if you don't want it)
		// this.sayRandom("rage_leave");

		// After the boom animation, deactivate mascot
		setTimeout(() => {
			boom.remove();
			this.deactivate();
		}, 700);
	}

	// ---- Idle Chat Loop ----
	registerMascotIdleChat() {
		if (!this.words.hasOwnProperty("idle_chat")) {
			console.log("No idle chat words in library. Aborting");
			return;
		}

		if (this.idleChatInterval) clearInterval(this.idleChatInterval);
		this.idleChatInterval = setInterval(
			function(scope) {
				if (scope.numRunIdleEvents < scope.maxIdleEvents) {
					let randomChance = Math.floor(Math.random() * 101);
					let rightNow = new Date().getTime();
					if (scope.userIsIdle && randomChance < scope.idleChatRandomChance && (rightNow - scope.lastIdleChatSent) / 1000 > scope.idleChatCooldownSeconds) {
						scope.numRunIdleEvents++;
						scope.setMood("happy");
						scope.sayRandom("idle_chat");
						scope.lastIdleChatSent = new Date().getTime();
					}
				} else {
					if (scope.numRunIdleEvents == scope.maxIdleEvents) {
						scope.numRunIdleEvents++;
						console.warn("Max idle events reached.");
						scope.setMood("sad");
						scope.sayRandom("idle_max_events_reached");
						if (scope.idleTimer) clearInterval(scope.idleTimer);
						return;
					}
				}
			},
			2000,
			this
		);
	}

	// ---- Random Events ----
	randomEvent() {
		if (!this.isActive) return;

		let randomChance = Math.floor(Math.random() * 101);
		let potentialActions = [];
		let currentTime = Date.now();

		for (let thisActionName in this.actions) {
			let thisAction = this.actions[thisActionName];
			let cooldownMet = thisAction.lastRun == null || currentTime - thisAction.lastRun >= thisAction.cooldownSeconds * 1000;

			if (thisAction?.trigger?.type == "random" && randomChance <= thisAction?.trigger?.chance && cooldownMet) {
				potentialActions.push(thisAction);
			}
		}

		if (potentialActions.length > 0) {
			var thisAction = potentialActions[Math.floor(Math.random() * potentialActions.length)];
			this[thisAction.functionToCall](randomChance, this);
			thisAction.lastRun = Date.now();
		}
	}

	// ---- Speech ----
	sayRandom(speechCategories = []) {
		let possiblePhrases = [];
		if (typeof speechCategories === "string") speechCategories = speechCategories.split(",");
		else if (isArray(speechCategories)) speechCategories = speechCategories;

		let uncensoredCategories = [];

		if (this.uncensoredMode) {
			for (let category of speechCategories) {
				if (this.words.hasOwnProperty(category + "_uncensored")) {
					uncensoredCategories.push(category + "_uncensored");
				}
			}
		}

		speechCategories = speechCategories.concat(uncensoredCategories);

		for (let category of speechCategories) {
			if (!this.words.hasOwnProperty(category)) {
				console.error(`Could not find speech category ${category}. Not adding words to list`);
			} else {
				possiblePhrases = possiblePhrases.concat(this.words[category]);
			}
		}

		if (possiblePhrases.length > 0) {
			let randomWords = possiblePhrases[Math.floor(Math.random() * possiblePhrases.length)];
			this.say(randomWords);
		} else {
			this.say("I don't know what to say!");
		}
	}

	say(speechText, hideOtherSpeechBubbles = true, interruptable = true, autoFade = true) {
		if (!speechText) {
			console.warn("No text provided for TTS. Not sending");
			return;
		}
		if (!this.isActive) {
			console.warn("Mascot inactive. Not reading text");
			return;
		}
		if (this.uninterruptableMessageDisplayed) {
			console.warn("Uninterruptable message active; ignoring new speech:", speechText);
			return;
		}

		if (hideOtherSpeechBubbles) {
			ui.getElements(".mascot-speech-bubble").forEach((e) => e.remove());
		}

		const divId =
			"speech-bubble-" +
			Date.now() +
			"-" +
			Math.random()
				.toString(36)
				.slice(2);
		const speechBubbleDiv = document.createElement("div");
		speechBubbleDiv.id = divId;

		if (!interruptable) {
			this.uninterruptableMessageDisplayed = true;
			speechText += `</br><span onclick=mascot.removeSpeechBubble('${speechBubbleDiv.id}') class="close-speech-link">Ok</span>`;
		}

		speechBubbleDiv.className = "bubble bubble-bottom-right mascot-speech-bubble";
		speechBubbleDiv.innerHTML = speechText;
		this.container.appendChild(speechBubbleDiv);

		this.currentSpeechBubbleId = speechBubbleDiv.id;

		if (this.useTTS && !this.mute) {
			this.tts(speechText, this.TTS.voice_id, interruptable, speechBubbleDiv.id);
		}

		// Strip HTML when estimating duration to avoid over-long fades
		const plain = speechText.replace(/<[^>]*>/g, " ");
		const numWords = plain
			.trim()
			.split(/\s+/)
			.filter(Boolean).length;
		let speechDelay = 2.5 * numWords * 1000 * this.speechBubbleFadeDelay;
		speechDelay = speechDelay > 1500 && speechDelay < 10000 ? speechDelay : 3000;

		if (autoFade) {
			this.removeSpeechBubble(speechBubbleDiv.id, speechDelay);
		}
	}
	_ttsNormalizeText(text) {
		const plain = String(text).replace(/<[^>]*>/g, " ");
		return plain.replace(/\s+/g, " ").trim();
	}
	_ttsKey(text, voice_id) {
		return `${voice_id}::${this._ttsNormalizeText(text)}`;
	}
	_ttsTouch(key) {
		const e = this.ttsCache.get(key);
		if (e) e.lastUsed = this._now();
	}
	// --- LRU insert + persist (stores Blob + type; no object URLs) ---

	stopTTS() {
		try {
			if (this.currentTTSAudio) {
				this.currentTTSAudio.pause();
				try {
					this.currentTTSAudio.src = "";
					this.currentTTSAudio.load?.();
				} catch {}
			}
			// Only revoke if it was an ephemeral (non-cached) URL
			if (this.currentTTSUrl) {
				let isCached = false;
				for (const v of this.ttsCache.values()) {
					if (v.url === this.currentTTSUrl) {
						isCached = true;
						break;
					}
				}
				if (!isCached) {
					try {
						URL.revokeObjectURL(this.currentTTSUrl);
					} catch {}
				}
			}
		} catch (e) {
			console.warn("Error while stopping TTS:", e);
		} finally {
			this.currentTTSAudio = null;
			this.currentTTSUrl = null;
			this.currentTTSInterruptible = true;
		}
	}
	/**
	 * Preload one or many phrases as TTS audio and cache them.
	 * @param {string|string[]} texts
	 * @param {{voice_id?: string}} opts
	 */
	async preloadSpeech(texts, opts = {}) {
		if (!texts) return;
		const voice_id = opts.voice_id || this.TTS.voice_id;
		const list = Array.isArray(texts) ? texts : [texts];

		const jobs = list.map(async (t) => {
			const norm = this._ttsNormalizeText(t);
			if (!norm) return;
			const key = this._ttsKey(norm, voice_id);

			// memory hit
			if (this.ttsCache.has(key)) {
				this._ttsTouch(key);
				return;
			}

			// DB hit?
			const rec = await this._dbGet(key);
			if (rec?.blob) {
				const url = URL.createObjectURL(rec.blob);
				await this._ttsInsertPersistent(key, { url, voice_id, text: norm, bytes: rec.blob.size, blob: rec.blob });
				return;
			}

			// fetch + cache + persist
			const audioData = await this.apiClient.textToSpeech({ text: norm, voiceId: voice_id });
			const blob = new Blob([audioData], { type: "audio/mpeg" });
			const url = URL.createObjectURL(blob);
			await this._ttsInsertPersistent(key, { url, voice_id, text: norm, bytes: blob.size, blob });
		});

		// run in parallel
		try {
			await Promise.all(jobs);
		} catch (e) {
			console.warn("preloadSpeech error:", e);
		}
	}

	async tts(text, voice_id, interruptable = true, speechBubbleId = null) {
		const normText = this._ttsNormalizeText(text);
		const key = this._ttsKey(normText, voice_id);

		// Try memory cache
		let cached = this.ttsCache.get(key);

		// Try DB
		if (!cached) {
			try {
				const rec = await this._dbGet?.(key);
				if (rec?.blob instanceof Blob) {
					cached = {
						voice_id: rec.voice_id || voice_id,
						text: normText,
						blob: rec.blob,
						type: rec.type || rec.blob.type || "audio/mpeg",
						lastUsed: this._now(),
					};
					this.ttsCache.set(key, cached);
				}
			} catch (e) {
				console.debug("TTS DB get miss/error:", e);
			}
		}

		// Fetch from server if needed
		if (!cached) {
			console.log("Trying to fetch audio from root server: " + this.apiClient.baseUrl);
			const url = `${this.apiClient.baseUrl}/api/text-to-speech`;
			const res = await fetch(url, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ text: normText, voiceId: voice_id }),
			});
			if (!res.ok) {
				console.error("TTS fetch failed:", res.status, await res.text().catch(() => ""));
				return;
			}
			const ct = res.headers.get("content-type") || "";
			const ab = await res.arrayBuffer();
			const blob = new Blob([ab], { type: ct || "audio/mpeg" });

			if (!(await this.validateAudioBlob(blob))) {
				console.warn("TTS blob invalid after fetch; aborting playback", { size: blob.size, type: blob.type });
				return;
			}

			cached = { voice_id, text: normText, blob, type: blob.type, lastUsed: this._now() };
			await this._ttsInsertPersistent(key, cached);
		} else {
			this._ttsTouch(key);
		}

		// Interrupt if requested
		if (interruptable && this.currentTTSAudio) {
			try {
				this.currentTTSAudio.pause();
			} catch {}
			try {
				this.currentTTSAudio.src = "";
			} catch {}
			this.currentTTSAudio = null;
		}

		console.debug("[TTS] about to play", { key, size: cached.blob.size, type: cached.type });

		// Final pre-play guard to avoid the "index.html" situation:
		if (!(cached.blob instanceof Blob) || cached.blob.size === 0) {
			console.error("[TTS] Refusing to play: invalid blob at final gate", { hasBlob: !!cached.blob, size: cached.blob?.size });
			return;
		}

		this.currentTTSAudio = await this._playBlob(cached.blob, {
			onEnd: (status) => {
				// status can be undefined, 'error', 'invalid-blob', 'bad-currentSrc', etc.
				if (status && status !== "error") {
					console.debug("[TTS] onEnd status:", status);
				}
				this.stopTTS?.();
				this.currentTTSAudio = null;
			},
		});
	}

	async _ttsInsertPersistent(key, entry) {
		// Evict if needed
		if (!this.ttsCache.has(key) && this.ttsCache.size >= this.ttsCacheMaxEntries) {
			let oldestKey = null,
				oldestTs = Infinity;
			for (const [k, v] of this.ttsCache.entries()) {
				if (v.lastUsed < oldestTs) {
					oldestTs = v.lastUsed;
					oldestKey = k;
				}
			}
			if (oldestKey) {
				this.ttsCache.delete(oldestKey);
				try {
					await this._dbDelete?.(oldestKey);
				} catch {}
			}
		}

		const { blob } = entry;
		if (!(blob instanceof Blob) || blob.size === 0) {
			throw new Error("Refusing to cache invalid/empty blob");
		}
		if (!(await this.validateAudioBlob(blob))) {
			throw new Error("Refusing to cache undecodable blob");
		}

		const type = entry.type || blob.type || "audio/mpeg";
		const normalized = { voice_id: entry.voice_id, text: entry.text, blob, type, lastUsed: this._now() };
		this.ttsCache.set(key, normalized);

		try {
			await this._dbSet?.({ key, voice_id: entry.voice_id, text: entry.text, blob, type });
		} catch (e) {
			console.warn("TTS DB persist failed:", e);
		}
	}
	// --- Safe audio playback with per-play object URL + cleanup ---
	async _playBlob(blob, { onEnd } = {}) {
		// Hard guards: don’t even create <audio> if blob is bad
		if (!(blob instanceof Blob) || blob.size === 0) {
			console.error("[TTS] _playBlob called with invalid blob", { hasBlob: !!blob, size: blob?.size });
			onEnd?.("invalid-blob");
			return null;
		}

		const audio = new Audio();

		// Add listeners BEFORE we set src so we can capture early errors
		const onError = () => {
			// Log BEFORE cleanup so we see true currentSrc
			this.logAudioState(audio, "error");
			cleanup();
			onEnd?.("error");
		};
		const onEnded = () => {
			cleanup();
			onEnd?.();
		};

		audio.addEventListener("error", onError);
		audio.addEventListener("stalled", () => this.logAudioState(audio, "stalled"));
		audio.addEventListener("abort", () => this.logAudioState(audio, "abort"));
		audio.addEventListener("loadedmetadata", () => this.logAudioState(audio, "loadedmetadata"));
		audio.addEventListener("canplaythrough", () => this.logAudioState(audio, "canplaythrough"));
		audio.addEventListener("ended", onEnded);

		let url;
		try {
			url = URL.createObjectURL(blob);
		} catch (e) {
			console.error("[TTS] createObjectURL failed", e);
			onEnd?.("createObjectURL-failed");
			return null;
		}

		const cleanup = () => {
			try {
				audio.pause();
			} catch {}
			// IMPORTANT: blank src AFTER we’re done logging
			try {
				audio.src = "";
			} catch {}
			try {
				URL.revokeObjectURL(url);
			} catch {}
			audio.removeEventListener("error", onError);
			audio.removeEventListener("ended", onEnded);
			audio.remove();
		};

		audio.src = url;

		// Sanity check: ensure currentSrc is blob: (not index.html)
		// Some environments can reflect empty src as the document URL.
		await new Promise((res) => setTimeout(res, 0)); // microtick flush
		if (!(audio.currentSrc && audio.currentSrc.startsWith("blob:"))) {
			this.logAudioState(audio, "bad-currentSrc", { note: "expected a blob: URL" });
			cleanup();
			onEnd?.("bad-currentSrc");
			return null;
		}

		// Optional: small readiness wait (bounded)
		await new Promise((res) => {
			let done = false;
			const finish = () => {
				if (!done) {
					done = true;
					res();
				}
			};
			audio.addEventListener("canplaythrough", finish, { once: true });
			audio.addEventListener("loadedmetadata", finish, { once: true });
			setTimeout(finish, 300);
		});

		try {
			await audio.play();
		} catch (err) {
			// Log BEFORE cleanup to see real currentSrc (avoid blanking src first)
			console.error("TTS play() failed:", err);
			this.logAudioState(audio, "play-catch");
			cleanup();
			onEnd?.("playfail");
			return null;
		}

		return audio;
	}

	removeSpeechBubble(bubbleId, speechDelay) {
		const stopIfMatches = () => {
			if (this.currentSpeechBubbleId && bubbleId === this.currentSpeechBubbleId) {
				this.stopTTS();
				this.currentSpeechBubbleId = null;
			}
			if (this.uninterruptableMessageDisplayed) {
				this.uninterruptableMessageDisplayed = false;
			}
		};

		setTimeout(
			(id) => {
				const el = document.getElementById(id);
				if (el) ui.addClass([el], "fade-out");

				setTimeout(
					(id2) => {
						const bubbleDiv = document.getElementById(id2);
						if (bubbleDiv) bubbleDiv.remove();
						stopIfMatches();
					},
					1900,
					id
				);
			},
			speechDelay,
			bubbleId
		);
	}

	// ---- Actions ----
	fart() {
		let resetToStatusAfterFart = this.currentStatus.value;
		if (resetToStatusAfterFart === "fart") return;

		this.setMood("fart");

		let speechCategories = ["fart"];
		this.sayRandom(speechCategories);

		this.playRandomSound("fart");

		let fartDiv = document.createElement("div");
		fartDiv.className = "slide-in-out-left mascot-fart-cloud";
		fartDiv.style.backgroundImage = `url(${this.buildMascotMediaUrl(this.miscImages.fart, "img")})`;
		fartDiv.id = "mascot-fart-cloud";
		this.container.appendChild(fartDiv);

		setTimeout(
			function(scope) {
				scope.setMood(resetToStatusAfterFart);
			},
			1000,
			this
		);

		setTimeout(
			function(fartDiv) {
				if (fartDiv) {
					fartDiv.remove();
				}
			},
			2800,
			fartDiv
		);
	}

	// ---- Mascot visuals ----
	setMood(moodName) {
		if (!this.moodImages.hasOwnProperty(moodName)) {
			console.error(`Invalid mascot mood provided: ${moodName}. Valid moods are ${Object.keys(this.moodImages)}`);
			return;
		}
		this.currentStatus.value = moodName;
		this.setMascotImage(this.moodImages[moodName]);
	}

	createMascotImageContainer() {
		const mascotId = `mascot-image-${this.name}`;
		const existingMascotDiv = document.getElementById(mascotId);

		if (existingMascotDiv) {
			console.warn(`Mascot div with id "${mascotId}" already exists. Removing it.`);
			existingMascotDiv.remove();
		}

		const mascotDiv = document.createElement("div");
		mascotDiv.id = mascotId;
		mascotDiv.className = `${this.defaultMascotClass} mascot-image`;

		const container = document.getElementById(this.containerName);
		if (!container) {
			console.error(`Container with id "${this.containerName}" not found. Mascot div not created.`);
			return null;
		}

		container.appendChild(mascotDiv);
		return mascotDiv;
	}

	buildMascotMediaUrl(fileName, dataType) {
		let folderName = "";
		if (dataType == "img") folderName = "img";
		else if (dataType == "sfx") folderName = "sfx";
		else {
			console.warn('Invalid data type provided for filename "' + fileName + '". Type: ' + dataType);
			return null;
		}
		const basePath = `${this.apiClient.baseUrl}/mascot-media/${this.name}/${folderName}/${fileName}`;
		return basePath;
	}

	setMascotImage(imageName) {
		const imageUrl = this.buildMascotMediaUrl(imageName, "img");
		this.mascotDiv.style.backgroundImage = `url(${imageUrl})`;
	}

	async preloadMascotImages() {
		for (let imageKey in this.moodImages) {
			const imageUrl = this.buildMascotMediaUrl(this.moodImages[imageKey], "img");
			this.preloadImage(imageUrl);
		}
	}

	preloadImage(url) {
		const img = new Image();
		img.src = url;
	}

	addMascotAnimationEffect(animationName) {
		ui.addClass([this.mascotDiv], animationName);
	}

	removeMascotAnimationEffect(animationName) {
		ui.removeClass([this.mascotDiv], animationName);
	}

	feed(snack = null) {
		const snacks = snack ? [snack] : this.elements?.snacks || [];
		if (!snacks.length || !this.container || !this.mascotDiv) return;

		// Pick snack
		const pick = snacks[Math.floor(Math.random() * snacks.length)];
		const imgUrl = this.buildMascotMediaUrl(pick.image, "img");
		const sfxUrl = pick.sound ? this.buildMascotMediaUrl(pick.sound, "sfx") : null;
		const healAmt = Number(pick.health || 0);

		// Mascot geometry
		const mrect = this.container.getBoundingClientRect();
		const mcx = mrect.left + mrect.width / 2;
		const mcy = mrect.top + mrect.height / 2;

		// Snack sprite (100x100)
		const snackDiv = document.createElement("div");
		snackDiv.className = "mascot-snack";
		Object.assign(snackDiv.style, {
			position: "fixed",
			width: "100px",
			height: "100px",
			backgroundImage: `url(${imgUrl})`,
			backgroundSize: "contain",
			backgroundRepeat: "no-repeat",
			pointerEvents: "none",
			left: `${mcx - 50}px`,
			top: `${mrect.top - 150}px`, // 50px above mascot + snack height
			zIndex: "2147483647",
		});
		document.body.appendChild(snackDiv);

		// Compute end position (center of mascot)
		const endTop = `${mcy - 50}px`;

		const finish = () => {
			// Play crunch sound
			try {
				if (!this.mute && sfxUrl) new Audio(sfxUrl).play().catch(() => {});
			} catch {}

			// Heal + happiness
			this.health = Math.min(this.maxHealth, this.health + healAmt);
			this.updateHealthBar?.();
			this.showHealthBarTemporarily?.();

			if (this.currentStatus?.mood) {
				const cur = Number(this.currentStatus.mood.happiness || 0);
				this.currentStatus.mood.happiness = Math.min(100, cur + 5);
			}

			// Set mood happy
			this.setMood("happy");

			// Friendly bounce effect
			this.mascotDiv.classList.add("pop-in");
			setTimeout(() => this.mascotDiv.classList.remove("pop-in"), 300);

			// After 1 second, speak from "eat" category
			setTimeout(() => {
				if (this.isActive) this.sayRandom("eat");
			}, 1000);

			snackDiv.remove();
		};

		// Animate down
		if (snackDiv.animate) {
			const a = snackDiv.animate([{ transform: "translateY(0px)" }, { transform: `translateY(${mcy - 50 - (mrect.top - 150)}px)` }], { duration: 700, easing: "cubic-bezier(.22,.61,.36,1)" });
			a.onfinish = finish;
		} else {
			snackDiv.style.transition = "top 0.7s cubic-bezier(.22,.61,.36,1)";
			requestAnimationFrame(() => (snackDiv.style.top = endTop));
			snackDiv.addEventListener("transitionend", finish, { once: true });
			setTimeout(finish, 800);
		}
	}
	// Inside Mascot class
	reportStats() {
		if (!this.isActive) return;

		const health = Math.round(this.health);
		const happiness = Math.round(this.currentStatus?.mood?.happiness ?? 0);
		const mood = this.currentStatus?.value || "neutral";

		const line = `My health is ${health} out of ${this.maxHealth}, my happiness is ${happiness}, and I feel ${mood}.`;

		this.say(line, true, true, true);
	}
	// ---- Audio ----
	playRandomSound(category) {
		if (!this.urls.sounds.hasOwnProperty(category)) {
			console.error(`No sound category ${category} could be found in sound library. Valid sounds are: ${Object.keys(this.urls.sounds)}`);
			return;
		}
		let thisSound = this.urls.sounds[category][Math.floor(Math.random() * this.urls.sounds[category].length)];
		this.playSound(category, thisSound);
	}

	playSound(category, soundName) {
		if (this.mute) {
			console.error(`Sounds disabled. Not playing sounds`);
			return;
		}
		if (!this.urls.sounds.hasOwnProperty(category)) {
			console.error(`No sound category ${category} could be found in sound library. Valid sounds are: ${Object.keys(this.urls.sounds)}`);
			return;
		}
		if (this.urls.sounds[category].indexOf(soundName) === -1) {
			console.error(`No sound named ${soundName} could be found in sound library. Valid sounds are: ${this.urls.sounds[category]}`);
			return;
		}

		let thisSound;
		if (!this.audio[category]) this.audio[category] = {};

		if (!this.audio[category].hasOwnProperty(soundName)) {
			thisSound = new Audio(this.buildMascotMediaUrl(soundName, "sfx"));
			this.audio[category][soundName] = thisSound;
		} else {
			thisSound = this.audio[category][soundName];
		}

		try {
			thisSound.play();
		} catch (exception) {
			console.error("Unable to play sound: " + exception.message);
		}
	}

	// ---- Exit / Return ----
	rageQuit(textType) {
		this.sayRandom(textType);
		this.setMood("angry");
		this.fart();
		this.addMascotAnimationEffect("leave-right");
		this.canReactivate = false;
		setTimeout(
			function(scope) {
				scope.deactivate();
			},
			5000,
			this
		);
	}

	neutralLeave() {
		this.sayRandom("leave_neutral");
		this.setMood("confused");
		this.addMascotAnimationEffect("leave-right");
		setTimeout(
			function(scope) {
				scope.removeMascotAnimationEffect("leave-right");
				scope.deactivate();
			},
			5000,
			this
		);
	}

	mascotReturn() {
		if (!this.canReactivate) {
			console.warn("Mascot was requested to reactivate but canReactivate is set to false. Not reactivating");
			return;
		}
		this.activate();
		this.addMascotAnimationEffect("fade-in");
		this.sayRandom("return");
		this.setMood("happy");
	}

	deactivate() {
		// Stop new actions immediately
		this.isActive = false; // <-- correct flag
		this.stopTTS();
		this.mute = true; // optional: hard-mute any stray sounds

		// Kill intervals
		if (this.idleTimer) {
			clearInterval(this.idleTimer);
			this.idleTimer = null;
		}
		if (this.idleChatInterval) {
			clearInterval(this.idleChatInterval);
			this.idleChatInterval = null;
		}
		if (this.randomEventLoop) {
			clearInterval(this.randomEventLoop);
			this.randomEventLoop = null;
		}

		// Unbind interactive handlers
		this.unregisterMascotEventHandlers();

		// Remove activity + hotkey listeners
		if (this._activityEvents && this._activityHandler) {
			this._activityEvents.forEach((evt) => document.removeEventListener(evt, this._activityHandler));
			this._activityEvents = null;
			this._activityHandler = null;
		}
		if (this._hotkeyHandler) {
			document.removeEventListener("keydown", this._hotkeyHandler);
			this._hotkeyHandler = null;
		}

		// Stop any preloaded SFX currently playing
		try {
			for (const cat in this.audio) {
				for (const name in this.audio[cat]) {
					const a = this.audio[cat][name];
					if (a && typeof a.pause === "function") {
						a.pause();
						a.currentTime = 0;
					}
				}
			}
		} catch (e) {
			console.warn("Error stopping SFX:", e);
		}

		// Clear transient timers / UI
		if (this._punchFXTimeout) {
			clearTimeout(this._punchFXTimeout);
			this._punchFXTimeout = null;
		}
		if (this._healthBarHideTimer) {
			clearTimeout(this._healthBarHideTimer);
			this._healthBarHideTimer = null;
		}
		if (this._lifeBar) this._lifeBar.classList.remove("visible");

		ui.hideElements([this.container]);

		this.stopOffscreenWatcher(); // NEW
	}

	activate() {
		if (!this.canReactivate) {
			console.warn("Mascot was requested to reactivate but canReactivate is set to false. Not reactivating");
			return;
		}
		this.isActive = true;
		this.mute = false;

		this.registerMascotEventHandlers();
		this.registerMascotIdleTimer();
		this.registerMascotIdleChat();
		this.registerMascotRandomEventTimer();

		ui.showElements([this.container]);
	}

	destroy() {
		console.log(`Destroying mascot: ${this.name}`);

		// Mark mascot as inactive
		this.isActive = false;
		this.canReactivate = false;
		this.stopTTS();

		// Stop intervals
		if (this.idleTimer) clearInterval(this.idleTimer);
		if (this.idleChatInterval) clearInterval(this.idleChatInterval);
		if (this.randomEventLoop) clearInterval(this.randomEventLoop);

		// Remove listeners
		this.unregisterMascotEventHandlers();

		if (this._activityEvents && this._activityHandler) {
			this._activityEvents.forEach((evt) => document.removeEventListener(evt, this._activityHandler));
			this._activityEvents = null;
			this._activityHandler = null;
		}
		if (this._hotkeyHandler) {
			document.removeEventListener("keydown", this._hotkeyHandler);
			this._hotkeyHandler = null;
		}

		// Remove mascot DOM elements
		if (this.mascotDiv) this.mascotDiv.remove();

		// Remove any remaining speech bubbles
		const speechBubbles = document.querySelectorAll(".mascot-speech-bubble");
		speechBubbles.forEach((bubble) => bubble.remove());

		// Optionally clear container
		if (this.container) {
			this.container.innerHTML = "";
		}
		this.stopOffscreenWatcher(); // NEW
	}
	// Inside Mascot class
	/**
	 * Summon a bus that slams into the mascot and transfers momentum.
	 * Sounds: horn on spawn, yell immediately, crash on impact.
	 * @param {{speed?:number, side?:"left"|"right", image?:string, width?:number, height?:number, sayPanic?:boolean}} opts
	 */
	summonBus(opts = {}) {
		if (!this.container) return;

		const speed = Math.max(600, Number(opts.speed ?? 1800)); // px/s
		const side = opts.side || (Math.random() < 0.5 ? "left" : "right");
		const imgName = opts.image || "bus.png"; // put in /mascot-media/<name>/img/
		const W = window.innerWidth,
			H = window.innerHeight;

		// Mascot geometry (center)
		const mrect = this.container.getBoundingClientRect();
		const mcx = mrect.left + mrect.width / 2;
		const mcy = mrect.top + mrect.height / 2;

		// Bus sprite
		const busW = 300;
		const busH = 300;

		const bus = document.createElement("div");
		bus.className = "mascot-bus";
		Object.assign(bus.style, {
			position: "fixed",
			width: `${busW}px`,
			height: `${busH}px`,
			backgroundImage: `url(${this.buildMascotMediaUrl(imgName, "img")})`,
			backgroundSize: "contain",
			backgroundRepeat: "no-repeat",
			pointerEvents: "none",
			zIndex: "2147483647",
			top: `${mcy - busH / 2}px`,
			left: side === "left" ? `${-busW - 20}px` : `${W + 20}px`,
			transform: side === "right" ? "scaleX(-1)" : "none", // face toward mascot
		});
		document.body.appendChild(bus);

		// 🔊 HORN + YELL right away
		this.playRandomSound?.("horn");
	
		// optional speech reaction, if you have "panic" lines
		setTimeout(() => this.sayRandom?.("scared"), 150);
		

		// Motion state (viewport coords)
		let x = side === "left" ? -busW - 20 : W + 20;
		const y = mcy - busH / 2;
		const dir = side === "left" ? +1 : -1; // +1 => move right, -1 => move left
		let last = this._now();
		let hit = false;

		const setPos = () => {
			bus.style.left = `${x}px`;
			bus.style.top = `${y}px`;
		};
		setPos();

		const intersectsMascot = () => {
			const b = bus.getBoundingClientRect();
			const m = this.container.getBoundingClientRect();
			return !(b.right < m.left || b.left > m.right || b.bottom < m.top || b.top > m.bottom);
		};

		const tick = () => {
			if (!document.body.contains(bus)) return;

			const now = this._now();
			const dt = Math.min(0.05, (now - last) / 1000);
			last = now;

			// Move bus
			x += dir * speed * dt;
			setPos();

			// Check impact
			if (!hit && intersectsMascot()) {
				hit = true;
				this.setMood("angry");
				// 💥 CRASH sound
				this.playRandomSound?.("crash");

				// Ensure physics is on
				if (!this._phEnabled) this.enableThrowPhysics();

				// Transfer momentum (shove + a bit of lift & spin)
				this._vel.x = dir * speed * 0.95;
				this._vel.y = -260;
				this._angVel = dir * 6.5;

				// Feedback
				this.mascotDiv.classList.add("hitshake");
				setTimeout(() => this.mascotDiv.classList.remove("hitshake"), 140);

				// Kick physics loop
				this._lastPhysicsT = this._now();
				if (!this._throwRAF) this._throwRAF = requestAnimationFrame((t) => this._physicsStep(t));

				// Let the bus continue then despawn
				setTimeout(() => bus.remove(), 800);
				requestAnimationFrame(tick);
				return;
			}

			// Despawn when fully off-screen on far side
			if ((dir === +1 && x > W + busW + 40) || (dir === -1 && x < -busW - 40)) {
				bus.remove();
				return;
			}

			requestAnimationFrame(tick);
		};

		requestAnimationFrame(tick);
	}

	enableThrowPhysics() {
		if (this._phEnabled || !this.container) return;
		// Record origin once from the first on-screen placement
		if (!this._originCaptured) {
			this._origin = { x: this._pos.x, y: this._pos.y };
			this._originCaptured = true;
		}

		// Viewport-based coordinates + fixed positioning
		const el = this.container;
		const rect = el.getBoundingClientRect();

		// If any ancestor is transformed, a "fixed" element can get a weird containing block.
		// Move the node to <body> first so it truly uses the viewport as its reference.
		const hasTransformedAncestor = (node) => {
			for (let n = node.parentElement; n && n !== document.body; n = n.parentElement) {
				const cs = getComputedStyle(n);
				if (cs.transform !== "none" || cs.perspective !== "none" || cs.filter !== "none") return true;
			}
			return false;
		};

		if (hasTransformedAncestor(el) && el.parentNode !== document.body) {
			// (optional) keep a placeholder if you ever want to put it back
			this._viewportPlaceholder ??= document.createComment("mascot-placeholder");
			el.parentNode.insertBefore(this._viewportPlaceholder, el);
			document.body.appendChild(el);
		}

		// Promote to fixed so left/top are viewport coords
		const cs = getComputedStyle(el);
		if (cs.position !== "fixed") {
			el.style.position = "fixed";
		}

		// Set size so layout doesn’t jump when we change positioning
		el.style.width = `${this._size?.w || rect.width}px`;
		el.style.height = `${this._size?.h || rect.height}px`;

		// Left/top in **viewport** pixels
		el.style.left = `${rect.left}px`;
		el.style.top = `${rect.top}px`;
		el.style.right = "";
		el.style.bottom = "";
		el.style.willChange = "transform,left,top";

		// Store physics position in viewport coords
		this._pos.x = rect.left;
		this._pos.y = rect.top;

		// Unified pointer gesture: quick click => punch; drag/hold => throw
		this._onPointerDownMain = (e) => this._pointerDown(e);
		this._onPointerMoveMain = (e) => this._pointerMove(e);
		this._onPointerUpMain = (e) => this._pointerUp(e);

		this.container.addEventListener("pointerdown", this._onPointerDownMain);

		this._phEnabled = true;
	}

	_pointerDown(e) {
		if (!this.isActive || this._exploded) return;
		if (this._dragging || this._dragCandidate) return;

		this._dragCandidate = true;
		this._pointerDownAt = this._now();
		this._downX = e.clientX;
		this._downY = e.clientY;

		// track relative grab offset (in case we switch to dragging)
		const rect = this.container.getBoundingClientRect();
		this._dragOffsetX = e.clientX - rect.left;
		this._dragOffsetY = e.clientY - rect.top;

		this._samples.length = 0;
		this._samples.push({ t: this._now(), x: e.clientX, y: e.clientY });

		this._throwPointerId = e.pointerId;
		this.container.setPointerCapture?.(e.pointerId);

		window.addEventListener("pointermove", this._onPointerMoveMain, { passive: true });
		window.addEventListener("pointerup", this._onPointerUpMain, { passive: true });
		window.addEventListener("pointercancel", this._onPointerUpMain, { passive: true });
	}

	_pointerMove(e) {
		if (e.pointerId !== this._throwPointerId) return;
		const now = this._now();

		// sample for velocity + potential spin estimation
		this._samples.push({ t: now, x: e.clientX, y: e.clientY });
		while (this._samples.length && now - this._samples[0].t > 120) this._samples.shift();

		// If we haven't committed to drag yet, check thresholds
		if (this._dragCandidate && !this._dragging) {
			const moved = Math.hypot(e.clientX - this._downX, e.clientY - this._downY);
			const elapsed = now - this._pointerDownAt;
			if (moved > this._CLICK_MOVE_PX || elapsed > this._CLICK_MS) {
				// switch to dragging mode
				this._dragCandidate = false;
				this._dragging = true;
				// stop any active physics during drag
				if (this._throwRAF) {
					cancelAnimationFrame(this._throwRAF);
					this._throwRAF = null;
				}
			}
		}

		// If dragging, move the mascot with the pointer
		if (this._dragging) {
			this._pos.x = e.clientX - this._dragOffsetX;
			this._pos.y = e.clientY - this._dragOffsetY;
			this._applyPos();
		}
	}

	_pointerUp(e) {
		if (e.pointerId !== this._throwPointerId) return;

		// release
		this.container.releasePointerCapture?.(e.pointerId);
		window.removeEventListener("pointermove", this._onPointerMoveMain);
		window.removeEventListener("pointerup", this._onPointerUpMain);
		window.removeEventListener("pointercancel", this._onPointerUpMain);

		const now = this._now();
		const elapsed = now - this._pointerDownAt;
		const moved = Math.hypot((e.clientX ?? this._downX) - this._downX, (e.clientY ?? this._downY) - this._downY);

		// Decide: punch vs throw
		if (this._dragCandidate && !this._dragging && elapsed <= this._CLICK_MS && moved <= this._CLICK_MOVE_PX) {
			// QUICK CLICK -> PUNCH
			this._dragCandidate = false;
			this._startPunchFX(); // uses your existing bark/hit/speech logic
		} else {
			// THROW: compute initial linear + angular velocity
			this._finalizeThrowVelocity();
			this._startPhysics();
		}

		// reset flags
		this._dragCandidate = false;
		this._dragging = false;
		this._throwPointerId = null;
	}

	_finalizeThrowVelocity() {
		// linear velocity from last sample window
		if (this._samples.length >= 2) {
			const first = this._samples[0];
			const last = this._samples[this._samples.length - 1];
			const dt = (last.t - first.t) / 1000;
			if (dt > 0) {
				this._vel.x = (last.x - first.x) / dt;
				this._vel.y = (last.y - first.y) / dt;
			}
			// angular velocity heuristic: spin from "swipe around center"
			const rect = this.container.getBoundingClientRect();
			const cx = rect.left + rect.width / 2;
			const cy = rect.top + rect.height / 2;
			const r0x = first.x - cx,
				r0y = first.y - cy;
			const r1x = last.x - cx,
				r1y = last.y - cy;
			// 2D cross of r and v gives approx torque direction; scale down
			const vx = (last.x - first.x) / dt;
			const vy = (last.y - first.y) / dt;
			const torqueLike = (r1x * vy - r1y * vx) * 0.00008; // tune
			this._angVel = torqueLike; // rad/sec
		}
	}

	_startPhysics() {
		this._lastPhysicsT = this._now();
		if (!this._throwRAF) this._throwRAF = requestAnimationFrame((t) => this._physicsStep(t));
	}

	_startDrag(e) {
		if (!this.isActive || this._exploded) return;
		// Only 1 pointer
		if (this._dragging) return;
		this._dragging = true;
		this._throwPointerId = e.pointerId;
		this.container.setPointerCapture?.(e.pointerId);

		// zero out motion
		this._vel.x = 0;
		this._vel.y = 0;
		this._samples.length = 0;

		// offset from top-left to pointer
		const rect = this.container.getBoundingClientRect();
		this._dragOffsetX = e.clientX - rect.left;
		this._dragOffsetY = e.clientY - rect.top;

		// Listen globally while dragging
		window.addEventListener("pointermove", this._onPointerMove, { passive: true });
		window.addEventListener("pointerup", this._onPointerUp, { passive: true });
		window.addEventListener("pointercancel", this._onPointerUp, { passive: true });

		// stop physics while dragging
		if (this._throwRAF) {
			cancelAnimationFrame(this._throwRAF);
			this._throwRAF = null;
		}
	}

	_drag(e) {
		if (!this._dragging || e.pointerId !== this._throwPointerId) return;

		// Place mascot with pointer (minus grab offset)
		const x = e.clientX - this._dragOffsetX;
		const y = e.clientY - this._dragOffsetY;

		this._pos.x = x;
		this._pos.y = y;
		this._applyPos();

		// sample recent movement for velocity estimate
		const now = this._now();
		this._samples.push({ t: now, x: e.clientX, y: e.clientY });

		// keep ~120ms of history
		while (this._samples.length && now - this._samples[0].t > 120) {
			this._samples.shift();
		}
	}

	_endDrag(e) {
		if (!this._dragging || e.pointerId !== this._throwPointerId) return;

		this._dragging = false;
		this._throwPointerId = null;
		this.container.releasePointerCapture?.(e.pointerId);

		window.removeEventListener("pointermove", this._onPointerMove);
		window.removeEventListener("pointerup", this._onPointerUp);
		window.removeEventListener("pointercancel", this._onPointerUp);

		// Estimate initial throw velocity from samples
		if (this._samples.length >= 2) {
			const first = this._samples[0];
			const last = this._samples[this._samples.length - 1];
			const dt = (last.t - first.t) / 1000;
			if (dt > 0) {
				this._vel.x = (last.x - first.x) / dt;
				this._vel.y = (last.y - first.y) / dt;
			}
		}

		// Start physics loop
		this._lastPhysicsT = this._now();
		if (!this._throwRAF) this._throwRAF = requestAnimationFrame((t) => this._physicsStep(t));
	}

	_physicsStep(tNow) {
		if (!this.isActive || this._exploded) {
			this._throwRAF = null;
			return;
		}

		const dt = Math.min(0.05, (tNow - this._lastPhysicsT) / 1000);
		this._lastPhysicsT = tNow;

		// Integrate linear
		this._vel.x *= this._air;
		this._vel.y = this._vel.y * this._air + this._acc.y * dt;
		this._pos.x += this._vel.x * dt;
		this._pos.y += this._vel.y * dt;

		// Integrate angular (tumble)
		this._angVel *= this._angAir;
		this._angle += this._angVel * dt;

		const W = window.innerWidth;
		const H = window.innerHeight;
		let impacted = false;
		let impactSpeed = 0;

		// Floor
		if (this._pos.y + this._size.h > H) {
			const vBefore = Math.abs(this._vel.y);
			this._pos.y = H - this._size.h;
			this._vel.y *= -this._restitution;
			this._vel.x *= this._groundFriction;
			// angular bounce (flip some spin on floor contact)
			this._angVel *= -this._angRestitution;
			impacted = true;
			impactSpeed = Math.max(impactSpeed, vBefore);
		}
		// Ceiling
		if (this._pos.y < 0) {
			const vBefore = Math.abs(this._vel.y);
			this._pos.y = 0;
			this._vel.y *= -this._restitution;
			this._angVel *= -this._angRestitution;
			impacted = true;
			impactSpeed = Math.max(impactSpeed, vBefore);
		}
		// Right wall
		if (this._pos.x + this._size.w > W) {
			const vBefore = Math.abs(this._vel.x);
			this._pos.x = W - this._size.w;
			this._vel.x *= -this._restitution;
			this._angVel += (Math.sign(this._vel.y) || 1) * (vBefore * 0.002);
			impacted = true;
			impactSpeed = Math.max(impactSpeed, vBefore);
		}
		// now 0..W and 0..H match your left/top coordinates
		// Left wall
		if (this._pos.x < 0) {
			const vBefore = Math.abs(this._vel.x);
			this._pos.x = 0;
			this._vel.x *= -this._restitution;
			this._angVel -= (Math.sign(this._vel.y) || 1) * (vBefore * 0.002);
			impacted = true;
			impactSpeed = Math.max(impactSpeed, vBefore);
		}

		// Apply position & rotation
		this._applyPos();

		// Impact damage + SFX + jolt on image
		if (impacted) {
			this.emitPain(impactSpeed);
			this._playImpactHit(impactSpeed); // <<< add this line
			//this._impactDamage(impactSpeed);
			this.mascotDiv.classList.add("hitshake");
			setTimeout(() => this.mascotDiv.classList.remove("hitshake"), 120);
		}

		// Sleep if settled on floor
		const speed = Math.hypot(this._vel.x, this._vel.y);
		const atFloor = Math.abs(this._pos.y + this._size.h - H) < 1;
		if (speed < 20 && Math.abs(this._angVel) < 0.2 && atFloor) {
			this._vel.x = this._vel.y = 0;
			this._angVel = 0;
			this._throwRAF = null;
			return;
		}

		this._throwRAF = requestAnimationFrame((tt) => this._physicsStep(tt));
	}
	_playImpactHit(impactSpeed = 0) {
		if (!this.isActive || this.mute) return;
		const now = this._now();
		if (now - this._lastImpactSfx < this._impactSfxCooldownMs) return; // debounce
		this._lastImpactSfx = now;

		// If you want to vary volume by impact speed, you could tweak your playSound
		// to accept a volume. For now, just play the standard hit.
		this.playRandomSound("hit");
	}
	_applyPos() {
		this.container.style.left = `${this._pos.x}px`;
		this.container.style.top = `${this._pos.y}px`;
		this.container.style.transform = `rotate(${this._angle}rad)`;
	}

	_impactDamage(impactSpeed) {
		// Only hurt if impact is strong
		const threshold = 800; // px/sec
		if (impactSpeed <= threshold) return;

		// scale damage from speed over threshold
		const dmg = Math.min(35, Math.round((impactSpeed - threshold) / 120));
		if (dmg > 0) {
			this.takePunchDamage(dmg);
			// optional: tiny screen jolt to sell the hit
			this.container.classList.add("hitshake");
			setTimeout(() => this.container.classList.remove("hitshake"), 120);
		}
	}

	emitPain(impactSpeed = 0) {
		if (!this.isActive || this._exploded) return;
		const now = this._now();
		if (now - this._lastPainAt < this._painCooldownMs) return;
		this._lastPainAt = now;

		// Pick severity by speed (px/s). Use higher severity for big smacks.
		let bucket = "light";
		if (impactSpeed > 1600) bucket = "heavy";
		else if (impactSpeed > 1000) bucket = "medium";

		// Quick mood flicker + bubble
		const prevMood = this.currentStatus.value;
		this.setMood("angry");
		this.sayRandom("pain");
		ui.addClass([this.mascotDiv], "hit-impact");
		setTimeout(() => {
			ui.removeClass([this.mascotDiv], "hit-impact");
			// only revert if we didn't change mood elsewhere in between
			if (this.currentStatus.value === "angry") this.setMood(prevMood || "happy");
		}, 450);
	}

	async _openTtsDB() {
		if (this._ttsDB) return this._ttsDB;
		return new Promise((resolve, reject) => {
			const req = indexedDB.open("mascot-tts", 1);
			req.onupgradeneeded = (e) => {
				const db = e.target.result;
				if (!db.objectStoreNames.contains("clips")) {
					db.createObjectStore("clips", { keyPath: "key" }); // {key, voice_id, text, blob}
				}
			};
			req.onsuccess = () => {
				this._ttsDB = req.result;
				resolve(this._ttsDB);
			};
			req.onerror = () => reject(req.error);
		});
	}

	async _dbGet(key) {
		const db = await this._openTtsDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction("clips", "readonly");
			const store = tx.objectStore("clips");
			const r = store.get(key);
			r.onsuccess = () => resolve(r.result || null);
			r.onerror = () => reject(r.error);
		});
	}
	async _dbSet(record) {
		const db = await this._openTtsDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction("clips", "readwrite");
			const store = tx.objectStore("clips");
			const r = store.put(record);
			r.onsuccess = () => resolve(true);
			r.onerror = () => reject(r.error);
		});
	}

	async _dbDelete(key) {
		const db = await this._openTtsDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction("clips", "readwrite");
			const store = tx.objectStore("clips");
			const r = store.delete(key);
			r.onsuccess = () => resolve(true);
			r.onerror = () => reject(r.error);
		});
	}
	startOffscreenWatcher() {
		if (this._offscreenInterval) return;

		// Also handle window resizes (can push him off-screen)
		this._onResizeClamp = () => {
			if (this._isOffscreen()) this._resetToOrigin(true);
		};
		window.addEventListener("resize", this._onResizeClamp, { passive: true });

		this._offscreenInterval = setInterval(() => {
			if (!this.isActive || this._exploded) return;
			if (this._isOffscreen()) this._resetToOrigin(true);
		}, this._offscreenCheckMs);
	}

	stopOffscreenWatcher() {
		if (this._offscreenInterval) {
			clearInterval(this._offscreenInterval);
			this._offscreenInterval = null;
		}
		if (this._onResizeClamp) {
			window.removeEventListener("resize", this._onResizeClamp);
			this._onResizeClamp = null;
		}
	}

	_isOffscreen() {
		const W = window.innerWidth;
		const H = window.innerHeight;
		const m = this._offscreenMargin;
		const x = this._pos.x,
			y = this._pos.y;
		const w = this._size.w,
			h = this._size.h;

		// fully (or well) outside the viewport + margin?
		const tooLeft = x + w < -m;
		const tooRight = x > W + m;
		const tooAbove = y + h < -m;
		const tooBelow = y > H + m;

		return tooLeft || tooRight || tooAbove || tooBelow;
	}

	_resetToOrigin(animated = true) {
		// kill motion
		this._vel.x = 0;
		this._vel.y = 0;
		this._angVel = 0;
		this._angle = 0;

		// snap back
		this._pos.x = this._origin.x;
		this._pos.y = this._origin.y;
		this._applyPos();

		// friendly visual cue
		if (animated) {
			this.container.classList.add("pop-in");
			setTimeout(() => this.container.classList.remove("pop-in"), 300);
		}

		// make sure physics loop isn’t stuck sleeping mid-air
		if (!this._throwRAF) {
			this._lastPhysicsT = this._now();
			this._throwRAF = requestAnimationFrame((t) => this._physicsStep(t));
		}
	}

	// --- Safe time source (monotonic when available) ---
	_now() {
		try {
			const p = globalThis && globalThis.performance;
			if (p && typeof p.now === "function") return p.now();
		} catch (_) {}
		return Date.now(); // fallback; OK since we only compare within-session
	}
	async validateAudioBlob(blob) {
		if (!(blob instanceof Blob)) return false;
		if (blob.size < 128) return false;
		try {
			const AC = window.AudioContext || window.webkitAudioContext;
			if (!AC) return true; // can’t validate, assume okay
			const ac = new AC();
			const buf = await blob.arrayBuffer();
			await new Promise((res, rej) => {
				const done = (b) => {
					try {
						ac.close();
					} catch {}
					res(b);
				};
				const fail = (e) => {
					try {
						ac.close();
					} catch {}
					rej(e);
				};
				const p = ac.decodeAudioData(buf.slice(0), done, fail);
				if (p && typeof p.then === "function") p.then(done).catch(fail);
			});
			return true;
		} catch {
			return false;
		}
	}

	// --- Debug helpers ---
	logAudioState(audio, where) {
		const err = audio.error;
		console.debug(`[TTS][${where}]`, {
			src: audio?.src,
			readyState: audio?.readyState,
			networkState: audio?.networkState,
			errCode: err?.code,
			errMsg: err?.message,
		});
	}
};

