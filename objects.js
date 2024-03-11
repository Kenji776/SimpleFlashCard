class ShuffleDeckConfig {
    constructor(sourceDeckConfig, options={}) {
        this.sourceDeckConfig = sourceDeckConfig;
        this.shuffleType;
        this.groupBy;

        //default options
        //TODO: Set better defaults
        this.options = {
            shuffleType: 'group-by',
            groupBy: 'drugClassName',
            deckType: 'multiple-choice',
            minRightAnswers: 1,
            minWrongAnswers: 1,
            maxAnswerOptions: 5,
            answerLabelProperty: 'genericName',
            answerValueProperty: 'genericName'
        }

        for(let propName in options){
            if(options[propName] && options[propName] != undefined ) this[propName] = options[propName];
        }
    }
}

class Card {
    constructor(constructorData){
        this.type = ''; //type of card. May be 'choice' or 'flashcard;
        this.questionText = ''; //text of the question
        this.correctAnswerValues = []; //index numbers of the option values in the options array that are correct
        this.points = 1; //number of points this question is worth
        this.hint = '' //text hint string to present to user
        this.options = []; //array of option value objects. Each option should have a 'value' and a 'label' property.
        this.allValidAnswers = [];

        if(typeof constructorData === 'object'){
            for (var k in this) if (constructorData[k] != undefined) this[k] = constructorData[k];
        } 
    }
}

class Answer{
    constructor(constructorData){
        this.correct = false;
        this.awardedPoints = 0
        this.possiblePoints = 0;
        this.question = {};
        this.givenAnswers = [];
        this.correctAnswers = [];
        

        if(typeof constructorData === 'object'){
            for (var k in this) if (constructorData[k] != undefined) this[k] = constructorData[k];
        }
    }
}

class PerformanceRecord {

    constructor(constructorData){
        this.deckId = '';
        this.currentPoints = 0; 
        this.possiblePoints = 0; 
        this.numberCorrect = 0; 
        this.numberOfQuestions = 0; 
        this.numberIncorrect = 0;
        this.numberUnanswered = 0;
        this.pointsScorePercent = 0;
        this.correctPercent = 0;
        this.pointsGrade = '-';
        this.numberCorrectGrade = '-';
        this.streak = 0;
        this.longestStreak = 0;
        this.runningTotalScore = 0;
        this.missStreak = 0;
        this.hintsUsed = 0;
        this.answersRevelaed = 0;
        this.lettersShown = 0
        this.answers = []; //an array of Answer objects
        this.performanceRecordId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        this.dateTimeStart = Date.now();

        if(typeof constructorData === 'object'){
            for (var k in this) if (constructorData[k] != undefined) this[k] = constructorData[k];
        } 

        console.log('New PerformanceRecord Constructed with ID: ' + this.performanceRecordId + ' For Deck: ' + this.deckId);
    }

    recordAnswer(answerObject){
        //we only want to write a new entry into the answers array if we don't have an existing entry for this question
        let existingAnswerPosition = this.answers.find(obj => {
            return obj.question.id === answerObject.question.id
        });

        if(existingAnswerPosition){
            this.answers[existingAnswerPosition] = answerObject;
        }else{
            this.answers.push(answerObject);
        }
        

        //we only want to update the totals if this is the first time this question was answered
        if(!existingAnswerPosition){
            this.possiblePoints += parseInt(answerObject.possiblePoints,10);
            this.numberOfQuestions++;

            if(answerObject.correct){
                this.numberCorrect++;
                this.missStreak = 0;
                this.streak++;
                this.currentPoints += parseInt(answerObject.awardedPoints,10);
                if(this.streak > this.longestStreak) this.longestStreak = this.streak;
            }else{
                this.numberIncorrect++;
                this.streak = 0;
                this.missStreak++;
            }

            this.pointsScorePercent = Math.round( (this.currentPoints / (this.possiblePoints)) * 100);
            this.correctPercent = Math.round( (this.numberCorrect / (this.numberOfQuestions-this.numberUnanswered)) * 100);

            this.pointsGrade = this.getLetterGrade(this.pointsScorePercent);
            this.numberCorrectGrade = this.getLetterGrade(this.correctPercent);
            this.runningTotalScore = Math.round( (this.currentPoints * 1000)) - ((this.hintsUsed * 1.2) * 100) - ((this.hintsUsed * 5.0) * 100) - ((this.lettersShown * 1.0));
        }

    }

    getAnswer(cardId){
        for(let thisAnswerIndex in this.answers){
            if(this.answers[thisAnswerIndex].question.id == cardId) return this.answers[thisAnswerIndex];
        }
        return null;
    }

    getPreviousResults(pastPerformances={}){
        let previousResults = [];
        for(let thisPerf of pastPerformances){
            if(thisPerf.deckId === this.deckId && thisPerf.performanceRecordId != this.performanceRecordId) previousResults.push(thisPerf);
        }
        return previousResults;
    }

    previousHighScore(pastPerformances){
        let prevResults = this.getPreviousResults(pastPerformances);
        let highScore = 0;
        let bestResult = {};
        for(let thisResult of prevResults){
            if(thisResult.currentPoints > highScore){
                highScore = thisResult.currentPoints;
                bestResult = thisResult;
            }
        }
        return bestResult;       
    }

    isBestScore(pastPerformances){
        let prevResults = this.getPreviousResults(pastPerformances);
        let isHighScore = true;
        for(let thisResult of prevResults){
            if(thisResult.currentPoints >= this.currentPoints){
                isHighScore = false;
                break;
            }
        }
        return isHighScore;
    }

    recalculateScore(){

        let finalAnswers = {};
        
        for(let answer of answerResults){
            this.currentPoints += answer.awardedPoints;
            this.possiblePoints += answer.possiblePoints;
            finalAnswers[answer.card.id] = answer;
        }
    
        doLog('Final Answers object');
        doLog(finalAnswers);
    
        for(let thisCard of cards){
            if(finalAnswers.hasOwnProperty(thisCard.id)){
                if(finalAnswers[thisCard.id].wasCorrect){
                    this.numberCorrect++;
                }else{
                    this.numberIncorrect++;
                }
            }else{
                this.numberUnanswered++;
            }
        }
    }
    
    getLetterGrade(numberGrade) {
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
}