const Mascot = class {
	rootServerUrl = "";
	name = "Default Mascot";
	containerName = "mascot-container";
	defaultMascotClass = "happy";
	speechBubbleFadeDelay = 1;
	words = {}; ///gets populated from the speech property. Used to come from external source.
	mute = false;
	isActive = true;
	canReactivate = true;
	mood = 50;
	uncensoredMode = false;
	apiClient;

	urls = {
		sounds: {
			fart: [
				"fart1.wav",
				"fart2.wav",
				"fart3.wav",
				"fart4.wav",
				"fart5.wav",
			],
			bark: ["bark1.wav"],
		},
	};
	audio = [];

	// --- TTS concurrency control ---
	currentTTSAudio = null; // HTMLAudioElement for current TTS
	currentTTSUrl = null; // Object URL for current TTS (so we can revoke)
	currentTTSInterruptible = true; // Is the current TTS allowed to be interrupted?
	currentSpeechBubbleId = null; // Bubble id associated with the current TTS (optional but handy)

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
	};

	//elevenlabs text to speech settins.
	TTS = {
		voice_id: "QzTKubutNn9TjrB7Xb2Q",
	};
	//divs
	container; //outer container div that holds mascot and other animation divs
	mascotDiv; //div with mascot background image

	//Idle chat variables
	idleSeconds = 0; //internal timer that keeps track of how long the user has been idle
	idleTimer; //container for idle timer
	idleChatInterval; //how long user must be idle for chat message to appear
	idleThesholdSeconds = 20; //how long with no user interation before we consider them idle
	idleChatCooldownSeconds = 10; //minimum amount of time between idle chat messages
	idleChatRandomChance = 10; //odds of random chat being sent (out of 100) if cooldown is met
	lastIdleChatSent = 0; //when was the idle last chat sent?
	userIsIdle = false; //tracks if user is currently idle
	maxIdleEvents = 15; //maximum number of idle chats to send before stopping
	numRunIdleEvents = 0;
	uninterruptableMessageDisplayed = false; //if the currently displayed message is uninterruptable track it
	//random event loop variables
	randomEventLoop;
	randomEventLoopIntervalMS = 5000; //every twenty seconds maybe do something random
	actions = {
		fart: {
			enabled: false,
			functionToCall: "fart",
			name: "Fart",
			lastRun: null,
			cooldownSeconds: 5,
			trigger: {
				type: "random",
				chance: 5,
			},
		},
	};

	currentStatus = {
		mood: {
			type: "neutral",
			sadness: 0,
			anger: 0,
			confusion: 0,
			happiness: 50,
		},
		value: "",
		lastIdleChatSent: null,
		clickedTimes: 0,
		clickLimit: 10,
	};

	speech = {};

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
			//set object properties
			if (typeof constructorData === "object") {
				for (var k in this)
					if (constructorData[k] != undefined)
						this[k] = constructorData[k];
			}

			console.log("New instance of Mascot class initiated.");
			this.initMascot();
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
	}

	async askQuestion(questionString) {
		this.uninterruptableMessageDisplayed = false;

		this.setMood("think");
		this.say("Alright.... gimme a second....");

		let chatGPTResponse = await this.apiClient.chat(questionString);

		console.log(chatGPTResponse);

		setTimeout(
			function(scope) {
				scope.setMood("happy");
				scope.say(
					chatGPTResponse.data.choices[0].message.content,
					true,
					false,
					false
				);
			},
			2000,
			this
		);
	}

	async loadMascotWords() {
		return this.speech;
	}

	registerMascotIdleTimer() {
		let activityEvents = [
			"load",
			"mousemove",
			"mousedown",
			"click",
			"touchstart",
			"keydown",
		];

		for (let thisEvent of activityEvents) {
			document.addEventListener(
				thisEvent,
				function() {
					this.resetIdleTimer();
				}.bind(this)
			);
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
		if (this.idleTimer) clearTimeout(this.idleTimer);
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
		this.randomEventLoop = setInterval(
			function(scope) {
				scope.randomEvent();
			},
			this.randomEventLoopIntervalMS,
			this
		);
	}

	registerMascotEventHandlers() {
		this.mascotDiv.addEventListener(
			"click",
			function() {
				this.setMood("angry");

				this.playRandomSound("bark");

				ui.addClass([this.mascotDiv], "hit-impact");

				setTimeout(
					function(scope) {
						ui.removeClass([scope.mascotDiv], "hit-impact");
					},
					100,
					this
				);

				//ui.removeClass([this.mascotDiv],'hit-impact');
				this.currentStatus.clickedTimes++;
				if (
					this.currentStatus.clickedTimes + 1 ==
					this.currentStatus.clickLimit
				) {
					this.sayRandom("click_leave_warning");
				} else if (
					this.currentStatus.clickedTimes ==
					this.currentStatus.clickLimit
				) {
					this.rageQuit("rage_leave");
				} else {
					this.sayRandom("clicked");
				}
			}.bind(this)
		);
	}

	registerMascotHotkeys() {
		document.addEventListener(
			"keydown",
			function(e) {
				e = e || window.event;
				// use e.keyCode
				if (e.keyCode == "70") {
					let prevSetting = this.mute;
					this.mute = false;
					this.fart();
					this.mute = prevSetting;
					e.preventDefault();
				}
			}.bind(this)
		);
	}

	registerMascotIdleChat() {
		if (!this.words.hasOwnProperty("idle_chat")) {
			console.log("No idle chat words in library. Aborting");
			return;
		}

		this.idleChatInterval = setInterval(
			function(scope) {
				//console.log('Idle event values: ' +  scope.numRunIdleEvents + ' < ' + scope.maxIdleEvents)
				if (scope.numRunIdleEvents < scope.maxIdleEvents) {
					let randomChance = Math.floor(Math.random() * 101);

					let rightNow = new Date().getTime();
					if (
						scope.userIsIdle &&
						randomChance < scope.idleChatRandomChance &&
						(rightNow - scope.lastIdleChatSent) / 1000 >
							scope.idleChatCooldownSeconds
					) {
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
						if (this.idleTimer) clearTimeout(this.idleTimer);
						return;
					}
				}
			},
			2000,
			this
		);
	}

	randomEvent() {
		if (!this.isActive) return;

		//generate a random percentage chance between 0 - 100
		let randomChance = Math.floor(Math.random() * 101);

		//we only want to perform one action per loop, so we create a sub collection of potential actions based on % chance
		let potentialActions = [];
		let currentTime = Date.now();

		for (let thisActionName in this.actions) {
			let thisAction = this.actions[thisActionName];

			let cooldownMet =
				thisAction.lastCalled == null ||
				currentTime - thisAction.lastCalled >=
					thisAction.cooldownSeconds * 1000
					? true
					: false;

			if (
				thisAction?.trigger?.type == "random" &&
				randomChance <= thisAction?.trigger?.chance &&
				cooldownMet
			) {
				potentialActions.push(thisAction);
			}
		}

		if (potentialActions.length > 0) {
			var thisAction =
				potentialActions[
					Math.floor(Math.random() * potentialActions.length)
				];
			this[thisAction.functionToCall](randomChance, this);
			thisAction.lastCalled = Date.now();
		}
	}

	sayRandom(speechCategories = []) {
		let possiblePhrases = [];
		if (typeof speechCategories === "string")
			speechCategories = speechCategories.split(",");
		else if (isArray(speechCategories)) speechCategories = speechCategories;

		let uncensoredCategories = [];

		//automatically injects uncensored words collection for this category if it exists and we are uncensored mode
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
				console.error(
					`Could not find speech category ${category}. Not adding words to list`
				);
			} else {
				possiblePhrases = possiblePhrases.concat(this.words[category]);
			}
		}

		if (possiblePhrases.length > 0) {
			let randomWords =
				possiblePhrases[
					Math.floor(Math.random() * possiblePhrases.length)
				];
			this.say(randomWords);
		} else {
			this.say("I don't know what to say!");
		}
	}

	say(
		speechText,
		hideOtherSpeechBubbles = true,
		interruptable = true,
		autoFade = true
	) {
		if(!speechText){
			console.warn("No text provided for TTS. Not sending");
			return;
		}
		if (!this.isActive) {
			console.warn("Mascot invactive. Not reading text");
			return;
		}

		// If an uninterruptible message is currently displayed, do nothing (no bubble, no TTS).
		if (this.uninterruptableMessageDisplayed) {
			console.warn(
				"Uninterruptable message active; ignoring new speech:",
				speechText
			);
			return;
		}

		if (hideOtherSpeechBubbles) {
			ui.getElements(".mascot-speech-bubble").forEach((e) => e.remove());
		}

		const divId = "speech-bubble-" + Math.floor(Math.random() * 101);
		const speechBubbleDiv = document.createElement("div");
		speechBubbleDiv.id = divId;

		if (!interruptable) {
			this.uninterruptableMessageDisplayed = true;
			speechText += `</br><span onclick=mascot.removeSpeechBubble('${speechBubbleDiv.id}') class="close-speech-link">Ok</span>`;
		}

		speechBubbleDiv.className =
			"bubble bubble-bottom-right mascot-speech-bubble";
		speechBubbleDiv.innerHTML = speechText;
		this.container.appendChild(speechBubbleDiv);

		// Track the bubble associated with this speech (so removing it can stop TTS).
		this.currentSpeechBubbleId = speechBubbleDiv.id;

		// Start TTS only after we’ve decided we’re allowed to speak.
		if (this.useTTS && !this.mute) {
			this.tts(
				speechText,
				this.TTS.voice_id,
				interruptable,
				speechBubbleDiv.id
			);
		}

		// Compute fade timing roughly by words
		const numWords = speechText.split(" ").length;
		let speechDelay = 2.5 * numWords * 1000 * this.speechBubbleFadeDelay;
		speechDelay =
			speechDelay > 1500 && speechDelay < 10000 ? speechDelay : 3000;

		if (autoFade) {
			this.removeSpeechBubble(speechBubbleDiv.id, speechDelay);
		}
	}

	stopTTS() {
		try {
			if (this.currentTTSAudio) {
				this.currentTTSAudio.pause();
				// Clear src to stop downloads/buffering in some browsers
				try {
					this.currentTTSAudio.src = "";
					this.currentTTSAudio.load?.();
				} catch {}
			}
			if (this.currentTTSUrl) {
				URL.revokeObjectURL(this.currentTTSUrl);
			}
		} catch (e) {
			console.warn("Error while stopping TTS:", e);
		} finally {
			this.currentTTSAudio = null;
			this.currentTTSUrl = null;
			this.currentTTSInterruptible = true;
		}
	}

	async tts(speechText, voice_id, interruptable = true, bubbleId = null) {
		// If something is already playing:
		if (this.currentTTSAudio) {
			// If current is interruptible, stop it. If not, refuse to start a new one.
			if (this.currentTTSInterruptible) {
				this.stopTTS();
			} else {
				console.warn(
					"Existing uninterruptible TTS is playing; ignoring new TTS."
				);
				return;
			}
		}

		console.log("Sending text for TTS:", speechText);

		// Fetch audio
		const audioData = await this.apiClient.textToSpeech({
			text: speechText,
			voiceId: voice_id,
		});

		// Double-check again (race-safety): if something started while we were fetching…
		if (this.currentTTSAudio) {
			if (this.currentTTSInterruptible) this.stopTTS();
			else return;
		}

		// Create audio + track it
		const audioBlob = new Blob([audioData], { type: "audio/mpeg" });
		const audioUrl = URL.createObjectURL(audioBlob);
		const audio = new Audio(audioUrl);

		this.currentTTSAudio = audio;
		this.currentTTSUrl = audioUrl;
		this.currentTTSInterruptible = !!interruptable;
		this.currentSpeechBubbleId = bubbleId || this.currentSpeechBubbleId;

		// Cleanup when finished
		audio.addEventListener("ended", () => {
			this.stopTTS();
		});

		// If playback fails (e.g., autoplay policy), just log and cleanup
		audio.play().catch((err) => {
			console.error("TTS play() failed:", err);
			this.stopTTS();
		});
	}

	removeSpeechBubble(bubbleId, speechDelay) {
		// If we’re removing the bubble associated with the current TTS, stop it
		const stopIfMatches = () => {
			if (
				this.currentSpeechBubbleId &&
				bubbleId === this.currentSpeechBubbleId
			) {
				this.stopTTS();
				this.currentSpeechBubbleId = null;
			}
			// If we’re closing an uninterruptible message, release the lock
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

	fart() {
		let resetToStatusAfterFart = this.currentStatus.value;

		if (resetToStatusAfterFart === "fart") return;

		this.setMood("fart");

		let speechCategories = ["fart"];
		this.sayRandom(speechCategories);

		this.playRandomSound("fart");

		let fartDiv = document.createElement("div");
		fartDiv.className = "slide-in-out-left mascot-fart-cloud";
		fartDiv.style.backgroundImage = `url(${this.buildMascotMediaUrl(
			this.miscImages.fart,
			"img"
		)})`;
		fartDiv.id = "mascot-fart-cloud";
		this.container.appendChild(fartDiv);

		//reset back to previous mood after done farting.
		setTimeout(
			function(scope) {
				scope.setMood(resetToStatusAfterFart);
			},
			1000,
			this
		);

		//remove the fart cloud after a few seconds
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

	setMood(moodName) {
		if (!this.moodImages.hasOwnProperty(moodName)) {
			console.error(
				`Invalid mascot mood provided: ${moodName}. Valid moods are ${Object.keys(
					this.moodImages
				)}`
			);
			return;
		}
		this.currentStatus.value = moodName;
		this.setMascotImage(this.moodImages[moodName]);
	}

	createMascotImageContainer() {
		const mascotId = `mascot-image-${this.name}`;
		const existingMascotDiv = document.getElementById(mascotId);

		// Remove existing mascot div if found
		if (existingMascotDiv) {
			console.warn(
				`Mascot div with id "${mascotId}" already exists. Removing it.`
			);
			existingMascotDiv.remove();
		}

		// Create new mascot div
		const mascotDiv = document.createElement("div");
		mascotDiv.id = mascotId;
		mascotDiv.className = `${this.defaultMascotClass} mascot-image`;

		// Append to container
		const container = document.getElementById(this.containerName);
		if (!container) {
			console.error(
				`Container with id "${this.containerName}" not found. Mascot div not created.`
			);
			return null;
		}

		container.appendChild(mascotDiv);
		return mascotDiv;
	}

	/**
	 * Builds the correct URL to request mascot media files from the server proxy route
	 */
	buildMascotMediaUrl(fileName, dataType) {
		// Example output: /mascot-media/shiba/shibaHappy.png
		let folderName = "";
		if (dataType == "img") folderName = "img";
		else if (dataType == "sfx") folderName = "sfx";
		else {
			console.warn(
				'Invalid data type provided for filename" ' +
					fileName +
					". Type: " +
					dataType
			);
			return null;
		}
		const basePath = `${this.apiClient.baseUrl}/mascot-media/${this.name}/${folderName}/${fileName}`;
		return this.apiClient.baseUrl
			? `${this.rootServerUrl}${basePath}`
			: basePath;
	}

	setMascotImage(imageName) {
		console.log("Trying to get image from node proxy url");
		console.log(imageName);

		const imageUrl = this.buildMascotMediaUrl(imageName, "img");
		this.mascotDiv.style.backgroundImage = `url(${imageUrl})`;
	}

	async preloadMascotImages() {
		for (let imageKey in this.moodImages) {
			const imageUrl = this.buildMascotMediaUrl(
				this.moodImages[imageKey],
				"img"
			);
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

	playRandomSound(category) {
		if (!this.urls.sounds.hasOwnProperty(category)) {
			console.error(
				`No sound category ${category} could be found in sound library. Valid sounds are: ${Object.keys(
					this.urls.sounds
				)}`
			);
			return;
		}
		let thisSound = this.urls.sounds[category][
			Math.floor(Math.random() * this.urls.sounds[category].length)
		];
		this.playSound(category, thisSound);
	}
	playSound(category, soundName) {
		if (this.mute) {
			console.error(`Sounds disabled. Not playing sounds`);
			return;
		}

		if (!this.urls.sounds.hasOwnProperty(category)) {
			console.error(
				`No sound category ${category} could be found in sound library. Valid sounds are: ${Object.keys(
					this.urls.sounds
				)}`
			);
			return;
		}
		if (this.urls.sounds[category].indexOf(soundName) === -1) {
			console.error(
				`No sound named ${soundName} could be found in sound library. Valid sounds are: ${this.urls.sounds[category]}`
			);
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
			console.warn(
				"Mascot was requested to reactivate but canReactivate is set to false. Not reactivating"
			);
			return;
		}
		this.activate();
		this.addMascotAnimationEffect("fade-in");
		this.sayRandom("return");
		this.setMood("happy");
	}

	deactivate() {
		this.currentStatus.isActive = false;
		if (this.idleTimer) clearTimeout(this.idleTimer);
		if (this.randomEventLoop) clearTimeout(this.randomEventLoop);
		ui.hideElements([this.container]);
	}

	activate() {
		if (!this.canReactivate) {
			console.warn(
				"Mascot was requested to reactivate but canReactivate is set to false. Not reactivating"
			);
			return;
		}
		this.currentStatus.isActive = true;
		this.registerMascotIdleTimer();
		this.registerMascotIdleChat();
		ui.showElements([this.container]);
	}

	destroy() {
		console.log(`Destroying mascot: ${this.name}`);

		// Mark mascot as inactive
		this.isActive = false;
		this.canReactivate = false;
		this.stopTTS();

		// Stop timers
		if (this.idleTimer) clearInterval(this.idleTimer);
		if (this.idleChatInterval) clearInterval(this.idleChatInterval);
		if (this.randomEventLoop) clearInterval(this.randomEventLoop);

		// Remove event listeners from document
		document.removeEventListener("keydown", this.boundKeydownHandler);
		document.removeEventListener("mousemove", this.boundActivityHandler);
		document.removeEventListener("mousedown", this.boundActivityHandler);
		document.removeEventListener("click", this.boundActivityHandler);
		document.removeEventListener("touchstart", this.boundActivityHandler);
		document.removeEventListener("keydown", this.boundActivityHandler);

		// Remove mascot DOM elements
		if (this.mascotDiv) this.mascotDiv.remove();
		// Remove any remaining speech bubbles
		const speechBubbles = document.querySelectorAll(
			".mascot-speech-bubble"
		);
		speechBubbles.forEach((bubble) => bubble.remove());

		// Optionally hide or remove the whole mascot container if desired
		console.log("Container");
		console.log(this.container);
		if (this.container) {
			this.container.innerHTML = "";
		}
	}
};