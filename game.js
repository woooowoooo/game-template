import StateMachine from "./betterStateMachine.js";
const canvas = document.getElementById("game");
canvas.width = 1920;
canvas.height = 1280;
const canvasContext = canvas.getContext("2d");
canvasContext.imageSmoothingEnabled = false;
// Variables
const keysPressed = new Set();
const mouse = {
	x: 0,
	y: 0
};
const images = {};
const sounds = {};
let paused = false;
const pausedAudio = {};
let muted = false;
const buttons = {};
// Helper functions
function clear() {
	canvasContext.clearRect(0, 0, 1920, 1280);
	for (const button in buttons) {
		removeEventListener("click", buttons[button]);
		delete buttons[button];
	}
}
function getMousePosition(event) {
	const bounds = canvas.getBoundingClientRect();
	mouse.x = (event.clientX - bounds.left) * 1920 / (bounds.right - bounds.left);
	mouse.y = (event.clientY - bounds.top) * 1280 / (bounds.bottom - bounds.top);
}
function setFontSize(size) {
	canvasContext.font = `${size * 1024 / 100}px "Commodore 64", sans-serif`;
}
function wrapClickEvent(listenerID, callback, condition = (() => true)) {
	function fullCallback(e) {
		getMousePosition(e);
		if (condition(e)) {
			callback();
			removeEventListener("click", fullCallback);
		}
	};
	addEventListener("click", fullCallback);
	buttons[listenerID] = fullCallback;
}
// Buttons
function createButton(id, x, y, dx, dy, imagePath, callback) {
	canvasContext.drawImage(images[imagePath], x, y, dx, dy);
	const hitbox = new Path2D();
	hitbox.rect(x, y, dx, dy);
	hitbox.closePath();
	wrapClickEvent(id, callback, () => canvasContext.isPointInPath(hitbox, mouse.x, mouse.y) && !paused);
}
function muteButton() {
	createButton(muted ? "unmute" : "mute", 1920 - 96, 1280 - 96, 96, 96, muted ? "soundOff" : "soundOn", function () {
		for (const sound of sounds) {
			sound.muted = !muted;
		}
		muted = !muted;
		console.log(muted ? "Muted" : "Unmuted");
		removeEventListener("click", buttons[muted ? "soundOff" : "soundOn"]);
		delete buttons[muted ? "soundOff" : "soundOn"];
	});
}
function textButton(x, y, text, callback, width, ignorePause = false) {
	setFontSize(8);
	const buttonWidth = width ? width - 160 : Math.ceil(canvasContext.measureText(text).width / 32) * 32;
	// Draw button
	canvasContext.drawImage(images.buttonStart, x - buttonWidth / 2 - 80, y, 80, 128);
	canvasContext.drawImage(images.buttonMiddle, x - buttonWidth / 2, y, buttonWidth, 128);
	canvasContext.drawImage(images.buttonEnd, x + buttonWidth / 2, y, 80, 128);
	canvasContext.textAlign = "center";
	canvasContext.fillStyle = "rgb(0, 0, 0)";
	canvasContext.fillText(text, x, y + 92);
	// Detect clicks
	const hitbox = new Path2D();
	hitbox.rect(x - buttonWidth / 2 - 64, y, buttonWidth + 128, 128);
	hitbox.rect(x - buttonWidth / 2 - 80, y + 16, buttonWidth + 160, 96);
	hitbox.closePath();
	wrapClickEvent(text.toLowerCase(), callback, () => canvasContext.isPointInPath(hitbox, mouse.x, mouse.y) && (!paused || ignorePause));
}
// Noting input
addEventListener("keydown", e => {
	keysPressed.add(e.key);
	console.log(`The "${e.key}" key was pressed.`);
});
addEventListener("keyup", e => {
	keysPressed.delete(e.key);
	console.log(`The "${e.key}" key was released.`);
});
addEventListener("click", e => {
	getMousePosition(e);
	console.log("The mouse was clicked on " + mouse.x + ", " + mouse.y + ".");
});
// Loading assets TODO: Change to async
function loadResources(imageNames, soundNames) {
	let successes = 0;
	console.log(`Images has length "${imageNames.length}" and sounds has length "${soundNames.length}".`);
	const initialize = function (cache, type, eventType, folder, path, extension) {
		cache[path] = document.createElement(type);
		cache[path].addEventListener(eventType, success);
		cache[path].src = folder + path + extension;
	};
	const success = function (e) {
		e.target.removeEventListener(e.type, success);
		successes++;
		if (successes === imageNames.length + soundNames.length) {
			// Prompt for user interaction so autoplay won't get blocked
			clear();
			canvasContext.rect(0, 0, 1920, 1280);
			canvasContext.fillStyle = "rgb(0, 0, 0)";
			canvasContext.fill();
			setFontSize(8);
			canvasContext.fillStyle = "rgb(255, 255, 255)";
			canvasContext.fillText("Loading finished.", 960, 400);
			canvasContext.fillText("CLICK ANYWHERE", 960, 800);
			canvasContext.fillText("TO CONTINUE", 960, 960);
			wrapClickEvent("autoplayPrompt", () => {
				console.log(imageNames);
				stateMachine.toMenu();
			});
		}
	};
	for (const imageName of imageNames) {
		initialize(images, "img", "load", "images/", imageName, ".png");
	}
	for (const soundName of soundNames) {
		initialize(sounds, "audio", "canplaythrough", "sounds/", soundName, ".mp3");
	}
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
			console.log(`Transition: ${lifecycle.transition}\nNew State: ${lifecycle.to}`);
		},
		onBoot() {
			const imageNames = ["start", "main", "credits", "buttonStart", "buttonMiddle", "buttonEnd", "soundOn", "soundOff"];
			const soundNames = ["mainTheme"];
			loadResources(imageNames, soundNames);
			canvasContext.rect(0, 0, 1920, 1280);
			canvasContext.fillStyle = "rgb(0, 0, 0)";
			canvasContext.fill();
			canvasContext.textAlign = "center";
			setFontSize(16);
			canvasContext.fillStyle = "rgb(255, 255, 255)";
			canvasContext.fillText("LOADING", 960, 400);
			setFontSize(8);
			canvasContext.fillText("If this doesn't go away,", 960, 800);
			canvasContext.fillText("refresh the page.", 960, 960);
		},
		onMenu() {
			clear();
			canvasContext.drawImage(images.start, 0, 0, 1920, 1280);
			sounds.mainTheme.play();
			textButton(960, 720, "Start", stateMachine.start, 576);
			textButton(960, 912, "Credits", stateMachine.toCredits, 576);
			muteButton();
		},
		onCredits() {
			clear();
			canvasContext.drawImage(images.credits, 0, 0, 1920, 1280);
			textButton(960, 912, "Return", stateMachine.toMenu, 576);
			muteButton();
		},
		onMain() {
			// Main loop
			if (stateMachine.is("main")) {
				// Render
				clear();
				canvasContext.drawImage(images.main, 0, 0, 1920, 1280);
				muteButton();
				// Handle inputs
				if (keysPressed.has("p") || keysPressed.has("P") || keysPressed.has("Escape")) {
					stateMachine.pause();
				}
				requestAnimationFrame(stateMachine.onMain);
			}
		},
		onPaused() {
			paused = true;
			for (const sound of sounds) {
				if (!sound.paused) {
					sound.pause();
					pausedAudio[sound] = true;
				}
			}
			canvasContext.rect(0, 0, 1920, 1280);
			canvasContext.fillStyle = "rgba(0, 0, 0, 0.5)";
			canvasContext.fill();
			setFontSize(16);
			canvasContext.fillStyle = "rgb(255, 255, 255)";
			canvasContext.fillText("PAUSED", 960, 400);
			textButton(672, 880, "Menu", stateMachine.toMenu, 480, true);
			textButton(1248, 880, "Return", stateMachine.unpause, 480, true);
		},
		onLeavePaused() {
			paused = false;
			for (const sound in pausedAudio) {
				sound.play();
				delete pausedAudio[sound];
			}
		}
	}
});