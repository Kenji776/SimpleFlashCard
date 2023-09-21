var cardStack = 'GroupA';
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
var preventDuplicates = false;
var availableCards = [];
var hintText = 'Stuck? Try clicking Show Drug Class or Show Next Letter!';
var historyEntryToWrite;
var showHistory = true;
var selectedDeckCategory = 'pharmacy'

async function loadCardLibrary(){
    console.log('Loading card library');
    const response = await fetch("https://kenji776.github.io/SimpleFlashChard/cardLibrary.json?cache-invalidate="+Date.now(), {cache: "no-store"});
    const cardLibrary = await response.json();
    console.log(cardLibrary);

    setDeckOptions(cardLibrary);
}

function setDeckOptions(cardLibrary){

    let optionsArray = [];
    [].forEach.call(cardLibrary.card_stacks.categories[selectedDeckCategory], function(category) {
        for(deck in category){
            console.log(category[deck]);
            optionsArray.push({'value':category[deck].url,'label':category[deck].name});
        }

    });

    console.log('Card deck options');
    console.log(optionsArray);
    setSelectOptions('card-deck', optionsArray, null, false)
}

async function loadDeck(deckUrl){
    
    if(!deckUrl){
        console.warn('No deck URL provided to load deck. Aborting');
        return;
    }
    console.log('Loading card library: ' + deckUrl);
    const response = await fetch(deckUrl+'?cache-invalidate='+Date.now(), {cache: "no-store"});
    const deckData = await response.json();
    console.log(deckData);

    cards = deckData.cards;
    availableCards = cards;
    config = deckData.config;


    console.log('Cards');
    console.log(cards);
    console.log('Config');
    console.log(config);
    document.getElementById("content-header").innerHTML= `Card Stack: ${cardStack} - ${cards.length} Cards`; 
    
    setPromptKey(config.defaultPrompt);
    setAnswerKey(config.defaultAnswer);
    
    setSelectOptions('promptKey', config.promptKeys, promptKey, true);
    setSelectOptions('answerKey', config.answerKeys, answerKey, true);
    //loadCard(0);
}

function loadCard(index, forceIndex){
    
    console.log('Loading card from stack #: ' + index);
    
    document.getElementById('answer-card').classList.remove("flip-card-flipped")
    
    hintIndex = 0;
    currentCard = cards[index];
    if(forceIndex) {
        console.log('Forcing index to: ' +forceIndex);
        cardIndex = forceIndex;
    }
    
    console.log(currentCard);


    setSelectedHistoryCard(index);
    
    //removeCardFromAvailable(index);
    
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
    
    //TODO: Make the currentAnswer the value from whatever the promptVal isn't.
    //if promptVal == config.defaultPrompt => currentAnswer = config.defaultAnswer
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
    document.getElementById("prompt").innerHTML= `${index+1} - ${selectedPromptKeyText}<br/> <span class="prompt-text">${currentCard[promptVal]}</span>`; 
    document.getElementById("answer").innerHTML= `${generateAnswerText(currentCard)}`;
    
    document.getElementById("drug-class").innerHTML=currentCard.drugClassName;
    //document.getElementById('answer').style.visibility='hidden';
    document.getElementById('drug-class').style.visibility='hidden';
    document.getElementById('hint-text').style.visibility='hidden';
    
     console.log('Viewed Cards Array');
     console.log(viewedCards);	 			
}

function removeCardFromAvailable(cardIndex){
    console.log('Removing card from stack ' + cardIndex);
    availableCards.splice(cardIndex, 1);
    console.log(availableCards);
}
function setSelectedHistoryCard(cardIndex){
    
    var elems = document.querySelectorAll(".history-item");

    [].forEach.call(elems, function(el) {
        el.classList.remove("selected-history-item");
    });

    console.log('Attempting to highlight card with index: ' + cardIndex);
    try{
        document.querySelectorAll(`.history-item[data-index="${cardIndex}"]`)[0].classList.add("selected-history-item");
    }catch(ex){
        console.log('Could not hightlight item');
        console.log(ex);
    }
}

function generateAnswerText(card){
    let answerString = '';
    for (const [key, value] of Object.entries(card)) {
      let keyLabel = config.labels.hasOwnProperty(key) ? config.labels[key] : key;
      answerString += `${keyLabel}: ${value} </br>`;
    }
    return answerString;
}

function loadNext(){
    console.log('---------------------------------- Loading next card. Card Index: ' + cardIndex);
    console.log(viewedCards);
    
    let cardToLoad;

    if(historyEntryToWrite != null){
        document.getElementById('history-items').appendChild(historyEntryToWrite);
        historyEntryToWrite = null;
    }

    if(viewedCards.length > cardIndex){
        console.log('Exising card in stack. Loading card at index: ' + cardIndex);
        cardToLoad = cardIndex;
        cardIndex++;
        
        loadCard(cardToLoad);
    }		
    else {
        if(!useRandom){
            cardToLoad = cardIndex;
        }else{
            cardToLoad = Math.floor(Math.random()*cards.length)	
        }
        
        createHistoryEntry(cardToLoad,cardIndex);
        viewedCards.push(cardToLoad);
        cardIndex++;
        
        document.getElementById("history-items").scrollIntoView({ behavior: 'smooth', block: 'end' });
        
        loadCard(cardToLoad);
    }
        
    
    console.log('Card index: ' + cardIndex + '. Card to load: ' + cardToLoad);
    console.log('----------------------------------');
}


function createHistoryEntry(cardIndex,navigationPosition){
    let cardData = cards[cardIndex];
    let cardTitle = cardData.genericName;
    var div = document.createElement('div');
    div.innerHTML = `${cardIndex+1}) ${cardTitle}`;
    div.setAttribute('class', 'history-item');
    div.setAttribute('onClick', `loadCard(${cardIndex},${navigationPosition+1})`);
    div.setAttribute('data-index', `${cardIndex}`);

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
        loadCard(cardToLoad);
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

function setSelectOptions(selectId, optionsArray, defaultValue, includeRandom){

    let selectList = document.getElementById(selectId);
    
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

function setAnswerKey(value){
    console.log('Setting answer key: ' + value);
    answerKey = value;
}

function setPreventDupes(){
    preventDuplicates = !preventDuplicates;
}

function toggleHistory(){
    showHistory = !showHistory;

    if(showHistory){
        document.getElementById('history').style.visibility='visible';
    }else{
        document.getElementById('history').style.visibility='hidden';
    }
}

loadCardLibrary();