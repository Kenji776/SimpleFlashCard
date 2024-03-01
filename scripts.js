const settingsCookieName = 'SimpleFlashCardSettings';
const scoresCookieName = 'SimpleFlashCardHighScores';
//class objects
var resultsModal; //instance of Modal
var settingsCookie; //instance of Cookie
var scoresCookie; //instance of Cookie

var deckUrl;
var cardLibrary = {};
var currentCard = {};
var cardIndex = 0;
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
var answerResults = [];
var autoLoadNextCardOnAnswer = true;
var selectedVariantDeck = '';


//final score tally objects
var scoreTally = {
	targetNode: {},
	tallyAnimationInterval: {}, //interval timer
	currentTally: 0, //current value of score tally
	totalScore: 0, //score to reach to clear tally
	tallyIntervalMS: 1 //how often to incriment the display
}

//overall score/performance data
var performance = {
	currentPoints: 0, 
	possiblePoints : 0, 
	numberCorrect: 0, 
	numberOfQuestions:0, 
	numberIncorrect : 0,
	numberUnanswered : 0,
	pointsScorePercent: 0,
	correctPercent: 0,
	pointsGrade : '-',
	numberCorrectGrade: '-',
	streak: 0,
	longestStreak: 0,
	runningTotalScore: 0
}
//options
var options = {
	deckControls: {
		autoProgress: true,
		randomOrder: true,
		hideHistory: false,
		hideTimer: false,
		hideScore: false,
		hideMascots: false,
		promptKey: ''
	}
}



function init(){
	loadCardLibrary();
	
	registerKeyboardShortcuts();
	
	resultsModal = new Modal();
	
	resultsModal.registerModal('results-modal');
	
	resultsModal.registerModalCloseHandler(function(scope){
		ui.hideElements('confetti_outer');
	});		
	
	settingsCookie = new Cookie(settingsCookieName);
	console.log('Settings Cookie Data');
	console.log(settingsCookie);
	settingsCookie.getPersistentValuesFromUI();
	
	scoresCookie = new Cookie(scoresCookieName);
	console.log('Scores Cookie Data');
	console.log(scoresCookie);
		
}

async function loadCardLibrary(){
    console.log('Loading card library');
    const response = await fetch("https://pharmacy-flashcards-2027.lol/cardLibrary.json?cache-invalidate="+Date.now(), {cache: "no-store"});
    cardLibrary = await response.json();
    console.log(cardLibrary);

    setDeckCategories(cardLibrary);

    if(selectedDeckCategory) setDeckOptions(cardLibrary);
}
				
function registerKeyboardShortcuts(){
	
	console.log('Registering shortcut keys!');
	document.onkeydown = function (e) {
		e = e || window.event;
		// use e.keyCode
		console.log(e.keyCode);
		
		if (e.keyCode == '38') {
			//up arrow
			showAnswer();
			e.preventDefault();
		}
		else if (e.keyCode == '40') {
			// down arrow
			performHintAction();
			e.preventDefault();
		}
		else if (e.keyCode == '37') {
		   // left arrow
		   loadPrev();
		   e.preventDefault();
		}
		else if (e.keyCode == '39') {
			//right arrow
		   loadNext();
		   e.preventDefault();
		}
		else if(e.keyCode == '72'){
			showClue();
			e.preventDefault();
		}
		else if(e.keyCode == '49'){
			answerCorrect();
			e.preventDefault();
		}
		else if(e.keyCode == '50'){
			answerIncorrect();
			e.preventDefault();
		}
		else if(e.keyCode == '35'){
			deckCompleteEvents();
			e.preventDefault();
		}
	};
}

/**
 * @description sets all of the potential deck category options from the card library
 * @param {} deckData 
 * @returns 
 */
function setDeckCategories(deckData){
    console.log('Getting categories from deckData');
    console.log(deckData);
    let optionsArray = [];
	optionsArray.push({'value': null, 'label': '--Select One---'});
    for(let categoryName in deckData.card_stacks.categories){
        optionsArray.push({'value': categoryName, 'label': categoryName});
    }

    console.log('Writting options array');
    console.log(optionsArray);
    setSelectOptions('deck-category', optionsArray, null, false, true);

    
    return categories;
}

/*
* @description Populates the 'card-deck' select with options from the selected deck category
*/
function setDeckOptions(){

    let optionsArray = [];
    console.log('Select deck options for selectedDeck ' + selectedDeckCategory);
    console.log(cardLibrary)
	
	console.log('Selected category: ' + selectedDeckCategory);
    for(let deckIndex in cardLibrary.card_stacks.categories[selectedDeckCategory][0]){
        let deck = cardLibrary.card_stacks.categories[selectedDeckCategory][0][deckIndex];

        console.log(deck);
        optionsArray.push({'value':deck.url,'label':deck.name});
    }
    setSelectOptions('card-deck', optionsArray, null, false, true);
    
    //set default deck url to first element in list
    deckUrl = optionsArray[0].value;
}

function setVariantDeckOptions(){
    let optionsArray = [];
    console.log('Select deck options for variant deck options');
    console.log(cardLibrary)
	
	console.log('Selected category: ' + selectedDeckCategory);
    for(let variantIndex in config.variants){
        let variant = config.variants[variantIndex];

        console.log(variant);
        optionsArray.push({'value':variant.name,'label':variant.name});
    }
    setSelectOptions('load-variant-select', optionsArray, null, false, true);

    if(optionsArray.length == 0 ) {
        console.log('No variants found?');
        debugger;
        selectedVariantDeck = optionsArray[0].value;
    }
    
}

function setSelectedDeckCategory(categoryId){
    selectedDeckCategory = categoryId;
    if(categoryId) setDeckOptions()
}

function handleSetSelectedDeck(value){
    console.log('Setting deck url to...' + value);
    var select = document.getElementById("card-deck");
    selectedIndex = select.selectedIndex;
    var options = select.options;
    var selectedValue = options[selectedIndex].value;
    deckUrl = selectedValue;
    console.log('Deck url is...' + deckUrl);
}

function handleSetSelectedVariant(value){
    console.log('Setting deck url to...' + value);

    selectedVariantDeck = value;
}

function loadVariantDeck(){
    console.log('Loading custom variant deck: ' + selectedVariantDeck);

    let variantConfig = config.variants[selectedVariantDeck];

    console.log(variantConfig);

    generateDeckFromData(new ShuffleDeckConfig({config: config, cards: cards}, variantConfig));
}

async function handleLoadDeckSelect(){
    console.log('handleLoadDeckSelect called with deckUrl: ' + deckUrl)
    let deckData = await fetchRemoteDeck(deckUrl);
    loadDeck(deckData);
}

async function fetchRemoteDeck(deckUrl){
    if(!deckUrl || deckUrl == 'none'){
        console.warn('No deck URL provided to load deck. Aborting');
        return;
    }

    console.log('Loading card library: ' + deckUrl);
    const response = await fetch(deckUrl+'?cache-invalidate='+Date.now(), {cache: "no-store"});
    const deckData = await response.json();

    return deckData;
}

async function loadDeck(deckData){
    
    console.log('loadDeck Loading deck with data');
    console.log(deckData);

    if(!deckData) {
        console.log('Deck data not provided. Aborting Load');
        alert('Deck data not provided. Aborting Load');
        return;
    }

    resetHistory();
    cards = assignCardIds(deckData.cards);

    availableCards = cards;
    config = deckData.config;

    document.getElementById("content-header").innerHTML= `Card Stack: ${config.name} - ${cards.length} Cards`; 
    document.title = config.name;
    
    setPromptKey(config.defaultPrompt);
    
    setSelectOptions('prompt-key', config.promptKeys, promptKey, true, true);
    //setSelectOptions('answerKey', config.answerKeys, answerKey, true);
    //loadCard(0);

    if(!config.isVariant) setVariantDeckOptions();

    var clueBtn = document.getElementById("clue-button");
    clueBtn.innerHTML  = config?.labels?.clueButtonName ? config.labels.clueButtonName : 'Clue';

    console.log('Set clue button name to: ' + clueBtn.innerHTML );
    console.log(config.labels);

    ui.hideElements('intro-slide-image');
    ui.showElements('deck-loaded-image');
    setUi(true);

    setNavigationButtonStates(0,cards.length);
	
    document.getElementById("prompt").innerHTML= `${config.name} Loaded. Press Next To Begin`;

}

class ShuffleDeckConfig {
    constructor(sourceDeckConfig, options={}) {
        this.sourceDeckConfig = sourceDeckConfig;
        this.shuffleType;
        this.groupBy;

        //default options
        //TODO: Set better defaults
        this.options = {
            shuffleType: 'group-by',
            groupBy: 'drugClassName',
            deckType: 'multiple-choice',
            minRightAnswers: 1,
            minWrongAnswers: 1,
            maxAnswerOptions: 5,
            answerLabelProperty: 'genericName',
            answerValueProperty: 'genericName'
        }

        for(let propName in options){
            if(options[propName] && options[propName] != undefined ) this[propName] = options[propName];
        }
    }
}

class Card {
    constructor(constructorData){
        this.type = ''; //type of card. May be 'choice' or 'flashcard;
        this.questionText = ''; //text of the question
        this.correctAnswerValues = []; //index numbers of the option values in the options array that are correct
        this.points = 1; //number of points this question is worth
        this.hint = '' //text hint string to present to user
        this.options = []; //array of option value objects. Each option should have a 'value' and a 'label' property.

        if(typeof constructorData === 'object'){
            for (var k in this) if (constructorData[k] != undefined) this[k] = constructorData[k];
        } 
    }
}

function generateDeckFromData(shuffleConfig=new ShuffleDeckConfig()){
    console.log('Generating Custom Deck From Config');
    console.log(shuffleConfig);

    let newCards = [];
    let newConfig = config;

    //if we are building a custom deck by grouping cards by a property and generating multiple choice questions then start here
    if(shuffleConfig.options.shuffleType == 'group-by'){

        let answerLabelProperty = shuffleConfig.options.answerLabelProperty;
        let answerValueProperty = shuffleConfig.options.answerValueProperty;
        console.log('Shuffling Deck. Grouping by: ' + shuffleConfig.groupBy);

        let groups = {};
        //group our cards by the desired key
        for(let thisCard of shuffleConfig.sourceDeckConfig.cards){
            let thisGroupCards = groups.hasOwnProperty(thisCard[shuffleConfig.options.groupBy]) ? groups[thisCard[shuffleConfig.options.groupBy]] : [];
            thisGroupCards.push(thisCard);
            groups[thisCard[shuffleConfig.options.groupBy]] = thisGroupCards;

        }

        //if building a multiple choice deck...
        if(shuffleConfig.options.deckType = 'multiple-choice'){
            
            console.log('------------- Groups Data');
            console.log(groups);
            
            for(let groupName in groups){
                let thisGroupCorrectAnswers = [];
                //first generate list of correct options
                for(let thisAnswer in groups[groupName]){
                    let thisOption = {
                        value: groups[groupName][thisAnswer][answerValueProperty],
                        label: groups[groupName][thisAnswer][answerLabelProperty]
                    }
                    thisGroupCorrectAnswers.push(thisOption);
                }

                console.log('All Option Answers For: ' + groupName);
                console.log(thisGroupCorrectAnswers);

                //construct our answer array
                let allOptionsArray = [];
                let correctAnswerIndexes = [];

                while(true) {
                    //decide if we get a correct anwer by 'flipping a coin' and by ensuring there is a correct answer left to get from the source array.
                    let getCorrectAnswer = randomIntFromInterval(0,1) == 1 && thisGroupCorrectAnswers.length > 0 ? true : false;
                    console.log('getCorrectAnswer: ' + getCorrectAnswer);
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

                    console.log('Added options to select list');
                    console.log(allOptionsArray[allOptionsArray.length-1]);
                   

                    //check all conditions to see if we should stop adding answers
                    if(allOptionsArray.length >= shuffleConfig.options.maxAnswerOptions && correctAnswerIndexes.length > 0){
                        break;
                    }
                }

                let newCard = new Card({
                    type: 'choice',
                    questionText: `Which of the following are ${groupName}`, //(${correctAnswerIndexes.join(',')})`,
                    points: 1,
                    hint: 'There are ' + correctAnswerIndexes.length + ' correct answers',
                    options: allOptionsArray,
                    correctAnswerValues: correctAnswerIndexes
                });

                console.log('Pushing new card to array');
                console.log(newCard);

                newCards.push(newCard);
            }

        }

        console.log('Grouped cards is now');
        console.log(groups);

        console.log('Generated New Card Deck');
        console.log(newCards);

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
        console.log(JSON.stringify(cards));
        loadDeck({
            config: newConfig,
            cards: newCards
        });
    }
}

/**
* @description ensures that every card has a unique ID so that can be identified between the stack containing all cards (window.cards) and all available cards (window.availableCards)
* @param {Array} cards a array of card objects which to assign ids if they do not posses one.
* @returns list of cards with set modified ids
*/
function assignCardIds(cards){
    for(card in cards){
        if(!card.hasOwnProperty('id')){
            cards[card].id = Date.now().toString(36) + Math.random().toString(36).substr(2);
        }
    }
    return cards;
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

    
    //flip the card back to the question side
    document.getElementById('answer-card').classList.remove("flip-card-flipped")
    
    hintIndex = 0;

    //find the current card information by using the id
    console.log('Getting card with id: ' + cardId);
    currentCard = getCardById(cardId);


    if(forceIndex) {
        console.log('Forcing index to: ' +forceIndex);
        cardIndex = forceIndex;
    }
    
    console.log(currentCard);


    setSelectedHistoryCard(currentCard.id);
    
    removeCardFromAvailable(currentCard.id);

    let promptVal = promptKey;
    let answerVal = answerKey;
    let selectedAnswerKeyText = '';
    let selectedPromptKeyText = '';

 

    //if this is a multple choice question then we can't randomize the answers
    if(currentCard.hasOwnProperty('options')){
        console.log('Multiple Choice Card Selected');
        console.log(currentCard);

    }else{
        try{
            if(promptKey == 'random'){
                console.log('Randomizing prompt value');	
                promptVal = config.promptKeys[Math.floor(Math.random()*config.promptKeys.length)].value;
            }
            if(answerKey == 'random'){
                console.log('Randomizing answer value');
                answerVal = config.answerKeys[Math.floor(Math.random()*config.answerKeys.length)].value;		
            }
        }catch(ex){
            console.warn('Unable to randomize question');
            console.error(ex);
        }
        selectedAnswerKeyText = config.answerKeys.find(x => x.value === answerVal).label;
        selectedPromptKeyText = config.promptKeys.find(x => x.value === promptVal).label;
    }




    //create the history entry if it doesn't exist for this card.
    if(!viewedCards.some(e => e.id === currentCard.id)) {
        console.log('Viewed cards does not have an entry for id: ' + currentCard.id);
        console.log(viewedCards)
        console.log('Creating history item for card');
        console.log(currentCard);
        createHistoryEntry(currentCard,viewedCards.length,currentCard[promptVal]);
        viewedCards.push(currentCard);
    }

    ui.hideElements('answer-buttons');
    if(currentCard.type == 'choice'){
        console.log('current card is a choice type. Attempting to read current answer from options index!');

        console.log('Current Card Info');
        console.log(currentCard);
        //get the text of the current correct answer for a choice question by using the correctAnswerValue property of the question definition to then read that object's label
        //currentAnswer = currentCard.options.find(function(o){ return o.value===currentCard.correctAnswerValues}).label;


        currentAnswer = 'Choice card logic needs fixing...'

        ui.showElements('next-answer-button');
        ui.hideElements('next-letter-button');

        console.log('================ Prompt key');
        console.log(ui.getElements('prompt-key'));
        ui.getElements('prompt-key')[0].setAttribute('disabled',true);
    }else{
        console.log('current card is unknown type. Prompt text');
        currentAnswer = promptVal == config.defaultPrompt ? currentCard[config.defaultAnswer] : currentCard[config.defaultPrompt];

        ui.setAttribute('correct-icon-button','correctValue,',selectedAnswerKeyText);
        ui.setAttribute('incorrect-icon-button','correctValue,',selectedAnswerKeyText);

        ui.hideElements('next-answer-button');
        ui.showElements('next-letter-button');

        ui.showElements('answer-buttons');

        ui.getElements('prompt-key')[0].setAttribute('disabled',false);
    }

    if(!currentAnswer || currentAnswer.length === 0){
        alert('Unable to determine correct answer for this card. Please check card definition to ensure it has all properties set. See developer console for card info.');
        console.warn('Incomplete card info');
        console.log(currentCard);
    }else{
        console.log('Current correct answer is: ' + currentAnswer);
    }
    /*
    
    console.log('Prompt Key: ' + promptVal);
    console.log('Answer Key: ' + answerVal);
    
    console.log('Answer Key Text: ' + selectedAnswerKeyText);
    console.log('Answer Prompt Text: ' + selectedPromptKeyText);
    
    console.log(currentCard);
    console.log(config.promptKeys);
    console.log(config.answerKeys);
    */
    document.getElementById("prompt").innerHTML= `${selectedPromptKeyText}<br/> <span class="prompt-text">${currentCard[promptVal]}</span>`; 
    
    if(currentCard.type == 'choice'){
        document.getElementById("answer").innerHTML= document.getElementById("prompt").innerHTML;

        console.log('\n\n\n---------- Generating card fro data');
        console.log(currentCard.options);
        console.log(currentCard.correctAnswerValues);


        document.getElementById("answer").appendChild(generateSelectListFromOptions(currentCard.options,currentCard.correctAnswerValues));
    }else{
        document.getElementById("answer").innerHTML= `${generateAnswerText(currentCard)}`;
    }
    
    
    document.getElementById("clue-text").innerHTML=currentCard[config.clueTextKey];

    //document.getElementById('answer').style.visibility='hidden';
    document.getElementById('clue-text').style.visibility='hidden';
    document.getElementById('hint-text').style.visibility='hidden';

    document.getElementById("viewed-total").innerHTML = `${viewedCards.length} / ${cards.length}`;
		
}

function removeCardFromAvailable(cardId){
    console.log('Removing card from stack with Id' + cardId);
    availableCards = availableCards.filter(item => item.id !== cardId);
    console.log('Available cards is now: ');
    console.log(availableCards);
}

function setSelectedHistoryCard(cardId){
    
    var elems = document.querySelectorAll(".history-item");

    [].forEach.call(elems, function(el) {
        el.classList.remove("selected-history-item");
    });

    console.log('Attempting to highlight card with index: ' + cardId);
    try{
        document.querySelectorAll(`.history-item[data-card-id="${cardId}"]`)[0].classList.add("selected-history-item");
    }catch(ex){
        console.log('Could not hightlight item');
        console.log(ex);
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
    answerResults.push({
        "card": card,
        "givenAnswers": givenAnswers,
        "correctAnswers": correctAnswers,
        "awardedPoints": awardedPoints,
        "possiblePoints" : card.points ? card.points : 1,
        "wasCorrect": JSON.stringify(givenAnswers.sort()) === JSON.stringify(correctAnswers.sort()) ? true : false
    });

    if(answerResults[answerResults.length-1].wasCorrect) {
        correctAnswerAlert()
        performance.streak++;
		
		let newPoints = performance.streak * (awardedPoints * 10);
		console.log(`Adding ${newPoints} to total  ${performance.runningTotalScore}.  ${performance.streak} * (${awardedPoints} * 10)`);
		
		performance.runningTotalScore += newPoints;
		if(performance.streak > performance.longestStreak) performance.longestStreak = performance.streak;
    }
    else {
        incorrectAnswerAlert();
        performance.streak = 0;
    }
    if(autoLoadNextCardOnAnswer) loadNext();
}

function calculateScore(){

	//copy our performance objects so we don't lose anything that was set on it that we arn't calculating here
	returnObj = performance;
	
    returnObj.numberOfQuestions = cards.length;
	returnObj.currentPoints = 0;
	returnObj.possiblePoints = 0
	returnObj.numberCorrect = 0;
	returnObj.numberIncorrect = 0;
	returnObj.numberUnanswered = 0;

    let finalAnswers = {};
	
    for(let answer of answerResults){
        returnObj.currentPoints += answer.awardedPoints;
        returnObj.possiblePoints += answer.possiblePoints;
        finalAnswers[answer.card.id] = answer;
    }

    console.log('Final Answers object');
    console.log(finalAnswers);

    for(let thisCard of cards){
        if(finalAnswers.hasOwnProperty(thisCard.id)){
            if(finalAnswers[thisCard.id].wasCorrect){
                returnObj.numberCorrect++;
            }else{
                returnObj.numberIncorrect++;
            }
        }else{
            returnObj.numberUnanswered++;
        }
    }

	
    returnObj.pointsScorePercent = Math.round( (returnObj.currentPoints / (returnObj.possiblePoints)) * 100);
    returnObj.correctPercent = Math.round( (returnObj.numberCorrect / (returnObj.numberOfQuestions-returnObj.numberUnanswered)) * 100);

    returnObj.pointsGrade = getLetterGrade(returnObj.pointsScorePercent);
    returnObj.numberCorrectGrade = getLetterGrade(returnObj.correctPercent);

    document.getElementById('score-total').innerHTML =`${returnObj.numberCorrect} / ${returnObj.numberOfQuestions-returnObj.numberUnanswered}`;
    document.getElementById('points-total').innerHTML =`${returnObj.currentPoints} / ${returnObj.possiblePoints}`;
    document.getElementById('streak-total').innerHTML = returnObj.streak;
    

	if(returnObj.numberOfQuestions-returnObj.numberUnanswered >= 1){
		document.getElementById('score-grade').innerHTML =`${returnObj.numberCorrectGrade}`;
		document.getElementById('score-grade').setAttribute('data-grade',returnObj.numberCorrectGrade.slice(0,1).toLowerCase());
	}else{
		document.getElementById('score-grade').innerHTML = '';
	}
	
	if(returnObj.numberOfQuestions-returnObj.numberUnanswered >= 1){
		//document.getElementById('points-grade').innerHTML =`${returnObj.pointsGrade}`;
		//document.getElementById('points-grade').setAttribute('data-grade',returnObj.pointsGrade.slice(0,1).toLowerCase());
	}else{
		//document.getElementById('points-grade').innerHTML = '';
	}
    document.getElementById('streak-total').setAttribute('data-grade',returnObj.numberCorrectGrade.slice(0,1).toLowerCase());
    

    /*
    if(returnObj.pointsScorePercent === 100) {
        ui.showElements('point-sparkles');
        ui.addClass('points-total-animations','pulse');
    }
    else  {
        ui.hideElements('point-sparkles');
        ui.removeClass('points-total-animations','pulse');
    }
    */

    
    if(returnObj.correctPercent === 100 && returnObj.numberOfQuestions > 0) {
        ui.showElements('score-sparkles','inline');
        ui.addClass('score-total-animations','pulse');
    }
    else  {
        ui.hideElements('score-sparkles');
        ui.removeClass('score-total-animations','pulse');
    }
    

    return returnObj;

}

function getLetterGrade(numberGrade) {
    let letter;
    if (numberGrade == 100){
        letter = 'S';
    }else if (numberGrade >= 97) {
      letter = 'A+';
    }else if (numberGrade >= 94) {
        letter = 'A';
    }else if (numberGrade >= 90) {
        letter = 'A-';
    } else if (numberGrade >= 87) {
      letter = 'B+';
    } else if (numberGrade >= 84) {
        letter = 'B';
    } else if (numberGrade >= 80) {
        letter = 'B-';
    } else if (numberGrade >= 77) {
      letter = 'C+';
    } else if (numberGrade >= 70) {
        letter = 'C';
    } else {
      letter = 'F';
    }
    return letter;
}

function getCorrectAnswerText(){
	let defaultResponses = ['Nice Job!','Woo hoo!','Awesome','Sweet!','Your killing it!','Hell yeah!','Dope. Hella Dope','Fish','I\'ll drink to that!','That\'s what I\'m talking about','Git er done!'];
	let returnString = '';
	if(config.correctAnswerText){
		let optionsArray = config.correctAnswerText.split(',');
		returnString = optionsArray[Math.floor(Math.random()*optionsArray.length)];
	}else{
		returnString = defaultResponses[Math.floor(Math.random()*defaultResponses.length)];
	}
	return returnString;
}

function getIncorrectAnswerText(){
	let defaultResponses = ['Boo!','I\m not angry. Just disappointed','Sigh...','WTF?! Seriously?','C\'mon are you even trying?','Yeesh, don\'t quit your day job.','Uh yeah... no','Honestly, I\'m embarassed for you'];
	let returnString = '';
	if(config.wrongAnswerText){
		let optionsArray = config.wrongAnswerText.split(',');
		returnString = optionsArray[Math.floor(Math.random()*optionsArray.length)];
	}else{
		returnString = defaultResponses[Math.floor(Math.random()*defaultResponses.length)];
	}
	return returnString;
}

function correctAnswerAlert(){
    mascotSay(getCorrectAnswerText(),'happy')
}

function incorrectAnswerAlert(){
    mascotSay(getIncorrectAnswerText(),'sad')
}

function mascotSay(answerText,mascotType){

    let mascotClass = 'correct-anwer-image';
    if(mascotType == 'sad') mascotClass = 'incorrect-anwer-image';
    if(mascotType == 'confused') mascotClass = 'confused-image';

    document.getElementById('mascot-response-container').innerHTML = '';
    let divId = Math.floor(Math.random() * 101);
    let mascotDiv = document.createElement("div");
    mascotDiv.id = 'mascot-'+divId;
    mascotDiv.className = `${mascotClass}`;
    console.log(mascotDiv);

	let speechBubbleDiv = document.createElement("div");
	speechBubbleDiv.id = 'speech-bubble-'+divId;
	speechBubbleDiv.className = "bubble bubble-bottom-right";
	speechBubbleDiv.innerHTML = answerText;
	
	document.getElementById('mascot-response-container').appendChild(speechBubbleDiv);    
    document.getElementById('mascot-response-container').appendChild(mascotDiv);    

    setTimeout(function(elementId){
        ui.addClass([document.getElementById(elementId)], 'fade-out');

        setTimeout(function(elementId){
            document.getElementById(elementId).remove();
        },2000,speechBubbleDiv.id);

    },2000,speechBubbleDiv.id);
}


function setNavigationButtonStates(cardIndex,stackLength){
	
	console.log('Setting button navigation states');
	console.log('card index' + cardIndex + ' stack length ' + stackLength);
	
	//if we are the beginning of the deck
	if(cardIndex == 0){
		console.log('If block 1');
		ui.disable(['prev-button','clue-button','next-letter-button','next-answer-button']);
		
	}
	
	//if we are one away from the end of the stack
	else if(cardIndex+1 == stackLength){
		console.log('If block 2');
		ui.getElements('next-button')[0].value = 'Finish';
	}
	//if we are somewhere in middle of the stack
	else if(cardIndex < cards.length){
		console.log('If block 3');
		ui.enable(['next-button','prev-button','clue-button','next-letter-button','next-answer-button']);
		ui.getElements('next-button')[0].value = 'Next';
	}
	//if we are at the very end of the stack
	else if(cardIndex == cards.length){
		console.log('If block 4');
        if(timer) timer.stopTimer();
        ui.disable('next-button');
		deckCompleteEvents();
    }
}

function loadNext(){
    console.log('---------------------------------- Loading next card. Card Index: ' + cardIndex);
    console.log(viewedCards);
    
    //card object to load next
    let cardToLoad;


    if(timer && timer.timerInterval && cardIndex == 0){
        ui.hideElements('deck-loaded-image');
        timer.startTimer();
    }

    if(historyEntryToWrite != null){
        document.getElementById('history-items').appendChild(historyEntryToWrite);
        historyEntryToWrite = null;
    }

    setHistoryItemStyles();

    //if we are back in the stack, then instead just move up to the next card
    if(viewedCards.length > cardIndex){
        console.log('Exising card in stack. Loading card at index: ' + cardIndex);
        cardIndex++;
        loadCard(viewedCards[cardIndex].id);
    }		
    else {
        if(!useRandom){
            cardToLoad = cards[cardIndex];
        }else{
            
            if(!preventDuplicates) cardToLoad = cards[Math.floor(Math.random()*cards.length)];	
            else {
                console.log('Loading random card, preventing dupes');
                console.log(availableCards);
                cardToLoad = availableCards[Math.floor(Math.random()*availableCards.length)];	
            }
        }
        
        cardIndex++;
        //document.getElementById("history-items").scrollIntoView({ behavior: 'smooth', block: 'end' });
        
        loadCard(cardToLoad.id);
    }
	
	setNavigationButtonStates(cardIndex,cards.length);
}


function createHistoryEntry(cardData,navigationPosition,entryLabel){
    var div = document.createElement('div');

    //TODO - Replace this with whatever 
    div.innerHTML = `${entryLabel}`;
    div.setAttribute('class', 'history-item');
    div.setAttribute('onClick', `loadCard('${cardData.id}',${navigationPosition})`);
    div.setAttribute('data-card-id', `${cardData.id}`);
    //stack the entry into the div
    historyEntryToWrite = div;
}

function setHistoryItemStyles(){
    let answerMap = {};
    for(let answerindex in answerResults){
        answerMap[answerResults[answerindex].card.id] = answerResults[answerindex].wasCorrect;
    }

    let historyItems = document.querySelectorAll('.history-item');

    for(let thisItem of historyItems){

        let isCorrect = answerMap.hasOwnProperty(thisItem.getAttribute('data-card-id')) ? answerMap[thisItem.getAttribute('data-card-id')] : false;

        if(answerMap.hasOwnProperty(thisItem.getAttribute('data-card-id'))){
            if(isCorrect){
                thisItem.classList.remove("incorrect-answer");
                thisItem.classList.add("correct-answer");
            }

            if(!isCorrect){
                thisItem.classList.remove("correct-answer");
                thisItem.classList.add("incorrect-answer");
            }
        }else{
            console.log('Question does not seem to have been answered. Does not exist in answer object. Skipping')
        }

        
    }
}
/**
* if the previous card index is less than 0, don't go back.
* if the previous card index is greater than 0, then load the card at index position in viewedCards
*/

function loadPrev(){
    console.log('---------------------------------- Loading previous card. Card Index: ' + cardIndex);
    console.log(viewedCards);
    
    let cardToLoad;
    
    if(cardIndex > 0) {
        cardIndex--;
        console.log('Removed one from card index. Index is now ' + cardIndex);
        cardToLoad = viewedCards[cardIndex];
        console.log('Previous card in the stack found. Going back to index' + cardToLoad);
        loadCard(cardToLoad.id);
    }else{
        console.log('No previous card in stack. Not going back');
        alert('At beginning of card stack');
    }
    console.log('----------------------------------');
    
}

function showAnswer(){
    document.getElementById('answer').style.visibility='visible';
    let card = document.getElementById('answer-card').classList.toggle("flip-card-flipped")
}

function setRandom(){
    useRandom = !useRandom;
}

function showClue() {
    document.getElementById('clue-text').style.visibility='visible';

    mascotSay(document.getElementById('clue-text').innerHTML,'happy');
    
}

function performHintAction(){
    if(currentCard.type == 'choice')  showNextAnswer();
    else showNextHintLetter();
}

function showNextHintLetter(){
    hintIndex++;
    var hintText = currentAnswer.substring(0, hintIndex);
    document.getElementById("hint-text").innerHTML=hintText;
    document.getElementById('hint-text').style.visibility='visible';   
    
    mascotSay(hintText,'happy')
}

function showNextAnswer(){
    if(!hintIndex) hintIndex = 0;
    //var hintText = currentAnswer.substring(0, hintIndex);

    if(hintIndex > currentCard.correctAnswerValues.length-1) {
        document.getElementById("hint-text").innerHTML='All correct answers highlighted';
        mascotSay('I already highlighted them all for you....','confused')
        return;
    }

    let highlightAnswerIndex = currentCard.correctAnswerValues[hintIndex];

    console.log('highlighting answer hintIndex: ' + hintIndex + '  highlightAnswerIndex: ' + highlightAnswerIndex);

    let options = ui.getElements('.question-option');

    console.log('Options are');
    console.log(options);

    ui.addClass([options[highlightAnswerIndex].nextSibling],'correct-answer'); //get the next sibling (label) for this checkbox to add style to it


    document.getElementById("hint-text").innerHTML='Next correct answer highlighted ' + currentCard.options[highlightAnswerIndex].label;

    mascotSay(currentCard.options[highlightAnswerIndex].label,'happy')

    document.getElementById('hint-text').style.visibility='visible';  
    
    hintIndex++;
}

function answerCorrect(event){
    console.log(currentCard);
    let pointsMod = currentCard.points ? currentCard.points : 1;
    recordQuestionResponse(currentCard,currentCard.genericName,currentCard.genericName,pointsMod);
    performance = calculateScore();

    console.log('Current score info');
    console.log(performance);

    setHistoryItemStyles();
}

function answerIncorrect(event){
    console.log(currentCard);
    recordQuestionResponse(currentCard,currentCard.genericName,'miss',0);
    performance = calculateScore();

    console.log('Current score info');
    console.log(performance);

    setHistoryItemStyles();
}


function deckCompleteEvents(){
	ui.showElements('confetti_outer');
	ui.hideElements('.results-fact');
	resultsModal.showModal();
	
	console.log('Performance Info');
	console.log(performance);
	
	animateScoreTally(performance.runningTotalScore);
	
	//set the contents of the results divs
	ui.setContent('final-score-correct-answers',`${performance.numberCorrect} / ${performance.numberOfQuestions}`);
	ui.setContent('final-score-incorrect-answers',`${performance.numberIncorrect } / ${performance.numberOfQuestions}`);
	ui.setContent('final-score-grade',`${performance.pointsGrade}`);
	ui.setContent('final-score-longest-streak',`${performance.longestStreak}`);
	
	scoreTally.resultFacts = document.getElementsByClassName('results-fact');
	scoreTally.resultFactIndex = 0;
	
	scoreTally.resultFactInterval = setInterval(function(scope){
		scoreTally.resultFacts[scoreTally.resultFactIndex].classList.add('bounce-in-right');
		scoreTally.resultFacts[scoreTally.resultFactIndex].style.visibility = 'visible';
		scoreTally.resultFacts[scoreTally.resultFactIndex].style.display = 'inline-block';	
		scoreTally.resultFactIndex++;
		if(scoreTally.resultFactIndex == scoreTally.resultFacts.length) clearInterval(scoreTally.resultFactInterval);
		
		setTimeout(function(index){
			console.log('Removing bounce style from ');
			console.log(scoreTally.resultFacts[index]);
			scoreTally.resultFacts[index].classList.remove('bounce-in-right');
		},2000,scoreTally.resultFactIndex);
		
	},1000,this);
	

}

function animateScoreTally(score){
	scoreTally.targetNode = ui.getElements('#final-score-results')[0];
	scoreTally.totalScore = score;
	
	console.log(scoreTally);
	
	scoreTally.tallyAnimationInterval  = setInterval(function(scope){

		scoreTally.currentTally = scoreTally.currentTally + 10;
		
		if(scoreTally.currentTally >= scoreTally.totalScore) {
			clearInterval(scoreTally.tallyAnimationInterval);
			scoreTally.currentTally = scoreTally.totalScore;
			scoreTally.targetNode.classList.add('bounce');
		}
		
		scoreTally.targetNode.innerHTML = scoreTally.currentTally;
		
	}, scoreTally.tallyIntervalMS, this);
}

function generateSelectListFromOptions(optionsArray,correctValues){

    if(!isArray(correctValues)) correctValues = [correctValues];

    const container = document.createElement('div');
    container.className = 'question-container';

    console.log('Options array...');
    console.log(optionsArray);

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
    answerBtn.setAttribute('data-correct-value',correctValues);
    answerBtn.onclick = function(event){
        let correctAnswersIndexes = event.target.getAttribute('data-correct-value').split(',');

        console.log('Correct Answers From Button');
        console.log(correctAnswersIndexes);

        let options = ui.getElements('.question-option');;
        let selectedOptionIndexes = [];
        let selectedOptionValues = [];

        console.log('Options');
        console.log(options);

        for(let i = 0; i < options.length; i++){
            if(options[i].checked){
                selectedOptionIndexes.push(i.toString()); //the values in the array this will compare to are strings, so convert this to a string as well
                selectedOptionValues.push(options[i].value);
            }
        }

        console.log('Comparing Answer Arrays: ' + JSON.stringify(selectedOptionIndexes.sort()) + ' VS ' + JSON.stringify(correctAnswersIndexes.sort()));
        console.log(selectedOptionIndexes);

        console.log(correctAnswersIndexes);

        const isCorrect = JSON.stringify(selectedOptionIndexes.sort()) == JSON.stringify(correctAnswersIndexes.sort()) ? true : false;

        let pointsMod = currentCard.points ? currentCard.points : 1;

        if(isCorrect){
            console.log('User got question correct!');
        }else{
            console.log('User got question wrong!');
            pointsMod = 0;
        }

        recordQuestionResponse(currentCard,selectedOptionIndexes,correctAnswersIndexes,pointsMod);

        performance = calculateScore();

        setHistoryItemStyles();
    }

    form.appendChild(answerBtn);
    container.appendChild(form);

    console.log('Returning Container');
    console.log(container);
    return container;
}

function createAnswerOptionInput(optionData,correctValues,forceCheckboxList){

    if(!isArray(correctValues)) correctValues = [correctValues];

    console.log('Creating radio option from');
    console.log(optionData);
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

    console.log('Creating radio option from');
    console.log(optionData);
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

function setPromptKey(value){
    console.log('Setting prompt key: ' + value);
    promptKey = value;
}


function setPreventDupes(){
    preventDuplicates = !preventDuplicates;
}


function setUi(enableUi){


    console.log('toggling ui');
    if(enableUi){
        console.log('enabling UI');
        document.getElementById('deck-controls').style.visibility='visible';
        document.getElementById('controls').style.visibility='visible';
    }else{
        console.log('Hiding ui')
        document.getElementById('deck-controls').style.visibility='hidden';
        document.getElementById('controls').style.visibility='hidden';
    }   
}

function randomIntFromInterval(min, max) { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min)
}

function toggleValue(paramName){
    console.log('Switching ' + paramName + ' from ' + this[paramName] + ' to ' + !this[paramName]);
    this[paramName] = !this[paramName];
}

function resetHistory(){
    try{
        historyEntryToWrite = null;
        viewedCards = [];
        availableCards = [];
        cards = [];
        cardIndex = 0;
        answerResults = [];
		cardLibrary = {};
	    currentCard = {};
		config = {};
		hintIndex = 0;
		currentAnswer = '';


		//final score tally objects
		scoreTally = {
			targetNode: {},
			tallyAnimationInterval: {}, //interval timer
			currentTally: 0, //current value of score tally
			totalScore: 0, //score to reach to clear tally
			tallyIntervalMS: 1 //how often to incriment the display
		}

		performance = {
			currentPoints: 0, 
			possiblePoints : 0, 
			numberCorrect: 0, 
			numberOfQuestions:0, 
			numberIncorrect : 0,
			numberUnanswered : 0,
			pointsScorePercent: 0,
			correctPercent: 0,
			pointsGrade : '-',
			numberCorrectGrade: '-',
			streak: 0,
			longestStreak: 0,
			runningTotalScore: 0
		}
		
        document.getElementById("hint-text").innerHTML = '';
        document.getElementById("clue-text").innerHTML = '';
        document.getElementById('history-items').innerHTML = '';
		document.getElementById("viewed-total").innerHTML = `${viewedCards.length} / ${cards.length}`;
		
		timer.stopTimer();
		timer.seconds =0;
		timer.tens = 0;
		timer.mins = 0;
		calculateScore();
    }catch(ex){
        console.log('Error resetting history');
        console.error(ex);
    }
    
}
window.onload = function() {
	init();
};
