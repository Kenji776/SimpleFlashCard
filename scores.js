const databaseUrl = 'https://daj000002wi3eeas-dev-ed.develop.my.salesforce-sites.com/services/apexrest/flashCard';
const database = new Database(databaseUrl);
const utils = new Utils();

var scoresInterval;
var deckId;
var refreshGlobalScoresIntervalMS = 10000;




async function init(){
    const urlParams = new URLSearchParams(window.location.search);
    deckId = utils.formatId(urlParams.get('deck'));
    buildGlobalHighScoresTable(deckId, 'global-leaderboard-container')
    registerGetScoresInterval(deckId)
}

async function registerGetScoresInterval(){
    setInterval(function(scope){
        buildGlobalHighScoresTable(deckId, 'global-leaderboard-container');
    },refreshGlobalScoresIntervalMS,this)
}

async function getScores(deckId){
    let getResult = await database.sendRequest({
        'action':'get_scores',
        'deck':deckId,
    });
    return getResult;
}

async function buildGlobalHighScoresTable(deckId, targetContainer){
    if(!deckId || deckId.length === 0) return;
    //console.log('Getting high scores for deck: ' + deckId)
    let scores = await getScores(deckId);

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
        cell1.appendChild(document.createTextNode(score.Player_Name__c));
        tr.appendChild(cell1);

        var cell2 = document.createElement('td');
        cell2.appendChild(document.createTextNode(score.Score__c.toLocaleString(
            undefined, // leave undefined to use the visitor's browser 
                       // locale or a string like 'en-US' to override it.
            { minimumFractionDigits: 0 }
        )));
        tr.appendChild(cell2);

        var cell3 = document.createElement('td');
        let thisDate = new Date(score.CreatedDate)
        cell3.appendChild(document.createTextNode(`${thisDate.toLocaleDateString()} ${thisDate.toLocaleTimeString()}`));
        tr.appendChild(cell3);        
        
    });

    document.getElementById(targetContainer).innerHTML = table.outerHTML;

}


window.onload = function() {
	init();
};