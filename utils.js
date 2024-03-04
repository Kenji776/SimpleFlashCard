const Utils = class {
    formatId(idString){
        if(!idString) return '';
        idString = idString.replace(/\W+/g, '-').replace(/\-$/, '').toLowerCase();
        return idString;
    }
}