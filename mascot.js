const Mascot = class {
	
	name = 'Default Mascot'
    containerName = 'mascot-response-container';
    defaultMascotClass = 'happy';
	words = {};
    idleChatInterval;
    mood = 50;
    imageBaseFolderURL = 'https://pharmacy-flashcards-2027.lol/media/';
    urls = {
        wordsLibrary: 'https://pharmacy-flashcards-2027.lol/mascotWords.json',
        sounds: {
            fart: 'https://assets.mixkit.co/sfx/download/mixkit-cartoon-fart-sound-2891.wav'
        }
    }
    audio = {}
    mascotDiv;
    speechBubbleDiv;
    speechBubbleLifeMS = 3000;
    moodImages = {
        angry: 'shibaAngry.png',
        confused: 'shibaConfused.png',
        fart: 'shibaFart.png',
        happy: 'shibaHappy.png',
        sad: 'shibaSad.png'
    }


	
	constructor() {
		try{
			console.log('New instance of Mascot class initiated. Either register an exisitng div with registerModal(modalId) or create one with createModal()');

            this.mascotDiv = this.createMascotImageContainer();

            this.audio.fart = new Audio(this.urls.sounds.fart);

		}catch(ex){
			console.error(`Unable to register div with id ${modalId} as a modal!`);
			console.log(ex);
		}
	}

    async loadMascotWords(){
        mascotWordsData = await fetch(`${this.urls.words}?cache-invalidate=${Date.now()}`, {cache: "no-store"});
        mascotWords = await mascotWordsData.json();
        console.log('Loaded mascot words');
        console.log(mascotWords);
        return mascotWords;
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
                mascotSay(mascotWords.idle_chat[Math.floor(Math.random() * mascotWords.idle_chat.length)],'confused');
            }
        },10000);
    }

    mascotSay(answerText,mascotType){     
        let speechBubbleDiv = document.createElement("div");
        speechBubbleDiv.id = 'speech-bubble-'+divId;
        speechBubbleDiv.className = "bubble bubble-bottom-right";
        speechBubbleDiv.innerHTML = answerText;
        
        document.getElementById(this.containerName).appendChild(speechBubbleDiv);     
    
        setTimeout(function(elementId){
            ui.addClass([document.getElementById(elementId)], 'fade-out');
    
            setTimeout(function(elementId){
                document.getElementById(elementId).remove();
            },1800,speechBubbleDiv.id);
    
        },this.speechBubbleLifeMS,speechBubbleDiv.id);
    }

    setMood(moodName){
        if(!this.moodImages.hasOwnProperty(moodName)){
            console.error(`Invalid mascot mood provided: ${moodName}. Valid moods are ${Object.keys(this.moodImages)}`);
        }

        let imageURL = `${this.imageBaseFolderURL}${this.moodImages[moodName]}`;
        console.log(`Setting mascot image to: ${imageURL}`)
        this.setMascotImage(imageURL);
    }

    createMascotImageContainer(){
        let mascotDiv = document.createElement("div");
        mascotDiv.id = 'mascot-'+this.name;
        mascotDiv.className = `${this.defaultMascotClass}`;
        document.getElementById(this.containerName).appendChild(mascotDiv);
        return mascotDiv;
    }

    setMascotImage(imageURL){
        this.mascotDiv.style.backgroundImage=`url(${imageURL})`; // specify the image path here
    }

    playSound(soundName){
        this.sounds[sound].play();
    }
}