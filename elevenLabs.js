const ElevenLabs = class {
    apiKey;
    streamingURL = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream?optimize_streaming_latency=3";
    voiceURL = "https://api.elevenlabs.io/v1/voices";
    isStreaming = false;
    constructor(apiKey){
        console.log('Eleven Labs init!');
        this.apiKey = apiKey;
    } 

    async getVoices(){
        const req = new Request(this.voiceURL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': this.apiKey,
            },
        });

        const response = await fetch(req);
        const data = await response.json();

        console.log('Voice Data is');
        console.log(data);
        return data;
    }

    async tts(text,voiceId,config) {

        console.log('tts2 called with string: ' + text);

        if(!this.apiKey || this.apiKey.length === 0){
            console.log('Eleven labs API key not set. Skipping TTS');
            return;
        }
        if(this.isStreaming){
            console.log('Already reading content. Skipping reading of ' + text);
            return;
        }

        this.isStreaming = true;
        setTimeout(function(scope){
            console.log('Unsetting is streaming flag');
            scope.isStreaming = false;
    
        },3000,this);
        // Create an audio context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
        // Create a source node
        const source = audioContext.createBufferSource();
    
        // Make a request to the streaming API
        const request = new XMLHttpRequest();
        request.open('POST', this.streamingURL.replace('{voice_id}',voiceId), true);
        request.responseType = 'arraybuffer';
        request.setRequestHeader('Content-Type', 'application/json');
        request.setRequestHeader('xi-api-key', this.apiKey);


    
        request.onload = function() {
            const audioData = request.response;
    
            // Decode the audio data
            audioContext.decodeAudioData(audioData, function(buffer) {
                // Set the buffer to the source node
                source.buffer = buffer;
                // Connect the source to the destination (the speakers)
                source.connect(audioContext.destination);
                // Start playing the audio
                source.start(0);

                source.onended = function(){
                    console.log('Audio complete. Setting delay until next message readable');

                    setTimeout(function(scope){
                        console.log('Unsetting is streaming flag');
                        scope.isStreaming = false;
                
                    },2000,this);
                }
            }, function(error) {
                console.error('Error decoding audio data: ', error);
            });
        };

        request.onloadend = function(){
            console.log('Audio fetch complete')
        }
    
        request.onerror = function() {
            console.error('Error fetching audio data');
            this.isStreaming = false;
        };
    
        // Send the request with JSON payload containing the text
        const payload = JSON.stringify(new this.TtsRequest(text));
        request.send(payload);
    }

    TtsRequest = class{
        constructor(text,voiceSettings){
            this.text = text;
            if(voiceSettings) this.voiceSettings = voiceSettings;
        }
        text = '';
        voice_settings = {
            "similarity_boost":0.5,
            "stability": 0.25,
            "style": 0,
            "use_speaker_boost": false
        }
    }
}