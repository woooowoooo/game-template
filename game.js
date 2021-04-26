// Canvas
let canvas = document.getElementById("game");
canvas.width = 1920;
canvas.height = 1280;
let canvasContext = canvas.getContext("2d");
canvasContext.imageSmoothingEnabled = false;
// Helper functions
function clear() {
	canvasContext.clearRect(0, 0, 1920, 1280);
}
function setFontSize(size) {
	canvasContext.font = `${size * 1024 / 100}px "Commodore 64", sans-serif`;
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
	});
	sounds.forEach(function (assetName) {
		initialize("audio", "canplaythrough", "sounds/", assetName, ".mp3");
	});
}
const images = ["start", "main", "buttonStart", "buttonMiddle", "buttonEnd"];
const sounds = ["goldbergAria"];
// Game loop
function loop() {
	render();
	handle();
	if (stateMachine.is("main")) {
		requestAnimationFrame(loop);
	}
}
// Noting input
let keysPressed = {};
let mouse = {
	x: 0,
	y: 0
};
function getMousePosition(event) {
    let bounds = canvas.getBoundingClientRect();
    mouse.x = (event.clientX - bounds.left) * 1920 / (bounds.right - bounds.left);
    mouse.y = (event.clientY - bounds.top) * 1280 / (bounds.bottom - bounds.top);
}
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
// Handling input
let pausedAudio = {};
function handle() {
	if ("p" in keysPressed || "P" in keysPressed || "Escape" in keysPressed) {
		stateMachine.pause();
	}
	if ("t" in keysPressed) {
		cache.goldbergAria.play();
	}
}
// Rendering everything
function render() {
	clear();
	canvasContext.drawImage(cache.main, 0, 0, 1920, 1280);
}
function button(x, y, text, callback, width) {
	setFontSize(8);
	let buttonWidth = Math.ceil(canvasContext.measureText(text).width / 32) * 32;
	if (width) {
		buttonWidth = width - 160;
	}
	// Draw button
	canvasContext.drawImage(cache.buttonStart, x - buttonWidth / 2 - 80, y, 80, 128);
	canvasContext.drawImage(cache.buttonMiddle, x - buttonWidth / 2, y, buttonWidth, 128);
	canvasContext.drawImage(cache.buttonEnd, x + buttonWidth / 2, y, 80, 128);
	canvasContext.textAlign = "center";
	canvasContext.fillStyle = "rgb(0, 0, 0)";
	canvasContext.fillText(text, x, y + 92);
	// Detect clicks
	let hitbox = new Path2D();
	hitbox.rect(x - buttonWidth / 2 - 64, y, buttonWidth + 128, 128);
	hitbox.rect(x - buttonWidth / 2 - 80, y + 16, buttonWidth + 160, 96);
	hitbox.closePath();
	let fullCallback = function (e) {
		getMousePosition(e);
		if (canvasContext.isPointInPath(hitbox, mouse.x, mouse.y)) {
			callback();
		}
		removeEventListener("click", fullCallback);
	};
	addEventListener("click", fullCallback);
}
// State machine
let stateMachine = new StateMachine({
	init: "booting",
	transitions: [
		{
			name: "ready",
			from: "booting",
			to: "menu"
		},
		{
			name: "start",
			from: "menu",
			to: "main"
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
		},
		{
			name: "quit",
			from: "paused",
			to: "menu"
		}
	],
	methods: {
		onTransition: function (lifecycle) {
			console.log("Transition: " + lifecycle.transition + "\nNew State: " + lifecycle.to);
		},
		onBooting: function () {
			// Draw loading screen
			canvasContext.rect(0, 0, 1920, 1280);
			canvasContext.fillStyle = "rgb(0, 0, 0)";
			canvasContext.fill();
			canvasContext.textAlign = "center";
			setFontSize(16);
			canvasContext.fillStyle = "rgb(255, 255, 255)";
			canvasContext.fillText("LOADING", 960, 480);
			setFontSize(8);
			canvasContext.fillText("If this doesn't go away,", 960, 640);
			canvasContext.fillText("refresh the page.", 960, 720);
		},
		onMenu: function () {
			// Draw start menu
			clear();
			canvasContext.drawImage(cache.start, 0, 0, 1920, 1280);
			cache.goldbergAria.play();
			button(960, 640, "Easy", function () {
				console.log("Easy difficulty");
				stateMachine.start();
			}, 480);
			button(960, 800, "Medium", function () {
				console.log("Medium difficulty");
				stateMachine.start();
			}, 480);
			button(960, 960, "Hard", function () {
				console.log("Hard difficulty");
				stateMachine.start();
			}, 480);
		},
		onMain: function() {
			loop();
		},
		onPause: function () {
			sounds.forEach(function (assetName, index) {
				if (!cache[assetName].paused) {
					cache[assetName].pause();
					pausedAudio[index] = true;
					console.log("PausedAudio[" + index + "], " + assetName + ", is now true.");
				}
			});
			canvasContext.rect(0, 0, 1920, 1280);
			canvasContext.fillStyle = "rgba(0, 0, 0, 0.5)";
			canvasContext.fill();
			setFontSize(16);
			canvasContext.fillStyle = "rgb(255, 255, 255)";
			canvasContext.fillText("PAUSED", 960, 480);
			button(640, 800, "Menu", function () {
				stateMachine.quit();
			}, 480);
			button(1280, 800, "Return", function () {
				stateMachine.unpause();
			}, 480);
		},
		onUnpause: function () {
			clear();
			sounds.forEach(function (assetName, index) {
				if (pausedAudio[index]) {
					cache[assetName].play();
					pausedAudio[index] = false;
					console.log("PausedAudio[" + index + "], " + assetName + ", is now false.");
				}
			});
		}
	}
});
// Start
loadResources(images, sounds);