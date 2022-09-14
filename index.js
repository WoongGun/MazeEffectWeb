////1. initial set up
////2. wait for user to click start
////3. initialize environment
////	1. create new scene
////	2. generate maze
////	3. create camera
////	4. set up models
////	5. place objects (player, walls, monsters)
////	6. render in webgl
////	7. create HUD overlay
////4. run game loop
////	1. check game state (dead/win)
////	2. move AI and player
////	3. check collision
////    4. draw new positions

//// Constants
var WALLWIDTH = 15,
    WALLHEIGHT = WALLWIDTH,
    MOVESPEED = 0.7,
    STRAFESPEED = 0.3,
    BACKSPEED = 0.3,
    LOOKSPEED = 1;

//// Global variables
var t = THREE; // purely for ergonomics

// window
var windowWidth = window.innerWidth,
    windowHeight = window.innerHeight,
    aspectRatio;

// core
var clock,
    scene,
    camera_Character,
    renderer,
    character,
    keyboard = new THREEx.KeyboardState(),
    hudBox,
    lastLoop,
    frameCounter,
    torch,
    hasTorch,
    ownedTorch,
    score,
    startTime,
    scoreMatrix,
    monsterDex,
    gameWon,
    gameLost;

// movement
var moveForward,
    moveBack,
    moveLeft,
    moveRight,
    sneak,
    interact;

// stats
var avgFps,
    fpsCounter;

// mouse and picker
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2(),
    oldmouse = new THREE.Vector2(),
    ndcMouse = new THREE.Vector2(),
    INTERSECTED,
    spdx,
    spdy,
    mouseDown,
    currentY,
    currentX,
    mouseLook;

//// Maze
var maze = new Array([]);
var mazeWidth = maze.length,
    mazeHeight = maze[0].length,
    monsterBox,
    monsterCount,
    torchBox;

var EMPTY_ID = 0,
    WALLTILE_ID = 1,
    MONSTER_ID = 2,
    EXIT_ID = 3,
    TORCH_ID = 4;



// Audio set up
var deathAudio,
    deathAudioPlaying,
    monsterBreath1,
    monsterBreath2;

// camera set up
var views = [
{
    left: 0,
    bottom: 0,
    width: 1.0,
    height: 1.0,
    eye: [0, 0, 0],
    up: [0, 1, 0],
    fov: 45,
}
];

// base on back tracking maze generator loosely on prim's algorithm
function randomMazeGenerator(width, height) {
    // use even number for sizes for actor placement ease
    mazeHeight = width;
    mazeWidth = height;

    // container for backtracking and movement
    var moves = [];

    // populate entire board with walls
    for (var i = 0; i < mazeHeight; i++) {
        maze[i] = [];
        for (var j = 0; j < mazeWidth; j++) {
            maze[i][j] = 1;
        }
    }

    //start from 0,0
    var coords = getCoordinates(new t.Vector3(0, 0, 0));
    var posX = coords[0];
    var posY = coords[1]-4;

    // make initial corridor
    maze[posX][posY] = 0;
    maze[posX][posY + 1] = 0;
    maze[posX][posY + 2] = 0;
    maze[posX][posY + 3] = 0;
    maze[posX][posY + 4] = 0;

    moves.push(posY + posY * mazeWidth);
    var steps = 0;

    var endCandidate = new t.Vector2();
    var endpointCandidates = new Array();
    var endPointValid = false;

    // will keep iterating until there are no good moves left
    while (moves.length) {
        var nextMove = [];
        //north
        if (posX - 2 > 0 && posX - 2 < mazeHeight - 1 && maze[posX - 2][posY] == WALLTILE_ID) {
            nextMove.push(-2);
        }
        //east
        if (posY + 2 > 0 && posY + 2 < mazeWidth - 1 && maze[posX][posY + 2] == WALLTILE_ID) {
            nextMove.push(1);
        }
        //south
        if (posX + 2 > 0 && posX + 2 < mazeHeight - 1 && maze[posX + 2][posY] == WALLTILE_ID) {
            nextMove.push(2);
        }
        //west
        if (posY - 2 > 0 && posY - 2 < mazeWidth - 1 && maze[posX][posY - 2] == WALLTILE_ID) {
            nextMove.push(-1);
            // awkward but first move is only north or south or torch floats.
            if (steps == 0) {
                nextMove.pop();
            }
        }

        // if we have move candidates, randomly pick one and move.  otherwise backtrack.
        if (nextMove.length > 0) {
            // pick next random move
            var move = Math.floor(Math.random() * nextMove.length);

            // mathemagic decoding, -2 is north, 2 is south, 1 is east, -1 west
            // if not right axis, the move is 0 in that axis.  behold magic modulo
            yMove = nextMove[move] % 2;
            xMove = (nextMove[move] + 1) % 2;

            maze[posX + 2 * xMove][posY + 2 * yMove] = EMPTY_ID;
            maze[posX + 1 * xMove][posY + 1 * yMove] = EMPTY_ID;
            posX += 2 * xMove;9
            posY += 2 * yMove;

            moves.push(posY + posX * mazeWidth);

            // for finding exit candidates
            if (Math.abs(coords[0] - posX) > 5 || Math.abs(coords[1] - posY) > 5) {
                console.log(endCandidate);
                endPointValid = true;
                endCandidate.x = posX;
                endCandidate.y = posY;
            }
        }
        else {
            // capture each end point in array
            if (endPointValid == true) {
                endpointCandidates.push(endCandidate);
                endPointValid = false;
            }9
            var back = moves.pop();
            posX = Math.floor(back / mazeWidth);
            posY = back % mazeWidth;
        }

        // take a step for counting purposes
        steps++;
        // place a room every 20 steps, but minimum distance from player
        if (steps % 20 == 0 &&
            (Math.abs(coords[0] - posX) > 3 || Math.abs(coords[1] - posY) > 3) &&
            (posX > 2 && posX < mazeHeight - 2 && posY > 2 && posY < mazeWidth -2)) {

            maze[posX - 1][posY] = EMPTY_ID;
            maze[posX][posY - 1] = EMPTY_ID;
            maze[posX + 1][posY] = EMPTY_ID;
            maze[posX][posY + 1] = EMPTY_ID;
            maze[posX - 1][posY - 1] = EMPTY_ID;
            maze[posX + 1][posY - 1] = EMPTY_ID;
            maze[posX + 1][posY + 1] = EMPTY_ID;
            maze[posX - 1][posY + 1] = EMPTY_ID;
        }
        
        // place a monster every 10th step, but minimum distance away from player
        if (steps % 10 == 0 && (Math.abs(coords[0] - posX) > 3 || Math.abs(coords[1] - posY) > 3)) {
            maze[posX][posY] = MONSTER_ID;
        }

        // place a torch every 25th step
        if (steps % 25 == 0) {
            maze[posX][posY] = TORCH_ID;
        }
    }

    // pick random exit candidate as exit point
    var exitCell = Math.floor(Math.random() * endpointCandidates.length);
    endCandidate = endpointCandidates[exitCell];
    maze[endCandidate.x][endCandidate.y] = EXIT_ID;

    // make sure the hero torch is always against a wall.  room generation can make this block disappear.
    maze[coords[0]][coords[1] - 5] = WALLTILE_ID;
}


function init() {
    // set up timer for animation later
    clock = new t.Clock(true);
    
    // set up scene
    scene = new t.Scene();
    
    randomMazeGenerator(24, 24);

    scoreMatrix = new Array([]);
    // set up score sheet
    for (i = 0; i < mazeHeight; i++) {
        scoreMatrix[i] = new Array(mazeWidth);
    }

    startTime = new Date;
    lastLoop = new Date;
    frameCounter = 0;
    score = 0;
    gameWon = false;
    gameLost = false;
    hasTorch = false;
    ownedTorch = null;
    mouse.x = 0;
    mouse.y = 0;
    currentY = 0;
    currentX = 0;
    sneak = false;

    // mouse vars
    spdx = 0;
    spdy = 0;
    oldmouse.x = 0;
    oldmouse.y = 0;
    mouseDown = false;
    
    avgFps = 0.0;
    fpsCounter = 0;

    // Creating the camera, add to character later.
    var view = views[0];
    camera_Character = new THREE.PerspectiveCamera(view.fov, windowWidth / windowHeight, 1, 10000);
    camera_Character.position.x = view.eye[0];
    camera_Character.position.y = view.eye[1];
    camera_Character.position.z = view.eye[2];
    camera_Character.up.x = view.up[0];
    camera_Character.up.y = view.up[1];
    camera_Character.up.z = view.up[2];
    camera_Character.lookAt(scene.position);
    view.camera = camera_Character;
    
    // Add objects to world space
    setupWorld();

    var canvas = document.getElementById('canvas');
    //var scene = new THREE.Scene();
    if (!renderer){
        renderer = new t.WebGLRenderer();
        renderer.shadowMap.type = t.PCFSoftShadowMap;
        renderer.shadowMap.enabled = true;
        renderer.setClearColor(0xFFFFFF); // white background colour
        
    }
    canvas.appendChild(renderer.domElement);

    // make the hud box
    hudBox = document.createElement('div');
    hudBox.style.position = 'absolute';
    hudBox.style.width = 150;
    hudBox.style.height = 100;
    hudBox.style.backgroundColor = "gray";
    hudBox.innerHTML = "Starting...";
    hudBox.style.top = 20 + 'px';
    hudBox.style.left = 20 + 'px';
    document.body.appendChild(hudBox);

    // audio samples are stock audio licensed to me
    deathAudio = new Audio('assets/audio/playerCaught.wav');
    deathAudioPlaying = false;
    monsterBreath1 = new Audio('assets/audio/monsterBreath1.wav');
    monsterBreath2 = new Audio('assets/audio/monsterBreath2.wav');9
}

$(document).ready(function () {
    $('body').append('<div id="intro">Stay in the light for protection.  One touch from the monsters and it is over <br> <br> WASD to move, mouse to look, click to grab <br> press m to enter mouse look, e to drop the torch <br> <br> Click to start</div>');
    $('#intro').css({ width: windowWidth, height: windowHeight }).one('click', function (e) {
        e.preventDefault();
        $(this).fadeOut();
        init();
        update();
        resize();
    });
});


// monster factory
function addMonster(i) {
    // random monster body, head, eye size
    var monsterSize = 1 + Math.random()*2;
    var monsterEyeSize = 0.3 + Math.random() / 5;
    var monsterBodyTopSize = Math.min(1 + Math.random() * 2, monsterSize/2);
    var monsterBodyBottomSize = 1 + Math.random() * 2;
    var monsterEarSize = 1 + Math.random();
    var monsterEarWidth = Math.min(1 + Math.random(), monsterSize/2);

    var monsterGeometry = new t.SphereGeometry(monsterSize, 10, 10);
    var monsterTexture = new t.MeshLambertMaterial();
    monsterBox[i] = new t.Mesh(monsterGeometry, monsterTexture);
    var monster = monsterBox[i];
    var monsterEyeGeometry = new t.SphereGeometry(monsterEyeSize, 5, 5);
    var monsterEyeTexture = new t.MeshLambertMaterial({ color: 0xff0000, emissive: 0xff0000 });
    var monsterLeftEye = new t.Mesh(monsterEyeGeometry, monsterEyeTexture);
    var monsterRightEye = new t.Mesh(monsterEyeGeometry, monsterEyeTexture);

    var monsterBodyGeometry = new t.CylinderGeometry(monsterBodyTopSize, monsterBodyBottomSize, WALLHEIGHT/3);
    var monsterBodyTexture = new t.MeshLambertMaterial();
    var monsterBody = new t.Mesh(monsterBodyGeometry, monsterBodyTexture);

    var monsterEarGeometry = new t.CylinderGeometry(0, monsterEarWidth, monsterEarSize);
    var monsterLeftEar = new t.Mesh(monsterEarGeometry, monsterBodyTexture);
    var monsterRightEar = new t.Mesh(monsterEarGeometry, monsterBodyTexture);

    // random monster color
    monsterTexture.color.setHex(Math.random() * 0xffffff);
    monsterBodyTexture.color.setHex(Math.random() * 0xffffff);

    monsterLeftEye.position.set(monsterSize/2, 0, monsterSize - monsterEyeSize);
    monsterRightEye.position.set(-monsterSize / 2, 0, monsterSize - monsterEyeSize);

    monsterLeftEar.position.set(3*monsterSize/4, 3*monsterSize/4, 0);
    monsterRightEar.position.set(-3*monsterSize/4, 3*monsterSize/4, 0);
    monsterLeftEar.rotation.set(0, 0, -.7);
    monsterRightEar.rotation.set(0, 0, .7);

    monsterBody.position.set(0, -WALLHEIGHT / 6, -monsterSize / 2);

    monster.add(monsterLeftEye);
    monster.add(monsterRightEye);
    monster.add(monsterLeftEar);
    monster.add(monsterRightEar);
    monster.add(monsterBody);
}

//torch factory
function addTorch(i){
    // create torch
    var torchgeo = new t.SphereGeometry(.5, 5, 5);
    var torchMaterial = new t.MeshLambertMaterial({ color: 0xFF8C00, emissive: 0xFF8C00 });
    torchBox[i] = new t.Mesh(torchgeo, torchMaterial);
    var weakTorch = torchBox[i];
    
    var handlegeo = new t.CubeGeometry(0.25, 2, 0.25);
    var handleMaterial = new t.MeshPhongMaterial({ color: 0x663300 });
    var handle = new t.Mesh(handlegeo, handleMaterial);
    
    handle.translateY(-1.4);
    weakTorch.add(handle);
    
    weakTorch.rotation.set(-0.5, 0, 1.4);
    
    // fading torches don't cast shadows to save frame rate.
    weakLight = new THREE.PointLight(0xffffff, 1, 20);
    weakLight.position.set(0, 1, 0);
    weakTorch.add(weakLight);
}

function setupWorld() {
    // Create character
    var geometry = new t.SphereGeometry(5, 32, 32);
    generateVertexColors(geometry);
    var material = new t.MeshBasicMaterial({ color: 0xffff00 });
    character = new t.Mesh(geometry, material);
    character.translateY(10);
    character.add(camera_Character);
    scene.add(character);

    torchBox = new Array();
    
    // create torch
    var torchgeo = new t.SphereGeometry(.5, 5, 5);
    var torchMaterial = new t.MeshLambertMaterial({ color: 0xffff00, emissive: 0xffff00 });
    torch = new t.Mesh(torchgeo, torchMaterial);

    var handlegeo = new t.CubeGeometry(0.25, 2, 0.25);
    var handleMaterial = new t.MeshPhongMaterial({ color: 0x663300 });
    var handle = new t.Mesh(handlegeo, handleMaterial);

    handle.translateY(-1.4);
    torch.add(handle);

    torch.position.set(0,10,-66.5);
    torch.rotateX(60*Math.PI/360);
    scene.add(torch);

    // add floor as large flat cube
    // use per pixel lighting for torch light effect
    // textures from cgtextures.com
    // normal maps made with photoshop
    
    //create textureloader
    const loader = new t.TextureLoader();

    var floorGeometry = new t.CubeGeometry(mazeWidth * WALLWIDTH, 5, mazeWidth * WALLWIDTH);
    const floorTexture = new loader.load( 'assets/textures/floor.jpg' );
    const floorTextureNormal = new loader.load( 'assets/textures/floor_normal.jpg' );
    floorTexture.wrapS = floorTexture.wrapT = t.RepeatWrapping;
    floorTexture.repeat.set(mazeWidth, mazeWidth);
    floorTextureNormal.wrapS = floorTextureNormal.wrapT = t.RepeatWrapping;
    floorTextureNormal.repeat.set(mazeWidth, mazeWidth);
    var floorMaterial = new t.MeshPhongMaterial({ map: floorTexture, shininess: 0, normalMap: floorTextureNormal });
    var floor = new t.Mesh(floorGeometry, floorMaterial);
    floor.castShadow = false;
    floor.receiveShadow = true;
    scene.add(floor);

    var ceiling = new t.Mesh(floorGeometry, floorMaterial);
    ceiling.translateY(WALLHEIGHT);
    scene.add(ceiling);

    // set up exit as a cube
    var wallGeometry = new t.CubeGeometry(WALLWIDTH, WALLHEIGHT, WALLWIDTH);
    const wallTexture = new loader.load( 'assets/textures/wall.jpg' );
    const wallTextureNormal = new loader.load( 'assets/textures/wall_normal.jpg' );
    var wallMaterial = new t.MeshPhongMaterial({ map: wallTexture, shininess: 0, normalMap: wallTextureNormal });

    // monster generator
    monsterBox = new Array();
    monsterCount = 0;
    torchCount = 0;

    // generate maze
    for (var i = 0; i < mazeWidth; i++) {
        for (var j = 0, m = mazeHeight; j < m; j++) {
            if (maze[i][j] == WALLTILE_ID) {
                var wall = new t.Mesh(wallGeometry, wallMaterial);
                wall.position.x = (i - mazeWidth / 2) * WALLWIDTH;
                wall.position.y = WALLHEIGHT / 2;
                wall.position.z = (j - mazeWidth / 2) * WALLWIDTH;
                wall.castShadow = true;
                wall.receiveShadow = true;
                scene.add(wall);
            }
            if (maze[i][j] == MONSTER_ID) {
                addMonster(monsterCount);
                monsterBox[monsterCount].position.x = (i - mazeWidth / 2) * WALLWIDTH;
                monsterBox[monsterCount].position.y = WALLHEIGHT / 2;
                monsterBox[monsterCount].position.z = (j - mazeWidth / 2) * WALLWIDTH;
                scene.add(monsterBox[monsterCount]);
                monsterCount++;
            }
            if (maze[i][j] == EXIT_ID) {
                var exit = new t.Mesh(wallGeometry, material);
                exit.position.x = (i - mazeWidth / 2) * WALLWIDTH;
                exit.position.y = WALLHEIGHT / 2;
                exit.position.z = (j - mazeWidth / 2) * WALLWIDTH;
                scene.add(exit);
            }
            if (maze[i][j] == TORCH_ID) {
                addTorch(torchCount);
                torchBox[torchCount].position.x = (i - mazeWidth / 2) * WALLWIDTH;
                torchBox[torchCount].position.y = 3.2;
                torchBox[torchCount].position.z = (j - mazeWidth / 2) * WALLWIDTH;
                scene.add(torchBox[torchCount]);
                torchCount++;
            }
        }
    }

    // each new monster encountered gives points.
    monsterDex = new Array(monsterCount);

    // fog effect
    scene.fog = new t.FogExp2(0x000000, 0.013);

    // Add hero torch
    var lights = [];
    lights[0] = new THREE.PointLight(0xffffff, 1, 40);
    lights[0].castShadow = true;
    lights[0].shadowDarkness = 0.5;
    lights[0].position.set(0, 1, 0);

    torch.add(lights[0]);

    var audio = new Audio('assets/audio/playerBreathing.wav');
    audio.play();
}

// ADAPT TO WINDOW RESIZE
function resize() {
    windowWidth = window.innerWidth;
    windowHeight = window.innerHeight;
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// EVENT LISTENER RESIZE
window.addEventListener('resize', resize);

//SCROLLBAR FUNCTION DISABLE
window.onscroll = function () {
    window.scrollTo(0, 0);
}

//var clock = new THREE.Clock(true);
function updateSystem() {
    if (gameWon) {
        var finalScore = score + 10;
        hudBox.innerHTML = "You have won!<br>Score: " + finalScore + "<br>Press space to restart";
        $(renderer.domElement).fadeOut();
        return;
    }

    if (gameLost) {
        var finalScore = score;
        hudBox.innerHTML = "You have lost!<br>Score: " + finalScore + "<br>Press space to restart";
        $(renderer.domElement).fadeOut();
        if (!deathAudioPlaying) {
            deathAudioPlaying = true;
            deathAudio.play();
        }
        return;
    }

    updateAi();

    var thisLoop = new Date;
    var fps = 1000 / (thisLoop - lastLoop);
    lastLoop = thisLoop;
    hudText = "fps: " + fps.toPrecision(3) + "<br>";
    // running average over 60 frame
    avgFps = avgFps + (fps - avgFps)/60;
    hudText += "avg fps: " + avgFps.toPrecision(3) + "<br>";
        
    // keyboard movement
    movementModifier = 1;
    if (sneak) {
        movementModifier = 0.3;
    }
    if (moveLeft) {
        var localDir = new t.Vector3(-1, 0, 0);
        movementHandler(character, localDir, STRAFESPEED * movementModifier);
    }
    if (moveRight) {
        var localDir = new t.Vector3(1, 0, 0);
        movementHandler(character, localDir, STRAFESPEED * movementModifier);
    }
    if (moveForward) {
        var localDir = new t.Vector3(0, 0, -1);
        movementHandler(character, localDir, MOVESPEED * movementModifier);
    }
    if (moveBack) {
        var localDir = new t.Vector3(0, 0, 1);
        movementHandler(character, localDir, BACKSPEED * movementModifier);
    }

    //Mouse movement
    if (mouseLook || mouseDown) {

        currentY = camera_Character.rotation.y;
        currentX = camera_Character.rotation.x;

        spdy = (oldmouse.y - mouse.y) * LOOKSPEED;
        spdx = (oldmouse.x - mouse.x) * LOOKSPEED;
            
        character.rotateY(spdx * Math.PI / 360);
        camera_Character.rotateX(spdy * Math.PI / 360);
            
        if (camera_Character.rotation.x < -1){
            camera_Character.rotateX(-spdy * Math.PI / 360);
        }
        if (camera_Character.rotation.x > 0.5){
            camera_Character.rotateX(-spdy * Math.PI / 360);
        }
            
        oldmouse.y = mouse.y;
        oldmouse.x = mouse.x;
    }

    // interactions
    // calculate objects intersecting the picking ray
    raycaster.setFromCamera(ndcMouse, camera_Character);
    var intersects = raycaster.intersectObjects(scene.children);

    var isTorch;

    // based on three js implementation of intersect
    if (intersects.length > 0) {
        isTorch = intersects[0].object == torch;
        for (var i = 0; i < torchCount; i++) {
            if (intersects[0].object == torchBox[i]) isTorch = true;
        }

        if (INTERSECTED != intersects[0].object) {
            if (INTERSECTED) INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex);
            if (isTorch) {
                INTERSECTED = intersects[0].object;
                INTERSECTED.currentHex = INTERSECTED.material.emissive.getHex();
                INTERSECTED.material.emissive.setHex(0xff0000);
            }
            else {
                INTERSECTED = null;
            }
        }
    } else {
        if (INTERSECTED) INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex);
        INTERSECTED = null;
    }

    // pick up the torch
    if (isTorch && (interact || mouseDown) && intersects[0].distance < 10) {
        // if doesnt have torch, pick it up
        if (!hasTorch) {
            ownedTorch = intersects[0].object;
            ownedTorch.position.set(1.3, 0, -4);
            ownedTorch.rotation.set(-0.5, 0, 0.3);
            camera_Character.add(ownedTorch);
            hasTorch = true;
            interact = false;
        }
        // upgrade fading torch to hero torch, existing hero torch fades.
        else if (ownedTorch != torch && intersects[0].object != torch) {
            //put held torch in the void
            scene.add(ownedTorch);
            ownedTorch.position.set(0, -10, 0);

            // put torch on ground in hero torch location
            intersects[0].object.position.set(torch.position.x, torch.position.y, torch.position.z);
            intersects[0].object.rotation.set(torch.rotation.x, torch.rotation.y, torch.rotation.z);

            // replace held torch with hero torch
            ownedTorch = torch;
            ownedTorch.position.set(1.3, 0, -4);
            ownedTorch.rotation.set(-0.5, 0, 0.3);
            camera_Character.add(torch);
            hasTorch = true;
            interact = false;

            // upgrading a torch gives points.
            score += 2;
        }
 
    }

    // drop the torch
    if (interact && hasTorch) {
        scene.add(ownedTorch);
        ownedTorch.rotation.set(-0.5, 0, 1.4);
        ownedTorch.position.x = character.position.x;
        ownedTorch.position.y = 3.2;
        ownedTorch.position.z = character.position.z;
        ownedTorch = null;
        interact = false;
        hasTorch = false;
    }

    var coord = getCoordinates(character.position);
    var gameState = maze[coord[0]][coord[1]];

    // see if explored a new tile for score.  Only add a score point if its a new tile.
    if (gameState != 1) {
        if (scoreMatrix[coord[0]][coord[1]] != 1) {
            scoreMatrix[coord[0]][coord[1]] = 1;
            score++;
        }
    }

    // see if found exit
    if (gameState == 3) {
        gameWon = true;
    }

    // update framecounter every 1/2 second to make it readable
    frameCounter++;
    if (frameCounter > 30) {
        hudText += "Time: " + Math.floor((thisLoop - startTime) / 1000) + " s<br>";
        hudText += "Score: " + score + "<br>";

        // if hero torch
        if (INTERSECTED == torch) {
            if (intersects[0].distance < 10) {
                hudText += "Pick up the torch<br>";
            } else {
                hudText += "Get closer to the torch<br>";
            }
        }
        else if (isTorch) {
            if (hasTorch && ownedTorch != torch) {
                hudText += "Upgrade your torch<br>";
            }
            else {
                hudText += "This is a fading torch<br>";
            }
        }

        hudBox.innerHTML = hudText;
        frameCounter = 0;
    }
}

// I chose move forward and move back instead of forward checking because it is easier to implement.
function movementHandler(actor, direction, distance) {
    // move actor
    var worldDir = direction.applyMatrix4(actor.matrixWorld);
    var finalDir = worldDir.sub(actor.position).normalize();
    var finalVector = finalDir.multiplyScalar(distance);
    actor.position.add(finalVector);

    // check collision
    if (checkCollision(actor.position)) {
        // if collided move actor back and check direction
        actor.position.sub(finalVector);
        // try to slide along x
        var slideDir = new t.Vector3(finalVector.x, 0, 0);
        actor.position.add(slideDir);
        if (checkCollision(actor.position)) {
            actor.position.sub(slideDir);

            // if collided try to slide along z
            slideDir = new t.Vector3(0, 0, finalVector.z);
            actor.position.add(slideDir);
            
            if (checkCollision(actor.position)) {
                actor.position.sub(slideDir);
            }
        }
    }

}

// monster movement and behaviour
function updateAi() {
    // iterate through each monster
    for (var i = 0; i < monsterCount ; i++) {
        
        var monster = monsterBox[i];
        var characterDistance = distance(monster.position, character.position);
        var distanceCheck = characterDistance;
        // check if within range of player
        if (distanceCheck > 70) {
            continue;
        }

        // if monster touches the player, player loses
        if (distanceCheck < 8) {
            gameLost = true;
            return;
        }
        var monsterTarget = character;
        var lightSource = torch;

        //get closest of torch or character
        var torchDistance = distance(monster.position, torch.position);
        if (!hasTorch && distanceCheck > torchDistance) {
            monsterTarget = torch;
            distanceCheck = torchDistance;
        }

        // is player is closer than torch on the ground, use torch held by character
        if (hasTorch && distanceCheck < torchDistance) {
            lightSource = ownedTorch;
        }
        
        // get player direction
        var targetDirection = monsterTarget.position.clone().sub(monster.position);
        // turn to player
        // dont change y position for look at
        var monsterLookAt = new t.Vector3(monster.position.x + targetDirection.x,
                                            monster.position.y,
                                            monster.position.z + targetDirection.z)
        monster.lookAt(monsterLookAt);

        if (monsterTarget == character) {
            //monster doesn't need line of sight to player, they can sense life force.
            var localDir = new t.Vector3(0, 0, 1);
            movementHandler(monster, localDir, MOVESPEED * 0.3);
            monsterBreath1.volume = 5/characterDistance;
            monsterBreath1.play();
        }

        // step back if within light range
        // only the HERO TORCH can repel monsters while on the ground
        // fading torches are weak and has lesser repel range
        // get world coordinates for torch
        var lightWorldPos = new THREE.Vector3();
        lightWorldPos.setFromMatrixPosition(lightSource.matrixWorld);

        var lightRange = 30;
        if (hasTorch && ownedTorch == torch) {
            lightRange = 40;
        }

        //get player lookat vector
        var playerLookat = new THREE.Vector3(0, 0, -1);
        var worldDir = playerLookat.applyMatrix4(character.matrixWorld);
        var finalDir = worldDir.sub(character.position).normalize();
        // if player is looking away, monsters will try to sneak up
        if (monsterTarget == character && finalDir.dot(targetDirection) > 0) {
            lightRange = lightRange / 3;
        }

        if (distance(monster.position, lightWorldPos) < lightRange) {
            var lightDirection = lightWorldPos.clone().sub(monster.position);
            var lightcaster = new THREE.Raycaster();
            lightcaster.set(monster.position, lightDirection.clone().normalize());
            var intersects = lightcaster.intersectObjects(scene.children);

            // character needs a light and be close enough to document a monster
            if (hasTorch && intersects[0].object == character) {
                // see if the monster is new
                if (monsterDex[i] != 1) {
                    monsterDex[i] = 1;
                    score += 3;
                }
            }
            if (intersects[0].object == lightSource || (hasTorch && intersects[0].object == character)) {
                monsterLookAtTorch = new t.Vector3(monster.position.x + lightDirection.x,
                                            monster.position.y,
                                            monster.position.z + lightDirection.z)
                monster.lookAt(monsterLookAtTorch);
                var localDir = new t.Vector3(0, 0, -1);
                movementHandler(monster, localDir, MOVESPEED * 0.5);

                monsterBreath2.volume = 5 / characterDistance;
                monsterBreath2.play();
                monster.lookAt(monsterLookAt);
            }
        }
    }
}

// get distance between two positions
function distance(posA, posB) {
    return Math.sqrt(Math.pow((posB.x - posA.x), 2) + Math.pow((posB.z - posA.z), 2));
}

// movement
function onKeyDown(event) {
    if (keyboard.eventMatches(event, "shift")) {
        sneak = !sneak;
    }
    if (keyboard.eventMatches(event, "a")) {
        moveLeft = true;
    }
    if (keyboard.eventMatches(event, "d")) {
        moveRight = true;
    }
    if (keyboard.eventMatches(event, "w")) {
        moveForward = true;
    }
    if (keyboard.eventMatches(event, "s")) {
        moveBack = true;
    }
    if (keyboard.eventMatches(event, "e")) {
        interact = true;
    }
    if (keyboard.eventMatches(event, "m")) {
        mouseLook = !mouseLook;
        // use pointer lock for mouse look
        if (mouseLook == true){
            canvas.requestPointerLock = canvas.requestPointerLock ||
            canvas.mozRequestPointerLock;
            
            canvas.requestPointerLock()
            
        }
        else{
            canvas.exitPointerLock = canvas.exitPointerLock    ||
            canvas.mozExitPointerLock;
            
            // Attempt to unlock, not all browsers work but can just press esc
            canvas.exitPointerLock();
        }
    }
    if (keyboard.eventMatches(event, "space") && (gameWon || gameLost)) {
        init();
        resize();
        $(renderer.domElement).fadeIn();
    }
}
keyboard.domElement.addEventListener('keydown', onKeyDown);

keyboard.domElement.addEventListener("keyup", function (event) {
    if (keyboard.eventMatches(event, "a")) {
        moveLeft = false;
    }
    if (keyboard.eventMatches(event, "d")) {
        moveRight = false;
    }
    if (keyboard.eventMatches(event, "w")) {
        moveForward = false;
    }
    if (keyboard.eventMatches(event, "s")) {
        moveBack = false;
    }
    if (keyboard.eventMatches(event, "e")) {
        interact = false;
    }
}, false);


// mouse down and mouse up kept track of to determine drag.
document.addEventListener('mousemove', function (event) {
    // normalized device coodinate mouse for picking
    ndcMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    ndcMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // for pointer locked controls
    if (mouseLook){
        var movementX = event.movementX ||
                        event.mozMovementX ||
                        0;
        var movementY = event.movementY ||
                        event.mozMovementY ||
                        0;
                          
        mouse.x += movementX;
        mouse.y += movementY;
    }else{
        mouse.x = event.clientX;
        mouse.y = event.clientY;
    }
                          
}, false);

// for click drag movement and pointer clicking
document.body.addEventListener("mousedown", function (event) {             
    mouseDown = true;
    if (!mouseLook){
        oldmouse.x = event.clientX;
        oldmouse.y = event.clientY;
    }
}, false);
document.body.addEventListener("mouseup", function (event) {   
    mouseDown = false;
    if (!mouseLook){
        var currentY = 0;
        var currentX = 0;
    }
}, false);


//primitive collision implementation
// get coodinate of given position with respect to maze layout
function getCoordinates(position) {
    var x = Math.floor((position.x + WALLWIDTH / 2) / WALLWIDTH + mazeWidth / 2);
    var z = Math.floor((position.z + WALLWIDTH / 2) / WALLWIDTH + mazeWidth / 2);
    return [x,z];
}

// custom collision detector
// detects collision with various things
function checkCollision(position) {
    var isCollided = 0;
    var checkPosition = new t.Vector3(position.x, position.y, position.z);
    var unitBuffer = 2;
    if (hasTorch) {
        unitBuffer = 2;
    }
    //console.log(position.x, checkPosition.x, position.z, checkPosition.z)
    // create a one unit buffer around the character to predict collison
    // acts as a collision proxy
    
    //check monster collision
    for (i = 0; i < monsterCount; i++){
        monsterDistance = distance(position, monsterBox[i].position);
        if (monsterDistance > 0 && monsterDistance < 5){
            return 1;
        }
    }
    
    //check wall collision
    loop1:
        for (i = -1; i < 2; i++) {
            checkPosition.x = position.x + unitBuffer * i;
    loop2:
            for (j = -1; j < 2; j++) {
                checkPosition.z = position.z + unitBuffer * j;
                var coord = getCoordinates(checkPosition);
                isCollided = maze[coord[0]][coord[1]];
                if (isCollided == 1) {
                    break loop1;
                }
            }
        }
    return isCollided == 1;
}

// SETUP UPDATE CALL-BACK
function update() {
    updateSystem();
    requestAnimationFrame(update);

    view = views[0];
    camera_ = view.camera;

    var left = Math.floor(windowWidth * view.left);
    var bottom = Math.floor(windowHeight * view.bottom);
    var width = Math.floor(windowWidth * view.width);
    var height = Math.floor(windowHeight * view.height);
    renderer.setViewport(left, bottom, width, height);
    renderer.setClearColor(view.background);

    camera_.aspect = width / height;
    camera_.updateProjectionMatrix();

    renderer.render(scene, camera_);
}
