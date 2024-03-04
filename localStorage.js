const LS = class {

	name;

	get value(){
		return JSON.parse(localStorage.getItem(this.name));
	}
	
	set value(value){
		localStorage.setItem(this.name, JSON.stringify(value));
	}

	constructor(name) {
		this.name = name;
	}
	
	getPersistentValuesFromUI(){
		let nodeList = document.querySelectorAll('input[data-persistent=true]');
		let values = {};
		
		for(let thisNode of nodeList){
			//let thisNode = nodeList[thisNodeIndex];
			try{	
				let objectValuePath = thisNode.getAttribute('data-option-key');
				
				let obj = {};
				if(thisNode.type == 'checkbox') obj[objectValuePath] = thisNode.checked;
				else obj[objectValuePath] = thisNode.value;				
				let fieldData = this.expandDotString(obj);						
				values = this.mergeDeep(values,fieldData);

			}catch(ex){
				console.error('Error getting data option from node');
				console.log(ex);
				console.log(thisNode);
				console.log(nodeList);
			}
		}
		
		console.log('Completed Local Storage Item: ' + this.name);
		console.log(values);
		
		return values;
	}

	setPersistantValuesInUI(target,path='',nodes=[]){

		if (this.isObject(target) ) {
			for(let key in target){
				const newPath = path.length > 0 ? path + '.' + key : key;
				//first we have to figure out if this value is an object, if so we need to dig into it recursivly until we get to actual values
				if (this.isObject(target[key]) ) {
					this.setPersistantValuesInUI(target[key],newPath,nodes);
				}else{
					nodes.push(this.setFormElement(newPath,target[key],nodes));
				}

			}
		}else{
			nodes.push(this.setFormElement(path,target,nodes));
		}
		return nodes;
	}

	setFormElement(key,value){
		const thisNode = document.querySelector(`input[data-persistent=true][data-option-key="${key}"]`);

		if(thisNode){
			
			if(thisNode.type == 'checkbox') {
				thisNode.checked = value;
			}
			else{
				thisNode.value = value;
			}
		}
		return thisNode;
	}
	
	mergeDeep(target, ...sources) {
	  if (!sources.length) return target;
	  const source = sources.shift();

	  if (this.isObject(target) && this.isObject(source)) {
		for (const key in source) {
		  if (this.isObject(source[key])) {
			if (!target[key]) Object.assign(target, { [key]: {} });
				this.mergeDeep(target[key], source[key]);
		  } else {
			Object.assign(target, { [key]: source[key] });
		  }
		}
	  }

	  return this.mergeDeep(target, ...sources);
	}
	
	isObject(item) {
		return (item && typeof item === 'object' && !Array.isArray(item));
	}
	
	parseDotNotation(str, val, obj) {
        var currentObj = obj,
            keys = str.split("."),
            i, l = Math.max(1, keys.length - 1),
            key;

        for (i = 0; i < l; ++i) {
            key = keys[i];
            currentObj[key] = currentObj[key] || {};
            currentObj = currentObj[key];
        }

        currentObj[keys[i]] = val;
        delete obj[str];
    }
	
    expandDotString(obj) {
        for (var key in obj) {
            if (key.indexOf(".") !== -1)
            {
                this.parseDotNotation(key, obj[key], obj);
            }            
        }
        return obj;
    }
	
	delete() {   
		localStorage.removeItem(this.name);
	}
}