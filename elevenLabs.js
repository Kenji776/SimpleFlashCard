const ElevenLabs = class {
    apiKey;
    streamingURL = "https://api.elevenlabs.io/v1/text-to-speech/2ovNLFOsfyKPEWV5kqQi/stream?optimize_streaming_latency=3";
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

    async tts(text,voiceId){

        if(!this.apiKey || this.apiKey.length === 0){
            console.log('Eleven labs API key not set. Skipping TTS');
            return;
        }
        if(this.isStreaming){
            console.log('Already reading content. Skipping reading of ' + text);
            return;
        }

        //if the audio decoding fails it throws an uncatchable error it seems. So we have a manual timer to unset the isStreaming flag
        //so that future calls can be ready
        setTimeout(function(scope){
            console.log('Unsetting is streaming flag');
            scope.isStreaming = false;
    
        },3000,this);

        const req = new Request(this.streamingURL, {
            method: 'POST',
            body: JSON.stringify({text: text}),
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': this.apiKey,
            },
        });

        fetch(req).then((resp) => {

            this.isStreaming = true;
            const audioContext = new AudioContext()
            let startTime = 0
            const reader = resp.body.getReader()
            const read = async () => {



            try{
                await reader.read().then(({done, value}) => {
                    try{
                        if (done) {
                            console.log("Audio stream ended");
                            this.isStreaming = false;
                            return
                        }

                        audioContext.decodeAudioData(value.buffer, (audioBuffer) => {
                            try{
                                const source = audioContext.createBufferSource();
                                source.buffer = audioBuffer;
                                source.connect(audioContext.destination);

                                // Wait for the current audio part to finish playing
                                source.onended = () => {
                                    read()
                                };

                                if (startTime == 0) {
                                    startTime = audioContext.currentTime + 0.1 //adding 50ms latency to work well across all systems
                                }
                                source.start(audioContext.currentTime)
                                startTime = startTime + source.buffer.duration
                            }catch(ex){
                                console.error('Error playing audio chunk');
                                console.log(value.buffer);
                                this.isStreaming = false;
                            }
                        });
                    }catch(ex){
                        console.error('Error processing data chunk for audio stream');
                        console.log(done);
                        console.log(value);
                        console.log(ex);  
                        this.isStreaming = false;                     
                    }

                })
            }catch(ex){
                console.error('Error reading data chunk for audio stream');
                console.log(ex);
                this.isStreaming = false;
            }
        }
        read()
    })

    }
}