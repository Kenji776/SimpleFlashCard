const Modal = class {
	
	modal = {}
	openCount = 0;
	closeCount = 0;
	hideModalHandler;
	
	constructor() {
		try{
			console.log('New instance of Modal class initiated. Either register an exisitng div with registerModal(modalId) or create one with createModal()');
		}catch(ex){
			console.error(`Unable to register div with id ${modalId} as a modal!`);
			console.log(ex);
		}
	}
	
	registerModal(modalId){
		try{
			this.modal  = document.getElementById(modalId);
			
			console.log('Registering close buttons');
			
			for(let closeButton of this.modal.getElementsByClassName('close-modal-button')){
				console.log(closeButton);
				closeButton.addEventListener('click', this.hideModal.bind(this));
			}
			
			return this.modal;
		}catch(ex){
			console.error(`Unable to register div with id ${modalId} as a modal!`);
			console.log(ex);
		}
	}
	
	registerModalCloseHandler(handlerFunction){
		this.hideModalHandler = handlerFunction;
	}
	
	showModal(e){
		this.openCount++;
		console.log(this);
		if(!this.modal) throw new Error(`Modal not registered, use registerModal to register a div as a modal first`);
		this.modal.style.display = "block";
	}
	
	
	
	hideModal(e){
		this.closeCount++;
		console.log(this);
		console.log(e);
		if(!this.modal) throw new Error(`Modal not registered, use registerModal to register a div as a modal first`);
		this.modal.style.display = "none";
		
		if(this.hideModalHandler) {
			console.log('Calling modal close handler function!');
			this.hideModalHandler(this);
		}
	}
	
	createModal(id='',title='',content='',footer=''){
		let modalWindowContent = `<div id="${id}" class="modal">
			<!-- Modal content -->
			<div class="modal-content">
				<div class="modal-header">
					<span class="close-modal-button modal-close">&times;</span>
					<h2>${title}</h2>
				</div>
				
				<div class="modal-body">
					${content}
				</div>
				
				<div class="modal-footer">
					<h3>${footer}</h3>
				</div>
			</div>
		</div>`;
	}

}