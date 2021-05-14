'use strict'

const chalk = require('chalk');

const LOADING_ANIMATION_FRAME_MS = 80;
const LOADING_ANIMATION_SPRITES = [
    "⠋",
    "⠙",
    "⠹",
    "⠸",
    "⠼",
    "⠴",
    "⠦",
    "⠧",
    "⠇",
    "⠏"
]

class TinyLogger{

    constructor(){
        if(!instance){
            this.timer = null;
            this.loadingText = "";
            this.loadingAnimationFrame = 0;
            instance = this;
        }
        return instance;
    }

    get currentLoadingAnimationSprite(){
        return LOADING_ANIMATION_SPRITES[this.loadingAnimationFrame];
    }

    log(txt, end = false){
        this.loadingText = txt;
        if(this.timer == null){
            var self = this;
            this.timer = setInterval(function(){
                self.loadingAnimationFrame = (self.loadingAnimationFrame + 1) % LOADING_ANIMATION_SPRITES.length;
                process.stdout.clearLine();
                process.stdout.cursorTo(0);
                process.stdout.write(`    ${chalk.green(self.currentLoadingAnimationSprite)} ${chalk.yellow(self.loadingText)}...`)
            }, LOADING_ANIMATION_FRAME_MS);
        }
        if(end){
            clearInterval(this.timer);
            this.timer = null;
            this.loadingAnimationFrame = 0;
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
        }
    }

}

var instance = new TinyLogger();
module.exports = instance;