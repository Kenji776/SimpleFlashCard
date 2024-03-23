const Template = class {
    variables = {};
    updateLoop;
    updateLoopInterval = 1000;
    // Define a regular expression to match curly brackets and anything inside them
    regex = /{([^}]+)}/g;
    matchedElements = [];

    constructor(){
        this.updateTemplate();
        this.registerUpdateLoop();
    }

    updateTemplate(){
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
                            this.matchedElements.push({element:attributes[i]});
                            let variableValue = this.variables[varName];
                                const newText = variableValue.trim();       
                                element.setAttribute(attributes[i].name,newText);
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
                    this.matchedElements.push(element);
                    let variableValue = this.variables[varName];
                        const newText = variableValue.trim();

                        // Update the element's text content with the new text
                        if (element.textContent) {
                            element.textContent = newText;
                        } else {
                            element.innerText = newText;
                        }
                }
            }
        });

        console.log('Template elements');
        console.log(this.matchedElements)
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
            scope.updateTemplate();
        }, 3000, this);

        return this.updateLoop;
    }

}
