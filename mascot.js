const Mascot = class {
	
	name = 'Default Mascot'
    containerName = 'mascot-container';
    defaultMascotClass = 'happy';
	words = {};
  
    mood = 50;
    imageBaseFolderURL = 'https://pharmacy-flashcards-2027.lol/media/';
    urls = {
        wordsLibrary: 'https://pharmacy-flashcards-2027.lol/mascotWords.json',
        sounds: {
            fart: 'https://assets.mixkit.co/sfx/download/mixkit-cartoon-fart-sound-2891.wav'
        }
    }
    audio = []
    
    speechBubbleDiv;
    speechBubbleLifeMS = 3000;
    moodImages = {
        angry: 'shibaAngry.png',
        confused: 'shibaConfused.png',
        fart: 'shibaFart.png',
        happy: 'shibaHappy.png',
        sad: 'shibaSad.png'
    };

    miscImages = {
        fart: 'fart.png'
    }

    //divs
    container; //outer container div that holds mascot and other animation divs
    mascotDiv; //div with mascot background image

    //Idle chat variables
    idleSeconds = 0;  //internal timer that keeps track of how long the user has been idle
    idleTimer;        //container for idle timer
    idleChatInterval; //how long user must be idle for chat message to appear

    //random event loop variables
    randomEventLoop;
    randomEventLoopIntervalMS = 20000; //every twenty seconds maybe do something random

    currentStatus = {
        mood: {
            type: 'neutral',
            sadness: 0,
            anger: 0,
            confusion: 0,
            happiness: 50
        },
        value: ''
    }


	
	constructor(constructorData) {
		try{
            if(!ui) {
                console.error('UI Library not loaded. Cannot init Mascot');
                return;
            }

            //set object properties
            if(typeof constructorData === 'object'){
                for (var k in this) if (constructorData[k] != undefined) this[k] = constructorData[k];
            } 

			console.log('New instance of Mascot class initiated.');
            this.initMascot();
            console.log(this);

		}catch(ex){
			console.error(`Unable to register div with id ${modalId} as a modal!`);
			console.log(ex);
		}
	}

    async initMascot(){
        this.container = document.getElementById(this.containerName);
        this.mascotDiv = this.createMascotImageContainer();
        this.words = await this.loadMascotWords();
        this.registerMascotEventHandlers();
        this.preloadMascotImages();
        this.registerMascotRandomEventTimer();

        this.setMood('happy');
        this.say('Hello!');
    }


    async loadMascotWords(){
        let mascotWordsData = await fetch(`${this.urls.wordsLibrary}?cache-invalidate=${Date.now()}`, {cache: "no-store"});
        let words =  await mascotWordsData.json();
        console.log('Loaded mascot words');
        console.log(words);
        return words;
    }

    registerMascotIdleTimer(){
        this.idleSeconds = 0;
        window.onload = resetTimer;
        // DOM Events
        document.onload = resetTimer;
        document.onmousemove = resetTimer;
        document.onmousedown = resetTimer; // touchscreen presses
        document.ontouchstart = resetTimer;
        document.onclick = resetTimer;     // touchpad clicks
        document.onkeydown = resetTimer;   // onkeypress is deprectaed
    
        function resetTimer() {
            this.idleSeconds = 0;
            clearTimeout(idleTimer);
            this.idleTimer = setInterval(function(){
                this.idleSeconds++;
            }, 1000)
        }
    }

    registerMascotRandomEventTimer(){
        this.randomEventLoop = setInterval(function(scope){
            scope.randomEvent();
        }, this.randomEventLoopIntervalMS, this)        
    }

    registerMascotEventHandlers(){

        this.mascotDiv.addEventListener('click', function() {
            this.setMood('angry')
            this.sayRandom('clicked');
        }.bind(this));
    }

    registerMascotIdleChat(){
        console.log('\n\n\n------------------- Registering Mascot Idle Chat Loop');
        if(!mascotWords.hasOwnProperty('idle_chat')) {
            console.log('No idle chat words in library. Aborting')
            return;
        }
    
        console.log('Registered idle chat loop');
        idleChatInterval = setInterval(function(){
            if(idleSeconds >= 10){
                this.sayRandom('idle_chat');
            }
        },10000);
    }

    randomEvent(){
        let eventId = Math.floor(Math.random() * 101);
        console.log('Calling random event Id: ' + eventId);

        if(eventId > 50){
            this.fart();
        }
    }

    sayRandom(speechCategory){
        if(this.words.hasOwnProperty(speechCategory));
        let randomWords = this.words[speechCategory][Math.floor(Math.random() *  this.words[speechCategory].length)];
        this.say(randomWords);
    }

    say(speechText, hideOtherSpeechBubbles=true){     
        if(hideOtherSpeechBubbles) {
            ui.getElements('.mascot-speech-bubble').forEach(e => e.remove());
        }
        let divId = Math.floor(Math.random() * 101);

        let speechBubbleDiv = document.createElement("div");
        speechBubbleDiv.id = 'speech-bubble-'+divId;
        speechBubbleDiv.className = "bubble bubble-bottom-right mascot-speech-bubble";
        speechBubbleDiv.innerHTML = speechText;
        
        this.container.appendChild(speechBubbleDiv);     

    
        setTimeout(function(elementId){
            ui.addClass([document.getElementById(elementId)], 'fade-out');
    
            setTimeout(function(elementId){
                const bubbleDiv = document.getElementById(elementId);
                if(bubbleDiv) bubbleDiv.remove();
            },1800,speechBubbleDiv.id);
    
        },this.speechBubbleLifeMS,speechBubbleDiv.id);
    }

    fart(){

        let resetToStatusAfterFart = this.currentStatus.value;
        
        if(resetToStatusAfterFart === 'fart') return;

        console.log('Farting...');

        this.setMood('fart');
        this.playSound('fart');

        let fartDiv = document.createElement("div");
        fartDiv.className = 'slide-in-out-left mascot-fart-cloud';
        fartDiv.style.backgroundImage=`url(${this.imageBaseFolderURL}${this.miscImages.fart})`;
        fartDiv.id = 'mascot-fart-cloud';
        this.container.appendChild(fartDiv);     

        //reset back to previous mood after done farting.
        setTimeout(function(scope){
            scope.setMood(resetToStatusAfterFart);
        },1000,this);

        //remove the fart cloud after a few seconds
        setTimeout(function(fartDiv){ 
            if(fartDiv) {
                fartDiv.remove();
            }
        },3000,fartDiv);
    }

    setMood(moodName){
        if(!this.moodImages.hasOwnProperty(moodName)){
            console.error(`Invalid mascot mood provided: ${moodName}. Valid moods are ${Object.keys(this.moodImages)}`);
            return;
        }

        let imageURL = `${this.imageBaseFolderURL}${this.moodImages[moodName]}`;
        console.log(`Setting mascot image to: ${imageURL}`)
        this.currentStatus.value = moodName;
        this.setMascotImage(imageURL);
    }

    createMascotImageContainer(){
        let mascotDiv = document.createElement("div");
        mascotDiv.id = `mascot-image-${this.name}`;
        mascotDiv.className = `${this.defaultMascotClass} mascot-image`;
        document.getElementById(this.containerName).appendChild(mascotDiv);
        return mascotDiv;
    }

    setMascotImage(imageURL){
        this.mascotDiv.style.backgroundImage=`url(${imageURL})`; // specify the image path here
    }

    playSound(soundName){
        if(!this.urls.sounds.hasOwnProperty(soundName)){
            console.error(`No sound named ${soundName} could be found in sound library. Valid sounds are: ${Object.keys(this.urls.sounds)}`);
            return;
        }

        let thisSound;
        if(!this.audio.hasOwnProperty(soundName)){
            thisSound = new Audio(this.urls.sounds[soundName]);
            this.audio[soundName] = thisSound;
        }else{
            thisSound = this.audio[soundName];
        }
        console.log('Playing sound: ' + soundName)
        console.log(thisSound);
        thisSound.play();
    }

    hide(){
        ui.addClass([document.getElementById(elementId)], 'fade-out');
    
        setTimeout(function(elementId){
            ui.hideElements(elementId);
        },1800,this.containerName);
    }

    async preloadMascotImages(){
        for(let imageKey in this.moodImages){
            this.preloadImage(`${this.imageBaseFolderURL}${this.moodImages[imageKey]}`);
        }
    }
    preloadImage(url){
        var img=new Image();
        img.src=url;
    }
}