const Utils = class {
    formatId(idString){
        if(!idString) return '';
        idString = idString.replace(/\W+/g, '-').replace(/\-$/, '').toLowerCase();
        return idString;
    }

    decodeHtml(encoded) {
        const txt = document.createElement('textarea');
        txt.innerHTML = encoded ?? '';
        return txt.value;
    }
}