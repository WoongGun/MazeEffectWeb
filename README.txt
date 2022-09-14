What:

Maze effect is a dungeon crawling 3d adventure game.  Pick up torches to navigate the maze, and stay in the light to protect your self.  Listen carefully to find out how close they are, they can sneak up behind you.

3d objects: The 3d maze is procedurally generated series of cube walls on a flat floor under flat ceiling, with random placement of enemies and maze features such as torches and the exit.  The monsters are also randomly created, i.e. different head size, body shape, ear size/placement, eye size placement, colors.  

3d camera and interactivity: The controls are done with keyboard and mouse, with mouse look feature that allows pointer lock.  Since the game is first person, the controls therefore also control the camera.

Lighting and shading: The lighting is crucial to gameplay as it controls enemy behaviour and allows the player to progress.  The enemies have emissive eyes that allows the player to spot them in the dark, and pixel based shading allows realisting lighting.

Picking: raycasting is used to click to pick up objects (torches), and context sensitive messages based on what's under the mouse cursor.

Texturing: The walls and floors are textures and normal mapped.  The normal maps were created using photoshop, the wall textures are public open license images. (http://www.textures.com/)

On screen control panel:  A canvas is used to show the fps, average fps, time taken, score, and other messages.

Gameplay:  The player must pick up torches and to traverse the maze the find the exit.  Monsters roam the maze and are attracted to the heat from the fire and the player and will chase the player but are also repelled by direct light (raycast unobscured).  The bright torch can be placed on the ground to strategically block monsters in hallways, and fading torches can be stokes by picking up other fading torches.  Encountering monsters (seeing them close up), upgrading torches, and travering more of the maze increases your score.

Advanced features:
Collision detection and sliding is used to allow character to hit walls and slide along them.  Monsters will also collide with walls.
Monster audio based on distance

Normal maps are used for the walls and floors.

The map is made up on procedurally generated models, including mae creation and monster creation.

How:
The first person controls with the camera a child of the player character model.  When the player is moved, the camera moves with it as well.  Mouse look is implemented by using pointer lock.

The procedurally generated 3d maze map is based on a 2d array of bytes, 0's for floors and 1's for walls in a backtracking generator based on prim's algorithm.  The 2d array is populated with walls, and starting with a origin point the generator checks each direction to find a movement candidate (if within map and not connecting to an open space), and a random candidate direction is chosen and moved, making the path in to floors.  Every predetermined number of steps, a monster, torch, or room (3x3 space) will be placed.  The last space traversed is turned in to the exit.  The backtracking maze generator walks backwards if it gets to a dead end and branches out to another candidate direction.  Each dead end is stored as as a vect2 in an array, and chosen randomly to be an exit.

The monster models are procedurally generated as well, the body, eye, head, ear models have randomized sizes.  They are placed based on their relative sizes to make sure they line up best even when the random sizes are extreme.  The color is also randomized by multiplying hexcode with a random number.  The monsters are stored in an array and referred to by index numbers, and also tracked this way to see which monsters were encountered for scoring purposes.

The collision system uses several approximations for frame rate purposes.  The character and monsters use the same collision proxy to measure collision.  The wall collision it self is handled by getting the position of the actor, getting the map coordinate that they are in, and checking if that map coordinate is a wall.  The sliding is implemented simply by checking movement in x and y direction in world coordinates (since all the walls are at right angle) and moving in the direction of no collision that is also the player direction.  Monster to monster collision is done in a similar way of measuring the distance between them under a certain limit.  This system is very fast and takes advantage of inherent properties of the map.

The picker is based on the three.js example implementation, but adapted to only select torches.  The torches are generated seaprately and stored in an array, it contains their unique geo and position so they can be manipulated separately.  When the cursor's ndc is over the object and is the first item intersected, it becomes "highlighted" (made emissive), and can be interacted with.  when another object is selected, the item returns to its old color.

The monster behaviour is based on distances and raycasting.  If they are within a certain range of the character, they become active.  When active they will pursue the closest bright torch or player, but if they can draw a line to a torch (raycast), they will stay away from it.  This way they will follow the character, and have emergent behaviour such as waiting around corners and pushing against eachother to move forward.


How to:
w: move character forward
s: move character backward
a: strafe to the left
d: strafe to the right
shift: toggle careful slow movement

mouse click: pick up torch if they are close enough, upgrade fading torch with another fading torch.
e: pick up torch if they are close enough, upgrade fading torch with another fading torch, drop a torch.

mouse drag: look around
m: activate mouselook, allow looking around with mouse without click drag.  deactivate mouselook if mouselooking, may need to press esc after to get cursor back on some browsers.

space: restart game if the game is over.

Guide - 
Monsters: monsters will chase you, but if they see a light they will step back.  They are also attracted to the heat from the torch and will be distracted by them if you drop it.  You can use the torch to manipulate the monsters and move them around.  You can tell how close they are by listening to their breathing.  Be ware of turning away, they will sneak up on your if you aren't looking.

The bright torch: the first torch you see will be a bright torch.  It has a strong light radius and can allow you to see far and repel monsters the same.  It can be dropped to stop monsters, such as locking them behind a hallway.

Fading torch: throughout the dungeon you will see fading torches.  They are not as strong, with a short range that monsters are less afraid of.  Dropped fading torches do not repel monsters, they are too weak.  They can be upgraded to bright torches by stoking the fire with another fading torch.  This will fade an existing bright torch in the map.

The exit: You can't miss it, it glows yellow.  Sometimes the exit will be easy to find, use this as an opportunity to increase your score by exploring the map knowing where you can go back to if you need to exit.

Sources:

color picker: http://www.w3schools.com/colors/colors_picker.asp

java script reference: http://www.w3schools.com/jsref/

three.js reference: http://threejs.org


Features 
http://www.isaacsukin.com/news/2012/06/how-build-first-person-shooter-browser-threejs-and-webglhtml5-canvas
http://threejs.org/docs/#Reference/Core/Raycaster
https://en.wikipedia.org/wiki/Maze_generation_algorithm