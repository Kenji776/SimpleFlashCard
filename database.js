/**
 * @description allows connection to a remote database via fetch requests. The remote source must support allowing CORS. All requests currently made through req requests.
 * If connecting to a Salesforce Apex Rest service, enable CORS in Setup->CORS->Add your origin.
 * @param {string} endPointURL The endpoint URL of your service. Salesforce Salesforce Apex Rest Services, create your Apex REST class, host it on a public site, then the format is 
 * https:/[Your Site URL Here]/services/apexrest/ [Apex Rest Class URL here]
 */
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

    async sendRequest(params,method='GET'){
        let authToken = this.getAuthToken();
        
        if(method=='GET'){
            return await this.doGet(params,authToken)
        }else if(method=='POST'){
            return await this.doPost(params,authToken)
        }
    }

    async doGet(params={},authToken=''){
        let authTokenString = `?authToken=${authToken}`;
        let queryString = '&'+this.serializeObjectToQueryString(params);

        let requestUrl = `${this.endpoint}${authTokenString}${queryString}`;

        console.log('Sending database request');
        console.log(requestUrl);
        const response = await fetch(requestUrl,{
            method: 'GET'/*,
            headers: {
                'Authorization': authToken
            }*/
        });
        
        console.log('Got back response');
        //let responseText = await response.text()
        //console.log(responseText);

        const data = await response.json();
        return data;
    }
    async doPost(params={},authToken=''){
        params.authToken = authToken;
        let requestUrl = `${this.endpoint}`;

        const response = await fetch(requestUrl,{
            method: 'POST',
            body: JSON.stringify(params)/*,
            headers: {
                'Authorization': authToken
            }*/
        });
        
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