let timer = {
	seconds: 0,
	tens: 0,
    mins: 0,
	appendTens: document.getElementById("tens"),
	appendSeconds: document.getElementById("seconds"),
    appendMins:  document.getElementById("mins"),
	timerInterval: {},

    startTimer: function() {
        console.log('Start timer clicked');
        //this.appendTens = document.getElementById("tens");
        this.appendSeconds = document.getElementById("seconds");
        this.appendMins = document.getElementById("mins");
        if(this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(this.runTimer, 1000, this);

        console.log(this);
    },
    
    stopTimer: function() {
        clearInterval(this.timerInterval);
    },
    
    
    resetTimer: function() {
        clearInterval(this.timerInterval);
        this.tens = 0;
        this.seconds = 0;
        this.minutes = 0;
        if(this.appendTens) this.appendTens.innerHTML = "00";
        if(this.appendSeconds) this.appendSeconds.innerHTML = "00";
        if(this.appendMins) this.appendMins.innerHTML = "00";
    },
    
    runTimer: function(scope){
        scope.tens = scope.tens + 1000;
    
        
        //------------------------ Tenths of Seconds ----------------------//
        //scope.appendTens.innerHTML = scope.tens >=10 ? scope.tens : "0" + scope.tens;
    
        //------------------------ Seconds ----------------------//
        if (scope.tens > 99) {
            scope.seconds++;
            scope.appendSeconds.innerHTML = scope.seconds >=10 ? scope.seconds : "0" + scope.seconds;
            scope.tens = 0;
            //scope.appendTens.innerHTML = "0" + 0;
        }
    

        //------------------------ Minutes ----------------------//
        if (scope.seconds > 60){
            scope.mins++;
            scope.appendMins.innerHTML = scope.mins >=10 ? scope.mins : "0" + scope.mins;
            scope.seconds = 0;
            scope.appendSeconds.innerHTML = "0" + 0;
        }

    }
}
