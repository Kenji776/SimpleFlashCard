const Template = class {
    variables = {};
    updateLoop;
    updateLoopInterval = 500;
    // Define a regular expression to match curly brackets and anything inside them
    regex = /{([^}]+)}/g;
    matchedElements = [];

    constructor(){
        this.findTemplateVariables();
        this.registerUpdateLoop();
        this.updateTemplateStrings();
    }


    updateTemplateStrings(){
        for(let templateElement of this.matchedElements){
            if(!this.variables[templateElement.variable]){
                console.warn('No registered variable value for template');
                console.warn(templateElement);
            }
            if(templateElement.attribute != null){
                templateElement.element.setAttribute(templateElement.attribute,this.variables[templateElement.variable]);
            }else{
                // Update the element's text content with the new text
                if (templateElement.element.textContent) {
                    templateElement.element.textContent = this.variables[templateElement.variable];
                } else {
                    templateElement.element.innerText = this.variables[templateElement.variable];
                }                
            }
        }
    }
    findTemplateVariables(){
        // Find all elements in the DOM
        const allElements = document.querySelectorAll('*');

        // Iterate over each element and check its text content
        allElements.forEach(element => {
            const text = element.textContent?.trim() || element.innerText?.trim();

            //evaluate dom element attributes to perform replacements on thos values
            var attributes = element.attributes;
            if(attributes && attributes.length > 0 ){
                for (var i = 0; i < attributes.length; i++) {
                    var attributeValue = attributes[i].value;
                    
                    // Check if attribute value contains curly braces
                    if (attributeValue.match(this.regex)) {       
                        let varName = this.removeFirstAndLastCharacter(attributes[i].value);

                        if(this.variables[varName]){
                            this.matchedElements.push(new TemplateElement(element,varName,attributes[i].name));
                        }
                    }
                }
            }
            
            //Replacement of just plain text values

            // Check if the text content contains curly brackets
            if (text && text.length > 0 && text.match(this.regex)) {

                let varName = this.removeFirstAndLastCharacter(text);

                //if an element exists in our variables collection with the same 'name' then replace it
                if(this.variables[varName]){
                    this.matchedElements.push(new TemplateElement(element,varName));
                }
            }
        });
    }

    setTemplateValues(values){
        this.variables = this.concatenateObjects(this.variables,values)
    }
    concatenateObjects(obj1, obj2) {
        return {...obj1, ...obj2};
    }
    removeCurlyBraces(str) {
        return str.replace(/{|}/g, '');
    }
    removeFirstAndLastCharacter(str) {
        return str.substring(1, str.length - 1);
    }

    registerUpdateLoop(){
        this.updateLoop = setInterval((scope) => {
            scope.findTemplateVariables();
            scope.updateTemplateStrings();
        }, this.updateLoopInterval, this);
        return this.updateLoop;
    }
}

const TemplateElement = class{
    element;
    attribute;
    variable;

    constructor(domElement, variableString, attribute){
        this.element = domElement;
        this.variable = variableString;
        this.attribute = attribute;
    }
}