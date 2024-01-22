ui = {};
ui.state = {};
ui.elements = {
    'historySection': 'history-items' //container that contains the individual history elements. Not the entire history container itself.
}

//------------------------------------------------- HTML ELEMENT FUNCTIONS -------------------------------------//
HTMLElement.prototype.hide = function(element){
    console.log(this + ' hiding says: ' + thing);
    ui.setElementVisibility(element,false);
}

HTMLElement.prototype.show = function(element){
    console.log(this + ' showing says: ' + thing);
    ui.setElementVisibility(element,true);
}

HTMLElement.prototype.toggle = function(element){
    console.log(this + ' toggle says: ' + thing);
    ui.setElementVisibility(ui.getVisibilityById(element),true);
}


//------------------------------------------------- UTILITY FUNCTIONS -------------------------------------//
ui.toggleDisplay = function(elementId){

    console.log('Toggling: ' + elementId+ '. Visible: ' + ui.getVisibilityById(elementId));
    if(ui.getVisibilityById(elementId)){
        console.log('Hiding: ' + elementId)
        ui.hideElements(elementId);
        console.log('Visiblity: ' + ui.getVisibilityById(elementId))
    }else{
        console.log('Showing: ' + elementId)
        ui.showElements(elementId);
        console.log('Visiblity: ' + ui.getVisibilityById(elementId))
    }
}


ui.toggleUiLock = function(enableUi){
    if(enableUi){
        ui.showElements('deck-controls');
        ui.showElements('controls');
    }else{
        ui.hideElements('deck-controls');
        ui.hideElements('controls');
    }
}


//------------------- Private Methods --------------------------//
ui.getVisibilityById = function(elements){
    let allVisible = true;
    let elementsList = [];
    console.log(typeof elements);
    if(typeof elements === 'string') elementsList = elementsList.concat(elements.split(','));
    else if(isArray(element)) elementsList = elements;

    console.log('List of elements');
    console.log(elementsList);
    for(let element of elementsList){

        thisElement = element;
        if(typeof element === 'string') thisElement = ui.getElements(element)[0];

        //let style = window.getComputedStyle(thisElement);
        //let hidden = style.display === 'none' ? true : false;

        console.log('Checking visiblity of element: ' );
        console.log(thisElement);
        let isVisible = thisElement.checkVisibility({
            checkOpacity: true,      // Check CSS opacity property too
            checkVisibilityCSS: true // Check CSS visibility property too
        });

        if(!isVisible) allVisible = false;
    }
    return allVisible; //style.display === 'none' ? true : false;
}

ui.hideElements = function(elementId){
    ui.setElementVisibility(ui.getElements(elementId),false);
}

ui.showElements = function(elementId){
    ui.setElementVisibility(ui.getElements(elementId),true);
}

ui.addClass = function(elements,className){
    let elementsList = [];
    if(typeof elements === 'string') elementsList = elementsList.concat(elements.split(','));
    else if(isArray(element)) elementsList = element;
    for(let element of elementsList){
        thisElement = element;
        if(typeof element === 'string') thisElement = ui.getElements(element)[0];
        thisElement.classList.add(className);
    }
}

ui.removeClass = function(elements,className){
    let elementsList = [];
    if(typeof elements === 'string') elementsList = elementsList.concat(elements.split(','));
    else if(isArray(element)) elementsList = element;
    for(let element of elementsList){
        thisElement = element;
        if(typeof element === 'string') thisElement = ui.getElements(element)[0];
        thisElement.classList.remove(className);
    }
}


/**
* @description sets and HTMl elements visibility
* @param {array[object]} elements Array of element Ids, class names (start with .) or HTML elements to set visibility of
* @param {boolean} visible Visibility stat of elements 
* @returns boolean. True if visibility set to false. False if visibility was not set.
*/
ui.setElementVisibility = function(elements,visible){
    let elementsToProcess = [];
    if(!isArray(elements)) elementsToProcess.push(elements);
    else elementsToProcess = elements;
    let visiblityWord = visible ? 'visible' : 'hidden';

    for(let element of elementsToProcess){
        //if this element is an object, we can assume it is an html node and modify it directly.
        if(typeof element === 'object' ) element.style.visibility=visiblityWord;
        else ui.getElements(element)[0].style.visibility=visiblityWord;
    }
    return elementsToProcess;
}

/**
* @description Gets element by id in error safe.
* @param {*} elementsToFind Id or class of element to get. Start 
* @returns selected elements in array if more than one, singular element object if only one, or empty object
*/
ui.getElements = function(elementsToFind){
    if(elementsToFind[0] === '.'){
        return document.querySelectorAll(elementsToFind)
    }
    else if(elementsToFind[0] === '#') {
        return document.getElementById(elementsToFind.slice(1,elementsToFind.length)) ? [document.getElementById(elementsToFind.slice(1,elementsToFind.length))] : [];
    }
    else {
        return document.getElementById(elementsToFind) ? [document.getElementById(elementsToFind)] : [];
    }
}

function isArray(a){
    return Object.prototype.toString.apply(a) === '[object Array]';
}
