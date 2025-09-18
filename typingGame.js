// TypingMiniGame.js
// Requires: global `ui` helpers already loaded.
// Elements assumed in DOM: tg-word-idx, tg-word-total, tg-show-timer, tg-round-timer,
// tg-current-word, tg-correct, tg-required, tg-input, tg-submit, tg-feedback,
// tg-start, tg-next, tg-retry, (optional) tg-reset
// Game-mode UI expected (optional but recommended): tg-mode, tg-mode-explainer, tg-guide-match, tg-guide-answer

window.deckOptions = window.deckOptions || {};
deckOptions.typingGame = Object.assign(
	{
		displaySeconds: 3,
		requiredCorrect: 3,
		roundSeconds: 20,
		caseSensitive: false,
		shuffleWords: true,
		mode: "match", // 'match' | 'answer'
	},
	deckOptions.typingGame || {}
);

class TypingMiniGame {
	constructor() {
		this.cfg = deckOptions.typingGame;

		this.state = {
			prompts: [],
			responses: [],
			wordIndex: 0,
			currentWord: "",
			correctStreak: 0,
			timers: { showTimeout: null, roundTick: null },
			wired: false,
			gameActive: false,
		};

		this._handlers = {
			start: this._onStartClick.bind(this),
			submit: this._onSubmitClick.bind(this),
			enterKey: this._onEnterKey.bind(this),
			next: this._onNextClick.bind(this),
			retry: this._onRetryClick.bind(this),
			reset: this._onResetClick.bind(this),
			globalEnter: this._onGlobalEnter.bind(this),
		};

		this._modeUI = null;
	}

	// ---------- Public ----------
	start(prompts, overrides = {}) {
		if (!Array.isArray(prompts) || prompts.length === 0) {
			console.warn("TypingMiniGame.start: provide a non-empty array of words.");
			return;
		}
		this.cfg = Object.assign({}, deckOptions.typingGame, overrides);

		// Pull responses (may be undefined for pure Match mode)
		let responses = Array.isArray(this.cfg.responses) ? [...this.cfg.responses] : null;

		// Ensure equal lengths if responses exist (truncate to min)
		if (responses) {
			const minLen = Math.min(prompts.length, responses.length);
			if (prompts.length !== responses.length) {
				console.warn(`TypingMiniGame.start: prompts (${prompts.length}) and responses (${responses.length}) differ; truncating to ${minLen}.`);
			}
			prompts = prompts.slice(0, minLen);
			responses = responses.slice(0, minLen);
		}

		// Wire controls once
		this._wireControls();

		// Initialize UIs (safe if elements missing)
		this._initModeUI({ initialMode: this.cfg.mode });
		this._initShuffleUI({ initial: this.cfg.shuffleWords });

		// Use the *current UI* shuffle value before we build state:
		const doShuffle = this._getShuffle();
		if (doShuffle) {
			if (responses) {
				const { prompts: sp, responses: sr } = this._pairedShuffle(prompts, responses);
				prompts = sp;
				responses = sr;
			} else {
				prompts = this._shuffle([...prompts]);
			}
		}

		// Commit state
		this.state.prompts = prompts;
		this.state.responses = responses || [];
		this.state.wordIndex = 0;
		this.state.currentWord = prompts[0];
		this.state.correctStreak = 0;
		this._clearTimers();

		// Prime UI
		this._setText("tg-word-total", prompts.length);
		this._setText("tg-word-idx", 0);
		this._setText("tg-required", this.cfg.requiredCorrect);
		this._setText("tg-correct", 0);
		this._setText("tg-show-timer", this.cfg.displaySeconds);
		this._setText("tg-round-timer", this.cfg.roundSeconds);
		this._setWordHidden("");
		this._feedback("Click Start to begin.", null);

		// Mirrors
		this._setText("typing-num-correct-required", this.cfg.requiredCorrect);
		this._setText("typing-round-seconds", this.cfg.roundSeconds);
		this._setText("typing-seconds-displayed", this.cfg.displaySeconds);

		// Pre-game: allow changing mode & shuffle
		this._modeUI?.lock(false);
		this._shuffleUI?.lock(false);

		// Controls
		ui.enable("tg-start");
		ui.disable(["tg-input", "tg-submit", "tg-next", "tg-retry"]);
		ui.enable("tg-reset");
	}

	destroy() {
		this._clearTimers();
		this._unwireControls();
	}

	// ---------- Private: controls ----------
	_wireControls() {
		if (this.state.wired) return;
		this.state.wired = true;

		this._el("tg-start")?.addEventListener("click", this._handlers.start);
		this._el("tg-submit")?.addEventListener("click", this._handlers.submit);
		this._el("tg-input")?.addEventListener("keydown", this._handlers.enterKey);
		this._el("tg-next")?.addEventListener("click", this._handlers.next);
		this._el("tg-retry")?.addEventListener("click", this._handlers.retry);
		this._el("tg-reset")?.addEventListener("click", this._handlers.reset);

		document.addEventListener("keydown", this._handlers.globalEnter);
	}

	_unwireControls() {
		if (!this.state.wired) return;
		this.state.wired = false;

		this._el("tg-start")?.removeEventListener("click", this._handlers.start);
		this._el("tg-submit")?.removeEventListener("click", this._handlers.submit);
		this._el("tg-input")?.removeEventListener("keydown", this._handlers.enterKey);
		this._el("tg-next")?.removeEventListener("click", this._handlers.next);
		this._el("tg-retry")?.removeEventListener("click", this._handlers.retry);
		this._el("tg-reset")?.removeEventListener("click", this._handlers.reset);

		document.removeEventListener("keydown", this._handlers.globalEnter);
	}

	_onStartClick() {
		this.state.gameActive = true;
		this._modeUI?.lock(true);
		this._shuffleUI?.lock(true); // NEW
		ui.disable("tg-start");
		this._startShowPhase();
	}

	_onSubmitClick() {
		this._submitAttempt();
	}
	_onEnterKey(e) {
		if (e.key !== "Enter") return;
		if (this._isEnabled("tg-input") && !this._el("tg-input").disabled) {
			this._submitAttempt();
		}
	}
	_onGlobalEnter(e) {
		if (e.key !== "Enter") return;

		if (this._isEnabled("tg-input") && !this._el("tg-input").disabled) {
			this._el("tg-input")?.focus();
			this._submitAttempt();
		} else if (this._isEnabled("tg-next")) {
			this._nextWordOrFinish();
		} else if (this._isEnabled("tg-start")) {
			this._onStartClick();
		} else if (this._isEnabled("tg-retry")) {
			this._retryWord();
		}
	}
	_onNextClick() {
		this._nextWordOrFinish();
	}
	_onRetryClick() {
		this._retryWord();
	}
	_onResetClick() {
		this._resetGame();
	}

	// ---------- Private: phases ----------
	_startShowPhase() {
		const displaySeconds = this.cfg.displaySeconds;

		this._setText("tg-show-timer", displaySeconds);
		this._setText("tg-round-timer", "-");
		ui.disable(["tg-input", "tg-submit", "tg-next", "tg-retry"]);
		const input = this._el("tg-input");
		if (input) input.value = "";
		this._feedback("Memorize the word…", null);

		this._setWordVisible(this.state.currentWord);

		let remain = displaySeconds;
		const showTicker = setInterval(() => {
			remain -= 1;
			this._setText("tg-show-timer", remain);
			if (remain <= 0) clearInterval(showTicker);
		}, 1000);

		this.state.timers.showTimeout = setTimeout(() => {
			this._setWordHidden(this.state.currentWord);
			this._startRoundPhase();
		}, displaySeconds * 1000);
	}

	_startRoundPhase() {
		const roundSeconds = this.cfg.roundSeconds;

		this._setText("tg-show-timer", "0");
		this._setText("tg-round-timer", roundSeconds);
		ui.enable(["tg-input", "tg-submit"]);
		ui.disable(["tg-next", "tg-retry"]);

		const mode = this._getMode();
		if (mode === "answer") {
			this._feedback("Type the associated correct answer.", null);
		} else {
			this._feedback("Type the word. Wrong entry resets the streak.", null);
		}

		this._el("tg-input")?.focus();

		let remain = roundSeconds;
		this.state.timers.roundTick = setInterval(() => {
			remain -= 1;
			this._setText("tg-round-timer", remain);
			if (remain <= 0) {
				this._clearInterval("roundTick");
				ui.disable(["tg-input", "tg-submit"]);
				ui.enable("tg-retry");
				this._feedback("Time up! Click Retry for this word.", false);
			}
		}, 1000);
	}

	_submitAttempt() {
		const input = this._el("tg-input");
		if (!input || input.disabled) return;

		const attempt = this._norm(input.value.trim());
		if (!attempt) return;

		const mode = this._getMode();
		let targetRaw = this.state.currentWord;
		if (mode === "answer") {
			const idx = this.state.wordIndex;
			targetRaw = this.state.responses && typeof this.state.responses[idx] !== "undefined" ? this.state.responses[idx] : this.state.currentWord;
		}
		const target = this._norm(targetRaw);

		if (attempt === target) {
			this.state.correctStreak += 1;
			this._setText("tg-correct", this.state.correctStreak);
			this._feedback("Correct!", true);
			input.value = "";

			if (this.state.correctStreak >= this.cfg.requiredCorrect) {
				this._nextWordOrFinish();
			}
		} else {
			this.state.correctStreak = 0;
			this._setText("tg-correct", 0);
			this._feedback("Wrong. Streak reset!", false);
			input.select();
		}
	}

	_nextWordOrFinish() {
		this.state.wordIndex += 1;
		if (this.state.wordIndex >= this.state.prompts.length) {
			this._finishGame();
			return;
		}

		this.state.currentWord = this.state.prompts[this.state.wordIndex];
		this._setText("tg-word-idx", this.state.wordIndex + 1);

		this._clearTimers();

		this.state.correctStreak = 0;
		this._setText("tg-correct", 0);

		this._startShowPhase();
	}

	_retryWord() {
		this._clearTimers();
		this._startShowPhase();
	}

	_finishGame() {
		this._clearTimers();
		this._feedback("All done! 🎉", true);
		ui.enable("tg-start");
		ui.disable(["tg-input", "tg-submit", "tg-next", "tg-retry"]);
		ui.enable("tg-reset");
		this._setWordHidden("");
		this._setText("tg-show-timer", "-");
		this._setText("tg-round-timer", "-");
		this.state.gameActive = false;
		this._modeUI?.lock(false);
		this._shuffleUI?.lock(false); // NEW
	}

	_resetGame() {
		this._clearTimers();
		this.state.gameActive = false;
		this.state.wordIndex = 0;
		this.state.currentWord = this.state.prompts[0] || "";
		this.state.correctStreak = 0;

		this._setWordHidden("");
		this._setText("tg-word-idx", 0);
		this._setText("tg-correct", 0);
		this._setText("tg-show-timer", this.cfg.displaySeconds);
		this._setText("tg-round-timer", this.cfg.roundSeconds);
		this._feedback("Reset. Choose a game mode and click Start.", null);

		this._modeUI?.lock(false);
		this._shuffleUI?.lock(false); // NEW

		ui.enable("tg-start");
		ui.disable(["tg-input", "tg-submit", "tg-next", "tg-retry"]);
		ui.enable("tg-reset");
	}

	// ---------- Mode UI ----------
	_initModeUI({ initialMode } = {}) {
		if (this._modeUI?.__wired) {
			if (initialMode) this._modeUI.setMode(initialMode);
			return this._modeUI;
		}

		const sel = document.getElementById("tg-mode");
		const expl = document.getElementById("tg-mode-explainer");
		const guideMatch = document.getElementById("tg-guide-match");
		const guideAnswer = document.getElementById("tg-guide-answer");

		if (!sel || !expl || !guideMatch || !guideAnswer) {
			this._modeUI = {
				__wired: true,
				getMode: () => this.cfg.mode || "match",
				setMode: (m) => {
					this.cfg.mode = m === "answer" ? "answer" : "match";
				},
				lock: (locked) => {},
			};
			return this._modeUI;
		}

		const EXPLAINERS = {
			match: "Type exactly what you saw on screen.",
			answer: "Type the associated correct answer.",
		};

		const applyMode = (mode) => {
			const m = mode === "answer" ? "answer" : "match";
			expl.textContent = EXPLAINERS[m] || EXPLAINERS.match;
			guideMatch.style.display = m === "match" ? "" : "none";
			guideAnswer.style.display = m === "answer" ? "" : "none";
			this.cfg.mode = m;
			document.dispatchEvent(new CustomEvent("tg:modeChanged", { detail: { mode: m } }));
		};

		const onChange = () => {
			if (this.state.gameActive) {
				sel.value = this.cfg.mode || "match";
				return;
			}
			applyMode(sel.value);
		};

		sel.removeEventListener("change", onChange);
		sel.addEventListener("change", onChange);

		if (initialMode) sel.value = initialMode;
		applyMode(sel.value || this.cfg.mode || "match");

		this._modeUI = {
			__wired: true,
			getMode: () => sel.value,
			setMode: (m) => {
				sel.value = m;
				applyMode(m);
			},
			lock: (locked) => {
				sel.disabled = !!locked;
			},
		};

		return this._modeUI;
	}

	_getMode() {
		return this._modeUI?.getMode?.() || this.cfg.mode || "match";
	}

	// ---------- Helpers ----------
	_setWordVisible(word) {
		const el = this._el("tg-current-word");
		if (el) {
			el.classList.remove("tg-hidden");
			el.textContent = word;
		}
	}

	_setWordHidden(word) {
		const el = this._el("tg-current-word");
		if (el) {
			el.classList.add("tg-hidden");
			el.textContent = word || "";
		}
	}

	_feedback(msg, ok = null) {
		const fb = this._el("tg-feedback");
		if (!fb) return;
		fb.className = "tg-feedback";
		if (ok === true) fb.classList.add("tg-success");
		if (ok === false) fb.classList.add("tg-error");
		if (ok === null) fb.classList.add("tg-muted");
		fb.textContent = msg;
	}

	_setText(id, text) {
		const el = this._el(id);
		if (el) el.textContent = text;
	}
	_el(id) {
		return ui.getElements(id)[0];
	}

	_norm(s) {
		return this.cfg.caseSensitive ? s : (s || "").toLowerCase();
	}

	_shuffle(arr) {
		for (let i = arr.length - 1; i > 0; i--) {
			const j = (Math.random() * (i + 1)) | 0;
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
		return arr;
	}
	// Add inside the class (e.g., below _initModeUI)
	_initShuffleUI({ initial } = {}) {
		if (this._shuffleUI?.__wired) {
			if (typeof initial === "boolean") this._shuffleUI.setShuffle(initial);
			return this._shuffleUI;
		}

		const box = document.getElementById("tg-shuffle");

		if (!box) {
			// Graceful fallback to cfg
			this._shuffleUI = {
				__wired: true,
				getShuffle: () => !!this.cfg.shuffleWords,
				setShuffle: (v) => {
					this.cfg.shuffleWords = !!v;
				},
				lock: (locked) => {},
			};
			return this._shuffleUI;
		}

		const apply = (v) => {
			const val = !!v;
			box.checked = val;
			this.cfg.shuffleWords = val; // keep config in sync
			document.dispatchEvent(new CustomEvent("tg:shuffleChanged", { detail: { shuffle: val } }));
		};

		const onChange = () => {
			if (this.state.gameActive) {
				// Ignore changes during active game; restore visual toggle
				box.checked = !!this.cfg.shuffleWords;
				return;
			}
			apply(box.checked);
		};

		box.removeEventListener("change", onChange);
		box.addEventListener("change", onChange);

		// Initialize
		if (typeof initial === "boolean") box.checked = initial;
		apply(box.checked);

		this._shuffleUI = {
			__wired: true,
			getShuffle: () => !!box.checked,
			setShuffle: (v) => apply(v),
			lock: (locked) => {
				box.disabled = !!locked;
			},
		};
		return this._shuffleUI;
	}

	_getShuffle() {
		return this._shuffleUI?.getShuffle?.() ?? !!this.cfg.shuffleWords;
	}
	// NEW: shuffle prompts/responses with the same permutation
	_pairedShuffle(prompts, responses) {
		const n = Math.min(prompts.length, responses.length);
		const idx = Array.from({ length: n }, (_, i) => i);

		// Fisher–Yates over idx
		for (let i = n - 1; i > 0; i--) {
			const j = (Math.random() * (i + 1)) | 0;
			[idx[i], idx[j]] = [idx[j], idx[i]];
		}

		const sp = new Array(n);
		const sr = new Array(n);
		for (let k = 0; k < n; k++) {
			const i = idx[k];
			sp[k] = prompts[i];
			sr[k] = responses[i];
		}
		return { prompts: sp, responses: sr };
	}

	_clearInterval(name) {
		if (this.state.timers[name]) {
			clearInterval(this.state.timers[name]);
			this.state.timers[name] = null;
		}
	}
	_clearTimeout(name) {
		if (this.state.timers[name]) {
			clearTimeout(this.state.timers[name]);
			this.state.timers[name] = null;
		}
	}
	_clearTimers() {
		this._clearInterval("roundTick");
		this._clearTimeout("showTimeout");
	}

	_isEnabled(id) {
		const el = this._el(id);
		if (!el) return false;
		const notDisabled = !el.disabled;
		let visible = true;
		try {
			visible = ui.getVisibilityById(id);
		} catch (e) {
			visible = !(el.style.display === "none" || el.style.visibility === "hidden");
		}
		return notDisabled && visible;
	}
}

window.TypingMiniGame = TypingMiniGame;
