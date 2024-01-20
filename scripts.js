var cardStack = '';
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
var selectedDeckCategory = 'pharmacy'
var showUi = false;
var categories = [];

async function loadCardLibrary(){
    console.log('Loading card library');
    const response = await fetch("https://pharmacy-flashcards-2027.lol/cardLibrary.json?cache-invalidate="+Date.now(), {cache: "no-store"});
    const cardLibrary = await response.json();
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
    setSelectOptions('deck-category', optionsArray, null, false, false)
    return categories;
}

/*
* @description Populates the 'card-deck' select with options from the selected deck category
*/
function setDeckOptions(cardLibrary){

    let optionsArray = [];
    [].forEach.call(cardLibrary.card_stacks.categories[selectedDeckCategory], function(category) {
        for(deck in category){
            console.log(category[deck]);
            optionsArray.push({'value':category[deck].url,'label':category[deck].name});
        }

    });
    setSelectOptions('card-deck', optionsArray, null, false, false)
}

function setSelectedDeckCategory(categoryId){
    selectedDeckCategory = categoryId;
    setDeckOptions()
}

async function loadDeck(deckUrl){
    
    viewedCards = [];
    availableCards = [];
    cards = [];
    cardIndex = 0;

    if(!deckUrl || deckUrl == 'none'){
        console.warn('No deck URL provided to load deck. Aborting');
        return;
    }

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
    
    setPromptKey(config.defaultPrompt);
    
    setSelectOptions('prompt-key', config.promptKeys, promptKey, true, true);
    //setSelectOptions('answerKey', config.answerKeys, answerKey, true);
    //loadCard(0);

    setUi(true);

    
    document.getElementById("prompt").innerHTML= `Press Next To Begin`;
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
    
    if(promptKey == 'random'){
        console.log('Randomizing prompt value');	
        promptVal = config.promptKeys[Math.floor(Math.random()*config.promptKeys.length)].value;
    }
    if(answerKey == 'random'){
        console.log('Randomizing answer value');
        answerVal = config.answerKeys[Math.floor(Math.random()*config.answerKeys.length)].value;		
    }

    var selectedAnswerKeyText = config.answerKeys.find(x => x.value === answerVal).label;
    var selectedPromptKeyText = config.promptKeys.find(x => x.value === promptVal).label;
   
    //create the history entry if it doesn't exist for this card.
    if(!viewedCards.some(e => e.id === currentCard.id)) {
        console.log('Viewed cards does not have an entry for id: ' + currentCard.id);
        console.log(viewedCards)
        console.log('Creating history item for card');
        console.log(currentCard);
        createHistoryEntry(currentCard,viewedCards.length,currentCard[promptVal]);
        viewedCards.push(currentCard);
    }


    currentAnswer = promptVal == config.defaultPrompt ? currentCard[config.defaultAnswer] : currentCard[config.defaultPrompt];
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
    document.getElementById("answer").innerHTML= `${generateAnswerText(currentCard)}`;
    
    document.getElementById("drug-class").innerHTML=currentCard.drugClassName;
    //document.getElementById('answer').style.visibility='hidden';
    document.getElementById('drug-class').style.visibility='hidden';
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
        if(key == 'id') continue;
        let keyLabel = config.labels.hasOwnProperty(key) ? config.labels[key] : key;
        answerString += `${keyLabel}: ${value} </br>`;
    }
    return answerString;
}

function loadNext(){
    console.log('---------------------------------- Loading next card. Card Index: ' + cardIndex);
    console.log(viewedCards);
    
    //card object to load next
    let cardToLoad;



    if(historyEntryToWrite != null){
        document.getElementById('history-items').appendChild(historyEntryToWrite);
        historyEntryToWrite = null;
    }

    if(cardIndex == cards.length){
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

function showDrugClass() {
    document.getElementById('drug-class').style.visibility='visible';
    
}

function showNextHintLetter(){
    hintIndex++;
    var hintText = currentAnswer.substring(0, hintIndex);
    document.getElementById("hint-text").innerHTML=hintText;
    document.getElementById('hint-text').style.visibility='visible';
     
    
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

function toggleHistory(){
    showHistory = !showHistory;

    if(showHistory){
        document.getElementById('history-items').style.visibility='visible';
    }else{
        document.getElementById('history-items').style.visibility='hidden';
    }
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

window.onload = function() {
    
    loadCardLibrary();
};
