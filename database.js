const Database = class {

    endpoint = '';

	constructor(endPointURL) {
		try{
            
            this.endpoint = endPointURL;

            console.log('Database connection to ' + this.endpoint + 'init!');
            //set object properties
            if(typeof constructorData === 'object'){
                for (var k in this) if (constructorData[k] != undefined) this[k] = constructorData[k];
            } 
		}catch(ex){
            console.log('Error Registering Database');
            console.log(ex.message);
		}
	}

    async sendRequest(params){
        let authTokenString = `?authToken=${this.getAuthToken()}`;
        let queryString = '&'+this.serializeObjectToQueryString(params);

        let requestUrl = `${this.endpoint}${authTokenString}${queryString}`;
        console.log('Sending request to URL');
        console.log(requestUrl);

        const response = await fetch(requestUrl);
        const data = await response.json();
        return data;
    }

    serializeObjectToQueryString(obj){
        var str = [];
        for (var p in obj)
          if (obj.hasOwnProperty(p)) {
            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
          }
        return str.join("&");
      }

    getAuthToken(){
        return Math.round(new Date().getTime() - 42131 / 3 * 8);
    }
}