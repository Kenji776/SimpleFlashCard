const Modal = class {
	modal = null;
	openCount = 0;
	closeCount = 0;
	hideModalHandler = null;

	constructor() {
		console.log("🪟 Modal class initialized. Use registerModal(id) or createModal() to start.");
	}

	/**
	 * Registers an existing modal element by ID
	 */
	registerModal(modalId) {
		try {
			const modalEl = document.getElementById(modalId);
			if (!modalEl) throw new Error(`Modal element #${modalId} not found`);
			this.modal = modalEl;

			// Always re-parent to <body> so it can overlay hidden UI
			if (this.modal.parentElement !== document.body) {
				document.body.appendChild(this.modal);
			}

			// Wire up close buttons
			const closeButtons = this.modal.getElementsByClassName("close-modal-button");
			for (let btn of closeButtons) {
				btn.addEventListener("click", () => this.hideModal());
			}

			// Optional: allow clicking outside modal content to close
			this.modal.addEventListener("click", (e) => {
				if (e.target === this.modal) this.hideModal();
			});

			return this.modal;
		} catch (ex) {
			console.error(`❌ Unable to register modal: ${ex.message}`);
			console.error(ex);
		}
	}

	/**
	 * Shows the modal with full visibility control and optional fade-in
	 */
	showModal() {
		this.openCount++;
		if (!this.modal) throw new Error("Modal not registered. Use registerModal() first.");

		// Ensure visibility
		this.modal.style.display = "block";
		this.modal.style.visibility = "visible";
		this.modal.style.opacity = "1";
		this.modal.style.pointerEvents = "auto";
		this.modal.removeAttribute("aria-hidden");

		// Move to body to ensure overlay priority
		if (this.modal.parentElement !== document.body) {
			document.body.appendChild(this.modal);
		}

		// Optional fade-in animation (if you have .modal-fade-in CSS)
		this.modal.classList.remove("modal-fade-out");
		this.modal.classList.add("modal-fade-in");

		console.log(`📖 Showing modal (#${this.modal.id}), openCount=${this.openCount}`);
	}

	/**
	 * Hides the modal (with fade-out if supported)
	 */
	hideModal() {
		this.closeCount++;
		if (!this.modal) throw new Error("Modal not registered. Use registerModal() first.");

		console.log(`📘 Hiding modal (#${this.modal.id}), closeCount=${this.closeCount}`);

		// Apply fade-out class if available
		this.modal.classList.remove("modal-fade-in");
		this.modal.classList.add("modal-fade-out");

		// Wait for fade transition, then hide
		const transitionMs = 200; // adjust to match CSS transition
		setTimeout(() => {
			this.modal.style.display = "none";
			this.modal.style.visibility = "hidden";
			this.modal.style.opacity = "0";
			this.modal.setAttribute("aria-hidden", "true");

			if (this.hideModalHandler) this.hideModalHandler(this);
		}, transitionMs);
	}

	/**
	 * Registers a custom function to run when modal is closed
	 */
	registerModalCloseHandler(handlerFunction) {
		this.hideModalHandler = handlerFunction;
	}

	/**
	 * Dynamically creates and registers a modal
	 */
	createModal(id = "", title = "", content = "", footer = "", variant = "info") {
		const modalHTML = `
		<div id="${id}" class="modal modal--${variant}" role="dialog" aria-modal="true" aria-hidden="true" style="display:none;">
			<div class="modal-content">
				<div class="modal-header">
					<span class="close-modal-button modal-close" aria-label="Close">&times;</span>
					<h2>${title}</h2>
				</div>
				<div class="modal-body">${content}</div>
				${footer ? `<div class="modal-footer"><h3>${footer}</h3></div>` : ""}
			</div>
		</div>`;

		// Inject + register
		document.body.insertAdjacentHTML("beforeend", modalHTML);
		this.registerModal(id);
		return this.modal;
	}
};

/**
 * Convenience toast function using Modal
 */
function showToast(title = "Alert!", message = "") {
	const modal = new Modal();
	modal.createModal("TEMP_ALERT", title, message);
	modal.showModal();
	setTimeout(() => modal.hideModal(), 2000);
}
