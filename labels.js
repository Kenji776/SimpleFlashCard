const Labels = class {
    isMobile;

    constructor(){
        this.isMobile = this.isMobileDevice();

        if(template){
            template.setTemplateValues(this.getLabels());
        }
    }

    isMobileDevice() {
        return (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.screen.availWidth < 1000);
    }

    getLabels(){
        if(!this.isMobile){
            return {
                nextButton: 'Next \u{2192}',
                nextButtonFinish: 'Finish',
                previousButton: '\u{2190} Previous',
                generateMnemonic: 'Mnemonic (M)',
                hintButton: 'Hint (H)',
                nextLetterButton: 'Next Letter \u{2193}',
                nextAnswerButton: 'Next Answer  \u{2193}'
            }
        }else{
            return {
                nextButton: '\u{21E8}', //⇨
                nextButtonFinish: '\u{1F3C1}', //🏁
                previousButton: '\u{21E6}', // ⇦
                generateMnemonic: '\u{1F9E0}', //🧠
                hintButton: '\u{1F4A1}', //💡
                nextLetterButton: '\u{1F914}', //🤔
                nextAnswerButton: '\u{1F914}', //🤔
            }
        }
    }


}


