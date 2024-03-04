const Utils = class {
    formatId(idString){
        idString = idString.replace(/\W+/g, '-').replace(/\-$/, '').toLowerCase();
        return idString;
    }
}