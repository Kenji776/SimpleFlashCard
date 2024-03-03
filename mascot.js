const Mascot = class {
	
	name = 'Default Mascot'
    containerName = 'mascot-container';
    defaultMascotClass = 'happy';
	words = {};
    mute = false;
    isActive = true;
    mood = 50;
    imageBaseFolderURL = 'https://pharmacy-flashcards-2027.lol/media/';
    soundsFolder = 'https://pharmacy-flashcards-2027.lol/media/sounds/'
    urls = {
        wordsLibrary: 'https://pharmacy-flashcards-2027.lol/mascotWords.json',
        sounds: {
            fart: ['fart1.wav','fart2.wav','fart3.wav','fart4.wav','fart5.wav'],
            bark: ['bark1.wav']
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
    idleThesholdSeconds =20; //how long with no user interation before we consider them idle
    idleChatCooldownSeconds = 5; //minimum amount of time between idle chat messages
    idleChatRandomChance = 10; //odds of random chat being sent (out of 100) if cooldown is met
    lastIdleChatSent = 0 //when was the idle last chat sent?
    userIsIdle = false; //tracks if user is currently idle

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
        value: '',
        lastIdleChatSent: null,
        clickedTimes: 0,
        clickLimit: 10
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
        this.registerMascotIdleTimer();
        this.registerMascotIdleChat();
        this.registerMascotHotkeys();

        this.setMood('happy');
        this.sayRandom('greeting');
    }


    async loadMascotWords(){
        let mascotWordsData = await fetch(`${this.urls.wordsLibrary}?cache-invalidate=${Date.now()}`, {cache: "no-store"});
        let words =  await mascotWordsData.json();
        return words;
    }

    registerMascotIdleTimer(){
        let activityEvents = ['load','mousemove','mousedown','click','touchstart','keydown'];

        for(let thisEvent of activityEvents){
            document.addEventListener(thisEvent, function() {
                this.resetIdleTimer();
            }.bind(this));
        }
        this.resetIdleTimer();
    }

    resetIdleTimer(){
        if(this.userIsIdle){
            this.setMood('happy');
            this.sayRandom('idle_stop');
        }

        this.idleSeconds = 0;
        this.userIsIdle = false;
        if(this.idleTimer) clearTimeout(this.idleTimer);
        this.idleTimer = setInterval(function(scope){
            scope.idleSeconds++;
 
            if(scope.idleSeconds > scope.idleThesholdSeconds) {
                if(!scope.userIsIdle){
                    console.log('User Went Idle!');
                    scope.setMood('confused');
                    scope.sayRandom('idle_start');
                }
                scope.userIsIdle = true;
            }
        }, 1000, this)
    }

    registerMascotRandomEventTimer(){
        this.randomEventLoop = setInterval(function(scope){
            scope.randomEvent();
        }, this.randomEventLoopIntervalMS, this)        
    }

    registerMascotEventHandlers(){
        this.mascotDiv.addEventListener('click', function() {
            this.setMood('angry')
            
            this.playRandomSound('bark');

            ui.addClass([this.mascotDiv],'hit-impact');

            setTimeout(function(scope){
                ui.removeClass([scope.mascotDiv],'hit-impact');
            },100,this);
            
            //ui.removeClass([this.mascotDiv],'hit-impact');
            this.currentStatus.clickedTimes++;
            if(this.currentStatus.clickedTimes+1 == this.currentStatus.clickLimit){
                this.sayRandom('click_leave_warning')
            }
            else if(this.currentStatus.clickedTimes == this.currentStatus.clickLimit){
                this.sayRandom('leave');
                this.rageQuit('rage_leave');
            }else{
                this.sayRandom('clicked');
            }
        }.bind(this));
    }

    registerMascotHotkeys(){
        document.addEventListener('keydown', function(e) {
            e = e || window.event;
            // use e.keyCode
            console.log(e.keyCode);
            
            if (e.keyCode == '70') {
                this.fart();
                e.preventDefault();
            }
        }.bind(this));
    }

    registerMascotIdleChat(){
        if(!this.words.hasOwnProperty('idle_chat')) {
            console.log('No idle chat words in library. Aborting')
            return;
        }
    
        this.idleChatInterval = setInterval(function(scope){
            let randomChance = Math.floor(Math.random() * 101);

            let rightNow = new Date().getTime();

            if(scope.userIsIdle && randomChance < scope.idleChatRandomChance && ( (rightNow-scope.lastIdleChatSent) / 1000 > scope.idleChatCooldownSeconds)){          
                scope.setMood('happy');
                scope.sayRandom('idle_chat');
                scope.lastIdleChatSent = new Date().getTime(); 
            }
        },1000,this);
    }

    randomEvent(){
        let eventId = Math.floor(Math.random() * 101);

        if(eventId > 50){
            this.fart();
        }
    }

    sayRandom(speechCategory){
        if(!this.words.hasOwnProperty(speechCategory)){
            console.error(`Could not find speech category ${speechCategory}. Not reading text`);
            this.say('I don\'t know what to say!')
            return;
        }
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

        this.setMood('fart');
        this.sayRandom('fart');

        this.playRandomSound('fart');

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

    addMascotAnimationEffect(animationName){
        ui.addClass([this.mascotDiv],animationName)
    }

    removeMascotAnimationEffect(animationName){
        ui.removeClass([this.mascotDiv],animationName)
    }

    playRandomSound(category){
        if(!this.urls.sounds.hasOwnProperty(category)){
            console.error(`No sound category ${category} could be found in sound library. Valid sounds are: ${Object.keys(this.urls.sounds)}`);
            return;
        }
        let thisSound =  this.urls.sounds[category][Math.floor(Math.random() *  this.urls.sounds[category].length)];
        this.playSound(category,thisSound);
    }
    playSound(category, soundName){


        if(this.mute){
            console.error(`Sounds disabled. Not playing sounds`);
            return;
        }
        
        if(!this.urls.sounds.hasOwnProperty(category)){
            console.error(`No sound category ${category} could be found in sound library. Valid sounds are: ${Object.keys(this.urls.sounds)}`);
            return;
        }
        if(this.urls.sounds[category].indexOf(soundName) === -1){
            console.error(`No sound named ${soundName} could be found in sound library. Valid sounds are: ${this.urls.sounds[category]}`);
            return;
        }
        

        let thisSound;
        if(!this.audio[category]) this.audio[category] = {};

        if(!this.audio[category].hasOwnProperty(soundName)){
            thisSound = new Audio(`${this.soundsFolder}${soundName}`);
            this.audio[category][soundName] = thisSound;
        }else{
            thisSound = this.audio[category][soundName];
        }
        try{
            thisSound.play();
        }catch(exception){
            console.error('Unable to play sound: ' + exception.message)
        }
    }

    rageQuit(textType){
        
        this.sayRandom(textType);
        this.setMood('angry');
        this.addMascotAnimationEffect('leave-right');
        setTimeout(function(scope){
            scope.deactivate();
        },5000,this)
    }

    neutralLeave(){     
        this.sayRandom('leave_neutral');
        this.setMood('confused');
        this.addMascotAnimationEffect('leave-right');
        setTimeout(function(scope){
            scope.removeMascotAnimationEffect('leave-right');
            scope.deactivate();
        },5000,this)
    }

    mascotReturn(){
        this.activate();
        this.addMascotAnimationEffect('fade-in');
        this.sayRandom('return');
        this.setMood('happy');
    }

    deactivate(){
        this.currentStatus.isActive = false;
        if(this.idleTimer) clearTimeout(this.idleTimer);
        if(this.randomEventLoop) clearTimeout(this.randomEventLoop);
        ui.hideElements([this.container]);
    }

    activate(){
        this.currentStatus.isActive = true;
        this.registerMascotIdleTimer();
        this.registerMascotIdleChat();
        ui.showElements([this.container]);        
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