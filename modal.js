const Modal = class {
	modal = {};
	openCount = 0;
	closeCount = 0;
	hideModalHandler;

	constructor() {
		try {
			console.log(
				"New instance of Modal class initiated. Either register an exisitng div with registerModal(modalId) or create one with createModal()"
			);
		} catch (ex) {
			console.error(
				`Unable to register div with id ${modalId} as a modal!`
			);
			console.log(ex);
		}
	}

	registerModal(modalId) {
		try {
			this.modal = document.getElementById(modalId);
			console.log("Registering close buttons");

			for (let closeButton of this.modal.getElementsByClassName(
				"close-modal-button"
			)) {
				closeButton.addEventListener(
					"click",
					this.hideModal.bind(this)
				);
			}
			return this.modal;
		} catch (ex) {
			console.error(
				`Unable to register div with id ${modalId} as a modal!`
			);
			console.log(ex);
		}
	}

	showModal() {
		this.openCount++;
		if (!this.modal)
			throw new Error(
				`Modal not registered, use registerModal to register a div as a modal first`
			);
		this.modal.style.display = "block";
	}

	hideModal(e) {
		this.closeCount++;
		if (!this.modal)
			throw new Error(
				`Modal not registered, use registerModal to register a div as a modal first`
			);
		this.modal.style.display = "none";
		if (this.hideModalHandler) this.hideModalHandler(this);
	}

	registerModalCloseHandler(handlerFunction) {
		this.hideModalHandler = handlerFunction;
	}

	createModal(
			id = "",
			title = "",
			content = "",
			footer = "",
			variant = "info"
		) {
			const modalWindowContent = `
		<div id="${id}" class="modal modal--${variant}" role="alertdialog" aria-live="assertive" aria-modal="true" style="display:none">
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
			document.body.insertAdjacentHTML("beforeend", modalWindowContent);
			this.registerModal(id);
			return this.modal;
	}
}


function showToast(title='Alert!', message=''){
  const modal = new Modal();

  // 3) get the HTML and inject it as HTML (not text)
  const html = modal.createModal("TEMP_ALERT", title, message);
  document.body.insertAdjacentHTML("beforeend", html);

  // 4) actually call registerModal
  modal.registerModal("TEMP_ALERT");

  // show it
  modal.showModal();
}