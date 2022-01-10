import StateMachine from "./betterStateMachine.js";
const canvas = document.getElementById("game");
canvas.width = 1920;
canvas.height = 1280;
const context = canvas.getContext("2d");
context.imageSmoothingEnabled = false;
// Variables
const keysPressed = new Set();
const mouse = {
	x: 0,
	y: 0
};
const images = {};
const sounds = {};
let paused = false;
let muted = false;
const buttons = {};
// Helper functions
function clear() {
	context.clearRect(0, 0, 1920, 1280);
	for (const button in buttons) {
		canvas.removeEventListener("click", buttons[button].fullCallback);
		delete buttons[button];
	}
}
function getMousePosition(event) {
	const bounds = canvas.getBoundingClientRect();
	mouse.x = (event.clientX - bounds.left) * 1920 / (bounds.right - bounds.left);
	mouse.y = (event.clientY - bounds.top) * 1280 / (bounds.bottom - bounds.top);
}
function setFontSize(size) {
	context.font = `${size * 1024 / 100}px "Commodore 64", sans-serif`;
}
function wrapClickEvent(callback, condition = (() => true)) {
	// TODO: Figure out a way to use {once: true}
	function fullCallback(e) {
		if (condition(e)) {
			callback();
			canvas.removeEventListener("click", fullCallback);
		}
	};
	canvas.addEventListener("click", fullCallback);
	return fullCallback;
}
// Buttons
class Button {
	constructor (id, hitbox, draw, callback, ignorePause = false) {
		this.id = id;
		this.callback = callback;
		this.draw = draw;
		this.hitbox = hitbox;
		this.fullCallback = wrapClickEvent(callback, () => context.isPointInPath(hitbox, mouse.x, mouse.y) && (!paused || ignorePause));
		draw();
	}
}
class MuteButton extends Button {
	constructor () {
		const [x, y, dx, dy] = [1920 - 96, 1280 - 96, 96, 96];
		const name = muted ? "unmute" : "mute";
		const hitbox = new Path2D();
		hitbox.rect(x, y, dx, dy);
		hitbox.closePath();
		function draw() {
			context.drawImage(images[muted ? "soundOff" : "soundOn"], x, y, dx, dy);
		}
		function callback() {
			muted = !muted;
			console.log(muted ? "Muted" : "Unmuted");
			for (const sound of Object.values(sounds)) {
				sound.muted = muted;
			}
			delete buttons[name];
			buttons[muted ? "unmute" : "mute"] = new MuteButton();
		}
		super(name, hitbox, draw, callback);
	}
}
class TextButton extends Button {
	constructor (x, y, text, callback, width, ignorePause = false) {
		const buttonWidth = width ? width - 160 : Math.ceil(context.measureText(text).width / 32) * 32;
		const hitbox = new Path2D();
		hitbox.rect(x - buttonWidth / 2 - 64, y, buttonWidth + 128, 128);
		hitbox.rect(x - buttonWidth / 2 - 80, y + 16, buttonWidth + 160, 96);
		hitbox.closePath();
		function draw() {
			setFontSize(8);
			context.drawImage(images.buttonStart, x - buttonWidth / 2 - 80, y, 80, 128);
			context.drawImage(images.buttonMiddle, x - buttonWidth / 2, y, buttonWidth, 128);
			context.drawImage(images.buttonEnd, x + buttonWidth / 2, y, 80, 128);
			context.textAlign = "center";
			context.fillStyle = "rgb(0, 0, 0)";
			context.fillText(text, x, y + 92);
		}
		super(text.toLowerCase(), hitbox, draw, callback, ignorePause);
	}
}
// Noting input
window.addEventListener("keydown", e => {
	keysPressed.add(e.key);
	console.log(`The "${e.key}" key was pressed.`);
});
window.addEventListener("keyup", e => {
	keysPressed.delete(e.key);
});
canvas.addEventListener("click", e => {
	getMousePosition(e);
	console.log("The mouse was clicked on " + mouse.x + ", " + mouse.y + ".");
});
// Loading assets
async function loadResources() {
	const imageNames = ["start", "main", "credits", "buttonStart", "buttonMiddle", "buttonEnd", "soundOn", "soundOff"];
	const soundNames = ["mainTheme"];
	const promises = [];
	const initialize = function (cache, id, path, type, eventType) {
		cache[id] = document.createElement(type);
		cache[id].src = path;
		promises.push(new Promise(resolve => {
			cache[id].addEventListener(eventType, resolve, {once: true});
		}));
	};
	for (const name of imageNames) {
		initialize(images, name, `images/${name}.png`, "img", "load");
	}
	for (const name of soundNames) {
		initialize(sounds, name, `sounds/${name}.mp3`, "audio", "canplaythrough");
	}
	return Promise.all(promises);
}
// State machine
const stateMachine = new StateMachine({
	init: "boot",
	transitions: [
		{
			name: "toMenu",
			from: "*",
			to: "menu"
		},
		{
			name: "start",
			from: "menu",
			to: "main"
		},
		{
			name: "toCredits",
			from: "menu",
			to: "credits"
		},
		{
			name: "pause",
			from: "main",
			to: "paused"
		},
		{
			name: "unpause",
			from: "paused",
			to: "main"
		}
	],
	methods: {
		onTransition(lifecycle) {
			console.log(`Transition: ${lifecycle.transition}\tNew State: ${lifecycle.to}`);
		},
		async onBoot() {
			// Loading screen
			context.rect(0, 0, 1920, 1280);
			context.fillStyle = "rgb(0, 0, 0)";
			context.fill();
			context.textAlign = "center";
			setFontSize(16);
			context.fillStyle = "rgb(255, 255, 255)";
			context.fillText("LOADING", 960, 400);
			setFontSize(8);
			context.fillText("If this doesn't go away,", 960, 800);
			context.fillText("refresh the page.", 960, 960);
			await loadResources();
			console.log("Resources loaded.", images, sounds);
			// Prompt for user interaction so autoplay won't get blocked
			clear();
			context.rect(0, 0, 1920, 1280);
			context.fillStyle = "rgb(0, 0, 0)";
			context.fill();
			setFontSize(8);
			context.fillStyle = "rgb(255, 255, 255)";
			context.fillText("Loading finished.", 960, 400);
			context.fillText("CLICK ANYWHERE", 960, 800);
			context.fillText("TO CONTINUE", 960, 960);
			wrapClickEvent(stateMachine.toMenu);
		},
		onMenu() {
			clear();
			context.drawImage(images.start, 0, 0, 1920, 1280);
			sounds.mainTheme.play();
			buttons.start = new TextButton(960, 720, "Start", stateMachine.start, 576);
			buttons.credits = new TextButton(960, 912, "Credits", stateMachine.toCredits, 576);
			buttons[muted ? "unmute" : "mute"] = new MuteButton();
		},
		onCredits() {
			clear();
			context.drawImage(images.credits, 0, 0, 1920, 1280);
			buttons.return = new TextButton(960, 912, "Return", stateMachine.toMenu, 576);
			buttons[muted ? "unmute" : "mute"] = new MuteButton();
		},
		onMain() {
			clear();
			buttons[muted ? "unmute" : "mute"] = new MuteButton();
			requestAnimationFrame(loop);
		},
		onPaused() {
			paused = true;
			for (const sound of Object.values(sounds).filter(sound => !sound.paused)) {
				sound.pause();
			}
			context.rect(0, 0, 1920, 1280);
			context.fillStyle = "rgba(0, 0, 0, 0.5)";
			context.fill();
			setFontSize(16);
			context.fillStyle = "rgb(255, 255, 255)";
			context.fillText("PAUSED", 960, 400);
			buttons.menu = new TextButton(672, 880, "Menu", stateMachine.toMenu, 480, true);
			buttons.return = new TextButton(1248, 880, "Return", stateMachine.unpause, 480, true);
		},
		onLeavePaused() {
			paused = false;
			for (const sound of Object.values(sounds).filter(sound => sound.paused)) {
				sound.play();
			}
		}
	}
});
// Main loop
function loop() {
	if (!stateMachine.is("main")) {
		return;
	}
	// Render
	context.clearRect(0, 0, 1920, 1280);
	context.drawImage(images.main, 0, 0, 1920, 1280);
	buttons[muted ? "unmute" : "mute"].draw();
	// Handle inputs
	if (keysPressed.has("p") || keysPressed.has("P") || keysPressed.has("Escape")) {
		stateMachine.pause();
		return;
	}
	requestAnimationFrame(loop);
}