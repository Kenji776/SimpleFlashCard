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
var selectedDeckCategory = 'Pharmacy'
var showUi = false;
var categories = [];
var answerResults = [];
var autoLoadNextCardOnAnswer = true;
var streakCount = 0;

async function loadCardLibrary(){
    console.log('Loading card library');
    const response = await fetch("https://pharmacy-flashcards-2027.lol/cardLibrary.json?cache-invalidate="+Date.now(), {cache: "no-store"});
    cardLibrary = await response.json();
    console.log(cardLibrary);

    setDeckCategories(cardLibrary);

    setDeckOptions(cardLibrary);
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
    for(let categoryName in deckData.card_stacks.categories){
        optionsArray.push({'value': categoryName, 'label': categoryName});
    }

    console.log('Writting options array');
    console.log(optionsArray);
    setSelectOptions('deck-category', optionsArray, null, false, true)
    return categories;
}

/*
* @description Populates the 'card-deck' select with options from the selected deck category
*/
function setDeckOptions(){

    let optionsArray = [];
    console.log('Select deck options for selectedDeck ' + selectedDeckCategory);
    console.log(cardLibrary)
    for(let deckIndex in cardLibrary.card_stacks.categories[selectedDeckCategory][0]){
        let deck = cardLibrary.card_stacks.categories[selectedDeckCategory][0][deckIndex];

        console.log(deck);
        optionsArray.push({'value':deck.url,'label':deck.name});
    }
    setSelectOptions('card-deck', optionsArray, null, false, true)
}

function setSelectedDeckCategory(categoryId){
    selectedDeckCategory = categoryId;
    setDeckOptions()
}

async function loadDeck(deckUrl){
    
    if(!deckUrl) {
        console.log('Setting deck url to...');
        var select = document.getElementById("card-deck");
        selectedIndex = select.selectedIndex;
        console.log('selected index: '  +selectedIndex);
        var options = select.options;
        console.log('options:');
        console.log(options);
        var selectedValue = options[selectedIndex].value;
        
        console.log('selected value:');
        console.log(selectedValue);
        deckUrl = selectedValue;
        console.log('Deck url is...' + deckUrl);
    }

    

    if(!deckUrl || deckUrl == 'none'){
        console.warn('No deck URL provided to load deck. Aborting');
        return;
    }

    resetHistory();

    console.log('Loading card library: ' + deckUrl);
    const response = await fetch(deckUrl+'?cache-invalidate='+Date.now(), {cache: "no-store"});
    const deckData = await response.json();
    console.log(deckData);

    cards = assignCardIds(deckData.cards);

    console.log(JSON.stringify(cards));
    availableCards = cards;
    config = deckData.config;


    console.log('Cards');
    console.log(cards);
    console.log('Config');
    console.log(config);
    document.getElementById("content-header").innerHTML= `Card Stack: ${config.name} - ${cards.length} Cards`; 
    document.title = config.name;
    
    setPromptKey(config.defaultPrompt);
    
    setSelectOptions('prompt-key', config.promptKeys, promptKey, true, true);
    //setSelectOptions('answerKey', config.answerKeys, answerKey, true);
    //loadCard(0);

    var clueBtn = document.getElementById("clue-button");
    clueBtn.innerHTML  = config?.labels?.clueButtonName ? config.labels.clueButtonName : 'Clue';

    console.log('Set clue button name to: ' + clueBtn.innerHTML );
    console.log(config.labels);

    ui.hideElements('intro-slide-image');
    ui.showElements('deck-loaded-image');
    setUi(true);

    
    document.getElementById("prompt").innerHTML= `${config.name} Loaded. Press Next To Begin`;
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
        //get the text of the current correct answer for a choice question by using the correctAnswerValue property of the question definition to then read that object's label
        currentAnswer = currentCard.options.find(function(o){ return o.value===currentCard.correctAnswerValue}).label;
    }else{
        console.log('current card is unknown type. Prompt text');
        currentAnswer = promptVal == config.defaultPrompt ? currentCard[config.defaultAnswer] : currentCard[config.defaultPrompt];

        ui.setAttribute('correct-icon-button','correctValue,',selectedAnswerKeyText);
        ui.setAttribute('incorrect-icon-button','correctValue,',selectedAnswerKeyText);

        ui.showElements('answer-buttons');
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
        document.getElementById("answer").appendChild(generateSelectListFromOptions(currentCard.options,currentCard.correctAnswerValue));
    }else{
        document.getElementById("answer").innerHTML= `${generateAnswerText(currentCard)}`;
    }
    
    
    document.getElementById("clue-text").innerHTML=currentCard[config.clueTextKey];

    console.log('Set clue to: ' + currentCard[config.clueTextKey]);
    console.log(currentCard);
    console.log(config);

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

function recordQuestionResponse(card,givenAnswer,correctAnswer,awardedPoints){
    answerResults.push({
        "card": card,
        "givenAnswer": givenAnswer,
        "correctAnswer": correctAnswer,
        "awardedPoints": awardedPoints,
        "possiblePoints" : card.points ? card.points : 1,
        "wasCorrect": givenAnswer == correctAnswer ? true : false 
    });

    console.log('Question Response Recorded!');
    console.log(answerResults);

    if(givenAnswer == correctAnswer) {
        correctAnswerAlert()
        streakCount++;
    }
    else {
        incorrectAnswerAlert();
        streakCount = 0;
    }
    if(autoLoadNextCardOnAnswer) loadNext();
}

function calculateScore(){
    let returnObj = {
        "currentPoints": 0, 
        "possiblePoints" : 0, 
        "numberCorrect": 0, 
        "numberOfQuestions":0, 
        "numberIncorrect" : 0,
        "numberUnanswered" : 0,
        "pointsScorePercent": 0,
        "correctPercent": 0,
        "pointsGrade" : '-',
        "numberCorrectGrade": '-',
        "streak": 0
    }

    returnObj.numberOfQuestions = cards.length;

    let finalAnswers = {};
    for(let answer of answerResults){
        console.log('Looking at recorded answer');
        console.log(answer);
        returnObj.currentPoints += answer.awardedPoints;
        returnObj.possiblePoints += answer.possiblePoints;
        finalAnswers[answer.card.id] = answer;
    }

    console.log('Final Answers object');
    console.log(finalAnswers);

    for(let thisCard of cards){
        console.log('Iterating cards');
        console.log(thisCard);
        if(finalAnswers.hasOwnProperty(thisCard.id)){
            if(finalAnswers[thisCard.id].wasCorrect){
                returnObj.numberCorrect++;
            }else{
                returnObj.numberIncorrect++;
            }
        }else{
            console.log('No answer found for  ' + thisCard.id)
            returnObj.numberUnanswered++;
        }
    }

    returnObj.pointsScorePercent = Math.round( (returnObj.currentPoints / (returnObj.possiblePoints)) * 100);
    returnObj.correctPercent = Math.round( (returnObj.numberCorrect / (returnObj.numberOfQuestions-returnObj.numberUnanswered)) * 100);

    returnObj.pointsGrade = getLetterGrade(returnObj.pointsScorePercent);
    returnObj.numberCorrectGrade = getLetterGrade(returnObj.correctPercent);

    document.getElementById('score-total').innerHTML =`${returnObj.numberCorrect} / ${returnObj.numberOfQuestions-returnObj.numberUnanswered}`;
    document.getElementById('points-total').innerHTML =`${returnObj.currentPoints} / ${returnObj.possiblePoints}`;
    document.getElementById('streak-total').innerHTML = streakCount;
    

    document.getElementById('score-grade').innerHTML =`${returnObj.numberCorrectGrade}`;
    //document.getElementById('points-grade').innerHTML =`${returnObj.pointsGrade}`;

    document.getElementById('score-grade').setAttribute('data-grade',returnObj.numberCorrectGrade.slice(0,1).toLowerCase());
    //document.getElementById('points-grade').setAttribute('data-grade',returnObj.pointsGrade.slice(0,1).toLowerCase());

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
	let defaultResponses = ['Boo!','You Suck!','Dumbass','WTF?! Seriously?','C\'mon are you even trying?','Yeesh, don\'t quit your day job.','Uh yeah... no','Honestly, I\'m embarassed for you'];
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
    let divId = Math.floor(Math.random() * 101);
    let mascotDiv = document.createElement("div");
    mascotDiv.id = 'sucess-image-'+divId;
    mascotDiv.className = "correct-anwer-image fade-out";
    console.log(mascotDiv);
	
	let speechBubbleDiv = document.createElement("div");
	speechBubbleDiv.id = 'speech-bubble-'+divId;
	speechBubbleDiv.className = "bubble bubble-bottom-right  fade-out";
	speechBubbleDiv.innerHTML = getCorrectAnswerText();
	
	document.getElementById('answer-card').appendChild(speechBubbleDiv);    
    document.getElementById('answer-card').appendChild(mascotDiv);    

    setTimeout(function(elementId){
        document.getElementById('sucess-image-'+elementId).remove()
		document.getElementById('speech-bubble-'+elementId).remove()
    },3000,divId);
}

function incorrectAnswerAlert(){
	
	let divId = Math.floor(Math.random() * 101);
    let mascotDiv = document.createElement("div");
    mascotDiv.id = 'fail-image-'+divId;
    mascotDiv.className = "incorrect-anwer-image fade-out";
    console.log(mascotDiv);
	
	let speechBubbleDiv = document.createElement("div");
	speechBubbleDiv.id = 'speech-bubble-'+divId;
	speechBubbleDiv.className = "bubble bubble-bottom-right  fade-out";
	speechBubbleDiv.innerHTML = getIncorrectAnswerText();
	
	document.getElementById('answer-card').appendChild(speechBubbleDiv);    
    document.getElementById('answer-card').appendChild(mascotDiv);    

    setTimeout(function(elementId){
        document.getElementById('fail-image-'+elementId).remove()
		document.getElementById('speech-bubble-'+elementId).remove()
    },3000,divId);
	
  
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

    if(cardIndex == cards.length){
        if(timer) timer.stopTimer();

        alert('End of deck reached');
        return;
    }

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
        
        console.log('Card to load set to:');
        console.log(cardToLoad);
        cardIndex++;
        document.getElementById("history-items").scrollIntoView({ behavior: 'smooth', block: 'end' });
        
        loadCard(cardToLoad.id);
    }
        
    
    console.log('Card index: ' + cardIndex + '. Card to load: ' + cardToLoad);
    console.log('----------------------------------');
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
        console.log('Parsing incorrect answers in history list');
        answerMap[answerResults[answerindex].card.id] = answerResults[answerindex].wasCorrect;
    }

    let historyItems = document.querySelectorAll('.history-item');

    for(let thisItem of historyItems){

        console.log(thisItem.getAttribute('data-card-id') + ' has answer logged? ' + answerMap.hasOwnProperty(thisItem.getAttribute('data-card-id')));

        let isCorrect = answerMap.hasOwnProperty(thisItem.getAttribute('data-card-id')) ? answerMap[thisItem.getAttribute('data-card-id')] : false;

        if(answerMap.hasOwnProperty(thisItem.getAttribute('data-card-id'))){
            console.log('this question has been answered. Applying styling class!');
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
    
}

function showNextHintLetter(){
    hintIndex++;
    var hintText = currentAnswer.substring(0, hintIndex);
    document.getElementById("hint-text").innerHTML=hintText;
    document.getElementById('hint-text').style.visibility='visible';
     
    
}

function answerCorrect(event){
    console.log(currentCard);
    let pointsMod = currentCard.points ? currentCard.points : 1;
    recordQuestionResponse(currentCard,currentCard.genericName,currentCard.genericName,pointsMod);
    let currentScore = calculateScore();

    console.log('Current score info');
    console.log(currentScore);

    setHistoryItemStyles();
}

function answerIncorrect(event){
    console.log(currentCard);
    recordQuestionResponse(currentCard,currentCard.genericName,'miss',0);
    let currentScore = calculateScore();

    console.log('Current score info');
    console.log(currentScore);

    setHistoryItemStyles();
}

function generateSelectListFromOptions(optionsArray,correctValue){
    const container = document.createElement('div');
    container.className = 'question-container';

    console.log('Options array...');
    console.log(optionsArray);

    const form = document.createElement('form');
    form.setAttribute('data-correct-value',correctValue);
    for(let option of optionsArray){
        form.appendChild(createOptionRadio(option,correctValue));
    }
    //optionsArray.forEach(({ option }) => form.appendChild(createOptionRadio(option)));

    const answerBtn = document.createElement('input');
    answerBtn.type = 'button';
    answerBtn.className = 'answer-button';
    answerBtn.value = `Submit Answer ${currentCard.points ? currentCard.points : 1} ${currentCard.points && currentCard.points > 1 ? 'Points' : 'Point'}`;
    answerBtn.id = `answer-btn`;
    answerBtn.name = `answer-btn`;
    answerBtn.className = 'button';
    answerBtn.setAttribute('data-correct-value',correctValue);
    answerBtn.onclick = function(event){
        var options = document.getElementsByName('question-options');
        var selectedOptionValue;

        for(var i = 0; i < options.length; i++){
            if(options[i].checked){
                selectedOptionValue = options[i].value;
            }
        }

        let pointsMod = currentCard.points ? currentCard.points : 1;
        console.log(event.target.getAttribute('data-correct-value') + ' vs ' + selectedOptionValue);
        if(event.target.getAttribute('data-correct-value') === selectedOptionValue){
            //alert(config.correctAnswerText);
        }else
        {
            //alert(config.wrongAnswerText);
            pointsMod = 0;
        }

        recordQuestionResponse(currentCard,selectedOptionValue,event.target.getAttribute('data-correct-value'),pointsMod);

        let currentScore = calculateScore();

        console.log('Current score info');
        console.log(currentScore);

        setHistoryItemStyles();
    }

    form.appendChild(answerBtn);
    container.appendChild(form);

    return container;
}

function createOptionRadio(optionData,correctValue){
    console.log('Creating radio option from');
    console.log(optionData);
    const container = document.createElement('div');

    const input = document.createElement('input');
    input.type = 'radio';
    input.className = 'question-option';
    input.value = optionData.value;
    input.id = `option-${optionData.value}`;
    input.name = `question-options`;
    
    if(optionData.value == correctValue) input.setAttribute('data-correct-value',true);

    const label = document.createElement('label');
    label.for = input.name;
    label.textContent = optionData.label[0].toUpperCase() + optionData.label.slice(1);

    container.appendChild(input);
    container.appendChild(label);

    return container;
};

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
        document.getElementById("hint-text").innerHTML = '';
        document.getElementById("clue-text").innerHTML = '';
        document.getElementById('history-items').innerHTML = '';
    }catch(ex){
        console.log('Error resetting history');
        console.error(ex);
    }
    
}
window.onload = function() {
    loadCardLibrary();
};
