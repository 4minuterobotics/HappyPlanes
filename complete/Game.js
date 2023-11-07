import * as THREE from '../libs/three137/three.module.js';
import { RGBELoader } from '../libs/three137/RGBELoader.js';
import { LoadingBar } from '../libs/LoadingBar.js';
import { Plane } from './Plane.js';
import { Obstacles } from './Obstacles.js';
import { SFX } from '../libs/SFX.js';

class Game {
	constructor() {
		const container = document.createElement('div');
		document.body.appendChild(container);

		//create and show a loading bar
		this.loadingBar = new LoadingBar();
		this.loadingBar.visible = false;

		//create an instance of a 3js clock so we can keep track of time elapsed during the game
		this.clock = new THREE.Clock();

		//set the path to the assets folder
		this.assetsPath = '../assets/';

		//create a camera, position it to suite the game, and set the direction by making it look at 0, 0, 6
		this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
		this.camera.position.set(-4.37, 0, -4.75);
		this.camera.lookAt(0, 0, 6);

		//use the Three.Object3D class when moving the camera. Creat an empty object3D and add the camera to it. Make its target position 0,0,6
		this.cameraController = new THREE.Object3D();
		this.cameraController.add(this.camera);
		this.cameraTarget = new THREE.Vector3(0, 0, 6);

		//create a scene adding the camera controller to it
		this.scene = new THREE.Scene();
		this.scene.add(this.cameraController);

		//create a hemispehre light. Remember, this has a different shade of light for downward facing triangles and upward facing triangles
		const ambient = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
		ambient.position.set(0.5, 1, 0.25);
		this.scene.add(ambient);

		//create a renderer to re-fresh the screen 60 x per second.
		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.outputEncoding = THREE.sRGBEncoding;
		container.appendChild(this.renderer.domElement);
		this.setEnvironment(); // use this method to set the scene environment texture. This is important when using the gltf loader since this uses mesh standard materials, which look way to dark when the scene env property is left default black

		this.active = false;
		this.load();

		window.addEventListener('resize', this.resize.bind(this));

		document.addEventListener('keydown', this.keyDown.bind(this));
		document.addEventListener('keyup', this.keyUp.bind(this));

		document.addEventListener('touchstart', this.mouseDown.bind(this));
		document.addEventListener('touchend', this.mouseUp.bind(this));
		document.addEventListener('mousedown', this.mouseDown.bind(this));
		document.addEventListener('mouseup', this.mouseUp.bind(this));

		this.spaceKey = false;

		const btn = document.getElementById('playBtn');
		btn.addEventListener('click', this.startGame.bind(this));
	}

	startGame() {
		const gameover = document.getElementById('gameover');
		const instructions = document.getElementById('instructions');
		const btn = document.getElementById('playBtn');

		gameover.style.display = 'none';
		instructions.style.display = 'none';
		btn.style.display = 'none';

		this.score = 0;
		this.bonusScore = 0;
		this.lives = 3;

		let elm = document.getElementById('score');
		elm.innerHTML = this.score;

		elm = document.getElementById('lives');
		elm.innerHTML = this.lives;

		this.plane.reset();
		this.obstacles.reset();

		this.active = true;

		this.sfx.play('engine');
	}

	resize() {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(window.innerWidth, window.innerHeight);
	}

	keyDown(evt) {
		switch (evt.keyCode) {
			case 32:
				this.spaceKey = true;
				break;
		}
	}

	keyUp(evt) {
		switch (evt.keyCode) {
			case 32:
				this.spaceKey = false;
				break;
		}
	}

	mouseDown(evt) {
		this.spaceKey = true;
	}

	mouseUp(evt) {
		this.spaceKey = false;
	}

	setEnvironment() {
		const loader = new RGBELoader().setPath(this.assetsPath);
		const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
		pmremGenerator.compileEquirectangularShader();

		const self = this;

		loader.load(
			'hdr/venice_sunset_1k.hdr',
			(texture) => {
				const envMap = pmremGenerator.fromEquirectangular(texture).texture;
				pmremGenerator.dispose();

				self.scene.environment = envMap;
			},
			undefined,
			(err) => {
				console.error(err.message);
			}
		);
	}

	load() {
		this.loadSkybox(); //load skybox
		this.loading = true; //class property indicating the current game state is loading
		this.loadingBar.visible = true; //show the loading bar

		this.plane = new Plane(this); //create a new instance of the game class, passing the game as a paramater to the plane constructor
		this.obstacles = new Obstacles(this);

		this.loadSFX();
	}

	loadSFX() {
		this.sfx = new SFX(this.camera, this.assetsPath + 'plane/');

		this.sfx.load('explosion');
		this.sfx.load('engine', true);
		this.sfx.load('gliss');
		this.sfx.load('gameover');
		this.sfx.load('bonus');
	}

	loadSkybox() {
		this.scene.background = new THREE.CubeTextureLoader() //assign the texture to the scenes backgrond property
			.setPath(`${this.assetsPath}/plane/paintedsky/`) //set the path to the images
			.load(
				[
					//the first parameter to the load method for a cube texture loader takes an array of images. The order of the images is:
					'px.jpg', //positive x
					'nx.jpg', //negative x
					'py.jpg', //positive y
					'ny.jpg', //negative y
					'pz.jpg', //positive z
					'nz.jpg', //negative z
				],
				() => {
					this.renderer.setAnimationLoop(this.render.bind(this)); // add an onload event handler that starts the rendering
				}
			);
	}

	gameOver() {
		this.active = false;

		const gameover = document.getElementById('gameover');
		const btn = document.getElementById('playBtn');

		gameover.style.display = 'block';
		btn.style.display = 'block';

		this.plane.visible = false;

		this.sfx.stopAll();
		this.sfx.play('gameover');
	}

	incScore() {
		this.score++;

		const elm = document.getElementById('score');

		if (this.score % 3 == 0) {
			this.bonusScore += 3;
			this.sfx.play('bonus');
		} else {
			this.sfx.play('gliss');
		}

		elm.innerHTML = this.score + this.bonusScore;
	}

	decLives() {
		this.lives--;

		const elm = document.getElementById('lives');

		elm.innerHTML = this.lives;

		if (this.lives == 0) setTimeout(this.gameOver.bind(this), 1200);

		this.sfx.play('explosion');
	}

	updateCamera() {
		this.cameraController.position.copy(this.plane.position); //the controller is what the camera is pointed at. Here it's moved to the planes position
		this.cameraController.position.y = 0; // setting it's y position to 0 allows you to easily position objects above and below
		this.cameraTarget.copy(this.plane.position); //the target is the distance the camera is looking
		this.cameraTarget.z += 6; //we initialized the target at 0,0,6 when the plane is at 0,0,0. This keeps the relative positioining
		this.camera.lookAt(this.cameraTarget);
	}

	render() {
		if (this.loading) {
			// check if we're still loading
			if (this.plane.ready && this.obstacles.ready) {
				//check the ready flag of the plane
				this.loading = false;
				this.loadingBar.visible = false;
			} else {
				//if not the we return from the method
				return;
			}
		}

		const dt = this.clock.getDelta();
		const time = this.clock.getElapsedTime();

		this.plane.update(time); //assuming the plane is loaded, we call update, passing the elapsed time which we get from the clock

		if (this.active) {
			this.obstacles.update(this.plane.position, dt);
		}

		this.updateCamera(); //update the camera.

		this.renderer.render(this.scene, this.camera);
	}
}

export { Game };
