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
	constructor(constructorData) {
		this.deckId = "";
		this.currentPoints = 0;
		this.possiblePoints = 0;
		this.numberCorrect = 0;
		this.numberOfQuestions = 0;
		this.numberIncorrect = 0;
		this.numberUnanswered = 0;
		this.pointsScorePercent = 0;
		this.correctPercent = 0;
		this.pointsGrade = "-";
		this.numberCorrectGrade = "-";
		this.streak = 0;
		this.longestStreak = 0;
		this.runningTotalScore = 0;
		this.missStreak = 0;
		this.hintsUsed = 0;
		this.answersRevelaed = 0;
		this.lettersShown = 0;
		this.answers = []; //an array of Answer objects
		this.performanceRecordId =
			Date.now().toString(36) +
			Math.random()
				.toString(36)
				.substr(2);
		this.dateTimeStart = Date.now();

		if (typeof constructorData === "object") {
			for (var k in this) if (constructorData[k] != undefined) this[k] = constructorData[k];
		}

		console.log("New PerformanceRecord Constructed with ID: " + this.performanceRecordId + " For Deck: " + this.deckId);
	}

	recordAnswer(answerObject) {
		try {
			// ✅ Validate inputs
			if (!answerObject || !answerObject.question || !answerObject.question.id) {
				console.warn("Invalid answer object. Aborting record.");
				return;
			}

			if (!Array.isArray(this.answers)) {
				console.warn("Answers array is not initialized. Initializing now.");
				this.answers = [];
			}

			// ✅ Find index safely
			let existingIndex = this.answers.findIndex((obj) => obj?.question?.id === answerObject.question.id);

			if (existingIndex !== -1) {
				this.answers[existingIndex] = answerObject;
			} else {
				this.answers.push(answerObject);
			}

			// ✅ Only update totals on first entry
			if (existingIndex === -1) {
				this.possiblePoints += parseInt(answerObject.possiblePoints || 0, 10);
				this.numberOfQuestions = (this.numberOfQuestions || 0) + 1;

				if (answerObject.correct) {
					this.numberCorrect = (this.numberCorrect || 0) + 1;
					this.missStreak = 0;
					this.streak = (this.streak || 0) + 1;
					this.currentPoints += parseInt(answerObject.awardedPoints || 0, 10);
					if (this.streak > (this.longestStreak || 0)) this.longestStreak = this.streak;
				} else {
					this.numberIncorrect = (this.numberIncorrect || 0) + 1;
					this.streak = 0;
					this.missStreak = (this.missStreak || 0) + 1;
				}

				let totalPossible = this.possiblePoints || 1;
				let totalAnswered = (this.numberOfQuestions || 1) - (this.numberUnanswered || 0);

				this.pointsScorePercent = Math.round((this.currentPoints / totalPossible) * 100);
				this.correctPercent = Math.round((this.numberCorrect / totalAnswered) * 100);

				if (typeof this.getLetterGrade === "function") {
					this.pointsGrade = this.getLetterGrade(this.pointsScorePercent);
					this.numberCorrectGrade = this.getLetterGrade(this.correctPercent);
				}

				this.runningTotalScore = Math.round(this.currentPoints * 1000) - (this.hintsUsed || 0) * 1.2 * 100 - (this.hintsUsed || 0) * 5.0 * 100 - (this.lettersShown || 0) * 1.0;
			}
		} catch (err) {
			console.error("❌ Error in recordAnswer:", err);
		}
	}

	getAnswer(cardId) {
		try {
			if (!Array.isArray(this.answers)) return null;
			if (!cardId) return null;

			return this.answers.find((ans) => ans?.question?.id == cardId) || null;
		} catch (err) {
			console.error("❌ Error in getAnswer:", err);
			return null;
		}
	}

	getPreviousResults(pastPerformances = []) {
		try {
			if (!Array.isArray(pastPerformances)) return [];
			if (!this.deckId) return [];

			return pastPerformances.filter((perf) => perf?.deckId === this.deckId && perf?.performanceRecordId && perf.performanceRecordId !== this.performanceRecordId);
		} catch (err) {
			console.error("❌ Error in getPreviousResults:", err);
			return [];
		}
	}

	previousHighScore(pastPerformances = []) {
		try {
			let prevResults = this.getPreviousResults(pastPerformances);
			let highScore = 0;
			let bestResult = null;

			for (let result of prevResults) {
				if ((result?.currentPoints || 0) > highScore) {
					highScore = result.currentPoints;
					bestResult = result;
				}
			}
			return bestResult;
		} catch (err) {
			console.error("❌ Error in previousHighScore:", err);
			return null;
		}
	}

	isBestScore(pastPerformances = []) {
		try {
			let prevResults = this.getPreviousResults(pastPerformances);
			if (!Array.isArray(prevResults) || prevResults.length === 0) return true;

			return !prevResults.some((res) => (res?.currentPoints || 0) >= (this.currentPoints || 0));
		} catch (err) {
			console.error("❌ Error in isBestScore:", err);
			return false;
		}
	}

	recalculateScore(answerResults = [], cards = []) {
		try {
			if (!Array.isArray(answerResults) || !Array.isArray(cards)) {
				console.warn("Invalid input to recalculateScore.");
				return;
			}

			let finalAnswers = {};
			this.currentPoints = 0;
			this.possiblePoints = 0;
			this.numberCorrect = 0;
			this.numberIncorrect = 0;
			this.numberUnanswered = 0;

			for (let answer of answerResults) {
				if (!answer) continue;
				this.currentPoints += parseInt(answer.awardedPoints || 0, 10);
				this.possiblePoints += parseInt(answer.possiblePoints || 0, 10);
				if (answer?.card?.id) {
					finalAnswers[answer.card.id] = answer;
				}
			}

			doLog?.("Final Answers object", finalAnswers);

			for (let card of cards) {
				if (!card?.id) continue;
				if (finalAnswers.hasOwnProperty(card.id)) {
					if (finalAnswers[card.id].wasCorrect) {
						this.numberCorrect++;
					} else {
						this.numberIncorrect++;
					}
				} else {
					this.numberUnanswered++;
				}
			}
		} catch (err) {
			console.error("❌ Error in recalculateScore:", err);
		}
	}

	getLetterGrade(numberGrade) {
		try {
			// ✅ Ensure we have a number
			let grade = Number(numberGrade);
			if (isNaN(grade) || grade < 0) {
				console.warn(`Invalid grade input (${numberGrade}). Defaulting to "F".`);
				return "F";
			}

			// ✅ Clamp values greater than 100
			if (grade > 100) grade = 100;

			let letter;
			if (grade === 100) {
				letter = "S"; // special case
			} else if (grade >= 97) {
				letter = "A+";
			} else if (grade >= 94) {
				letter = "A";
			} else if (grade >= 90) {
				letter = "A-";
			} else if (grade >= 87) {
				letter = "B+";
			} else if (grade >= 84) {
				letter = "B";
			} else if (grade >= 80) {
				letter = "B-";
			} else if (grade >= 77) {
				letter = "C+";
			} else if (grade >= 70) {
				letter = "C";
			} else {
				letter = "F";
			}

			return letter;
		} catch (err) {
			console.error("❌ Error in getLetterGrade:", err);
			return "F"; // safe fallback
		}
	}
}