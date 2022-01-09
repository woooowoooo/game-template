import StateMachine from "./betterStateMachine.js";
const canvas = document.getElementById("game");
canvas.width = 1920;
canvas.height = 1280;
const canvasContext = canvas.getContext("2d");
canvasContext.imageSmoothingEnabled = false;
// Variables
const keysPressed = {}; // TODO: Change to set
const mouse = {
	x: 0,
	y: 0
};
const cache = {};
let paused = false;
const pausedAudio = {};
let muted = false;
const buttons = {};
const images = ["start", "main", "credits", "buttonStart", "buttonMiddle", "buttonEnd", "soundOn", "soundOff"];
const sounds = ["mainTheme"];
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
function wrapClickEvent(listenerID, callback, condition) {
	let fullCallback = function (e) {
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
	canvasContext.drawImage(cache[imagePath], x, y, dx, dy);
	const hitbox = new Path2D();
	hitbox.rect(x, y, dx, dy);
	hitbox.closePath();
	wrapClickEvent(id, callback, function (e) {
		getMousePosition(e);
		return canvasContext.isPointInPath(hitbox, mouse.x, mouse.y) && !paused;
	});
}
function muteButton() {
	createButton(muted ? "unmute" : "mute", 1920 - 96, 1280 - 96, 96, 96, muted ? "soundOff" : "soundOn", function () {
		for (const soundName of sounds) {
			cache[soundName].muted = !muted;
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
	canvasContext.drawImage(cache.buttonStart, x - buttonWidth / 2 - 80, y, 80, 128);
	canvasContext.drawImage(cache.buttonMiddle, x - buttonWidth / 2, y, buttonWidth, 128);
	canvasContext.drawImage(cache.buttonEnd, x + buttonWidth / 2, y, 80, 128);
	canvasContext.textAlign = "center";
	canvasContext.fillStyle = "rgb(0, 0, 0)";
	canvasContext.fillText(text, x, y + 92);
	// Detect clicks
	const hitbox = new Path2D();
	hitbox.rect(x - buttonWidth / 2 - 64, y, buttonWidth + 128, 128);
	hitbox.rect(x - buttonWidth / 2 - 80, y + 16, buttonWidth + 160, 96);
	hitbox.closePath();
	wrapClickEvent(text.toLowerCase(), callback, function (e) {
		getMousePosition(e);
		return canvasContext.isPointInPath(hitbox, mouse.x, mouse.y) && (!paused || ignorePause);
	});
}
// Noting input
addEventListener("keydown", function (e) {
	keysPressed[e.key] = true;
	console.log("The \"" + e.key + "\" key was pressed.");
});
addEventListener("keyup", function (e) {
	delete keysPressed[e.key];
	console.log("The \"" + e.key + "\" key was released.");
});
addEventListener("click", function (e) {
	getMousePosition(e);
	console.log("The mouse was clicked on " + mouse.x + ", " + mouse.y + ".");
});
// Loading assets
function loadResources(images, sounds) {
	let successes = 0;
	console.log("Images has length " + images.length + " and sounds has length " + sounds.length + ".");
	const initialize = function (type, eventType, folder, path, extension) {
		cache[path] = document.createElement(type);
		cache[path].addEventListener(eventType, success);
		cache[path].src = folder + path + extension;
	};
	const success = function (e) {
		e.target.removeEventListener(e.type, success);
		successes++;
		if (successes === images.length + sounds.length) {
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
			let waitFunction = function () {
				console.log(cache);
				stateMachine.toMenu();
			};
			wrapClickEvent("autoplayPrompt", waitFunction, () => true);
		}
	};
	for (const imageName of images) {
		initialize("img", "load", "images/", imageName, ".png");
	}
	for (const soundName of sounds) {
		initialize("audio", "canplaythrough", "sounds/", soundName, ".mp3");
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
		onTransition: function (lifecycle) {
			console.log("Transition: " + lifecycle.transition + "\nNew State: " + lifecycle.to);
		},
		onBoot: function () {
			loadResources(images, sounds);
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
		onMenu: function () {
			clear();
			canvasContext.drawImage(cache.start, 0, 0, 1920, 1280);
			cache.mainTheme.play();
			textButton(960, 720, "Start", function () {
				stateMachine.start();
			}, 576);
			textButton(960, 912, "Credits", function () {
				stateMachine.toCredits();
			}, 576);
			muteButton();
		},
		onCredits: function () {
			clear();
			canvasContext.drawImage(cache.credits, 0, 0, 1920, 1280);
			textButton(960, 912, "Return", function () {
				stateMachine.toMenu();
			}, 576);
			muteButton();
		},
		onMain: function () {
			// Main loop
			if (stateMachine.is("main")) {
				// Render
				clear();
				canvasContext.drawImage(cache.main, 0, 0, 1920, 1280);
				muteButton();
				// Handle inputs
				if ("p" in keysPressed || "P" in keysPressed || "Escape" in keysPressed) {
					stateMachine.pause();
				}
				requestAnimationFrame(stateMachine.onMain);
			}
		},
		onPaused: function () {
			paused = true;
			for (const soundName of sounds) {
				if (!cache[soundName].paused) {
					cache[soundName].pause();
					pausedAudio[soundName] = true;
				}
			}
			canvasContext.rect(0, 0, 1920, 1280);
			canvasContext.fillStyle = "rgba(0, 0, 0, 0.5)";
			canvasContext.fill();
			setFontSize(16);
			canvasContext.fillStyle = "rgb(255, 255, 255)";
			canvasContext.fillText("PAUSED", 960, 400);
			textButton(672, 880, "Menu", function () {
				stateMachine.toMenu();
			}, 480, true);
			textButton(1248, 880, "Return", function () {
				stateMachine.unpause();
			}, 480, true);
		},
		onLeavePaused: function () {
			paused = false;
			for (const soundName in pausedAudio) {
				cache[soundName].play();
				delete pausedAudio[soundName];
			}
		}
	}
});