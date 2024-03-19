const Mascot = class {
	
	name = 'Default Mascot'
    containerName = 'mascot-container';
    defaultMascotClass = 'happy';
    speechBubbleFadeDelay = 1;
	words = {};
    mute = false;
    isActive = true;
    canReactivate = true;
    mood = 50;
    uncensoredMode = false;

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
    chatGPTLoaded = false;
    speechBubbleDiv;
    useTTS = true;
    moodImages = {
        angry: 'shibaAngry.png',
        confused: 'shibaConfused.png',
        fart: 'shibaFart.png',
        happy: 'shibaHappy.png',
        sad: 'shibaSad.png',
        think: 'shibaThink.png'
    };

    miscImages = {
        fart: 'fart.png'
    }

    //elevenlabs text to speech settins. 
    TTS = {
        voice_id: '2ovNLFOsfyKPEWV5kqQi'
    }
    //divs
    container; //outer container div that holds mascot and other animation divs
    mascotDiv; //div with mascot background image

    //Idle chat variables
    idleSeconds = 0;  //internal timer that keeps track of how long the user has been idle
    idleTimer;        //container for idle timer
    idleChatInterval; //how long user must be idle for chat message to appear
    idleThesholdSeconds =20; //how long with no user interation before we consider them idle
    idleChatCooldownSeconds = 10; //minimum amount of time between idle chat messages
    idleChatRandomChance = 10; //odds of random chat being sent (out of 100) if cooldown is met
    lastIdleChatSent = 0 //when was the idle last chat sent?
    userIsIdle = false; //tracks if user is currently idle
    maxIdleEvents = 2; //maximum number of idle chats to send before stopping
    numRunIdleEvents = 0;
    uninterruptableMessageDisplayed = false; //if the currently displayed message is uninterruptable track it
    //random event loop variables
    randomEventLoop;
    randomEventLoopIntervalMS = 5000; //every twenty seconds maybe do something random
    actions = {
        fart : {
            enabled: false,
            functionToCall: 'fart',
            name: 'Fart',
            lastRun: null,
            cooldownSeconds: 5,
            trigger: {
                type: 'random',
                chance: 5
            }
        }
    }

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

    async askQuestion(questionString){
        this.uninterruptableMessageDisplayed = false;

        this.setMood('think');
        this.say('Alright.... gimme a second....');

        let chatGPTResponse = await database.sendRequest({
            'action':'ask_chat_gpt',
            'prompt': questionString,
        });
    
        console.log(chatGPTResponse);
        
        setTimeout(function(scope){
            scope.setMood('happy');
            scope.say(chatGPTResponse.response.choices[0].message.content,true,false,false);
        },2000,this)
        
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

        if(!this.isActive) return;
        if(this.userIsIdle){
            this.setMood('happy');
            this.sayRandom('idle_stop');
            this.numRunIdleEvents = 0;
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
            if (e.keyCode == '70') {
                let prevSetting = this.mute;
                this.mute = false;
                this.fart();
                this.mute = prevSetting;
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

            //console.log('Idle event values: ' +  scope.numRunIdleEvents + ' < ' + scope.maxIdleEvents)
            if(scope.numRunIdleEvents < scope.maxIdleEvents){
                
                let randomChance = Math.floor(Math.random() * 101);

                let rightNow = new Date().getTime();

                /*
                console.log('Random chance check: ' + randomChance + ' < ' + scope.idleChatRandomChance)
                console.log('User idle?: ' + scope.userIsIdle);
                console.log('Cooldown met?: ' + (rightNow-scope.lastIdleChatSent) / 1000 > scope.idleChatCooldownSeconds);
                */
                if(scope.userIsIdle && randomChance < scope.idleChatRandomChance && ( (rightNow-scope.lastIdleChatSent) / 1000 > scope.idleChatCooldownSeconds)){
                    scope.numRunIdleEvents++;          
                    scope.setMood('happy');
                    scope.sayRandom('idle_chat');
                    scope.lastIdleChatSent = new Date().getTime(); 
                }
            }else{
                if(scope.numRunIdleEvents == scope.maxIdleEvents){
                    scope.numRunIdleEvents++;  
                    console.warn('Max idle events reached.');
                    scope.setMood('sad');
                    scope.sayRandom('idle_max_events_reached');
                    if(this.idleTimer) clearTimeout(this.idleTimer);
                    return;
                }
            }
        },2000,this);
    }

    randomEvent(){
        if(!this.isActive) return;

        //generate a random percentage chance between 0 - 100
        let randomChance = Math.floor(Math.random() * 101);

        //we only want to perform one action per loop, so we create a sub collection of potential actions based on % chance
        let potentialActions = [];
        let currentTime = Date.now();

        for(let thisActionName in this.actions){
            let thisAction = this.actions[thisActionName];

            let cooldownMet = thisAction.lastCalled == null || currentTime - thisAction.lastCalled >= (thisAction.cooldownSeconds * 1000) ? true : false;

            if(thisAction?.trigger?.type == 'random' && randomChance <= thisAction?.trigger?.chance && cooldownMet){
                potentialActions.push(thisAction);
            }
        }

        if(potentialActions.length > 0){
            var thisAction = potentialActions[Math.floor(Math.random()*potentialActions.length)];
            this[thisAction.functionToCall](randomChance, this);
            thisAction.lastCalled = Date.now();
            
        }
    }

    sayRandom(speechCategories=[]){


        let possiblePhrases = []; 
        if(typeof speechCategories === 'string') speechCategories = speechCategories.split(',');
        else if(isArray(speechCategories)) speechCategories = speechCategories;


        let uncensoredCategories = [];

        console.log('Uncensored mode?: ' + this.uncensoredMode);
        if(this.uncensoredMode){
            for(let category of speechCategories){
                if(this.words.hasOwnProperty(category+'_uncensored')){
                    console.log('Adding uncensored property!');
                    uncensoredCategories.push(category+'_uncensored');
                }
            }
        }
        speechCategories = speechCategories.concat(uncensoredCategories);

        console.log('Got speech categorioes');
        console.log(speechCategories);

        for(let category of speechCategories){
            if(!this.words.hasOwnProperty(category)){
                console.error(`Could not find speech category ${category}. Not adding words to list`);
                //this.say('I don\'t know what to say!')
            }else{
                possiblePhrases = possiblePhrases.concat(this.words[category])
            }
        }

        if(possiblePhrases.length > 0){
            let randomWords = possiblePhrases[Math.floor(Math.random() *  possiblePhrases.length)];
            this.say(randomWords);
        }else{
            this.say('I don\'t know what to say!');
        }
    }

    say(speechText, hideOtherSpeechBubbles=true, interruptable=true, autoFade=true){  
        
        if(!this.isActive){
            console.warn('Mascot invactive. Not reading text');
            return;            
        }
        if(this.useTTS && EL && !this.mute){
            EL.tts(speechText,this.TTS.voice_id);
        }
        if(this.uninterruptableMessageDisplayed) {
            console.warn('Uninterruptable Message Displayed. Not showing message ' + speechText);
            return;
        }


        if(hideOtherSpeechBubbles) {
            ui.getElements('.mascot-speech-bubble').forEach(e => e.remove());
        }

        let divId = Math.floor(Math.random() * 101);

        let speechBubbleDiv = document.createElement("div");
        speechBubbleDiv.id = 'speech-bubble-'+divId;

        if(!interruptable){
            this.uninterruptableMessageDisplayed = true;
            speechText += `</br><span onclick=mascot.removeSpeechBubble('${speechBubbleDiv.id}') class="close-speech-link">Ok</span>`;
        }

        speechBubbleDiv.className = "bubble bubble-bottom-right mascot-speech-bubble";
        speechBubbleDiv.innerHTML = speechText;
        this.container.appendChild(speechBubbleDiv);     

        let numWords = speechText.split(' ').length;
        let speechDelay = 2.5 * numWords * 1000 * this.speechBubbleFadeDelay;
        speechDelay = speechDelay > 1500 && speechDelay < 10000 ? speechDelay : 3000;
    
        if(autoFade){
            this.removeSpeechBubble(speechBubbleDiv.id,speechDelay);
        }

        
    }

    removeSpeechBubble(bubbleId,speechDelay){
        if(this.uninterruptableMessageDisplayed) this.uninterruptableMessageDisplayed = false;

        setTimeout(function(bubbleId){
            ui.addClass([document.getElementById(bubbleId)], 'fade-out');
    
            setTimeout(function(bubbleId){
                const bubbleDiv = document.getElementById(bubbleId);
                if(bubbleDiv) bubbleDiv.remove();
            },1900,bubbleId);
    
        },speechDelay,bubbleId);
    }

    fart(){

        let resetToStatusAfterFart = this.currentStatus.value;
        
        if(resetToStatusAfterFart === 'fart') return;

        this.setMood('fart');

        let speechCategories = ['fart'];
        this.sayRandom(speechCategories);

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
        this.fart();
        this.addMascotAnimationEffect('leave-right');
        this.canReactivate = false;
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
        if(!this.canReactivate) {
            console.warn('Mascot was requested to reactivate but canReactivate is set to false. Not reactivating');
            return;
        }
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
        if(!this.canReactivate) {
            console.warn('Mascot was requested to reactivate but canReactivate is set to false. Not reactivating');
            return;
        }
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