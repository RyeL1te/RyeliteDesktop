import { Plugin, SettingsTypes } from '@highlite/core';
import { PanelManager } from '@highlite/core';

export default class CoinCounter extends Plugin {
    pluginName = "Closing";
    author = "Highlite";
    panelManager = new PanelManager();
    panelContent = undefined;
    constructor() {
        super();
    }

    start() {
        if (!this.settings.enable.value) return;

        this.panelContent = this.panelManager.requestMenuItem('🪦', 'The End')[1];

        this.panelContent.style="width: 100%";
        const container = document.createElement('div');
        container.style="height: -webkit-fill-available; width: 100%"
        container.innerHTML = `
            <style>
                .closing-container {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    background: black;
                    color: yellow;
                    overflow: hidden;
                    font-family: 'Courier New', Courier, monospace;
                }

                .crawl {
                    position: absolute;
                    bottom: 0%;
                    width: 100%;
                    animation: crawl-up 30s linear forwards infinite;
                }

                .crawl-text {
                    text-align: center;
                    max-width: 600px;
                    margin: 0 auto;
                    font-size: 1.2em;
                    line-height: 1.6em;
                    padding: 20px;
                }

                @keyframes crawl-up {
                    0% {
                        bottom: -100%;
                    }
                    100% {
                        bottom: 100%;
                    }
                }

                .firework {
                    position: absolute;
                    width: 6px;
                    height: 6px;
                    background: transparent;
                    border-radius: 50%;
                    animation: explode 1s ease-out forwards;
                }

                @keyframes explode {
                    0% {
                        transform: scale(0.5);
                        opacity: 1;
                    }
                    100% {
                        transform: scale(3);
                        opacity: 0;
                    }
                }
            </style>

            <div class="closing-container">
                <div class="crawl">
                    <div class="crawl-text">
                        <p>Thanks to:</p>
                        <p>JayArrowz<br/>
                        Answerth<br/>
                        Doodleman360<br/>
                        0rangeYouGlad<br/>
                        Tomb<br/>
                        Valsekamerplant<br/>
                        Bpcooldude<br/>
                        SoggyPiggy<br/>
                        Zora<br/>
                        DarkIdol<br/>
                        Yoyo2324<br/>
                        Ellz</p>
                        <br/>
                        <p>Special Thanks to:</p>
                        <p>Xortrox<br/>
                        Spegal.dev<br/>
                        JustATextBox<br/>
                        TheDevilHacker<br/>
                        Zahzar<br/></p>
                        <br/>
                        <p>Shoutout to the original GenLite Team</p>
                        <br/>
                        <p>Keep grinding!<br/>
                        ❤️ KKona</p>
                    </div>
                </div>
            </div>
        `;

        this.panelContent.appendChild(container);

        // Firework burst generator
        const fireworkBurst = () => {
            for (let i = 0; i < 15; i++) {
                const fw = document.createElement('div');
                fw.className = 'firework';
                fw.style.background = `hsl(${Math.random() * 360}, 100%, 60%)`;
                fw.style.left = `${Math.random() * 100}%`;
                fw.style.top = `${Math.random() * 100}%`;
                const size = `${Math.random() * 4 + 2}px`;
                fw.style.width = size;
                fw.style.height = size;
                fw.style.animationDuration = `${Math.random() * 1 + 0.5}s`;

                container.querySelector('.closing-container')?.appendChild(fw);

                setTimeout(() => fw.remove(), 1500);
            }
        };
        this.fireworkInterval = setInterval(fireworkBurst, 1500);
    }

    stop() {
        if (this.panelContent) {
            this.panelContent.innerHTML = '';
        }

        if (this.fireworkInterval) {
            clearInterval(this.fireworkInterval);
            this.fireworkInterval = null;
        }
    }

}
