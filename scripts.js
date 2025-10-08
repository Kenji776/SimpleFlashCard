const settingsName = 'SimpleFlashCardSettings';
const scoresName = 'SimpleFlashCardHighScores';
//const databaseUrl = 'https://daj000002wi3eeas-dev-ed.develop.my.salesforce-sites.com/services/apexrest/flashCard';
var databaseUrl = "http://localhost:3000";

//class objects

let _connectedToServer = false; // backing variable

const appState = {
	get connectedToServer() {
		return _connectedToServer;
	},
	set connectedToServer(value) {
		_connectedToServer = value;
		console.log(`🔔 connectedToServer changed to: ${value}`);
		if(!value) ui.hideElements(".connected-options");
        else ui.showElements(".connected-options");
	},
};
// --- Local .cards support ---
const LOCAL_UPLOAD_VALUE = "__upload_local_cards__";
let usingLocalDeck = false;           // true when deck loaded from local .cards
const LOCAL_PLAY_CATEGORY = "Local";  // label used in deckId generation

var resultsModal = new Modal(); 
var highScoresModal = new Modal();
var serverConnectModal = new Modal();
var cardDetailsModal = new Modal();
var typeAttackModal = new Modal();
var optionsModal = new Modal();
var deckUploadModal = new Modal();

var mascot; //instance of Mascot
var storedSettings = new LS(settingsName); //instance of LS (local storage) object
var storedScores = new LS(scoresName); //instance of LS (local storage) object
let flashCardClient;
const utils = new Utils();
const template = new Template();
let labels = new Labels();
var serverPassword = "";

var showLogs = true;
var deckUrl;
var cardLibrary = {};
var currentCard = {};
var cardIndex = -1;
var promptKey = 'brandName';
var answerKey = 'genericName';
var cards = [];
var config = {};
var useRandom = false;
var hintIndex = 0;
var currentAnswer;
var viewedCards = [];
var preventDuplicates = true;
var availableCards = [];
var hintText = 'Stuck? Try clicking Show Drug Class or Show Next Letter!';
var historyEntryToWrite;
var showHistory = true;
var selectedDeckCategory;
var showUi = false;
var categories = [];
var autoLoadNextCardOnAnswer = false;
var selectedVariantDeck = '';
var userName = 'Test User';
var cardLabel = "Card Details";
var mascotLeaveLimit = 15;

//audio
let fanfareAudio = null;

//final score tally objects
var scoreTally = {
	targetNode: {},
	tallyAnimationInterval: {}, //interval timer
	currentTally: 0, //current value of score tally
	totalScore: 0, //score to reach to clear tally
	tallyIntervalMS: 1 //how often to incriment the display
}

//overall score/performance data. Created when deck is loaded
var performance;

//options
var options = {
	deckControls: {
		autoProgress: true,
		randomOrder: true,
		hideHistory: false,
		hideTimer: false,
		hideScore: false,
		hideMascots: false,
		promptKey: '',

		//typing game options
		displaySeconds: 3,     // N: how long the word is visible before typing starts
		requiredCorrect: 3,    // X: correct streak needed for each word
		roundSeconds: 20,      // Y: time limit to achieve the streak (after the word hides)
		caseSensitive: false,  // compare with case sensitivity or not
		shuffleWords: true     // randomize the input list

	}
}

const typingGame = new TypingMiniGame({ modalId: "type-attack-modal" });

async function init() {
	updateUiForState("init");
	registerKeyboardShortcuts();
	registerPersistantDataStorage();
	resultsModal.registerModal("results-modal");
	cardDetailsModal.registerModal("card-details-modal");
	optionsModal.registerModal("options-modal");
	deckUploadModal.registerModal("deck-upload-modal");
	typeAttackModal.registerModal("type-attack-modal");

	resultsModal.registerModalCloseHandler(() =>
		ui.hideElements("confetti_outer")
	);
	highScoresModal.registerModal("high-scores-modal");

	serverConnectModal.registerModal("server-connect-modal");
	serverConnectModal.showModal();
    window.addEventListener("resize", handleResize);

    
}

function debounce(func, delay) {
    let timeoutId;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(context, args);
        }, delay);
    };
}

// Event handler function
const handleResize = debounce(function(event) {
    // Get the new window dimensions
    var newWidth = window.innerWidth;
    var newHeight = window.innerHeight;

    labels = new Labels();
    console.log('Got new labels');
    console.log(labels);
    // Do something with the new dimensions
    console.log('Window resized to width: ' + newWidth + ', height: ' + newHeight);
}, 200); // Adjust the delay as needed



async function connectToServer() {
	const {
		connectButton,
		connectButtonText,
		connectSpinner,
		connectStatus,
	} = getConnectElements();

	try {
		startLoading(
			connectButton,
			connectButtonText,
			connectSpinner,
			connectStatus
		);
		const urlInput = getServerUrl();
		const username = userName; // Make sure userName is defined in your context
        
        console.log('Got server URL: ' + urlInput);
		databaseUrl = urlInput;
		console.log('Connecting to server: ' + databaseUrl);
        flashCardClient = new FlashcardServerClient(
			databaseUrl,
			serverPassword
		);
		await announceToServer(urlInput, username, connectStatus);
		//const apiKey = await initializeElevenLabs(urlInput, connectStatus);

		await performPostConnectionSetup(connectStatus);

		appState.connectedToServer = true;
		serverConnectModal.hideModal();
	} catch (err) {
		console.error("❌ Connection failed:", err);
		alert(`Connection failed: ${err.message}`);
	} finally {
		stopLoading(
			connectButton,
			connectButtonText,
			connectSpinner,
			connectStatus
		);
	}
}
function getConnectElements() {
	return {
		connectButton: document.getElementById("connect-button"),
		connectButtonText: document.getElementById("connect-button-text"),
		connectSpinner: document.getElementById("connect-spinner"),
		connectStatus: document.getElementById("connect-status"),
	};
}

function startLoading(button, buttonText, spinner, statusElement) {
	button.disabled = true;
	buttonText.style.display = "none";
	spinner.style.display = "inline-block";
	updateStatus(statusElement, "Connecting to server...");
}

function stopLoading(button, buttonText, spinner, statusElement) {
	button.disabled = false;
	buttonText.style.display = "inline";
	spinner.style.display = "none";
	updateStatus(statusElement, "");
}

function updateStatus(element, message) {
	element.textContent = message;
}

function newGame(){
   	try {
		console.log("🔁 Starting new game...");
		resultsModal.hideModal();
        // 🔇 Stop any fanfare still playing
        if (fanfareAudio) {
            try {
                fanfareAudio.pause();
                fanfareAudio.currentTime = 0;
                console.log("🔇 Fanfare stopped.");
            } catch (err) {
                console.warn("⚠️ Could not stop fanfare:", err);
            }
        }
		resetHistory(); // clear previous session

        if (cards && cards.length > 0) {
            
            handleLoadDeckSelect();
        } else {
            console.warn("⚠️ No cards available to load yet. Waiting for deck initialization.");
        }
	} catch (err) {
		console.error("❌ Failed to start new game:", err);
		handleError(err);
	} 
}
function getServerUrl() {
	databaseUrl = document.getElementById("server-url").value.trim();
    databaseUrl = databaseUrl.endsWith("/") ? databaseUrl.slice(0, -1) : databaseUrl;
	if (!databaseUrl) {
		throw new Error("Please enter a server URL.");
	}
	return databaseUrl;
}

async function announceToServer(url, username, statusElement) {
	updateStatus(statusElement, "Announcing to server...");
    const response = await flashCardClient.announce(username);
    if (!response.success) {
        throw new Error(response.message || "Failed to announce to server.");
    }
}



async function performPostConnectionSetup(statusElement) {
	updateStatus(statusElement, "Loading card library...");
	await loadCardLibrary();

	updateStatus(statusElement, "Initializing mascot...");
	loadMascotOptions();

	updateStatus(statusElement, "Finalizing...");


	const settings = loadSettings();
	if (settings?.config?.username) {
		setUsername(settings.config.username);
	}

}
    
async function loadCardLibrary(){
    doLog('Loading card library');
    const result = await flashCardClient.listDecks();
    cardLibrary = result.data;
    setDeckCategories(cardLibrary, "deck-category");
    setDeckCategories(cardLibrary, "upload-existing-category");
}

async function sendScore() {
	try {
		// ✅ Guard against missing local deck flag
		if (typeof usingLocalDeck !== "undefined" && usingLocalDeck) {
			console.log("Local deck: high-score submission disabled.");
			return;
		}

		// ✅ Validate userName
		if (typeof userName !== "string" || userName.trim().length === 0 || userName === "Your Name Here") {
			console.warn("No valid username set. Score will not be sent.");
			return;
		}

		// ✅ Guard against missing performance object
		if (typeof performance !== "object" || performance == null) {
			console.warn("Performance object is missing or invalid. Cannot send score.");
			return;
		}

		// ✅ Validate deckId
		if (!Object.prototype.hasOwnProperty.call(performance, "deckId") || !performance.deckId || (typeof performance.deckId === "string" && performance.deckId.trim().length === 0)) {
			console.warn("Performance deckId is missing or invalid. Cannot send score.");
			return;
		}

		// ✅ Validate performanceRecordId
		if (!performance.performanceRecordId) {
			console.warn("Performance record ID is missing. Cannot send score.");
			return;
		}

		console.log("Sending Score! with value: " + performance.runningTotalScore);

		// ✅ Safe call to flashCardClient
		if (!flashCardClient || typeof flashCardClient.submitScore !== "function") {
			console.error("flashCardClient or submitScore() is not available. Aborting send.");
			return;
		}


		let createResult = await flashCardClient.submitScore({
			deckId: utils?.formatId ? utils.formatId(performance.deckId) : performance.deckId,
			performanceRecordId: performance.performanceRecordId,
			player: userName,
			score: typeof performance.runningTotalScore === "number" ? performance.runningTotalScore : 0,
		});

		console.log("Result of high score create:", createResult);
	} catch (err) {
		console.error("❌ Error while sending score:", err);
	}
}



function registerKeyboardShortcuts(){
	
 
	document.onkeydown = function (e) {
        const tag = (e.target && e.target.tagName) || "";
        console.log('Keydown handler fired');
        console.log(isAnyModalOpen());
		if (tag === "INPUT" || tag === "TEXTAREA" || isAnyModalOpen()) {
            // Stop ALL other keydown listeners from firing
            e.stopImmediatePropagation();
            return;
        }
		e = e || window.event;
		// use e.keyCode
		
        console.log('Made it past')
        //up arrow
		if (e.keyCode == "38") showAnswer();
		//down arrow
		else if (e.keyCode == "40") performHintAction();
		// left arrow
		else if (e.keyCode == "37") loadPrev();
		//right arrow
		else if (e.keyCode == "39") loadNext();
		//"h"
		else if (e.key == "h") showClue();
		//1
		else if (e.key == "1") answerCorrect();
		//2
		else if (e.key == "2") answerIncorrect();
		//"s"
		else if (e.key == "s") saveSettings();
		//"l"
		else if (e.key == "l") loadSettings();
		//"r"
		else if (e.key == "r") savePerformance();
		//"p"
		else if (e.key == "p") getPastPerformanceData();
		else if (e.key == "m") generateMnemonic();
        
        e.preventDefault();
	};
}

function isAnyModalOpen() {
	const isVisible = (el) => {
		if (!el || el.hidden || el.getAttribute("aria-hidden") === "true") return false;
		const cs = window.getComputedStyle(el);
		if (cs.display === "none" || cs.visibility === "hidden" || cs.visibility === "collapse") return false;
		// Has on-screen box (works for position:fixed too)
		return el.getClientRects().length > 0;
	};

	return Array.from(document.querySelectorAll("div.modal")).some(isVisible);
}


function savePerformance() {
	try {
		// ✅ Guard against missing performance object
		if (typeof performance !== "object" || performance == null) {
			console.warn("Performance object is missing or invalid. Aborting save.");
			return;
		}

		// ✅ Guard against missing deckId
		if (
			!Object.prototype.hasOwnProperty.call(performance, "deckId") ||
			!performance.deckId ||
			(typeof performance.deckId === "string" && performance.deckId.trim().length === 0) ||
			(Array.isArray(performance.deckId) && performance.deckId.length === 0)
		) {
			console.warn("No valid deckId found in performance. Aborting save.");
			return;
		}

		// ✅ Ensure storedScores is valid
		let performanceHistory = Array.isArray(storedScores?.value) ? [...storedScores.value] : [];

		// ✅ Check for a valid performanceRecordId
		if (!performance.performanceRecordId) {
			console.warn("No performanceRecordId found. Saving as a new record.");
			performanceHistory.push(performance);
		} else {
			// ✅ Find index safely
			let existingIndex = performanceHistory.findIndex((obj) => obj && typeof obj === "object" && obj.performanceRecordId === performance.performanceRecordId);

			if (existingIndex !== -1) {
				performanceHistory[existingIndex] = performance;
			} else {
				performanceHistory.push(performance);
			}
		}

		storedScores.value = performanceHistory;

		console.log("✅ Saved Performance Data!");
		console.log(storedScores.value);
	} catch (err) {
		console.error("❌ Error saving performance:", err);
	}
}


function saveSettings(){
    let currentSettings = storedSettings.getPersistentValuesFromUI();
    storedSettings.value =currentSettings;

    console.log('Current Settings');
    console.log(currentSettings);
    //mascot.say("Settings Saved " + userName);
}

function loadSettings(){
	
    let savedSettings = storedSettings.value;
    let affectedElements = storedSettings.setPersistantValuesInUI(savedSettings);

    //this is a really stupid way to do this, but instead of manually calling each function an input would set I just iterate over them and call
    //their onclick function. This will only really work for like buttons and checkboxes and such. 
    for(let thisNode of affectedElements){

        if(!thisNode || !thisNode.type) continue;
        if((thisNode.type == 'checkbox' && thisNode.checked) || (thisNode.type != 'checkbox') ){
            if(thisNode.getAttribute('onclick')){
                eval(thisNode.getAttribute('onclick'));
            }
            if(thisNode.getAttribute('onchange')){
                eval(thisNode.getAttribute('onchange'));
            }
        }
    }

    console.log('Saved Settings');
    console.log(savedSettings);
    return savedSettings;
}

async function loadSelectedMascot() {
	const selectedFile = document.getElementById("mascot-selector").value;
	if (!selectedFile) {
		alert("Please select a mascot file.");
		return;
	}

	try {
        const mascotData = await flashCardClient.getMascotSettings(selectedFile);
        if (mascot) mascot.destroy();
        mascot = new Mascot(mascotData, flashCardClient);
        console.log("✅ Loaded mascot data", mascot);
        mascot.initMascot();

	} catch (err) {
		console.error("❌ Failed to load mascot:", err);
		mascot.say("Error loading mascot.", "sad");
	}
}

function getPastPerformanceData(){
    console.log(performance);

    let pastPerformances = performance.getPreviousResults(storedScores.value);
    console.log('All Previous Results for this deck');
    console.log(pastPerformances);
}

function setUsername(value){
    userName = value;
}

/**
* @description Adds event handlers to all inputs that are marked as data-persistent=true so that any time they are changed by the user (clicked, change, keyup) the 
* values are saved to local storage. It's not terrible efficient but it works well enough for now
*/
function registerPersistantDataStorage(){
    let nodeList = document.querySelectorAll('input[data-persistent=true]');
    let values = {};
    let activityEvents = ['click','change','keyup',];

    
    for(let thisNode of nodeList){
        for(let thisEvent of activityEvents){
            thisNode.addEventListener(thisEvent, function() {           
                saveSettings();
            });
        }
    }
    
}
/**
 * @description sets all of the potential deck category options from the card library
 * @param {} deckData 
 * @returns 
 */
function setDeckCategories(deckData, selectName) {
	doLog("Getting categories from deckData");
	doLog(deckData);
	let optionsArray = [];
	optionsArray.push({ value: null, label: "--Select One---" });

	for (let categoryName in deckData.card_stacks.categories) {
		optionsArray.push({ value: categoryName, label: categoryName });
	}

	doLog("Writting options array");
	doLog(optionsArray);
	setSelectOptions(selectName, optionsArray, null, false, true);
	return categories;
}
function setInitialButtonStates() {
	// Hard-disable action buttons until the right app states happen
	ui.disable([
		"load-deck-button",
		"type-attack-button",
		"prev-button",
		"next-button",
		"clue-button",
		"next-letter-button",
		"next-answer-button",
		"mnemonic-button",
		"flip-button",
		"high-scores-button",
	]);
}
/*
* @description Populates the provided select element with options from the selected deck category
*/
function setDeckOptions(categoryOptions=[], selectName = "card-deck") {
    //cardLibrary.card_stacks.categories;

	let optionsArray = [];
	doLog("Select deck options for selectedDeck " + selectedDeckCategory);
	doLog(categoryOptions);

	doLog("Selected category: " + selectedDeckCategory);
	for (let deckIndex in categoryOptions[0]) {
		let deck = categoryOptions[0][deckIndex];

		doLog(deck);
		optionsArray.push({
			value: deck.deck_slug, // was deck.url
			label: deck.name,
		});
	}

	setSelectOptions(selectName, optionsArray, null, false, true);

	// Set default deck slug to first element in list
	deckUrl = optionsArray[0].value;
}

async function loadMascotOptions() {
	const response = await fetch(`${databaseUrl}/api/mascots?password=${encodeURIComponent(serverPassword)}`);

    console.log(
		`Trying to fetch mascots from ${databaseUrl}/api/mascots?password=${encodeURIComponent(serverPassword)}`
	);
	const data = await response.json();

	const select = document.getElementById("mascot-selector");
	select.innerHTML = ""; // Clear old options
	data.mascots.forEach((fileName) => {
		const option = document.createElement("option");
		option.value = fileName;
		option.textContent = fileName;
		select.appendChild(option);
	});

    if(data.mascots && data.mascots.length > 0){
        loadSelectedMascot();
    }
}

function setVariantDeckOptions(){
    let optionsArray = [];
    doLog('Select deck options for variant deck options');
    doLog(cardLibrary)
	
	doLog('Selected category: ' + selectedDeckCategory);
    for(let variantIndex in config.variants){
        let variant = config.variants[variantIndex];

        doLog(variant);
        optionsArray.push({'value':variant.name,'label':variant.name});
    }
    setSelectOptions('load-variant-select', optionsArray, null, false, true);

    if(optionsArray.length == 0 ) {
        doLog('No variants found?');
        debugger;
        selectedVariantDeck = optionsArray[0].value;
    }
    
}

function setSelectedDeckCategory(categoryId) {
	if (categoryId) {
		selectedDeckCategory = categoryId;

        console.log('Getting decks for category: ' + categoryId);
        console.log(cardLibrary);
		setDeckOptions(
			cardLibrary.card_stacks.categories[selectedDeckCategory],
			"card-deck"
		);
		ui.enable("card-deck");
		ui.enable("load-deck-button");
	}
}

function handleSetSelectedDeck(value){
	if(value){
		doLog('Setting deck url to...' + value);
        const select = document.getElementById("card-deck");
        const idx = select.selectedIndex;
        const selectedValue = select.options[idx].value;
        deckUrl = selectedValue;
		doLog('Deck url is...' + deckUrl);
		
	}
}

function handleSetSelectedVariant(value){
    doLog('Setting deck url to...' + value);

    selectedVariantDeck = value;
}

async function handleUploadFile(){
  try {
    const res = await uploadDeckFromInputs({
		uploader: flashCardClient,
		overwrite: false,
	});

    if(!res || !res.success){
        if(res.message) throw res.message;
        else throw 'Uknown error uploading'
    }
    console.log("Upload successful:", res);
    showToast("Deck uploaded successfully!", "Your deck has been successfully upload and is now available", "success");

    loadCardLibrary();
    // show a toast / refresh list etc.
  } catch (err) {
    console.error("Upload failed:", err);
    handleError(err, err?.message ? err.message : err);
  }
}

function loadVariantDeck(){
    doLog('Loading custom variant deck: ' + selectedVariantDeck);

    let variantConfig = config.variants[selectedVariantDeck];

    doLog(variantConfig);

    generateDeckFromData(new ShuffleDeckConfig({config: config, cards: cards}, variantConfig));
}

async function handleLoadDeckSelect() {
	doLog("handleLoadDeckSelect called with deckUrl: " + deckUrl);
	let deckData = await fetchRemoteDeck(deckUrl);
    const answerCard = document.getElementById("answer-card");

    debugger;

    if (answerCard) {
        // Show/hide front and back manually
        const front = answerCard.querySelector(".flip-card-front");
        const back = answerCard.querySelector(".flip-card-back");

        if (front && back) {
            front.style.visibility = "visible";
            back.style.visibility = "hidden";
        }
    }
	loadDeck(deckData);
}

async function fetchRemoteDeck(deckSlug) {
	if (!deckSlug || deckSlug == "none") {
		console.warn("No deck slug provided to load deck. Aborting");
		return;
	}
	doLog("Loading card library slug: " + deckSlug);

    const deckDataResult = await flashCardClient.getDeck(deckSlug);
	return deckDataResult.data;
}

async function loadDeck(deckData){
    
    doLog('loadDeck Loading deck with data');
    console.log(deckData);

    performance = new PerformanceRecord({'deckId':selectedDeckCategory+'-'+deckData.config.name});

    setHighScoresFrame(performance.deckId);

    if(!deckData) {
        handleError( new Error('Deck data not provided. Aborting Load'));
        return;
    }

    resetHistory();
        cards = assignCardIds(deckData.cards);

        availableCards = cards;
        config = deckData.config;
		// Reset indices & state
		cardIndex = -1;
		viewedCards = [];
		availableCards = [...cards];
		scoreTally = {};
		performance.reset();

		// Reset UI
		ui.showElements(["deck-controls", "controls"]);
		ui.hideElements(["results-modal", "confetti_outer", "deck-complete-header", "new-high-score-alert"]);
		updateUiForState("init");
        document.getElementById("content-header").innerHTML= `Card Stack: ${config.name} - ${cards.length} Cards`; 
        document.title = config.name;
        
        setPromptKey(config.defaultPrompt);
        
        setSelectOptions('prompt-key', config.promptKeys, promptKey, true, true);
        //setSelectOptions('answerKey', config.answerKeys, answerKey, true);
        //loadCard(0);

        if(!config.isVariant) setVariantDeckOptions();

        var clueBtn = document.getElementById("clue-button");
        clueBtn.innerHTML  = config?.labels?.clueButtonName ? config.labels.clueButtonName : 'Clue';

        doLog('Set clue button name to: ' + clueBtn.innerHTML );
        doLog(config.labels);

        ui.hideElements('intro-slide-image');
        ui.showElements('deck-loaded-image');

        setNavigationButtonStates(0,cards.length);
        
        document.getElementById("prompt").innerHTML= `${config.name} Loaded. Press Next To Begin`;

        updateUiForState("deckLoaded");

}

function setHighScoresFrame(deckId){
    document.getElementById('scores-frame').src = `scores.html?deck=${utils.formatId(deckId)}&server-url=${databaseUrl}`;
}

function handleShowHighScores(){
    console.log('Showing scores modal!');
    highScoresModal.showModal();
}

function generateDeckFromData(shuffleConfig=new ShuffleDeckConfig()){
    doLog('Generating Custom Deck From Config');
    doLog(shuffleConfig);

    try{

        let newCards = [];
        let newConfig = config;

        //if we are building a custom deck by grouping cards by a property and generating multiple choice questions then start here
        if(shuffleConfig.options.shuffleType == 'group-by'){

            let answerLabelProperty = shuffleConfig.options.answerLabelProperty;
            let answerValueProperty = shuffleConfig.options.answerValueProperty;
            doLog('Shuffling Deck. Grouping by: ' + shuffleConfig.options.groupBy);

            let groups = {};
            //group our cards by the desired key
            for(let thisCard of shuffleConfig.sourceDeckConfig.cards){
                let thisGroupCards = groups.hasOwnProperty(thisCard[shuffleConfig.options.groupBy]) ? groups[thisCard[shuffleConfig.options.groupBy]] : [];
                
                if(thisCard[shuffleConfig.options.groupBy] === undefined){
                    if(mascot) mascot.say('There is some bad data in the card set. This drug has an undefined group!','confused');
                }

                thisGroupCards.push(thisCard);
                groups[thisCard[shuffleConfig.options.groupBy]] = thisGroupCards;

            }

            //if building a multiple choice deck...
            if(shuffleConfig.options.deckType === 'multiple-choice'){
                                
                for(let groupName in groups){
                    let thisGroupCorrectAnswers = [];
                    //first generate list of correct options
                    for(let thisAnswer in groups[groupName]){

                        if (thisGroupCorrectAnswers.some(e => e.value === groups[groupName][thisAnswer][answerValueProperty])) continue; //dont include duplicates
                        let thisOption = {
                            value: groups[groupName][thisAnswer][answerValueProperty],
                            label: groups[groupName][thisAnswer][answerLabelProperty]
                        }
                        thisGroupCorrectAnswers.push(thisOption);
                    }


                    //construct our answer array
                    let allOptionsArray = [];
                    let correctAnswerIndexes = [];
                    let allValidAnswers = JSON.parse(JSON.stringify(thisGroupCorrectAnswers));

                    while(true) {
                        //decide if we get a correct anwer by 'flipping a coin' and by ensuring there is a correct answer left to get from the source array.
                        let getCorrectAnswer = randomIntFromInterval(0,1) == 1 && thisGroupCorrectAnswers.length > 0 ? true : false;
                 
                        if(getCorrectAnswer){
                            //get the index of a random card in the correct answers stack
                            let index = randomIntFromInterval(0,thisGroupCorrectAnswers.length-1);

                            //read that option from the source array and put it into our selectable options array
                            let randomCorrectAnswer = thisGroupCorrectAnswers[index];

                            allOptionsArray.push(randomCorrectAnswer);

                            if(randomCorrectAnswer.label == undefined || randomCorrectAnswer.value == undefined) debugger;

                            //record the index position of this correct answer
                            correctAnswerIndexes.push(allOptionsArray.length-1);

                            //remove this element from the source array so it cannot be added again.
                            thisGroupCorrectAnswers.splice(index,1)
                        }else{
                            //get a random different answer from a different group. Use random selection in while loop to prevent selecting this group
                            let wrongAnswerGroup = '';
                            while(true){
                                let keys = Object.keys(groups);
                                let wrongAnswerGroupName = keys[ keys.length * Math.random() << 0];

                                wrongAnswerGroup = groups[wrongAnswerGroupName];
                                if(wrongAnswerGroupName != groupName) break;
                            }
    
                            //get the index of a random card in the correct answers stack
                            let index = randomIntFromInterval(0,wrongAnswerGroup.length-1);

                            //read that option from the source array and put it into our selectable options array
                            let randomWrongAnswer = wrongAnswerGroup[index];

                            //allOptionsArray.push(randomWrongAnswer);

                            allOptionsArray.push({
                                label: randomWrongAnswer[answerLabelProperty],
                                value: randomWrongAnswer[answerValueProperty]
                            });
                            
                        }


                        //check all conditions to see if we should stop adding answers
                        if( allOptionsArray.length >= shuffleConfig.options.maxAnswerOptions){
                            break;
                        }
                    }

                    let newCard = new Card({
                        type: 'choice',
                        questionText: `Which of the following are ${groupName}`, //(${correctAnswerIndexes.join(',')})`,
                        points: 1,
                        hint: 'There are ' + correctAnswerIndexes.length + ' correct answers',
                        options: allOptionsArray,
                        correctAnswerValues: correctAnswerIndexes,
                        allValidAnswers: allValidAnswers
                    });

                    newCards.push(newCard);
                }

            }

            doLog('Grouped cards is now');
            doLog(groups);

            doLog('Generated New Card Deck');
            doLog(newCards);

            newConfig = {  
                    "promptKeys": [
                    {
                        "value": "questionText",
                        "label": "Question"
                    }],
                    "answerKeys": [
                    {
                        "value": "questionText",
                        "label": "Question"
                    }],
                    "defaultPrompt": "questionText",
                    "clueTextKey": "hint",
                    "labels": {
                        "questionText": "Answer me this!",
                        "clueButtonName": "Seriously. A hint?"
                    }
            };

            newConfig.name = 'Custom Deck Build';
            newConfig.isVariant = true;
        
            let cards = assignCardIds(newCards.cards);
            doLog(JSON.stringify(cards));
            loadDeck({
                config: newConfig,
                cards: newCards
            });
        }
    }catch(ex){
        handleError(ex);
    }
}

/**
* @description ensures that every card has a unique ID so that can be identified between the stack containing all cards (window.cards) and all available cards (window.availableCards)
* @param {Array} cards a array of card objects which to assign ids if they do not posses one.
* @returns list of cards with set modified ids
*/
function assignCardIds(cards) {
	return cards.map((card) => ({
		...card,
		id:
			card.id ||
			Date.now().toString(36) +
				Math.random()
					.toString(36)
					.substr(2),
	}));
}

function getCardById(cardId){
    return cards.find(card => card.id === cardId);
}

/**
* @description Loads a requested card into view. If the card already exists in the stack, it moves to that index position and displayed it. If not
* the card is loaded from the available stack and displayed. The card is then removed from the available list
* @param {*} cardId 
* @param {*} forceIndex 
*/
function loadCard(cardId, forceIndex){

    try{
    
        //flip the card back to the question side
        document.getElementById('answer-card').classList.remove("flip-card-flipped")
        
        hintIndex = 0;

        //find the current card information by using the id
        doLog('Getting card with id: ' + cardId);
        currentCard = getCardById(cardId);


        if(forceIndex) {
            doLog('Forcing index to: ' +forceIndex);
            cardIndex = forceIndex;
        }
        
        doLog(currentCard);


        setSelectedHistoryCard(currentCard.id);
        
        removeCardFromAvailable(currentCard.id);

        let promptVal = promptKey;
        let answerVal = answerKey;
        let selectedAnswerKeyText = '';
        let selectedPromptKeyText = '';

   

        //if this is a multple choice question then we can't randomize the answers
        if(currentCard.hasOwnProperty('options')){
            doLog('Multiple Choice Card Selected');
            doLog(currentCard);

        }else{
            try{
                if(promptKey == 'random'){
                    doLog('Randomizing prompt value');	
                    promptVal = config.promptKeys[Math.floor(Math.random()*config.promptKeys.length)].value;
                }
                if(answerKey == 'random'){
                    doLog('Randomizing answer value');
                    answerVal = config.answerKeys[Math.floor(Math.random()*config.answerKeys.length)].value;		
                }
            }catch(ex){
                console.warn('Unable to randomize question');
                console.error(ex);
                handleError(ex);
            }
            selectedAnswerKeyText = config.answerKeys.find((x) => x.value === answerVal)?.label ?? "Response";

            selectedPromptKeyText = config.promptKeys.find((x) => x.value === promptVal)?.label ?? "Prompt";
        }


		const detailsFrame = document.getElementById("card-details-frame");
		//set card notes info if we have it
		if (
			currentCard &&
			typeof currentCard.note !== "undefined" &&
			String(currentCard.note).trim() !== ""
		) {
			if (detailsFrame) {
				document.getElementById(
					"card-details-title"
				).innerHTML = currentCard[promptVal]
				detailsFrame.innerHTML = utils.decodeHtml(
					String(currentCard.note)
				);
				ui.showElements("show-card-detail-button");
			} else {
				throw "Details frame is not available";
			}
		} else {
			ui.hideElements("show-card-detail-button");
		}

        //create the history entry if it doesn't exist for this card.
        if(!viewedCards.some(e => e.id === currentCard.id)) {
            doLog('Viewed cards does not have an entry for id: ' + currentCard.id);
            doLog(viewedCards)
            doLog('Creating history item for card');
            doLog(currentCard);
            createHistoryEntry(currentCard,viewedCards.length,currentCard[promptVal]);
            viewedCards.push(currentCard);
        }

        ui.hideElements('answer-buttons');
        if(currentCard.type == 'choice'){
            //get the text of the current correct answer for a choice question by using the correctAnswerValue property of the question definition to then read that object's label
            //currentAnswer = currentCard.options.find(function(o){ return o.value===currentCard.correctAnswerValues}).label;


            currentAnswer = 'Choice card logic needs fixing...'

            ui.showElements('next-answer-button');
            ui.hideElements('next-letter-button');
            
        }else{
            doLog('current card is unknown type. Prompt text');
            currentAnswer = promptVal == config.defaultPrompt ? currentCard[config.defaultAnswer] : currentCard[config.defaultPrompt];

            //ui.setAttribute('correct-icon-button','correctValue,',selectedAnswerKeyText);
            //ui.setAttribute('incorrect-icon-button','correctValue,',selectedAnswerKeyText);

            ui.hideElements('next-answer-button');
            ui.showElements('next-letter-button');

            ui.showElements('answer-buttons');

        }

        if(!currentAnswer || currentAnswer.length === 0){
            alert('Unable to determine correct answer for this card. Please check card definition to ensure it has all properties set. See developer console for card info.');
            console.warn('Incomplete card info');
            doLog(currentCard);
        }else{
            doLog('Current correct answer is: ' + currentAnswer);
        }

        document.getElementById("prompt").innerHTML= `${selectedPromptKeyText}<br/> <span class="prompt-text">${currentCard[promptVal]}</span>`; 
        
        if(currentCard.type == 'choice'){
            document.getElementById("answer").innerHTML= document.getElementById("prompt").innerHTML;

            document.getElementById("answer").appendChild(generateSelectListFromOptions(currentCard.options,currentCard.correctAnswerValues));
        }else{
            // Remove 'note' from what we feed into the answer generator
            const cardForAnswer = { ...currentCard };
            if ("note" in cardForAnswer) delete cardForAnswer.note;

            document.getElementById(
                "answer"
            ).innerHTML = `${generateAnswerText(cardForAnswer)}`;
        }
        
        
        document.getElementById("clue-text").innerHTML=currentCard[config.clueTextKey];
        document.getElementById("clue-text-no-mascot").innerHTML = currentCard[config.clueTextKey];
        //document.getElementById('answer').style.visibility='hidden';
        document.getElementById('clue-text').style.visibility='hidden';
        document.getElementById("clue-text-no-mascot").style.visibility = "hidden";
        document.getElementById('hint-text').style.visibility='hidden';

        document.getElementById("viewed-total").innerHTML = `${viewedCards.length} / ${cards.length}`;
    }catch(ex){
        handleError(ex);
    }
		
}

function removeCardFromAvailable(cardId){
    availableCards = availableCards.filter(item => item.id !== cardId);
}

function setSelectedHistoryCard(cardId){
    
    var elems = document.querySelectorAll(".history-item");

    [].forEach.call(elems, function(el) {
        el.classList.remove("selected-history-item");
    });

    doLog('Attempting to highlight card with index: ' + cardId);
    try{
        let matchingCards = document.querySelectorAll(`.history-item[data-card-id="${cardId}"]`);
        if(matchingCards.length > 0){
            ui.addClass(matchingCards, 'selected-history-item');
        }
    }catch(ex){
        handleError(ex);
    }
}

function generateAnswerText(card){
    let answerString = '';
    for (const [key, value] of Object.entries(card)) {
        if(key == 'id' || typeof value === 'object') continue;
        let keyLabel = config.labels.hasOwnProperty(key) ? config.labels[key] : key;
        answerString += `${keyLabel}: ${value} </br>`;
    }
    return answerString;
}

function recordQuestionResponse(card,givenAnswers,correctAnswers,awardedPoints){
    if(!isArray(givenAnswers)) givenAnswers = [givenAnswers];
    if(!isArray(correctAnswers)) correctAnswers = [correctAnswers];

    const thisAnswer = new Answer({
        "card": card,
        "givenAnswers": givenAnswers,
        "correctAnswers": correctAnswers,
        "awardedPoints": awardedPoints,
        "possiblePoints" : card.points ? card.points : 1,
        "correct": JSON.stringify(givenAnswers.sort()) === JSON.stringify(correctAnswers.sort()) ? true : false,
        "question": card
    });

    performance.recordAnswer(thisAnswer);

    if(thisAnswer.correct) {
        correctAnswerAlert()
    }
    else {
        incorrectAnswerAlert();

        if(performance.missStreak >= mascotLeaveLimit){
            if (mascot) mascot.rageQuit("sad_leave");
        }
    }
    if(autoLoadNextCardOnAnswer) loadNext();
}

function updateUIWithPerformanceData(performanceData){

    console.log('Updating UI With Performance Data');
    console.log(performanceData);

    document.getElementById('score-total').innerHTML =`${performanceData.numberCorrect} / ${performanceData.numberOfQuestions-performanceData.numberUnanswered}`;
    document.getElementById('points-total').innerHTML =`${performanceData.currentPoints} / ${performanceData.possiblePoints}`;
    document.getElementById('streak-total').innerHTML = performanceData.streak;
    

	if(performanceData.numberOfQuestions-performanceData.numberUnanswered >= 1){
		document.getElementById('score-grade').innerHTML =`${performanceData.numberCorrectGrade}`;
		document.getElementById('score-grade').setAttribute('data-grade',performanceData.numberCorrectGrade.slice(0,1).toLowerCase());
	}else{
		document.getElementById('score-grade').innerHTML = '';
	}
	
    document.getElementById('streak-total').setAttribute('data-grade',performanceData.numberCorrectGrade.slice(0,1).toLowerCase());
    
    if(performanceData.pointsScorePercent === 100) {
        ui.showElements('point-sparkles');
        ui.addClass('points-total-animations','pulse');
    }
    else  {
        ui.hideElements('point-sparkles');
        ui.removeClass('points-total-animations','pulse');
    }
    
    
    if(performanceData.correctPercent === 100 && performanceData.numberOfQuestions > 0) {
        ui.showElements('score-sparkles','inline');
        ui.addClass('score-total-animations','pulse');
    }
    else  {
        ui.hideElements('score-sparkles');
        ui.removeClass('score-total-animations','pulse');
    }
}

function getCorrectAnswerText(){

    doLog('------------------------------------------------- Getting saying for performance streak: ' + performance.streak);

    wordsToUse = 'correctAnswerResponses';

    if(performance.streak >= 15){
        wordsToUse='streak_2_responses';
    } else if(performance.streak >= 5){
        wordsToUse='streak_1_responses';
    }     
    return wordsToUse;

}

function getIncorrectAnswerText(){

    wordsToUse = 'incorrectAnswerResponses';

    if(performance.missStreak >= mascotLeaveLimit){
        wordsToUse = 'leave'
    }
    else if(performance.missStreak >= 10){
        wordsToUse = 'fail_streak_2_responses';
    }else if(performance.missStreak >= 5){
        wordsToUse = 'fail_streak_1_responses';
    }
    return wordsToUse;
}

function correctAnswerAlert(){
    if (mascot) mascot.sayRandom(getCorrectAnswerText(), "happy");
}

function incorrectAnswerAlert(){
    if (mascot) mascot.sayRandom(getIncorrectAnswerText(), "sad");
}

function generateMnemonic(){
    console.log('Calling Chat GPT!');
    console.log(currentCard);
    let question = 'Please give me a Mnemonic Device to remember the pairing of ' +currentCard[config.defaultPrompt] + ' to ' + currentCard[config.defaultAnswer] + ' Please keep the description breif and only reply in plain text, do not use emoji or formatting of any kind';
    if (mascot) mascot.askQuestion(question);


}

function setControlsEnabled(state) {
	const gameControls = ["prev-button", "next-button", "flip-button", "clue-button", "next-letter-button", "next-answer-button", "mnemonic-button", "type-attack-button"];
	const scoreControls = ["high-scores-button"];

	// Safety: ensure state is boolean
	state = !!state;

	if (!state) {
		ui.disable([...gameControls, ...scoreControls]);
		return;
	}

	// Enable main gameplay controls
	ui.enable(gameControls);

	// High-scores button only if connected to server and not using local deck
	if (usingLocalDeck || !appState.connectedToServer) ui.disable(scoreControls);
	else ui.enable(scoreControls);

	console.log(`🎮 Controls ${state ? "enabled" : "disabled"} (local=${usingLocalDeck})`);
}
function enableGameplayUI() {
	setControlsEnabled(true);
}
function disableGameplayUI() {
	setControlsEnabled(false);
}

function setNavigationButtonStates(cardIndex, stackLength) {
    if (cardIndex === 0) updateUiForState("first");
	else if (cardIndex === stackLength - 1) updateUiForState("last");
			else updateUiForState("middle");
}

function loadNext() {
	try {
		// 🧱 Prevent accidental triggers when deck is empty
		if (!cards || cards.length === 0) {
			console.warn("⚠️ loadNext called before deck initialized. Aborting.");
			return;
		}
		// --- Compute the next index ---
		let nextIndex = cardIndex + 1;
		if (isNaN(nextIndex) || nextIndex < 0) nextIndex = 0;

		// --- If we’ve gone past the end of the deck, finish it ---
		if (nextIndex >= cards.length) {
			doLog(`Reached end of deck (nextIndex=${nextIndex}, total=${cards.length}). Triggering completion.`);
            deckCompleteEvents();
			return;
		}

		doLog("---------------------------------- Loading next card.");
		doLog(`Current index: ${cardIndex}, Next index: ${nextIndex}`);
		doLog("Viewed cards so far:", viewedCards);

		let cardToLoad = null;

		// --- Reset visual state for next card ---
		const answerCard = document.getElementById("answer-card");
		if (answerCard) {
			const front = answerCard.querySelector(".flip-card-front");
			const back = answerCard.querySelector(".flip-card-back");
			if (front && back) {
				front.style.visibility = "visible";
				back.style.visibility = "hidden";
			}
		}

		// --- Start timer on first card ---
		if (timer && timer.timerInterval && cardIndex <= 0) {
			ui.hideElements("deck-loaded-image");
			timer.startTimer();
		}

		// --- Append pending history entry ---
		if (historyEntryToWrite != null) {
			document.getElementById("history-items").appendChild(historyEntryToWrite);
			historyEntryToWrite = null;
		}

		setHistoryItemStyles();

		// --- Determine which card to load ---
		if (viewedCards[nextIndex]) {
			doLog(`Loading existing viewed card at index ${nextIndex}`);
			cardToLoad = viewedCards[nextIndex];
		} else if (useRandom) {
			doLog(`Selecting random card (preventDuplicates=${preventDuplicates})`);
			if (!preventDuplicates || availableCards.length === 0) {
				cardToLoad = cards[Math.floor(Math.random() * cards.length)];
			} else {
				cardToLoad = availableCards[Math.floor(Math.random() * availableCards.length)];
			}
		} else {
			doLog(`Loading sequential card at index ${nextIndex}`);
			cardToLoad = cards[nextIndex];
		}

		// --- Safety fallback ---
		if (!cardToLoad || !cardToLoad.id) {
			console.warn(`⚠️ Invalid card at index ${nextIndex}, defaulting to last card`);
			cardToLoad = cards[cards.length - 1];
		}

		// --- Load card and advance index ---
		loadCard(cardToLoad.id);
		cardIndex = nextIndex;

		// --- Enable flip button and related controls after first card ---
		ui.enable(["flip-button", "clue-button", "next-letter-button", "next-answer-button", "mnemonic-button"]);

		// --- Update navigation state ---
		setNavigationButtonStates(cardIndex, cards.length);

		// --- Log success ---
		doLog(`✅ Card loaded successfully: ${cardToLoad.prompt || "[No prompt key]"}`);
	} catch (ex) {
		handleError(ex);
	}
}



function createHistoryEntry(cardData,navigationPosition,entryLabel){
    var div = document.createElement('div');

    div.innerHTML = `${entryLabel}`;
    div.setAttribute('class', 'history-item');
    div.setAttribute('onClick', `loadCard('${cardData.id}',${navigationPosition})`);
    div.setAttribute('data-card-id', `${cardData.id}`);
    //stack the entry into the div
    historyEntryToWrite = div;
}

function setHistoryItemStyles(){

    let historyItems = document.querySelectorAll('.history-item');

    for(let thisItem of historyItems){
        const cardId = thisItem.getAttribute('data-card-id');
        const answer = performance.getAnswer(cardId);
        //answer will be null in the case this question has not been answered. In which case we don't appy any styling
        if(answer != null){
            if(answer.correct){
                thisItem.classList.remove("incorrect-answer");
                thisItem.classList.add("correct-answer");
            }
            else{
                thisItem.classList.remove("correct-answer");
                thisItem.classList.add("incorrect-answer");
            }
        }else{
            doLog('Question does not seem to have been answered. Does not exist in answer object. Skipping')
        }  
    }
}
/**
* if the previous card index is less than 0, don't go back.
* if the previous card index is greater than 0, then load the card at index position in viewedCards
*/

function loadPrev(){
    doLog('---------------------------------- Loading previous card. Card Index: ' + cardIndex);
    doLog(viewedCards);
    
    let cardToLoad;
    
    if( (cardIndex == 0 || cardIndex == 1) && mascot) mascot.say('There is some kind of bug with clicking previous on the first card. Don\'t do it....','sad')

    if(cardIndex > 0) {
        cardIndex--;
        doLog('Removed one from card index. Index is now ' + cardIndex);
        cardToLoad = viewedCards[cardIndex];
        doLog('Previous card in the stack found. Going back to index' + cardToLoad);
        loadCard(cardToLoad.id);
    }else{
        doLog('No previous card in stack. Not going back');
        alert('At beginning of card stack');
    }
    doLog('----------------------------------');
    
}

function showAnswer(){
    clearClues();
    console.log(currentCard);
    if (currentCard && currentCard.id != null) {
        const answerCard = document.getElementById("answer-card");
        const isFlipped = answerCard.classList.toggle("flip-card-flipped");

        // Ensure the answer is visible
        document.getElementById("answer").style.visibility = "visible";

        // Show/hide front and back manually
        const front = answerCard.querySelector(".flip-card-front");
        const back = answerCard.querySelector(".flip-card-back");

        if (isFlipped) {
            front.style.visibility = "hidden";
            back.style.visibility = "visible";
        } else {
            front.style.visibility = "visible";
            back.style.visibility = "hidden";
        }
    }
    
}

function clearClues(){
    ["hint-text", "clue-text", "hint-text-no-mascot", "clue-text-no-mascot"].forEach((id) => {
		const el = document.getElementById(id);
		if (!el) return;
		el.textContent = "";
		el.style.visibility = "hidden";
	});
}

function setRandom(){
    useRandom = !useRandom;
}

function showClue() {
    if (mascot){
        document.getElementById("clue-text").style.visibility = "visible";
        mascot.say(document.getElementById("clue-text").innerHTML, "happy");
    }else{
        document.getElementById("clue-text-no-mascot").style.visibility = "visible";
		        
    }
    
}

function performHintAction(){
    
    if(currentCard.type == 'choice')  showNextAnswer();
    else showNextHintLetter();
}

function showNextHintLetter(){
    performance.lettersShown++;
    hintIndex++;
    var hintText = currentAnswer.substring(0, hintIndex);
    if (mascot) {
        document.getElementById("hint-text").innerHTML = hintText;
        document.getElementById('hint-text').style.visibility='visible';   
    
        mascot.say(hintText, "happy");
    }else{
        document.getElementById("hint-text-no-mascot").innerHTML = hintText;
        document.getElementById("hint-text-no-mascot").style.visibility = "visible";   
        
    }
}

function showNextAnswer(){
    performance.answersRevelaed++;
    if(!hintIndex) hintIndex = 0;
    //var hintText = currentAnswer.substring(0, hintIndex);

    if(hintIndex > currentCard.correctAnswerValues.length-1) {
        document.getElementById("hint-text").innerHTML='All correct answers highlighted';
        if(mascot) mascot.say('I already highlighted them all for you....','confused')
        return;
    }

    let highlightAnswerIndex = currentCard.correctAnswerValues[hintIndex];

    doLog('highlighting answer hintIndex: ' + hintIndex + '  highlightAnswerIndex: ' + highlightAnswerIndex);

    let options = ui.getElements('.question-option');

    doLog('Options are');
    doLog(options);

    ui.addClass([options[highlightAnswerIndex].nextSibling],'correct-answer'); //get the next sibling (label) for this checkbox to add style to it


    document.getElementById("hint-text").innerHTML='Next correct answer highlighted ' + currentCard.options[highlightAnswerIndex].label;

    if(mascot) mascot.say(currentCard.options[highlightAnswerIndex].label,'happy')

    document.getElementById('hint-text').style.visibility='visible';  
    
    hintIndex++;
}

function answerCorrect(event){
    doLog(currentCard);
    let pointsMod = currentCard.points ? currentCard.points : 1;
    recordQuestionResponse(currentCard, currentCard[config.defaultPrompt], currentCard[config.defaultPrompt], pointsMod);
    updateUIWithPerformanceData(performance);

    doLog('Current score info');
    doLog(performance);

    setHistoryItemStyles();
}

function answerIncorrect(event){
    doLog(currentCard);
    recordQuestionResponse(currentCard, currentCard[config.defaultPrompt], "miss", 0);
    updateUIWithPerformanceData(performance);

    doLog('Current score info');
    doLog(performance);

    setHistoryItemStyles();
}


function deckCompleteEvents(){
	updateUiForState("complete");

	ui.hideElements('.results-fact');
	resultsModal.showModal();
	
	doLog('Performance Info');
	doLog(performance);
    try {
        if (fanfareAudio) {
            fanfareAudio.pause();
            fanfareAudio.currentTime = 0;
        }
        fanfareAudio = new Audio("media/sounds/fanfare.mp3");
        fanfareAudio.volume = 0.8; // optional: 0.0–1.0
        fanfareAudio
            .play()
            .then(() => console.log("🎉 Fanfare playing!"))
            .catch((err) => console.warn("⚠️ Fanfare blocked or failed:", err));
    } catch (err) {
        console.error("❌ Could not play fanfare:", err);
    }	
	animateScoreTally(performance.runningTotalScore);
	
	//set the contents of the results divs
	ui.setContent('final-score-correct-answers',`${performance.numberCorrect} / ${performance.numberOfQuestions}`);
	ui.setContent('final-score-incorrect-answers',`${performance.numberIncorrect } / ${performance.numberOfQuestions}`);
	ui.setContent('final-score-grade',`${performance.pointsGrade}`);
	ui.setContent('final-score-longest-streak',`${performance.longestStreak}`);

    let bestPreviousScore = performance.previousHighScore(storedScores.value);

    if(bestPreviousScore && bestPreviousScore.hasOwnProperty('currentPoints')){
        ui.setContent('best-previous-score', bestPreviousScore.runningTotalScore);

        ui.hideElements('deck-complete-header');
        ui.showElements('confetti_outer');
        ui.showElements('best-previous-score-container');
    }else{
        ui.hideElements('best-previous-score-container');
        
    }
    
	scoreTally.resultFacts = document.getElementsByClassName('results-fact');
	scoreTally.resultFactIndex = 0;

    //change the header if this is the new highest score
    if(performance.isBestScore(storedScores.value)){
        console.log('New High Score Detected!');
        ui.showElements('new-high-score-alert');
        ui.hideElements('deck-complete-header');
    }else{
        console.log('Score is not high score');
        ui.hideElements('new-high-score-alert');
        ui.showElements('deck-complete-header');
    }
	
    console.log(scoreTally);

    if (scoreTally) {
        // Stop any previous interval still running
        if (scoreTally.resultFactInterval) {
            clearInterval(scoreTally.resultFactInterval);
            scoreTally.resultFactInterval = null;
        }

        // Defensive: validate resultFacts
        if (
            !scoreTally.resultFacts ||
            !scoreTally.resultFacts.length ||
            typeof scoreTally.resultFactIndex !== "number"
        ) {
            console.warn("⚠️ No valid result facts to animate; skipping animation.");
            return;
        }

        scoreTally.resultFactInterval = setInterval(() => {
            try {
                // Bail out cleanly if facts were cleared (e.g. new game started)
                if (
                    !scoreTally ||
                    !scoreTally.resultFacts ||
                    scoreTally.resultFacts.length === 0 ||
                    scoreTally.resultFactIndex >= scoreTally.resultFacts.length
                ) {
                    console.log("⏹️ Stopping score fact interval (no facts or deck reset).");
                    clearInterval(scoreTally.resultFactInterval);
                    scoreTally.resultFactInterval = null;
                    return;
                }

                const fact = scoreTally.resultFacts[scoreTally.resultFactIndex];
                if (!fact) {
                    clearInterval(scoreTally.resultFactInterval);
                    scoreTally.resultFactInterval = null;
                    return;
                }

                fact.classList.add("bounce-in-right");
                fact.style.visibility = "visible";
                fact.style.display = "inline-block";

                const index = scoreTally.resultFactIndex;
                scoreTally.resultFactIndex++;

                // Remove bounce effect after a short delay
                setTimeout(() => {
                    if (scoreTally?.resultFacts?.[index]) {
                        scoreTally.resultFacts[index].classList.remove("bounce-in-right");
                    }
                }, 2000);
            } catch (err) {
                console.warn("⚠️ Error in score fact animation tick:", err);
                clearInterval(scoreTally.resultFactInterval);
                scoreTally.resultFactInterval = null;
            }
        }, 1000);
    }

	
    savePerformance();

    sendScore();
}

function animateScoreTally(score) {
	try {
		if (scoreTally.isAnimating) {
			console.warn("⏳ animateScoreTally: already running, skipping duplicate start.");
			return;
		}

		const node = ui.getElements("#final-score-results")?.[0];
		if (!node) {
			console.warn("⚠️ animateScoreTally: target node not found — aborting animation.");
			return;
		}

		// 🔧 Environment-safe timing and animation
		const nowFn = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now.bind(performance) : Date.now;
		const rafFn = typeof requestAnimationFrame === "function" ? requestAnimationFrame : (cb) => setTimeout(() => cb(nowFn()), 16);
		const cancelRafFn = typeof cancelAnimationFrame === "function" ? cancelAnimationFrame : clearTimeout;

		// 🧹 Stop any previous animation
		if (scoreTally._rafId) cancelRafFn(scoreTally._rafId);

		scoreTally.isAnimating = true;
		scoreTally.targetNode = node;
		scoreTally.totalScore = Number(score) || 0;
		scoreTally.currentTally = 0;
		node.textContent = "0"; // ✅ always start clean

		let increment = 10;
		if (score > 100000) increment = 1000;
		else if (score > 50000) increment = 500;
		else if (score > 10000) increment = 50;

		let startTime = null; // ✅ initialized on first frame

		function step(timestamp) {
			if (!scoreTally || !scoreTally.targetNode || !(scoreTally.targetNode instanceof Element) || !document.body.contains(scoreTally.targetNode)) {
				console.log("⏹️ Score tally stopped — invalid or missing target node.");
				scoreTally.isAnimating = false;
				return;
			}

			if (startTime === null) {
				startTime = timestamp; // first frame sets baseline
			}

			const elapsed = timestamp - startTime;

			// 🔄 Simple smooth progression based on time
			const progress = Math.min(elapsed / 1000, 1); // normalized progress (1s animation cap)
			scoreTally.currentTally = Math.min(scoreTally.totalScore, Math.floor(scoreTally.totalScore * progress));

			node.textContent = scoreTally.currentTally;

			if (scoreTally.currentTally >= scoreTally.totalScore) {
				node.textContent = scoreTally.totalScore;
				node.classList?.add("bounce");
				scoreTally.isAnimating = false;
				return;
			}

			scoreTally._rafId = rafFn(step);
		}

		scoreTally._rafId = rafFn(step);
	} catch (err) {
		console.error("❌ Error in animateScoreTally:", err);
		scoreTally.isAnimating = false;
	}
}



function showPerformanceData(){

    console.log('Current Performance Info');
    console.log(performance);
    alert(JSON.stringify(performance));
    console.log('Existing Performance Info');

}
function generateSelectListFromOptions(optionsArray,correctValues){

    if(!isArray(correctValues)) correctValues = [correctValues];

    const container = document.createElement('div');
    container.className = 'question-container';

    const form = document.createElement('form');
    form.setAttribute('data-correct-value',correctValues);
    for(let option of optionsArray){
        form.appendChild(createAnswerOptionInput(option,correctValues,true));
    }
    
    const answerBtn = document.createElement('input');
    answerBtn.type = 'button';
    answerBtn.className = 'answer-button';
    answerBtn.value = `Submit Answer ${currentCard.points ? currentCard.points : 1} ${currentCard.points && currentCard.points > 1 ? 'Points' : 'Point'}`;
    answerBtn.id = `answer-btn`;
    answerBtn.name = `answer-btn`;
    answerBtn.className = 'button';
    //answerBtn.setAttribute('data-correct-value',correctValues);
    answerBtn.onclick = function(event){
    
        console.log('Correct values are');
        console.log(correctValues);

        let options = ui.getElements('.question-option');
        let selectedOptionIndexes = [];
        let selectedOptionValues = [];


        for(let i = 0; i < options.length; i++){
            if(options[i].checked){
                selectedOptionIndexes.push(i); //the values in the array this will compare to are strings, so convert this to a string as well
                selectedOptionValues.push(options[i].value);
            }
        }

        correctValues = correctValues.sort();
        console.log(JSON.stringify(selectedOptionIndexes.sort()) + ' VS ' + JSON.stringify(correctValues));
        const isCorrect = JSON.stringify(selectedOptionIndexes.sort()) == JSON.stringify(correctValues) ? true : false;

        console.log('Is correct?: ' + isCorrect)

        let pointsMod = currentCard.points ? currentCard.points : 1;

        if(isCorrect){
            doLog('User got question correct!');
        }else{
            doLog('User got question wrong!');
            pointsMod = 0;
        }

        recordQuestionResponse(currentCard,selectedOptionIndexes,correctValues,pointsMod);

        updateUIWithPerformanceData(performance);

        setHistoryItemStyles();
    }

    form.appendChild(answerBtn);
    container.appendChild(form);

    doLog('Returning Container');
    doLog(container);
    return container;
}

function createAnswerOptionInput(optionData,correctValues,forceCheckboxList){

    if(!isArray(correctValues)) correctValues = [correctValues];

    const container = document.createElement('div');
    const inputType = correctValues.length > 1 || forceCheckboxList ? 'checkbox' : 'radio';

    const input = document.createElement('input');
    input.type = inputType;
    input.className = 'question-option';
    input.value = optionData.value;
    input.id = `option-${optionData.value}`;
    input.name = optionData.value;
    
    if(correctValues.indexOf(optionData.value) > -1) input.setAttribute('data-correct-value',true);

    const label = document.createElement('label');
    label.setAttribute('for',input.name);
    label.textContent = optionData.label[0].toUpperCase() + optionData.label.slice(1);

    container.appendChild(input);
    container.appendChild(label);

    return container;
}

function createOptionRadio(optionData,correctValues){

    if(!isArray(correctValues)) correctValues = [correctValues];

    const container = document.createElement('div');

    const input = document.createElement('input');
    input.type = 'radio';
    input.className = 'question-option';
    input.value = optionData.value;
    input.id = `option-${optionData.value}`;
    input.name = `question-options`;
    
    if(correctValues.indexOf(optionData.value) > -1) input.setAttribute('data-correct-value',true);

    const label = document.createElement('label');
    label.for = input.name;
    label.textContent = optionData.label[0].toUpperCase() + optionData.label.slice(1);

    container.appendChild(input);
    container.appendChild(label);

    return container;
}

function setSelectOptions(selectId, optionsArray, defaultValue, includeRandom, clearExisting){

    let selectList = document.getElementById(selectId);

    if(clearExisting) selectList.length = 0;
    
    for (var i = 0; i < optionsArray.length; i++) {
        var option = document.createElement("option");
        option.value = optionsArray[i].value;
        option.text = optionsArray[i].label;
        selectList.appendChild(option);
    }
    
    if(includeRandom){
        var option = document.createElement("option");
        option.value = 'random';
        option.text = 'Random';
        selectList.appendChild(option);
    }
    if(defaultValue) selectList.value = defaultValue;
    
}

// --- Local .cards upload flow ---

function bindLocalDeckInput() {
	const input = document.getElementById("local-deck-file");
	if (input) input.addEventListener("change", onLocalDeckFileChosen);
}

function handleLocalDeckUploadStart() {
	const input = document.getElementById("local-deck-file");
	if (!input) {
		alert("Upload control not found.");
		return;
	}
	input.value = ""; // clear any previous selection
	input.click(); // open OS file picker
}

async function onLocalDeckFileChosen(evt) {
	try {
		const file = evt.target.files && evt.target.files[0];
		if (!file) return;

		// Require .cards extension
		if (!/\.cards$/i.test(file.name)) {
			alert("Please select a .cards file.");
			return;
		}

		// Parse JSON
		let data;
		try {
			data = JSON.parse(await file.text());
		} catch {
			alert("That file is not valid JSON.");
			return;
		}

		// Minimal schema check
		if (
			!data ||
			typeof data !== "object" ||
			!data.config ||
			!Array.isArray(data.cards)
		) {
			alert('Deck must include "config" and "cards" properties.');
			return;
		}

		// Mark as local mode (no server, no category/deck selectors)
		usingLocalDeck = true;
		selectedDeckCategory = LOCAL_PLAY_CATEGORY;

		// Load deck via the same pipeline
		await loadDeck(data);

		// Keep the category/deck selectors hidden (we never set connectedToServer = true)
		// Disable High Scores UI (server can't accept scores for local decks)
		ui.disable("high-scores-button");

		// Optional: clarify header
		try {
			const header = document.getElementById("content-header");
			if (header)
				header.innerText = `Card Stack: ${data.config.name} (Local) - ${data.cards.length} Cards`;
		} catch {}

		// Close the modal — we’re ready to play
		serverConnectModal.hideModal();
	} catch (err) {
		console.error(err);
		handleError(err, "Failed to load local .cards file.");
	}
}

function toggleMascot(event){
	if(mascot){
		mascot.isActive = !mascot.isActive;
		if(!mascot.isActive) mascot.neutralLeave();
		else mascot.mascotReturn();
	}
}

function toggleMuteMascot(event){
    if (mascot) mascot.mute = !mascot.mute;
}

function toggleUncensoredMascot(event){
    if (mascot) mascot.uncensoredMode = !mascot.uncensoredMode;
}

function setPromptKey(value){
    doLog('Setting prompt key: ' + value);
    promptKey = value;
}


function setPreventDupes(){
    preventDuplicates = !preventDuplicates;
}


function setUi(enableUi){


    doLog('toggling ui');
    if(enableUi){
        doLog('enabling UI');
        //document.getElementById('deck-controls').style.visibility='visible';
        //document.getElementById('controls').style.visibility='visible';
        ui.showElements(['deck-controls','controls','deck-variants'])
        ui.getElements("prompt-key")[0].removeAttribute("disabled");
        ui.getElements("load-variant-select")[0].removeAttribute("disabled");
        ui.getElements("load-variable-deck-button")[0].removeAttribute("disabled");

    }else{
        doLog('Hiding ui')
        //document.getElementById('deck-controls').style.visibility='hidden';
        //document.getElementById('controls').style.visibility='hidden';
        ui.hideElements(['deck-controls','controls','deck-variants'])
        ui.getElements("prompt-key")[0].setAttribute("disabled", true);
		ui.getElements("load-variant-select")[0].setAttribute("disabled", true);
		ui.getElements("load-variable-deck-button")[0].setAttribute("disabled", true);
    }   
}

function randomIntFromInterval(min, max) { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min)
}

function toggleValue(paramName){
    doLog('Switching ' + paramName + ' from ' + this[paramName] + ' to ' + !this[paramName]);
    this[paramName] = !this[paramName];
}

// Button click handler
function launchTypingGame() {
	console.log('Launching Type Attack!')
	typeAttackModal.showModal();


    const prompts = cards.map((obj) => obj[config.defaultPrompt]);
	const responses = cards.map((obj) => obj[config.defaultAnswer]);

    console.log('Sending Responses to game');
    console.log(responses);
    

	typingGame.start(prompts, {
        responses: responses, //if playing 'answer' mode these are the corresponding values that have to be typed
		displaySeconds: 4, // N seconds to memorize
		requiredCorrect: 1, // X correct streak
		roundSeconds: 20, // Y seconds per round
	});
}
/**
 * @description Centralized UI state handler for all deck/card navigation.
 * Ensures consistent enable/disable of buttons based on where we are in the deck.
 */
function updateUiForState(state) {
	const coreControls = ["prev-button", "next-button", "flip-button", "clue-button", "next-letter-button", "next-answer-button", "mnemonic-button", "type-attack-button"];
	const scoreControls = ["high-scores-button"];

	const enable = (ids) => ui.enable(ids);
	const disable = (ids) => ui.disable(ids);
	const show = (ids) => ui.showElements(ids);
	const hide = (ids) => ui.hideElements(ids);

	// Always reset next-button label
	const nextBtn = ui.getElements("next-button")[0];
	if (nextBtn) {
		nextBtn.value = nextBtn.getAttribute("data-default-value") || "Next";
	}

	switch (state) {
		case "init":
			hide(["deck-controls", "controls", "deck-variants"]);
			disable([...coreControls, ...scoreControls]);
			enable("next-button");
			break;

		case "deckLoaded":
			show(["deck-controls", "controls", "deck-variants"]);
			enable(coreControls);
			if (usingLocalDeck || !appState.connectedToServer) disable(scoreControls);
			else enable(scoreControls);
			break;

		case "first":
			enable(coreControls);
			disable("prev-button");
			break;

		case "middle":
			enable(coreControls);
			break;

		case "last":
			enable(coreControls);
			if (nextBtn) nextBtn.value = "{nextButtonFinish}";
			break;

		case "complete":
			disable([...coreControls, ...scoreControls]);
			//hide(["deck-controls", "controls", "deck-variants"]);
			if (timer) timer.stopTimer();
			break;

		default:
			console.warn(`⚠️ Unknown UI state: ${state}`);
			break;
	}

	console.log(`🎮 UI updated for state: ${state} (local=${usingLocalDeck}, connected=${appState.connectedToServer})`);
}



function resetHistory(){
    try{
			updateUiForState("init");

			historyEntryToWrite = null;
			viewedCards = [];
			availableCards = [];
			cardIndex = -1;
			cardLibrary = {};
			currentCard = {};
			config = {};
			hintIndex = 0;
			currentAnswer = "";

			//final score tally objects
			scoreTally = {
				targetNode: {},
				tallyAnimationInterval: {}, //interval timer
				currentTally: 0, //current value of score tally
				totalScore: 0, //score to reach to clear tally
				tallyIntervalMS: 1, //how often to incriment the display
			};

			document.getElementById("hint-text").innerHTML = "";
			document.getElementById("clue-text").innerHTML = "";
			document.getElementById("history-items").innerHTML = "";
			document.getElementById("viewed-total").innerHTML = `${viewedCards.length} / ${cards.length}`;
			document.getElementById("hint-text").innerHTML = "";
			document.getElementById("clue-text").innerHTML = "";
			document.getElementById("prompt").innerHTML = "";
			document.getElementById("answer").innerHTML = "";


			timer.stopTimer();
			timer.seconds = 0;
			timer.tens = 0;
			timer.mins = 0;
			// Remove old history DOM items
			const historyContainer = document.getElementById("history-items");
			if (historyContainer) historyContainer.innerHTML = "";

			// Reset counters / globals
			historyEntryToWrite = null;
			cardIndex = -1;
			viewedCards = [];
			if (timer) timer.stopTimer();
			ui.hideElements(["results-modal", "confetti_outer"]);
			if (typeof scoreTally !== "undefined") clearInterval(scoreTally?.resultFactInterval);
			updateUIWithPerformanceData(performance);

			if (scoreTally._rafId) cancelAnimationFrame(scoreTally._rafId);
			scoreTally._rafId = null;
			scoreTally.isAnimating = false;
		}catch(ex){
        doLog('Error resetting history');
        console.error(ex);
        handleError(ex);
    }
    
}

function handleError(e, customMessage){
    doLog(e);
    let message = customMessage ? customMessage : e.message;
    console.error('Error in application!')

    //if (mascot) mascot.say(message, "sad");
    showToast(
        "Error",
        `Oops, looks like we hit a snag. ${message}`,
        "error"
	);
}

function doLog(logData){
   if(showLogs) console.log(logData);
}

function setServerPassword(password) {
	serverPassword = password;
	console.log(`🔑 Server password set to: ${"*".repeat(password.length)}`);
}


window.onload = function() {
    init();
   

    // NEW: wire up local play
    const playLocalBtn = document.getElementById(
        "play-local-button"
    );
    if (playLocalBtn)
        playLocalBtn.addEventListener(
            "click",
            handleLocalDeckUploadStart
        );
    bindLocalDeckInput();
};
