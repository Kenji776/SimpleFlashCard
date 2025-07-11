//const databaseUrl = 'https://daj000002wi3eeas-dev-ed.develop.my.database-sites.com/services/apexrest/flashCard';
databaseUrl = "http://localhost:3000";
const database = new Database(databaseUrl);
const utils = new Utils();

var scoresInterval;
var deckId;
var refreshGlobalScoresIntervalMS = 10000;




async function init(){
    const urlParams = new URLSearchParams(window.location.search);
    deckId = utils.formatId(urlParams.get('deck'));
    buildGlobalHighScoresTable(deckId, 'global-leaderboard-container')
    //registerGetScoresInterval(deckId)
    getScores(deckId);
}

async function registerGetScoresInterval(){
    setInterval(function(scope){
        buildGlobalHighScoresTable(deckId, 'global-leaderboard-container');
    },refreshGlobalScoresIntervalMS,this)
}

async function getScores(deckId) {
	if (!deckId) {
		console.warn("⚠️ No deckId provided to getScores()");
		return { success: false, message: "Missing deckId" };
	}

	const url = `${database.endpoint}/api/scores?deck=${encodeURIComponent(deckId)}`;

	console.log(`➡️ Fetching scores from: ${url}`);

	try {
		const response = await fetch(url, {
			method: "GET",
			headers: {
				Accept: "application/json",
			},
		});

		const result = await response.json();

		if (!response.ok) {
			console.error("❌ Server responded with error:", result);
			return { success: false, error: result };
		}

		console.log("✅ Scores fetched successfully:", result);
		return result;
	} catch (error) {
		console.error("❌ Error fetching scores:", error);
		return { success: false, error: error.message };
	}
}

async function buildGlobalHighScoresTable(deckId, targetContainer){
    if(!deckId || deckId.length === 0) return;
    //console.log('Getting high scores for deck: ' + deckId)
    let scoresReq = await getScores(deckId);
    const scores = scoresReq.data;

    table = document.createElement('table'),
    table.setAttribute('class', 'high-score-table');
    tr = document.createElement('tr');
    tr.setAttribute('class', 'header-text');

    let headers = ['Player','Score','Date']
    table.appendChild(tr);
    headers.forEach(function(header) {
        var th = document.createElement('th');
        th.appendChild(document.createTextNode(header));
        tr.appendChild(th);
    });

    console.log('Parsing Scores');
    console.log(scores)
    scores.forEach(function(score) {
        tr = document.createElement('tr'), 
        tr.setAttribute('class', 'sub-header-text-2');     
        table.appendChild(tr);
        
        var cell1 = document.createElement('td');
        cell1.appendChild(document.createTextNode(score.playerName));
        tr.appendChild(cell1);

        var cell2 = document.createElement('td');
        cell2.appendChild(document.createTextNode(score.score.toLocaleString(
            undefined, // leave undefined to use the visitor's browser 
                       // locale or a string like 'en-US' to override it.
            { minimumFractionDigits: 0 }
        )));
        tr.appendChild(cell2);

        var cell3 = document.createElement('td');
        let thisDate = new Date(score.createdAt)
        cell3.appendChild(document.createTextNode(`${thisDate.toLocaleDateString()} ${thisDate.toLocaleTimeString()}`));
        tr.appendChild(cell3);        
        
    });

    document.getElementById(targetContainer).innerHTML = table.outerHTML;

}


window.onload = function() {
	init();
};