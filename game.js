let canvas = document.getElementById("game");
canvas.width = 1920;
canvas.height = 1280;
let canvasContext = canvas.getContext("2d");
canvasContext.imageSmoothingEnabled = false;
// Variables
let keysPressed = {};
let mouse = {
	x: 0,
	y: 0
};
let cache = {};
const images = ["start", "main", "buttonStart", "buttonMiddle", "buttonEnd", "soundOn", "soundOff"];
const sounds = ["mainTheme"];
let paused = false;
let pausedAudio = {};
let muted = false;
let buttons = {};
// Helper functions
function clear() {
	canvasContext.clearRect(0, 0, 1920, 1280);
}
function setFontSize(size) {
	canvasContext.font = `${size * 1024 / 100}px "Commodore 64", sans-serif`;
}
function getMousePosition(event) {
    let bounds = canvas.getBoundingClientRect();
    mouse.x = (event.clientX - bounds.left) * 1920 / (bounds.right - bounds.left);
    mouse.y = (event.clientY - bounds.top) * 1280 / (bounds.bottom - bounds.top);
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
// Loading assets
function loadResources(images, sounds) {
	let successes = 0;
	console.log("Images has length " + images.length + " and sounds has length " + sounds.length + ".");
	let initialize = function (type, eventType, folder, path, extension) {
		cache[path] = document.createElement(type);
		cache[path].addEventListener(eventType, success);
		cache[path].src = folder + path + extension;
	};
	let success = function (e) {
		this.removeEventListener(e.type, success);
		successes++;
		if (successes == images.length + sounds.length) {
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
				stateMachine.ready();
			}
			wrapClickEvent("autoplayPrompt", waitFunction, () => true);
		}
	};
	images.forEach(function (assetName) {
		initialize("img", "load", "images/", assetName, ".png");
	});
	sounds.forEach(function (assetName) {
		initialize("audio", "canplaythrough", "sounds/", assetName, ".mp3");
	});
}
// Game loop
function loop() {
	if (stateMachine.is("main")) {
		render();
		handle();
		requestAnimationFrame(loop);
	}
}
// Handling input
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
function handle() {
	if ("p" in keysPressed || "P" in keysPressed || "Escape" in keysPressed) {
		stateMachine.pause();
	}
}
// Rendering everything
function render() {
	clear();
	canvasContext.drawImage(cache.main, 0, 0, 1920, 1280);
}
// Buttons
function createButton(id, x, y, dx, dy, imagePath, callback) {
	canvasContext.drawImage(cache[imagePath], x, y, dx, dy);
	let hitbox = new Path2D();
	hitbox.rect(x, y, dx, dy);
	hitbox.closePath();
	wrapClickEvent(id, callback, function (e) {
		getMousePosition(e);
		return canvasContext.isPointInPath(hitbox, mouse.x, mouse.y) && !paused;
	});
}
function muteButton() {
	createButton(muted ? "unmute" : "mute", 1920 - 96, 1280 - 96, 96, 96, muted ? "soundOff" : "soundOn", function () {
		sounds.forEach(function (assetName) {
			cache[assetName].muted = !muted;
		});
		muted = !muted;
	});
}
function textButton(x, y, text, callback, width, ignorePause = false) {
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
	wrapClickEvent(text.toLowerCase(), callback, function (e) {
		getMousePosition(e);
		return canvasContext.isPointInPath(hitbox, mouse.x, mouse.y) && (!paused || ignorePause);
	});
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
			for (button in buttons) {
				removeEventListener("click", buttons[button]);
				delete buttons[button];
			}
		},
		onBooting: function () {
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
			textButton(960, 640, "Easy", function () {
				console.log("Easy difficulty");
				stateMachine.start();
			}, 480);
			textButton(960, 800, "Medium", function () {
				console.log("Medium difficulty");
				stateMachine.start();
			}, 480);
			textButton(960, 960, "Hard", function () {
				console.log("Hard difficulty");
				stateMachine.start();
			}, 480);
			muteButton();
		},
		onMain: function () {
			loop();
		},
		onPause: function () {
			paused = true;
			sounds.forEach(function (assetName, index) {
				if (!cache[assetName].paused) {
					cache[assetName].pause();
					pausedAudio[index] = true;
				}
			});
			canvasContext.rect(0, 0, 1920, 1280);
			canvasContext.fillStyle = "rgba(0, 0, 0, 0.5)";
			canvasContext.fill();
			setFontSize(16);
			canvasContext.fillStyle = "rgb(255, 255, 255)";
			canvasContext.fillText("PAUSED", 960, 400);
			textButton(672, 880, "Menu", function () {
				stateMachine.quit();
			}, 480, true);
			textButton(1248, 880, "Return", function () {
				stateMachine.unpause();
			}, 480, true);
		},
		onLeavePaused: function () {
			paused = false;
			clear();
			sounds.forEach(function (assetName, index) {
				if (pausedAudio[index]) {
					cache[assetName].play();
					pausedAudio[index] = false;
				}
			});
		}
	}
});