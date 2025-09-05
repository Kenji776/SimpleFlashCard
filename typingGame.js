// TypingMiniGame.js
// Requires: global `ui` helpers already loaded.
// Assumes the following elements already exist in your modal body:
// tg-word-idx, tg-word-total, tg-show-timer, tg-round-timer,
// tg-current-word, tg-correct, tg-required,
// tg-input, tg-submit, tg-feedback, tg-start, tg-next, tg-retry

window.deckOptions = window.deckOptions || {};
deckOptions.typingGame = Object.assign(
	{
		displaySeconds: 3, // N: show word for N seconds
		requiredCorrect: 3, // X: correct in-a-row needed
		roundSeconds: 20, // Y: time limit for attempts
		caseSensitive: false, // compare case-sensitively?
		shuffleWords: true, // randomize list
	},
	deckOptions.typingGame || {}
);

class TypingMiniGame {
	constructor() {
		this.cfg = deckOptions.typingGame;

		// State
		this.state = {
			words: [],
			wordIndex: 0,
			currentWord: "",
			correctStreak: 0,
			timers: { showTimeout: null, roundTick: null },
			wired: false,
		};

		// Bound handlers
		this._handlers = {
			start: this._onStartClick.bind(this),
			submit: this._onSubmitClick.bind(this),
			enterKey: this._onEnterKey.bind(this), // keeps input-enter behavior
			next: this._onNextClick.bind(this),
			retry: this._onRetryClick.bind(this),
			globalEnter: this._onGlobalEnter.bind(this), // NEW
		};
	}

	// ---------- Public ----------
	start(words, overrides = {}) {
		if (!Array.isArray(words) || words.length === 0) {
			console.warn(
				"TypingMiniGame.start: provide a non-empty array of words."
			);
			return;
		}
		this.cfg = Object.assign({}, deckOptions.typingGame, overrides);

		const list = this.cfg.shuffleWords
			? this._shuffle([...words])
			: [...words];
		this.state.words = list;
		this.state.wordIndex = 0;
		this.state.currentWord = list[0];
		this.state.correctStreak = 0;
		this._clearTimers();

		// Prime UI
		this._setText("tg-word-total", list.length);
		this._setText("tg-word-idx", 0);
		this._setText("tg-required", this.cfg.requiredCorrect);
		this._setText("tg-correct", 0);
		this._setText("tg-show-timer", "-");
		this._setText("tg-round-timer", "-");
		this._setWordHidden("");
		this._feedback("Click Start to begin.", null);

		// Wire once
		this._wireControls();

		// Reset controls
		ui.enable("tg-start");
		ui.disable(["tg-input", "tg-submit", "tg-next", "tg-retry"]);
	}

	destroy() {
		this._clearTimers();
		this._unwireControls();
	}

	// ---------- Private: controls ----------
	// 3) Wire / unwire the global handler
	_wireControls() {
		if (this.state.wired) return;
		this.state.wired = true;

		this._el("tg-start")?.addEventListener("click", this._handlers.start);
		this._el("tg-submit")?.addEventListener("click", this._handlers.submit);
		this._el("tg-input")?.addEventListener(
			"keydown",
			this._handlers.enterKey
		);
		this._el("tg-next")?.addEventListener("click", this._handlers.next);
		this._el("tg-retry")?.addEventListener("click", this._handlers.retry);

		// Listen globally so Enter works even when input is disabled
		document.addEventListener("keydown", this._handlers.globalEnter);
	}

	_unwireControls() {
		if (!this.state.wired) return;
		this.state.wired = false;

		this._el("tg-start")?.removeEventListener(
			"click",
			this._handlers.start
		);
		this._el("tg-submit")?.removeEventListener(
			"click",
			this._handlers.submit
		);
		this._el("tg-input")?.removeEventListener(
			"keydown",
			this._handlers.enterKey
		);
		this._el("tg-next")?.removeEventListener("click", this._handlers.next);
		this._el("tg-retry")?.removeEventListener(
			"click",
			this._handlers.retry
		);

		document.removeEventListener("keydown", this._handlers.globalEnter);
	}

	_onStartClick() {
		ui.disable("tg-start");
		this._startShowPhase();
	}
	_onSubmitClick() {
		this._submitAttempt();
	}
	_onEnterKey(e) {
		if (e.key !== "Enter") return;
		// If input is enabled, Enter submits
		if (this._isEnabled("tg-input") && !this._el("tg-input").disabled) {
			this._submitAttempt();
		}
	}

	_onGlobalEnter(e) {
		if (e.key !== "Enter") return;

		// Priority: submit -> next -> start -> retry
		if (this._isEnabled("tg-input") && !this._el("tg-input").disabled) {
			// make sure focus is reasonable
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

	// ---------- Private: phases ----------
	_startShowPhase() {
		const displaySeconds = this.cfg.displaySeconds;

		this._setText("tg-word-idx", this.state.wordIndex + 1);
		this._setText("tg-show-timer", displaySeconds);
		this._setText("tg-round-timer", "-");
		ui.disable(["tg-input", "tg-submit", "tg-next", "tg-retry"]);
		const input = this._el("tg-input");
		if (input) input.value = "";
		this.state.correctStreak = 0;
		this._setText("tg-correct", 0);
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
		this._feedback("Type the word. Wrong entry resets the streak.", null);
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
		const target = this._norm(this.state.currentWord);
		if (!attempt) return;

		if (attempt === target) {
			this.state.correctStreak += 1;
			this._setText("tg-correct", this.state.correctStreak);
			this._feedback("Correct!", true);
			input.value = "";

			if (this.state.correctStreak >= this.cfg.requiredCorrect) {
				this._clearTimers();
				ui.disable(["tg-input", "tg-submit"]);
				ui.enable("tg-next");
				ui.disable("tg-retry");
				this._feedback(
					"Nice! Streak achieved. Proceed to next word.",
					true
				);
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
		if (this.state.wordIndex >= this.state.words.length) {
			this._finishGame();
			return;
		}
		this.state.currentWord = this.state.words[this.state.wordIndex];
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
		this._setWordHidden("");
		this._setText("tg-show-timer", "-");
		this._setText("tg-round-timer", "-");
	}

	// ---------- Private: helpers ----------
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
		// consider visible AND not disabled
		const notDisabled = !el.disabled;
		let visible = true;
		try {
			// if your ui.getVisibilityById supports it, use it
			visible = ui.getVisibilityById(id);
		} catch (e) {
			// fallback: basic check
			visible = !(
				el.style.display === "none" || el.style.visibility === "hidden"
			);
		}
		return notDisabled && visible;
	}
}

// Expose globally
window.TypingMiniGame = TypingMiniGame;
