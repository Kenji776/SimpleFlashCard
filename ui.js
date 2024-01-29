ui = {};
ui.state = {};
ui.elements = {
    'historySection': 'history-items' //container that contains the individual history elements. Not the entire history container itself.
}

//------------------------------------------------- HTML ELEMENT FUNCTIONS -------------------------------------//
HTMLElement.prototype.hide = function(element){

    ui.setElementVisibility(element,false);
}

HTMLElement.prototype.show = function(element){

    ui.setElementVisibility(element,true);
}

HTMLElement.prototype.toggle = function(element){

    ui.setElementVisibility(ui.getVisibilityById(element),true);
}


//------------------------------------------------- UTILITY FUNCTIONS -------------------------------------//
ui.toggleDisplay = function(elements, forceHide){

  
    if(ui.getVisibilityById(elements) || forceHide){
        ui.hideElements(elements);
    }else{
        ui.showElements(elements);
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

ui.setAttribute = function(elements,property,value){
    let elementsList = [];
    if(typeof elements === 'string') elementsList = elementsList.concat(elements.split(','));
    else if(isArray(element)) elementsList = element;
    for(let element of elementsList){
        thisElement = element;
        if(typeof element === 'string') thisElement = ui.getElements(element)[0];

        try{
            thisElement.dataset[property] = value;//(property,value);
        }catch(ex){
            console.log('Error setting property ' + property + ' to value ' + value + ' on element');
            console.log(thisElement);
            console.error(ex);
        }
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

ui.hideElements = function(elements){
    ui.setElementVisibility(elements,false);
}

ui.showElements = function(elements,displayType){
    ui.setElementVisibility(elements,true,displayType);
}

ui.setContent = function(elements,content){
    let elementsToProcess = [];
    if(!isArray(elements)) elementsToProcess.push(elements);
    else elementsToProcess = elements;


    for(let element of elementsToProcess){

        //if this element is an object, we can assume it is an html node and modify it directly.
        if(typeof element === 'object' ) {     
            //elm.height='0px';
            element.innerHTML=content;

        }
        if(typeof element === 'string') {
            for(let elm of ui.getElements(element)){  
				elm.innerHTML=content;
			}
        }
        console.log('Setting visibility of ' + element);
   
    }
    return elementsToProcess;	
}

ui.addClass = function(elements,className){
    let elementsList = [];
    if(typeof elements === 'string') elementsList = elementsList.concat(elements.split(','));
    else if(isArray(elements)) elementsList = elements;
    for(let element of elementsList){
        thisElement = element;
        if(typeof element === 'string') thisElement = ui.getElements(element)[0];
        thisElement.classList.add(className);
    }
}

ui.disable  = function(elements,className){
    let elementsList = [];
    if(typeof elements === 'string') elementsList = elementsList.concat(elements.split(','));
    else if(isArray(elements)) elementsList = elements;
    for(let element of elementsList){
        thisElement = element;
        if(typeof element === 'string') thisElement = ui.getElements(element)[0];
        thisElement.disabled = true;
    }	
}

ui.enable  = function(elements,className){
    let elementsList = [];
    if(typeof elements === 'string') elementsList = elementsList.concat(elements.split(','));
    else if(isArray(elements)) elementsList = elements;
    for(let element of elementsList){
        thisElement = element;
        if(typeof element === 'string') thisElement = ui.getElements(element)[0];
        thisElement.disabled = false;
    }	
}

ui.removeClass = function(elements,className){
    let elementsList = [];
    if(typeof elements === 'string') elementsList = elementsList.concat(elements.split(','));
    else if(isArray(elements)) elementsList = elements;
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
ui.setElementVisibility = function(elements,visible,displayType){
    let elementsToProcess = [];
    if(!isArray(elements)) elementsToProcess.push(elements);
    else elementsToProcess = elements;
    let visiblityWord = visible ? 'visible' : 'hidden';
    let displayWord = visible ? 'block' : 'none';
    if(displayType) displayWord = displayType;

    for(let element of elementsToProcess){


        //if this element is an object, we can assume it is an html node and modify it directly.
        if(typeof element === 'object' ) {     
            //elm.height='0px';
            element.style.visibility=visiblityWord;
            elm.style.display=displayWord;
        }
        if(typeof element === 'string') {
            for(let elm of ui.getElements(element)){  
				//elm.height='0px';
				elm.style.visibility=visiblityWord;
				elm.style.display=displayWord;
			}
        }

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
