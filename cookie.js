const Cookie = class {

	cookieId = '';
	cookie = {};
	
	constructor(thisCookieName) {
		this.cookieId = thisCookieName;
		this.cookie = this.getCookie(thisCookieName);
	}
	
	setCookie(name,value,days) {
		var expires = "";
		if (days) {
			var date = new Date();
			date.setTime(date.getTime() + (days*24*60*60*1000));
			expires = "; expires=" + date.toUTCString();
		}
		document.cookie = name + "=" + (value || "")  + expires + "; path=/";
	}
	
	getCookie(name) {
		var nameEQ = name + "=";
		var ca = document.cookie.split(';');
		for(var i=0;i < ca.length;i++) {
			var c = ca[i];
			while (c.charAt(0)==' ') c = c.substring(1,c.length);
			if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
		}
		return null;
	}
	
	getPersistentValuesFromUI(){
		let nodeList = document.querySelectorAll('input[data-persistent=true]');
		let cookieValues = {};
		
		for(let thisNode of nodeList){
			//let thisNode = nodeList[thisNodeIndex];
			try{	
				let objectValuePath = thisNode.getAttribute('data-option-key');
				
				let obj = {};
				obj[objectValuePath] = thisNode.value;
				
				let fieldData = this.expandDotString(obj);			
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