const Labels = class {
    isMobile;

    constructor(){
        this.isMobile = this.isMobileDevice();

        if(template){
            template.setTemplateValues(this.getLabels());
        }
    }

    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    getLabels(){
        if(!this.isMobile){
            return {
                nextButton: 'Next →',
                nextButtonFinish: 'Finish',
                previousButton: '← Previous',
                generateMnemonic: 'Generate Mnemonic (M)',
                hintButton: 'Hint (H)',
                nextLetterButton: 'Next Letter ↓',
                nextAnswerButton: 'Next Answer  ↓'
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


