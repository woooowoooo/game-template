// Canvas
let canvas = document.getElementById("game");
let gameSize = {
	x: 1920,
	y: 1280
};
canvas.width = gameSize.x;
canvas.height = gameSize.y;
let canvasContext = canvas.getContext("2d");
canvasContext.imageSmoothingEnabled = false;
// Helper functions
function clear() {
	canvasContext.clearRect(0, 0, gameSize.x, gameSize.y);
}
function button(x, y, text, callback, width) {
	canvasContext.font = "81.92px \"Commodore 64\", \"Roboto Slab\", \"Century Gothic\", AppleGothic, sans-serif";
	console.log(canvasContext.measureText(text).width);
	let buttonWidth = Math.ceil(canvasContext.measureText(text).width / 32) * 32;
	if (width) {
		buttonWidth = width - 160;
	}
	canvasContext.drawImage(cache.buttonStart, x - buttonWidth / 2 - 80, y, 80, 128);
	canvasContext.drawImage(cache.buttonMiddle, x - buttonWidth / 2, y, buttonWidth, 128);
	canvasContext.drawImage(cache.buttonEnd, x + buttonWidth / 2, y, 80, 128);
	canvasContext.textAlign = "center";
	canvasContext.fillStyle = "rgb(0, 0, 0)";
	canvasContext.fillText(text, x, y + 92);
	addEventListener("onclick", callback);
}
// Loading assets
let cache = {};
function loadResources(images, sounds) {
	let successes = 0;
	console.log("Images has length " + images.length + " and sounds has length " + sounds.length + ".");
	let initialize = function (type, eventType, folder, path, extension) {
		cache[path] = document.createElement(type);
		cache[path].addEventListener(eventType, success, false);
		cache[path].src = folder + path + extension;
	};
	let success = function () {
		successes++;
		console.log(this.tagName + " " + this.src.split("/")[this.src.split("/").length - 1] + " has loaded; total " + successes + " successes.");
		if (successes == images.length + sounds.length) {
			stateMachine.ready();
		}
	};
	images.forEach(function (assetName) {
		initialize("img", "load", "images/", assetName, ".png");
	})
	sounds.forEach(function (assetName) {
		initialize("audio", "canplaythrough", "sounds/", assetName, ".mp3");
	})
}
const images = ["start", "buttonStart", "buttonMiddle", "buttonEnd"];
const sounds = ["goldbergAria"];
// Noting input
let keysPressed = {};
let clicked = false;
let mousePosition = {
	x: 0,
	y: 0
};
function getMousePosition(event) {
    let rect = canvas.getBoundingClientRect();
    mousePosition.x = event.clientX - rect.left;
    mousePosition.y = event.clientY - rect.top;
}
addEventListener("keydown", function (e) {
	keysPressed[e.key] = true;
	console.log("The \"" + e.key + "\" key was pressed.");
});
addEventListener("keyup", function (e) {
	delete keysPressed[e.key];
	console.log("The \"" + e.key + "\" key was released.");
});
addEventListener("mousedown", function (e) {
	clicked = true;
	getMousePosition(e);
	console.log("The mouse was clicked on " + mousePosition.x + ", " + mousePosition.y + ".");
});
addEventListener("mouseup", function (e) {
	clicked = false;
	console.log("The mouse was released.");
});
// Game loop
function loop() {
	checkPause();
	if (!stateMachine.is("paused")) {
		clear();
		handle();
		render();
	}
	requestAnimationFrame(loop);
}
// Checking for pause/unpause
let pPressed = false;
let pausedAudio = {};
function checkPause() {
	if (("p" in keysPressed || "P" in keysPressed) && !pPressed) {
		pPressed = true;
		if (!stateMachine.is("paused")) {
			stateMachine.pause();
		} else {
			stateMachine.unpause();
		}
	} else if (!("p" in keysPressed || "P" in keysPressed)) {
		pPressed = false;
	}
}
// Handling input
function handle() {
	if ("t" in keysPressed) {
		cache.goldbergAria.play();
	}
}
// Rendering other items
function render() {
	canvasContext.drawImage(cache.start, 0, 0, gameSize.x, gameSize.y);
}
// State machine
let stateMachine = new StateMachine({
	init: "booting",
	transitions: [
		{name: "ready", from: "booting", to: "menu"},
		{name: "pause", from: "menu", to: "paused"},
		{name: "unpause", from: "paused", to: "menu"},
	],
	methods: {
		onTransition: function (lifecycle) {
			console.log("State: " + lifecycle.transition);
		},
		onBooting: function () {
			// Draw loading screen
			canvasContext.rect(0, 0, gameSize.x, gameSize.y);
			canvasContext.fillStyle = "rgb(0, 0, 0)";
			canvasContext.fill();
			canvasContext.font = "240px \"Commodore 64\", \"Roboto Slab\", \"Century Gothic\", AppleGothic, sans-serif";
			canvasContext.textAlign = "center";
			canvasContext.fillStyle = "rgb(255, 255, 255)";
			canvasContext.fillText("LOADING", gameSize.x / 2, gameSize.y / 2);
		},
		onReady: function () {
			// Draw start menu
			console.log(cache);
			clear();
			canvasContext.drawImage(cache.start, 0, 0, gameSize.x, gameSize.y);
			cache.goldbergAria.play();
			button(960, 640, "Easy", function () {
				console.log("Easy difficulty");
			}, 480);
			button(960, 800, "Medium", function () {
				console.log("Medium difficulty");
			}, 480);
			button(960, 960, "Hard", function () {
				console.log("Hard difficulty");
			}, 480);
		},
		onPause: function () {
			canvasContext.rect(0, 0, gameSize.x, gameSize.y);
			canvasContext.fillStyle = "rgba(0, 0, 0, 0.4)";
			canvasContext.fill();
			canvasContext.fillStyle = "rgb(255, 255, 255)";
			canvasContext.fillText("PAUSED", gameSize.x / 2, gameSize.y / 2);
			sounds.forEach(function (assetName, index) {
				if (!cache[assetName].paused) {
					cache[assetName].pause();
					pausedAudio[index] = true;
					console.log("PausedAudio[" + index + "], " + assetName + ", is now true.");
				}
			})
		},
		onUnpause: function () {
			clear();
			sounds.forEach(function (assetName, index) {
				if (pausedAudio[index]) {
					cache[assetName].play();
					pausedAudio[index] = false;
					console.log("PausedAudio[" + index + "], " + assetName + ", is now false.");
				}
			})
		}
	}
});
// Start
loadResources(images, sounds);