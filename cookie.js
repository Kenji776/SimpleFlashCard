const Cookie = class {

	cookieId = '';
	cookie = {};
	
	constructor(thisCookieName) {
		this.cookieId = thisCookieName;
		this.cookie = this.loadCookie(thisCookieName);
	}
	
	setCookie(value,days=30) {
		if(!this.cookieId) console.error('Cookie Not Constucted.')
		var expires = "";
		if (days) {
			var date = new Date();
			date.setTime(date.getTime() + (days*24*60*60*1000));
			expires = "; expires=" + date.toUTCString();
		}
		document.cookie = this.cookieId + "=" + (value || "")  + expires + "; path=/";
		this.cookie = value;
	}
	
	loadCookie() {
		var nameEQ = this.cookieId + "=";
		var ca = document.cookie.split(';');
		for(var i=0;i < ca.length;i++) {
			var c = ca[i];
			while (c.charAt(0)==' ') c = c.substring(1,c.length);
			if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
		}
		return null;
	}

	getCookieValue(){
		return this.cookie;
	}
	
	getPersistentValuesFromUI(){
		let nodeList = document.querySelectorAll('input[data-persistent=true]');
		let cookieValues = {};
		
		for(let thisNode of nodeList){
			//let thisNode = nodeList[thisNodeIndex];
			try{	

				console.log('Reading persistant data value from');
				console.log(thisNode);

				let objectValuePath = thisNode.getAttribute('data-option-key');
				
				let obj = {};
				
				console.log('Node Value is: ' + thisNode.value);

				if(thisNode.type == 'checkbox') obj[objectValuePath] = thisNode.checked;
				else obj[objectValuePath] = thisNode.value;

				console.log('Resolved value is: ' + obj[objectValuePath]);
				
				let fieldData = this.expandDotString(obj);		
				
				console.log('Field Data is:');
				console.log(fieldData);

				cookieValues = this.mergeDeep(cookieValues,fieldData);

			}catch(ex){
				console.error('Error getting data option from node');
				console.log(ex);
				console.log(thisNode);
				console.log(nodeList);
			}
		}
		
		console.log('Completed Cookie');
		console.log(cookieValues);
		
		return cookieValues;
	}

	setPersistantValuesInUI(target,path=''){

		if (this.isObject(target) ) {
			console.log('Provided value is an object. Iterating its keys')
			for(let key in target){
				const newPath = path.length > 0 ? path + '.' + key : key;
				//first we have to figure out if this value is an object, if so we need to dig into it recursivly until we get to actual values
				if (this.isObject(target[key]) ) {
					this.setPersistantValuesInUI(target[key],newPath);
				}else{
					this.setFormElement(newPath,target[key]);
				}

			}
		}else{
			console.log('Hit secondary if')
			this.setFormElement(path,target);
		}
	}

	setFormElement(key,value){
		console.log('Finding element with path: ' + key);
		const nodeList = document.querySelectorAll(`input[data-persistent=true][data-option-key="${key}"]`);

		for(let thisNode of nodeList){
			
			if(thisNode.type == 'checkbox') {
				console.log('Setting '+key+' checked to: ' + value)
				thisNode.checked = value;
			}
			else{
				console.log('Setting  '+key+' value to: ' + value)
				thisNode.value = value;
			}
		}
	}
	
	setOptionValues(cookieObject){
		
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
	
	eraseCookie(name) {   
		document.cookie = name +'=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
	}
}