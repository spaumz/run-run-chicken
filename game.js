const THREE = window.THREE;

// Game variables
let scene, camera, renderer, player;
let gameStarted = false;
let gameOver = false;
let gamePaused = false;
let troops = 1;
let score = 0;
let fusionRate = 1;
let multipliers = [];
let troopMeshes = [];
let targetPlayerX = 0;
let timeElapsed = 0;
let multiplierSpawnRate = 2;
let lastSpawnTime = 0;
let mouseCursor;
let roadSegments = [];
let waterLeft, waterRight;
let particles = [];
let enemies = [];
let bullets = [];
let powerUps = [];
let bosses = [];
let currentLevel = 1;
let isShooting = false;
let shootingCooldown = 0;
let isInvincible = false;
let invincibilityTime = 0;
let powerUpTime = 0;
let hasPowerUp = false;
let playerHealth = 100;

// Max troop visualization
const MAX_TROOPS_DISPLAYED = 30;

// Colors for evolved troops
const troopColors = [
    0xffcc00,  // Yellow - Level 1 (Chicken color)
    0xff9900,  // Orange - Level 2
    0xff6600,  // Dark Orange - Level 3
    0xff3300,  // Red-Orange - Level 4
    0xff0000   // Red - Level 5
];

// Get DOM elements
const gameContainer = document.getElementById("game-container");
const menu = document.getElementById("menu");
const startButton = document.getElementById("start-button");
const ui = document.getElementById("ui");
const gameOverScreen = document.getElementById("game-over");
const pauseScreenElement = document.getElementById("pause-screen");
const restartButton = document.getElementById("restart-button");
const controlsInfo = document.getElementById("controls-info");
const troopsCount = document.getElementById("troops-count");
const scoreCount = document.getElementById("score-count");
const fusionRateElement = document.getElementById("fusion-rate");
const finalScore = document.getElementById("final-score");
const finalFusionRate = document.getElementById("final-fusion-rate");
const healthBar = document.getElementById("health-bar");
const healthBarInner = document.getElementById("health-bar-inner");
const levelIndicator = document.getElementById("level-indicator");

// Set up event listeners
startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", restartGame);
window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);

// Initialize Three.js
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 50, 100); // Add fog for depth
    
    // Create camera - Adjusted to be more top-down
    camera = new THREE.PerspectiveCamera(
        85, 
        gameContainer.clientWidth / gameContainer.clientHeight, 
        0.1, 
        1000
    );
    camera.position.set(0, 18, 10); // Moved higher up for more top-down view
    camera.lookAt(0, 0, -20);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(gameContainer.clientWidth, gameContainer.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    gameContainer.appendChild(renderer.domElement);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 0);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -30;
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.bottom = -30;
    scene.add(directionalLight);
    
    // Add spotlight for dramatic effect
    const spotlight = new THREE.SpotLight(0xffffff, 1);
    spotlight.position.set(0, 30, 10);
    spotlight.angle = Math.PI / 6;
    spotlight.penumbra = 0.3;
    spotlight.castShadow = true;
    spotlight.shadow.mapSize.width = 1024;
    spotlight.shadow.mapSize.height = 1024;
    scene.add(spotlight);
    
    // Create water surfaces on both sides of the road
    createWaterSurfaces();
    
    // Create road segments (instead of a single bridge)
    createRoadSegments();
    
    // Create rails
    const leftRail = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 1.5, 100),
        new THREE.MeshPhongMaterial({ color: 0xcc3333 })
    );
    leftRail.position.set(-10, 0.75, -20); // Adjusted for wider road
    leftRail.castShadow = true;
    leftRail.receiveShadow = true;
    scene.add(leftRail);
    
    const rightRail = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 1.5, 100),
        new THREE.MeshPhongMaterial({ color: 0xcc3333 })
    );
    rightRail.position.set(10, 0.75, -20); // Adjusted for wider road
    rightRail.castShadow = true;
    rightRail.receiveShadow = true;
    scene.add(rightRail);
    
    // Create mouse cursor
    createMouseCursor();
    
    // Handle window resize
    window.addEventListener("resize", onWindowResize);
    
    // Add mouse controls
    gameContainer.addEventListener("mousemove", handleMouseMove);
    gameContainer.addEventListener("mousedown", startShooting);
    gameContainer.addEventListener("mouseup", stopShooting);
    gameContainer.addEventListener("touchstart", startShooting);
    gameContainer.addEventListener("touchend", stopShooting);
    
    // Add initial troop
    updateTroops();
    
    // Start animation loop
    animate();
}

// Create water surfaces with better reflection effect
function createWaterSurfaces() {
    const waterGeometry = new THREE.PlaneGeometry(100, 100, 20, 20);
    const waterMaterial = new THREE.MeshPhongMaterial({
        color: 0x0099ff,
        transparent: true,
        opacity: 0.8,
        specular: 0xffffff,
        shininess: 100
    });
    
    // Left water
    waterLeft = new THREE.Mesh(waterGeometry, waterMaterial);
    waterLeft.rotation.x = -Math.PI / 2;
    waterLeft.position.set(-60, -1, 0);
    waterLeft.receiveShadow = true;
    scene.add(waterLeft);
    
    // Right water
    waterRight = new THREE.Mesh(waterGeometry, waterMaterial);
    waterRight.rotation.x = -Math.PI / 2;
    waterRight.position.set(60, -1, 0);
    waterRight.receiveShadow = true;
    scene.add(waterRight);
    
    // Add some decorative objects in the water
    addWaterDecorations();
}

// Add decorative objects to the water
function addWaterDecorations() {
    // Add rocks
    for (let i = 0; i < 20; i++) {
        const rockSize = Math.random() * 2 + 1;
        const rockGeometry = new THREE.DodecahedronGeometry(rockSize, 1);
        const rockMaterial = new THREE.MeshPhongMaterial({
            color: 0x888888,
            flatShading: true
        });
        
        const rock = new THREE.Mesh(rockGeometry, rockMaterial);
        
        // Position randomly in water
        const side = Math.random() > 0.5 ? 1 : -1;
        rock.position.set(
            (side * 20) + (side * Math.random() * 30),
            rockSize / 2 - 1,
            Math.random() * 80 - 40
        );
        
        rock.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        
        rock.castShadow = true;
        rock.receiveShadow = true;
        scene.add(rock);
    }
}

// Create road segments for scrolling effect
function createRoadSegments() {
    // Create multiple road segments for scrolling
    const segmentLength = 20;
    const numSegments = 6;
    
    for (let i = 0; i < numSegments; i++) {
        // Create road segment
        const roadTexture = createRoadTexture();
        const roadMaterial = new THREE.MeshPhongMaterial({
            map: roadTexture,
            color: 0xaaaaaa,
            bumpMap: roadTexture,
            bumpScale: 0.1
        });
        
        const segment = new THREE.Mesh(
            new THREE.BoxGeometry(20, 0.5, segmentLength), // Wider road (3 lanes)
            roadMaterial
        );
        
        segment.position.set(0, -0.25, -20 + (i - numSegments/2) * segmentLength);
        segment.receiveShadow = true;
        scene.add(segment);
        roadSegments.push(segment);
    }
}

// Create road texture with lane markings
function createRoadTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    
    // Road background
    ctx.fillStyle = "#444444";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add asphalt texture
    ctx.fillStyle = "#3a3a3a";
    for (let i = 0; i < 5000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * 3 + 1;
        ctx.fillRect(x, y, size, size);
    }
    
    // Lane markings (3 lanes) - Make them wider and more visible
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 12; // Wider lanes
    ctx.setLineDash([40, 20]); // Longer dashes
    
    // Left lane divider
    ctx.beginPath();
    ctx.moveTo(canvas.width / 3, 0);
    ctx.lineTo(canvas.width / 3, canvas.height);
    ctx.stroke();
    
    // Right lane divider
    ctx.beginPath();
    ctx.moveTo(canvas.width * 2 / 3, 0);
    ctx.lineTo(canvas.width * 2 / 3, canvas.height);
    ctx.stroke();
    
    // Edge markings - solid white lines
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 10;
    ctx.setLineDash([]);
    
    // Left edge
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(10, canvas.height);
    ctx.stroke();
    
    // Right edge
    ctx.beginPath();
    ctx.moveTo(canvas.width - 10, 0);
    ctx.lineTo(canvas.width - 10, canvas.height);
    ctx.stroke();
    
    return new THREE.CanvasTexture(canvas);
}

// Create mouse cursor
function createMouseCursor() {
    const cursorGeometry = new THREE.RingGeometry(0.1, 0.2, 16);
    const cursorMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
    });
    mouseCursor = new THREE.Mesh(cursorGeometry, cursorMaterial);
    mouseCursor.rotation.x = Math.PI / 2;
    mouseCursor.position.set(0, 0.5, 5);
    scene.add(mouseCursor);
    
    // Add inner cursor
    const innerCursorGeometry = new THREE.CircleGeometry(0.05, 16);
    const innerCursorMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff0000,
        side: THREE.DoubleSide
    });
    const innerCursor = new THREE.Mesh(innerCursorGeometry, innerCursorMaterial);
    innerCursor.rotation.x = Math.PI / 2;
    innerCursor.position.z = 0.01;
    mouseCursor.add(innerCursor);
}

// Create text texture for door labels
function createTextTexture(text, backgroundColor, isPositive) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    
    const ctx = canvas.getContext("2d");
    
    // Background color
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add gradient effect
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.3)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.2)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add border
    ctx.lineWidth = 10;
    ctx.strokeStyle = "#ffffff";
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    
    // Text in white with shadow
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 140px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    
    // Add additional visual elements based on type
    if (isPositive) {
        // Add a glow or stars for positive effects
        for (let i = 0; i < 5; i++) {
            const starSize = 20;
            const starX = Math.random() * (canvas.width - starSize * 2) + starSize;
            const starY = Math.random() * (canvas.height - starSize * 2) + starSize;
            
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            for (let j = 0; j < 5; j++) {
                const angle = j * 2 * Math.PI / 5 - Math.PI / 2;
                const x = starX + Math.cos(angle) * starSize;
                const y = starY + Math.sin(angle) * starSize;
                if (j === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
                
                const innerAngle = (j * 2 * Math.PI / 5) + (Math.PI / 5) - Math.PI / 2;
                const innerX = starX + Math.cos(innerAngle) * (starSize / 2.5);
                const innerY = starY + Math.sin(innerAngle) * (starSize / 2.5);
                ctx.lineTo(innerX, innerY);
            }
            ctx.closePath();
            ctx.fill();
        }
    } else {
        // Add warning symbols for negative effects
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 5;
        
        for (let i = 0; i < 3; i++) {
            const x = 30 + i * 80;
            const y = canvas.height - 30;
            const size = 20;
            
            ctx.beginPath();
            ctx.moveTo(x, y - size);
            ctx.lineTo(x + size, y + size);
            ctx.lineTo(x - size, y + size);
            ctx.closePath();
            ctx.stroke();
            
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(x, y - size/2, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    return new THREE.CanvasTexture(canvas);
}

// Create a chicken based on level
function createTroopMesh(level = 0, position = { x: 0, z: 0 }) {
    const troopGroup = new THREE.Group();
    
    // Size increases with level
    const sizeMultiplier = 1 + (level * 0.25);
    
    // Chicken body (egg shape)
    const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.4 * sizeMultiplier, 16, 16),
        new THREE.MeshPhongMaterial({ 
            color: troopColors[level],
            shininess: 70
        })
    );
    body.scale.set(0.8, 1, 0.9);
    body.position.y = 0.4 * sizeMultiplier;
    body.castShadow = true;
    troopGroup.add(body);
    
    // Chicken head
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.25 * sizeMultiplier, 16, 16),
        new THREE.MeshPhongMaterial({ color: troopColors[level] })
    );
    head.position.set(0, 0.8 * sizeMultiplier, 0.3 * sizeMultiplier);
    head.castShadow = true;
    troopGroup.add(head);
    
    // Beak
    const beak = new THREE.Mesh(
        new THREE.ConeGeometry(0.1 * sizeMultiplier, 0.3 * sizeMultiplier, 8),
        new THREE.MeshPhongMaterial({ color: 0xffaa00 })
    );
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.8 * sizeMultiplier, 0.5 * sizeMultiplier);
    beak.castShadow = true;
    troopGroup.add(beak);
    
    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.05 * sizeMultiplier, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.12 * sizeMultiplier, 0.85 * sizeMultiplier, 0.4 * sizeMultiplier);
    troopGroup.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.12 * sizeMultiplier, 0.85 * sizeMultiplier, 0.4 * sizeMultiplier);
    troopGroup.add(rightEye);
    
    // Wings
    const wingGeometry = new THREE.BoxGeometry(0.4 * sizeMultiplier, 0.1 * sizeMultiplier, 0.3 * sizeMultiplier);
    wingGeometry.translate(0, 0, 0.15 * sizeMultiplier);
    const wingMaterial = new THREE.MeshPhongMaterial({ 
        color: troopColors[level],
        shininess: 40
    });
    
    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
    leftWing.position.set(-0.4 * sizeMultiplier, 0.4 * sizeMultiplier, 0);
    leftWing.rotation.y = -Math.PI / 6;
    leftWing.castShadow = true;
    troopGroup.add(leftWing);
    
    const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
    rightWing.position.set(0.4 * sizeMultiplier, 0.4 * sizeMultiplier, 0);
    rightWing.rotation.y = Math.PI / 6;
    rightWing.castShadow = true;
    troopGroup.add(rightWing);
    
    // Legs
    const legGeometry = new THREE.CylinderGeometry(0.03 * sizeMultiplier, 0.03 * sizeMultiplier, 0.3 * sizeMultiplier);
    const legMaterial = new THREE.MeshPhongMaterial({ color: 0xffaa00 });
    
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.15 * sizeMultiplier, 0.15 * sizeMultiplier, 0);
    troopGroup.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.15 * sizeMultiplier, 0.15 * sizeMultiplier, 0);
    troopGroup.add(rightLeg);
    
    // Comb for higher levels
    if (level > 0) {
        const comb = new THREE.Mesh(
            new THREE.BoxGeometry(0.1 * sizeMultiplier, 0.2 * sizeMultiplier, 0.1 * sizeMultiplier),
            new THREE.MeshPhongMaterial({ color: 0xff0000 })
        );
        comb.position.set(0, 1 * sizeMultiplier, 0.2 * sizeMultiplier);
        troopGroup.add(comb);
    }
    
    // Special accessories for higher levels
    if (level >= 3) {
        // Add a crown for level 3+
        const crown = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2 * sizeMultiplier, 0.25 * sizeMultiplier, 0.1 * sizeMultiplier, 8),
            new THREE.MeshPhongMaterial({ color: 0xffdd00, shininess: 100 })
        );
        crown.position.set(0, 1.1 * sizeMultiplier, 0.2 * sizeMultiplier);
        troopGroup.add(crown);
    }
    
    if (level >= 4) {
        // Add a cape for level 4+
        const cape = new THREE.Mesh(
            new THREE.PlaneGeometry(0.8 * sizeMultiplier, 0.7 * sizeMultiplier),
            new THREE.MeshPhongMaterial({ 
                color: 0xff5500,
                side: THREE.DoubleSide
            })
        );
        cape.position.set(0, 0.6 * sizeMultiplier, -0.3 * sizeMultiplier);
        cape.rotation.x = Math.PI / 8;
        troopGroup.add(cape);
        
        // Add weapons for highest level
        const weaponGeometry = new THREE.BoxGeometry(0.05 * sizeMultiplier, 0.05 * sizeMultiplier, 0.4 * sizeMultiplier);
        const weaponMaterial = new THREE.MeshPhongMaterial({ color: 0xaaaaaa, metalness: 0.8 });
        
        const weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
        weapon.position.set(0.2 * sizeMultiplier, 0.4 * sizeMultiplier, 0.3 * sizeMultiplier);
        troopGroup.add(weapon);
    }
    
    // Set position
    troopGroup.position.set(position.x, 0, position.z);
    troopGroup.level = level;
    
    // Add to scene
    scene.add(troopGroup);
    
    return troopGroup;
}

// Create enemy
function createEnemy(type = "basic", position = { x: 0, z: -50 }) {
    const enemyGroup = new THREE.Group();
    
    let color, size, health;
    
    switch (type) {
        case "advanced":
            color = 0xff0000;
            size = 1.2;
            health = 3;
            break;
        case "elite":
            color = 0x9900ff;
            size = 1.5;
            health = 5;
            break;
        default: // basic
            color = 0x666666;
            size = 1;
            health = 1;
    }
    
    // Enemy body
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(size, size, size),
        new THREE.MeshPhongMaterial({ 
            color: color,
            shininess: 50
        })
    );
    body.position.y = 0.5 * size;
    body.castShadow = true;
    enemyGroup.add(body);
    
    // Eye visor
    const visorGeometry = new THREE.BoxGeometry(size * 1.1, size * 0.2, size * 0.1);
    const visorMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x00aaff,
        emissive: 0x0044aa,
        shininess: 90,
        transparent: true,
        opacity: 0.9
    });
    
    const visor = new THREE.Mesh(visorGeometry, visorMaterial);
    visor.position.set(0, size * 0.6, size * 0.55);
    enemyGroup.add(visor);
    
    // Shoulder spikes for advanced enemies
    if (type !== "basic") {
        const spikeGeometry = new THREE.ConeGeometry(size * 0.2, size * 0.5, 4);
        const spikeMaterial = new THREE.MeshPhongMaterial({ color: 0xaaaaaa });
        
        const leftSpike = new THREE.Mesh(spikeGeometry, spikeMaterial);
        leftSpike.position.set(-size * 0.6, size * 0.8, 0);
        leftSpike.rotation.z = Math.PI / 4;
        enemyGroup.add(leftSpike);
        
        const rightSpike = new THREE.Mesh(spikeGeometry, spikeMaterial);
        rightSpike.position.set(size * 0.6, size * 0.8, 0);
        rightSpike.rotation.z = -Math.PI / 4;
        enemyGroup.add(rightSpike);
    }
    
    // Additional features for elite enemies
    if (type === "elite") {
        // Crown
        const crownGeometry = new THREE.CylinderGeometry(size * 0.3, size * 0.4, size * 0.2, 8);
        const crownMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xffcc00,
            metalness: 0.7,
            roughness: 0.3
        });
        
        const crown = new THREE.Mesh(crownGeometry, crownMaterial);
        crown.position.set(0, size * 1.2, 0);
        enemyGroup.add(crown);
        
        // Crown spikes
        for (let i = 0; i < 4; i++) {
            const spikeGeometry = new THREE.ConeGeometry(size * 0.1, size * 0.3, 4);
            const spike = new THREE.Mesh(spikeGeometry, crownMaterial);
            
            const angle = i * Math.PI / 2;
            spike.position.set(
                Math.cos(angle) * size * 0.35,
                size * 1.35,
                Math.sin(angle) * size * 0.35
            );
            spike.rotation.x = Math.PI / 2;
            enemyGroup.add(spike);
        }
    }
    
    // Set position
    enemyGroup.position.set(position.x, 0, position.z);
    
    // Add custom properties
    enemyGroup.health = health;
    enemyGroup.type = type;
    enemyGroup.value = type === "elite" ? 50 : (type === "advanced" ? 20 : 10);
    enemyGroup.speed = type === "elite" ? 0.12 : (type === "advanced" ? 0.15 : 0.18);
    
    // Add to scene and enemies array
    scene.add(enemyGroup);
    enemies.push(enemyGroup);
    
    return enemyGroup;
}

// Create boss
function createBoss(level = 1) {
    const bossGroup = new THREE.Group();
    
    // Boss size and health based on level
    const size = 2.5 + (level * 0.5);
    const health = 20 + (level * 10);
    
    // Boss body
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(size * 1.2, size, size * 1.5),
        new THREE.MeshPhongMaterial({ 
            color: 0x990000,
            shininess: 70
        })
    );
    body.position.y = size / 2;
    body.castShadow = true;
    bossGroup.add(body);
    
    // Boss head
    const head = new THREE.Mesh(
        new THREE.BoxGeometry(size * 0.8, size * 0.8, size * 0.8),
        new THREE.MeshPhongMaterial({ 
            color: 0xaa0000,
            shininess: 70
        })
    );
    head.position.set(0, size * 1.1, size * 0.4);
    head.castShadow = true;
    bossGroup.add(head);
    
    // Horns
    const hornGeometry = new THREE.ConeGeometry(size * 0.2, size * 0.6, 8);
    const hornMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x666666,
        metalness: 0.7
    });
    
    const leftHorn = new THREE.Mesh(hornGeometry, hornMaterial);
    leftHorn.position.set(-size * 0.4, size * 1.5, size * 0.2);
    leftHorn.rotation.x = -Math.PI / 6;
    leftHorn.rotation.z = -Math.PI / 6;
    bossGroup.add(rightHorn);
        // Health bar above boss
    const healthBarGeometry = new THREE.BoxGeometry(size * 2, size * 0.2, size * 0.1);
    const healthBarMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    
    const healthBar = new THREE.Mesh(healthBarGeometry, healthBarMaterial);
    healthBar.position.set(0, size * 2, 0);
    bossGroup.add(healthBar);
    bossGroup.healthBar = healthBar;
    
    // Set position
    bossGroup.position.set(0, 0, -60);
    
    // Add custom properties
    bossGroup.health = health;
    bossGroup.maxHealth = health;
    bossGroup.level = level;
    bossGroup.value = 100 * level;
    bossGroup.speed = 0.08;
    bossGroup.shootingInterval = 2000 - (level * 300); // ms
    bossGroup.lastShot = 0;
    
    // Add to scene and bosses array
    scene.add(bossGroup);
    bosses.push(bossGroup);
    
    return bossGroup;
}

// Create particle effect for collisions
function createParticleEffect(position, color, type = "default") {
    let particleCount = 15;
    const particleGroup = new THREE.Group();
    
    // Different particle effects based on type
    if (type === "explosion") {
        particleCount = 30;
    } else if (type === "powerup") {
        particleCount = 20;
    }
    
    for (let i = 0; i < particleCount; i++) {
        let geometry;
        
        // Different particle shapes for different effects
        if (type === "explosion") {
            // Random shapes for explosion
            const shapes = [
                new THREE.SphereGeometry(0.1 + Math.random() * 0.2, 8, 8),
                new THREE.BoxGeometry(0.1 + Math.random() * 0.2, 0.1 + Math.random() * 0.2, 0.1 + Math.random() * 0.2),
                new THREE.TetrahedronGeometry(0.1 + Math.random() * 0.2)
            ];
            geometry = shapes[Math.floor(Math.random() * shapes.length)];
        } else if (type === "powerup") {
            // Stars or sparkles for powerups
            geometry = new THREE.OctahedronGeometry(0.1 + Math.random() * 0.15);
        } else {
            // Default spheres
            geometry = new THREE.SphereGeometry(0.05 + Math.random() * 0.1, 8, 8);
        }
        
        // Material with glow for special effects
        let material;
        if (type === "powerup") {
            material = new THREE.MeshBasicMaterial({ 
                color: color,
                transparent: true,
                opacity: 0.8
            });
        } else {
            material = new THREE.MeshBasicMaterial({ color: color });
        }
        
        const particle = new THREE.Mesh(geometry, material);
        
        // Random position offset
        const angle = Math.random() * Math.PI * 2;
        let radius;
        
        if (type === "explosion") {
            radius = 0.2 + Math.random() * 1.0; // Wider explosion
        } else {
            radius = 0.2 + Math.random() * 0.5;
        }
        
        particle.position.set(
            Math.cos(angle) * radius,
            0.5 + Math.random() * 1,
            Math.sin(angle) * radius
        );
        
        // Random velocity - different for different effects
        if (type === "explosion") {
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.4,
                0.1 + Math.random() * 0.3,
                (Math.random() - 0.5) * 0.4
            );
        } else if (type === "powerup") {
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.15,
                0.15 + Math.random() * 0.25,
                (Math.random() - 0.5) * 0.15
            );
        } else {
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                0.1 + Math.random() * 0.2,
                (Math.random() - 0.5) * 0.2
            );
        }
        
        // Life time in frames - different for different effects
        if (type === "explosion") {
            particle.life = 40 + Math.floor(Math.random() * 30);
        } else if (type === "powerup") {
            particle.life = 50 + Math.floor(Math.random() * 30);
        } else {
            particle.life = 30 + Math.floor(Math.random() * 20);
        }
        
        particle.maxLife = particle.life;
        particle.type = type;
        
        particleGroup.add(particle);
    }
    
    particleGroup.position.copy(position);
    scene.add(particleGroup);
    particles.push(particleGroup);
    
    return particleGroup;
}

// Update particles
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particleGroup = particles[i];
        let allDead = true;
        
        for (let j = 0; j < particleGroup.children.length; j++) {
            const particle = particleGroup.children[j];
            
            // Update position
            particle.position.add(particle.velocity);
            
            // Apply gravity - different for different types
            if (particle.type === "powerup") {
                // Slower falling for power-up particles
                particle.velocity.y -= 0.005;
                
                // Add some wobble
                particle.rotation.x += 0.05;
                particle.rotation.y += 0.05;
                particle.rotation.z += 0.05;
            } else if (particle.type === "explosion") {
                // Stronger gravity for explosion
                particle.velocity.y -= 0.015;
                
                // Add rotation
                particle.rotation.x += 0.1;
                particle.rotation.y += 0.1;
                particle.rotation.z += 0.1;
            } else {
                // Default gravity
                particle.velocity.y -= 0.01;
                
                // Slight rotation
                particle.rotation.y += 0.02;
            }
            
            // Update life
            particle.life--;
            
            // Fade out
            if (particle.material) {
                particle.material.opacity = particle.life / particle.maxLife;
                particle.material.transparent = true;
                
                // Color shift for power-up particles
                if (particle.type === "powerup") {
                    // Shift hue
                    const hue = (timeElapsed * 0.1 + j * 0.1) % 1;
                    particle.material.color.setHSL(hue, 1, 0.5);
                }
                
                // Scale down as they die
                const scale = particle.life / particle.maxLife;
                particle.scale.set(scale, scale, scale);
            }
            
            if (particle.life > 0) {
                allDead = false;
            }
        }
        
        // Remove dead particle group
        if (allDead) {
            scene.remove(particleGroup);
            particles.splice(i, 1);
        }
    }
}

// Create door multiplier
function createMultiplier() {
    // Define multiplier types
    const types = [
        { op: "+", color: 0x00cc44, min: 1, max: 5 },  // Addition (green)
        { op: "-", color: 0xcc0000, min: 1, max: 3 },  // Subtraction (red)
        { op: "×", color: 0x00aaff, min: 2, max: 5 },  // Multiplication (blue)
        { op: "÷", color: 0xffcc00, min: 2, max: 3 }   // Division (yellow)
    ];
    
    // Randomly select type
    const typeIndex = Math.floor(Math.random() * types.length);
    const type = types[typeIndex];
    
    // Generate value
    const value = Math.floor(Math.random() * (type.max - type.min + 1)) + type.min;
    
    // Create door group
    const doorGroup = new THREE.Group();
    
    // Get color hex as string
    const colorHex = "#" + type.color.toString(16).padStart(6, "0");
    const isPositive = (type.op === "+" || type.op === "×");
    
    // Create an outline frame first
    const outlineGeometry = new THREE.BoxGeometry(4.2, 6.2, 0.6);
    const outlineMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9
    });
    const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
    outline.position.y = 3;
    outline.castShadow = true;
    doorGroup.add(outline);
    
    // Main door frame
    const frameGeometry = new THREE.BoxGeometry(4, 6, 0.5);
    const frameMaterial = new THREE.MeshPhongMaterial({ 
        color: type.color,
        transparent: true,
        opacity: 0.9,
        shininess: 90
    });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.y = 3;
    frame.castShadow = true;
    doorGroup.add(frame);
    
    // Door opening - slightly transparent
    const openingGeometry = new THREE.BoxGeometry(3.5, 5.5, 0.6);
    const openingMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x000000,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    const opening = new THREE.Mesh(openingGeometry, openingMaterial);
    opening.position.y = 3;
    opening.position.z = 0.1;
    doorGroup.add(opening);
    
    // Create sign with multiplier text
    const textTexture = createTextTexture(type.op + value, colorHex, isPositive);
    const signMaterial = new THREE.MeshBasicMaterial({
        map: textTexture,
        transparent: true,
        opacity: 0.95
    });
    
    const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(3, 3),
        signMaterial
    );
    sign.position.set(0, 3, 0.3);
    doorGroup.add(sign);
    
    // Add a glow effect around the door
    const glowGeometry = new THREE.TorusGeometry(2.5, 0.15, 16, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.7
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.set(0, 3, 0.3);
    glow.rotation.x = Math.PI / 2;
    doorGroup.add(glow);
    
    // Add another inner glow with the door's color
    const innerGlowGeometry = new THREE.TorusGeometry(2.3, 0.1, 16, 32);
    const innerGlowMaterial = new THREE.MeshBasicMaterial({
        color: type.color,
        transparent: true,
        opacity: 0.8
    });
    const innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
    innerGlow.position.set(0, 3, 0.35);
    innerGlow.rotation.x = Math.PI / 2;
    doorGroup.add(innerGlow);
    
    // Set random position on x-axis (wider range for 3-lane road)
    const x = Math.random() * 16 - 8; // Between -8 and 8
    doorGroup.position.set(x, 0, -60);
    
    // Add to scene and multipliers array
    scene.add(doorGroup);
    
    // Different effects based on operator
    let effect;
    if (type.op === "+") {
        effect = t => t + value;
    } else if (type.op === "-") {
        effect = t => Math.max(0, t - value);
    } else if (type.op === "×") {
        effect = t => t * value;
    } else if (type.op === "÷") {
        effect = t => Math.max(1, Math.floor(t / value));
    }
    
    // Store multiplier info
    multipliers.push({
        mesh: doorGroup,
        type: type.op,
        value: value,
        effect: effect,
        color: type.color
    });
    
    return doorGroup;
}

// Create a power-up barrel
function createPowerUp() {
    const powerUpGroup = new THREE.Group();
    
    // Define power-up types
    const types = [
        { type: "invincibility", color: 0xffdd00, duration: 8 },      // Gold - invincibility
        { type: "firepower", color: 0xff5500, duration: 10 },         // Orange - increased fire rate
        { type: "health", color: 0x00cc44, duration: 0 },             // Green - health restore
        { type: "troops", color: 0x00aaff, duration: 0 }              // Blue - troops boost
    ];
    
    // Random select type
    const typeIndex = Math.floor(Math.random() * types.length);
    const powerUpType = types[typeIndex];
    
    // Barrel base
    const barrelGeometry = new THREE.CylinderGeometry(1, 1, 1.5, 16);
    const barrelMaterial = new THREE.MeshPhongMaterial({
        color: 0x885522,
        shininess: 40
    });
    
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.rotation.x = Math.PI / 2;
    barrel.castShadow = true;
    powerUpGroup.add(barrel);
    
    // Barrel metal bands
    const bandGeometry = new THREE.TorusGeometry(1.02, 0.1, 8, 20);
    const bandMaterial = new THREE.MeshPhongMaterial({
        color: 0x444444,
        metalness: 0.7,
        shininess: 80
    });
    
    // Add 3 metal bands
    for (let i = 0; i < 3; i++) {
        const band = new THREE.Mesh(bandGeometry, bandMaterial);
        band.rotation.x = Math.PI / 2;
        band.position.z = -0.5 + i * 0.5;
        powerUpGroup.add(band);
    }
    
    // Power-up icon/symbol
    const iconGeometry = new THREE.BoxGeometry(0.6, 0.6, 0.1);
    const iconMaterial = new THREE.MeshPhongMaterial({
        color: powerUpType.color,
        emissive: powerUpType.color,
        emissiveIntensity: 0.5,
        shininess: 100
    });
    
    const icon = new THREE.Mesh(iconGeometry, iconMaterial);
    icon.position.y = 0.8;
    powerUpGroup.add(icon);
    
    // Add specific symbols based on power-up type
    if (powerUpType.type === "invincibility") {
        // Shield symbol
        const shieldGeometry = new THREE.CircleGeometry(0.25, 16);
        const shield = new THREE.Mesh(shieldGeometry, new THREE.MeshBasicMaterial({ color: 0xffffff }));
        shield.position.set(0, 0.8, 0.35);
        powerUpGroup.add(shield);
    } else if (powerUpType.type === "firepower") {
        // Fire symbol
        const fireGeometry = new THREE.ConeGeometry(0.2, 0.4, 8);
        const fire = new THREE.Mesh(fireGeometry, new THREE.MeshBasicMaterial({ color: 0xffffff }));
        fire.position.set(0, 0.8, 0.35);
        powerUpGroup.add(fire);
    }
    
    // Set random position on x-axis
    const x = Math.random() * 16 - 8; // Between -8 and 8
    powerUpGroup.position.set(x, 0.75, -60);
    
    // Add to scene and power-ups array
    scene.add(powerUpGroup);
    
    // Store power-up info
    powerUps.push({
        mesh: powerUpGroup,
        type: powerUpType.type,
        color: powerUpType.color,
        duration: powerUpType.duration
    });
    
    return powerUpGroup;
}

// Create a bullet
function createBullet(position, direction = new THREE.Vector3(0, 0, -1), type = "normal") {
    const bulletGroup = new THREE.Group();
    
    let bulletGeometry, bulletMaterial;
    let speed, damage, size;
    
    // Different bullet types
    if (type === "boss") {
        // Boss bullets are larger and red
        bulletGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        bulletMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.5
        });
        speed = 0.4;
        damage = 20;
        size = 0.3;
    } else if (type === "powered") {
        // Powered-up bullets are larger and golden
        bulletGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        bulletMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffcc00,
            emissive: 0xffcc00,
            emissiveIntensity: 0.7
        });
        speed = 0.6;
        damage = 3;
        size = 0.2;
    } else {
        // Normal bullets are small and yellow
        bulletGeometry = new THREE.SphereGeometry(0.15, 8, 8);
        bulletMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffcc00
        });
        speed = 0.5;
        damage = 1;
        size = 0.15;
    }
    
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    bulletGroup.add(bullet);
    
    // Add trail effect for bullets
    const trailGeometry = new THREE.CylinderGeometry(0.05, size, 0.5, 8);
    const trailMaterial = new THREE.MeshBasicMaterial({
        color: bulletMaterial.color,
        transparent: true,
        opacity: 0.6
    });
    
    const trail = new THREE.Mesh(trailGeometry, trailMaterial);
    trail.rotation.x = Math.PI / 2;
    trail.position.z = 0.3;
    bulletGroup.add(trail);
    
    // Set position and direction
    bulletGroup.position.copy(position);
    bulletGroup.lookAt(position.clone().add(direction));
    
    // Add custom properties
    bulletGroup.velocity = direction.normalize().multiplyScalar(speed);
    bulletGroup.damage = damage;
    bulletGroup.type = type;
    bulletGroup.life = 100; // Bullets disappear after some distance
    
    // Add to scene and bullets array
    scene.add(bulletGroup);
    bullets.push(bulletGroup);
    
    return bulletGroup;
}

// Shoot function
function shoot() {
    if (!player || gameOver || gamePaused) return;
    
    // Create bullet position slightly in front of player
    const bulletPosition = new THREE.Vector3(
        player.position.x,
        player.position.y + 0.5,
        player.position.z - 1
    );
    
    // Create bullet
    const bulletType = hasPowerUp && powerUpTime > 0 ? "powered" : "normal";
    createBullet(bulletPosition, new THREE.Vector3(0, 0, -1), bulletType);
}

// Boss shoot function
function bossShoot(boss) {
    if (gameOver || gamePaused) return;
    
    // Number of bullets based on boss level
    const bulletCount = boss.level;
    const size = 2.5 + (boss.level * 0.5); // Boss size for reference
    
    // Shoot pattern based on boss level
    if (boss.level === 1) {
        // Single bullet straight ahead
        const bulletPosition = new THREE.Vector3(
            boss.position.x,
            boss.position.y + size / 2,
            boss.position.z + 2
        );
        createBullet(bulletPosition, new THREE.Vector3(0, 0, 1), "boss");
    } else if (boss.level === 2) {
        // Three bullets in a spread
        for (let i = 0; i < 3; i++) {
            const angle = (i - 1) * Math.PI / 8; // -22.5, 0, 22.5 degrees
            const direction = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
            
            const bulletPosition = new THREE.Vector3(
                boss.position.x + Math.sin(angle) * 1.5,
                boss.position.y + 1.5,
                boss.position.z + 2
            );
            createBullet(bulletPosition, direction, "boss");
        }
    } else {
        // Circle of bullets
        for (let i = 0; i < 8; i++) {
            const angle = i * Math.PI / 4; // 0, 45, 90, 135, 180, 225, 270, 315 degrees
            const direction = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
            
            const bulletPosition = new THREE.Vector3(
                boss.position.x + Math.sin(angle) * 2,
                boss.position.y + 1.5,
                boss.position.z + Math.cos(angle) * 2
            );
            createBullet(bulletPosition, direction, "boss");
        }
    }
}

// Start/stop shooting
function startShooting() {
    isShooting = true;
}

function stopShooting() {
    isShooting = false;
}

// Update troops visualization
function updateTroops() {
    // Remove all existing troops
    for (let i = 0; i < troopMeshes.length; i++) {
        scene.remove(troopMeshes[i]);
    }
    troopMeshes = [];
    
    // Reset player
    player = null;
    
    // Count how many troops of each level we need
    let remainingTroops = troops;
    let troopCounts = [0, 0, 0, 0, 0]; // Level 1-5
    
    // Calculate troop distribution using fusion rate
    while (remainingTroops > 0) {
        if (remainingTroops >= 100 * fusionRate) {
            troopCounts[4]++;
            remainingTroops -= 100 * fusionRate;
        } else if (remainingTroops >= 50 * fusionRate) {
            troopCounts[3]++;
            remainingTroops -= 50 * fusionRate;
        } else if (remainingTroops >= 10 * fusionRate) {
            troopCounts[2]++;
            remainingTroops -= 10 * fusionRate;
        } else if (remainingTroops >= 5 * fusionRate) {
            troopCounts[1]++;
            remainingTroops -= 5 * fusionRate;
        } else {
            // Always have at least one basic troop
            troopCounts[0] = Math.max(1, Math.min(remainingTroops, 5)); 
            remainingTroops = 0;
        }
        
        // Limit total visualized troops
        if (troopMeshes.length + troopCounts.reduce((a, b) => a + b, 0) > MAX_TROOPS_DISPLAYED) {
            break;
        }
    }
    
    // Create troops of each level in formation
    let xPos = -6;
    let zPos = 0;
    
    // Create highest level troops first (bigger ones in back)
    for (let level = 4; level >= 0; level--) {
        const count = troopCounts[level];
        for (let i = 0; i < count && troopMeshes.length < MAX_TROOPS_DISPLAYED; i++) {
            const troop = createTroopMesh(level, { x: xPos, z: zPos });
            troopMeshes.push(troop);
            
            // Set the first troop as player
            if (!player) player = troop;
            
            // Update position for next troop
            xPos += 1.5;
            if (xPos > 6) {
                xPos = -6;
                zPos -= 1.5;
            }
        }
    }
    
    // If no troops were created, create at least one
    if (troopMeshes.length === 0) {
        const troop = createTroopMesh(0, { x: 0, z: 0 });
        troopMeshes.push(troop);
        player = troop;
    }
}

// Window resize handler
function onWindowResize() {
    camera.aspect = gameContainer.clientWidth / gameContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(gameContainer.clientWidth, gameContainer.clientHeight);
}

// Mouse controls
function handleMouseMove(event) {
    if (gamePaused) return;
    
    // Calculate mouse position relative to container
    const rect = gameContainer.getBoundingClientRect();
    const mouseX = ((event.clientX - rect.left) / gameContainer.clientWidth) * 2 - 1;
    
    // Convert to world coordinates (wider range for 3-lane road)
    targetPlayerX = mouseX * 8;
    
    // Update cursor position
    if (mouseCursor) {
        mouseCursor.position.x = targetPlayerX;
    }
}

// Keyboard controls for pause and shooting
function handleKeyDown(event) {
    // Handle pause toggle with "P" key
    if (event.key === "p" || event.key === "P") {
        if (gameStarted && !gameOver) {
            gamePaused = !gamePaused;
            pauseScreenElement.style.display = gamePaused ? "block" : "none";
        }
    }
    
    // Handle shooting with space
    if (event.key === " " || event.key === "Space") {
        startShooting();
    }
}

// Key up handler for stopping shooting
function handleKeyUp(event) {
    if (event.key === " " || event.key === "Space") {
        stopShooting();
    }
}

// Start game
function startGame() {
    gameStarted = true;
    menu.style.display = "none";
    ui.style.display = "block";
    controlsInfo.style.display = "block";
    
    // Show health container and level indicator
    document.getElementById("health-container").style.display = "block";
    document.getElementById("level-container").style.display = "block";
    
    updateUI();
}

// Restart game
function restartGame() {
    // Reset game state
    gameOver = false;
    gamePaused = false;
    troops = 1;
    score = 0;
    fusionRate = 1;
    timeElapsed = 0;
    lastSpawnTime = 0;
    targetPlayerX = 0;
    playerHealth = 100;
    isInvincible = false;
    invincibilityTime = 0;
    hasPowerUp = false;
    powerUpTime = 0;
    
    // Remove all multipliers
    for (let i = 0; i < multipliers.length; i++) {
        scene.remove(multipliers[i].mesh);
    }
    multipliers = [];
    
    // Remove all particles
    for (let i = 0; i < particles.length; i++) {
        scene.remove(particles[i]);
    }
    particles = [];
    
    // Remove all enemies
    for (let i = 0; i < enemies.length; i++) {
        scene.remove(enemies[i]);
    }
    enemies = [];
    
    // Remove all bosses
    for (let i = 0; i < bosses.length; i++) {
        scene.remove(bosses[i]);
    }
    bosses = [];
    
    // Remove all bullets
    for (let i = 0; i < bullets.length; i++) {
        scene.remove(bullets[i]);
    }
    bullets = [];
    
    // Remove all power-ups
    for (let i = 0; i < powerUps.length; i++) {
        scene.remove(powerUps[i].mesh);
    }
    powerUps = [];
    
    // Reset troops
    updateTroops();
    
    // Hide game over, show UI
    gameOverScreen.style.display = "none";
    pauseScreenElement.style.display = "none";
    ui.style.display = "block";
    controlsInfo.style.display = "block";
    document.getElementById("health-container").style.display = "block";
    document.getElementById("level-container").style.display = "block";
    
    updateUI();
}

// Update UI
function updateUI() {
    troopsCount.textContent = troops;
    scoreCount.textContent = score;
    fusionRateElement.textContent = fusionRate;
    finalScore.textContent = score;
    finalFusionRate.textContent = fusionRate;
    
    // Update health bar
    if (healthBarInner) {
        healthBarInner.style.width = playerHealth + "%";
        document.getElementById("health-value").textContent = playerHealth + "%";
        
        // Change color based on health
        if (playerHealth > 60) {
            healthBarInner.style.backgroundColor = "#4CAF50"; // Green
        } else if (playerHealth > 30) {
            healthBarInner.style.backgroundColor = "#ffcc00"; // Yellow
        } else {
            healthBarInner.style.backgroundColor = "#f44336"; // Red
        }
    }
    
    // Update level indicator
    if (levelIndicator) {
        levelIndicator.textContent = currentLevel;
    }
}

// Check for game over
function checkGameOver() {
    if (troops <= 0 || playerHealth <= 0) {
        gameOver = true;
        ui.style.display = "none";
        controlsInfo.style.display = "none";
        document.getElementById("health-container").style.display = "none";
        document.getElementById("level-container").style.display = "none";
        gameOverScreen.style.display = "block";
        updateUI();
    }
}

// Animation loop
function animate(time) {
    requestAnimationFrame(animate);
    
    // Skip updates if paused
    if (gamePaused) {
        renderer.render(scene, camera);
        return;
    }
    
    if (gameStarted && !gameOver) {
        // Convert time to seconds
        const now = time ? time * 0.001 : 0;
        const deltaTime = now - timeElapsed;
        timeElapsed = now;
        
        // Smooth player movement (lerp)
        if (player) {
            // Gradually move towards target position
            player.position.x += (targetPlayerX - player.position.x) * 0.05;
            
            // Limit position (wider limits for wider road)
            player.position.x = Math.max(-9, Math.min(9, player.position.x));
            
            // Move all troops to follow the leader in formation
            for (let i = 1; i < troopMeshes.length; i++) {
                const troop = troopMeshes[i];
                
                // Calculate positions in a grid pattern
                const row = Math.floor(i / 5);
                const col = i % 5;
                
                // Position offset from leader
                const offsetX = (col - 2) * 1.5;
                const offsetZ = -row * 1.5;
                
                // Target position
                const targetX = player.position.x + offsetX;
                const targetZ = player.position.z + offsetZ;
                
                // Smoother movement for followers
                troop.position.x += (targetX - troop.position.x) * 0.05;
                troop.position.z += (targetZ - troop.position.z) * 0.05;
                
                // Add chicken waddle animation
                troop.position.y = Math.sin(now * 8 + i) * 0.1;
                
                // Wing flapping for random chickens
                if (troop.children[5]) { // Left wing
                    troop.children[5].rotation.z = Math.sin(now * 10 + i) * 0.2;
                }
                if (troop.children[6]) { // Right wing
                    troop.children[6].rotation.z = -Math.sin(now * 10 + i) * 0.2;
                }
            }
            
            // Add chicken waddle animation to leader too
            player.position.y = Math.sin(now * 8) * 0.1;
            
            // Wing flapping for leader
            if (player.children[5]) { // Left wing
                player.children[5].rotation.z = Math.sin(now * 10) * 0.2;
            }
            if (player.children[6]) { // Right wing
                player.children[6].rotation.z = -Math.sin(now * 10) * 0.2;
            }
        }
        
        // Spawn multipliers
        if (now - lastSpawnTime > multiplierSpawnRate) {
            lastSpawnTime = now;
            
            // Randomize what to spawn
            const spawnType = Math.random();
            
            if (spawnType < 0.7) {
                // 70% chance to spawn multiplier
                createMultiplier();
            } else if (spawnType < 0.9) {
                // 20% chance to spawn enemy
                const enemyType = Math.random() < 0.3 ? "advanced" : "basic";
                const x = Math.random() * 16 - 8; // Between -8 and 8
                createEnemy(enemyType, { x, z: -60 });
            } else {
                // 10% chance to spawn power-up
                createPowerUp();
            }
            
            // Increase spawn rate with score
            multiplierSpawnRate = Math.max(0.8, 2 - (score / 1000));
        }
        
        // Update multipliers
        for (let i = multipliers.length - 1; i >= 0; i--) {
            const multiplier = multipliers[i];
            
            // Move multiplier towards player
            multiplier.mesh.position.z += 0.2;
            
            // Check for collision with player
            if (player && multiplier.mesh.position.z > -1 && multiplier.mesh.position.z < 1 &&
                Math.abs(multiplier.mesh.position.x - player.position.x) < 2) {
                
                // Apply multiplier effect
                const oldTroops = troops;
                troops = multiplier.effect(troops);
                
                // Add score based on the effect
                if (troops > oldTroops) {
                    // Bonus for positive gain
                    score += (troops - oldTroops) * 10;
                    
                    // Increase fusion rate on significant troop gain
                    if (troops > oldTroops * 2 && troops > 50) {
                        fusionRate = Math.min(fusionRate + 1, 10);
                    }
                    
                    // Positive effect particles
                    createParticleEffect(multiplier.mesh.position, 0x00ff00, "powerup");
                } else {
                    // Some points even for negative multipliers
                    score += 5;
                    
                    // Negative effect particles
                    createParticleEffect(multiplier.mesh.position, 0xff0000, "default");
                }
                
                // Update troops visualization
                updateTroops();
                
                // Remove multiplier
                scene.remove(multiplier.mesh);
                multipliers.splice(i, 1);
                
                updateUI();
                checkGameOver();
            }
            // Remove if passed player
            else if (multiplier.mesh.position.z > 10) {
                scene.remove(multiplier.mesh);
                multipliers.splice(i, 1);
            }
        }
        
        // Update enemies
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            
            // Move enemy towards player
            enemy.position.z += enemy.speed;
            
            // Add movement variation
            if (enemy.type === "advanced" || enemy.type === "elite") {
                // Side-to-side movement for advanced enemies
                enemy.position.x = enemy.position.x + Math.sin(now * 2) * 0.02;
            }
            
            // Check for collision with player
            if (player && enemy.position.z > -1 && enemy.position.z < 1 &&
                Math.abs(enemy.position.x - player.position.x) < 2) {
                
                // Damage player based on enemy type
                if (!isInvincible) {
                    if (enemy.type === "elite") {
                        playerHealth -= 30;
                    } else if (enemy.type === "advanced") {
                        playerHealth -= 15;
                    } else {
                        playerHealth -= 10;
                    }
                    
                    // Cap health at 0
                    playerHealth = Math.max(0, playerHealth);
                    
                    // Update UI
                    updateUI();
                    
                    // Check for game over
                    checkGameOver();
                }
                
                // Create explosion
                createParticleEffect(enemy.position, 0xff9900, "explosion");
                
                // Remove enemy
                scene.remove(enemy);
                enemies.splice(i, 1);
            }
            // Remove if passed player
            else if (enemy.position.z > 10) {
                scene.remove(enemy);
                enemies.splice(i, 1);
            }
        }
        
        // Update power-ups
        for (let i = powerUps.length - 1; i >= 0; i--) {
            const powerUp = powerUps[i];
            
            // Move power-up towards player
            powerUp.mesh.position.z += 0.2;
            
            // Rotate power-up
            powerUp.mesh.rotation.y += 0.02;
            
            // Bob up and down
            powerUp.mesh.position.y = 0.75 + Math.sin(now * 3) * 0.2;
            
            // Check for collision with player
            if (player && powerUp.mesh.position.z > -1 && powerUp.mesh.position.z < 1 &&
                Math.abs(powerUp.mesh.position.x - player.position.x) < 2) {
                
                // Apply power-up effect
                if (powerUp.type === "invincibility") {
                    isInvincible = true;
                    invincibilityTime = powerUp.duration;
                    hasPowerUp = true;
                    powerUpTime = powerUp.duration;
                } else if (powerUp.type === "firepower") {
                    hasPowerUp = true;
                    powerUpTime = powerUp.duration;
                } else if (powerUp.type === "health") {
                    playerHealth = Math.min(100, playerHealth + 30);
                    updateUI();
                } else if (powerUp.type === "troops") {
                    troops += 10;
                    updateTroops();
                    updateUI();
                }
                
                // Create effect
                createParticleEffect(powerUp.mesh.position, powerUp.color, "powerup");
                
                // Remove power-up
                scene.remove(powerUp.mesh);
                powerUps.splice(i, 1);
            }
            // Remove if passed player
            else if (powerUp.mesh.position.z > 10) {
                scene.remove(powerUp.mesh);
                powerUps.splice(i, 1);
            }
        }
        
        // Update bullets
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            
            // Move bullet
            bullet.position.add(bullet.velocity);
            
            // Update bullet life
            bullet.life--;
            
            // Check for collisions with enemies
            for (let j = enemies.length - 1; j >= 0; j--) {
                const enemy = enemies[j];
                
                // Check distance
                const distance = bullet.position.distanceTo(enemy.position);
                
                if (distance < 1) {
                    // Damage enemy
                    enemy.health -= bullet.damage;
                    
                    // Check if enemy is defeated
                    if (enemy.health <= 0) {
                        // Add score based on enemy type
                        score += enemy.value;
                        updateUI();
                        
                        // Create explosion
                        createParticleEffect(enemy.position, 0xff9900, "explosion");
                        
                        // Remove enemy
                        scene.remove(enemy);
                        enemies.splice(j, 1);
                    } else {
                        // Hit effect
                        createParticleEffect(enemy.position, 0xff9900, "default");
                    }
                    
                    // Remove bullet
                    scene.remove(bullet);
                    bullets.splice(i, 1);
                    break; // Break out of enemy loop since bullet is gone
                }
            }
            
            // Check for collisions with bosses (if still in scene)
            if (bullet && bullet.life > 0) {
                for (let j = bosses.length - 1; j >= 0; j--) {
                    const boss = bosses[j];
                    
                    // Check distance (larger collision for boss)
                    const distance = bullet.position.distanceTo(boss.position);
                    
                    if (distance < 3) {
                        // Damage boss
                        boss.health -= bullet.damage;
                        
                        // Update boss health bar
                        boss.healthBar.scale.x = boss.health / boss.maxHealth;
                        
                        // Check if boss is defeated
                        if (boss.health <= 0) {
                            // Add score
                            score += boss.value;
                            updateUI();
                            
                            // Create explosion
                            createParticleEffect(boss.position, 0xff9900, "explosion");
                            createParticleEffect(
                                new THREE.Vector3(boss.position.x + 1, boss.position.y, boss.position.z),
                                0xff0000,
                                "explosion"
                            );
                            createParticleEffect(
                                new THREE.Vector3(boss.position.x - 1, boss.position.y, boss.position.z),
                                0xff3300,
                                "explosion"
                            );
                            
                            // Remove boss
                            scene.remove(boss);
                            bosses.splice(j, 1);
                            
                            // Level up when boss is defeated
                            currentLevel++;
                            levelIndicator.textContent = currentLevel;
                        } else {
                            // Hit effect
                            createParticleEffect(bullet.position, 0xff9900, "default");
                        }
                        
                        // Remove bullet
                        scene.remove(bullet);
                        bullets.splice(i, 1);
                        break; // Break out of boss loop since bullet is gone
                    }
                }
            }
            
            // Remove bullet if expired or out of scene
            if (bullet && (bullet.life <= 0 || bullet.position.z < -100 || bullet.position.z > 100)) {
                scene.remove(bullet);
                bullets.splice(i, 1);
            }
        }
        
        // Handle shooting
        if (isShooting) {
            if (shootingCooldown <= 0) {
                shoot();
                shootingCooldown = hasPowerUp ? 5 : 10; // Faster shooting with power-up
            } else {
                shootingCooldown--;
            }
        }
        
        // Update invincibility
        if (isInvincible) {
            invincibilityTime -= deltaTime;
            
            // Flash player when invincible
            if (player) {
                const flashRate = Math.sin(now * 10) * 0.5 + 0.5;
                for (const child of player.children) {
                    if (child.material) {
                        child.material.transparent = true;
                        child.material.opacity = 0.5 + flashRate * 0.5;
                    }
                }
            }
            
            // End invincibility
            if (invincibilityTime <= 0) {
                isInvincible = false;
                
                // Reset opacity
                if (player) {
                    for (const child of player.children) {
                        if (child.material) {
                            child.material.transparent = false;
                            child.material.opacity = 1.0;
                        }
                    }
                }
            }
        }
        
        // Update power-up time
        if (hasPowerUp) {
            powerUpTime -= deltaTime;
            if (powerUpTime <= 0) {
                hasPowerUp = false;
            }
        }
        
        // Boss shooting
        for (let i = 0; i < bosses.length; i++) {
            const boss = bosses[i];
            if (now - boss.lastShot > boss.shootingInterval / 1000) {
                bossShoot(boss);
                boss.lastShot = now;
            }
        }
        
        // Update mouse cursor
        if (mouseCursor) {
            mouseCursor.position.z = 5;
            mouseCursor.rotation.z += 0.01;
        }
        
        // Scroll road segments for endless runner effect
        for (let i = 0; i < roadSegments.length; i++) {
            const segment = roadSegments[i];
            segment.position.z += 0.2;
            
            // If segment has moved past the camera, move it to the back
            if (segment.position.z > 30) {
                segment.position.z -= roadSegments.length * 20;
            }
        }
        
        // Add water animation
        if (waterLeft && waterRight) {
            waterLeft.position.z = player ? player.position.z : 0;
            waterRight.position.z = player ? player.position.z : 0;
            
            // Add wave effect to water
            const waterWave = Math.sin(now) * 0.2;
            waterLeft.position.y = -1 + waterWave;
            waterRight.position.y = -1 + waterWave;
        }
        
        // Update particles
        updateParticles();
    }
    
    renderer.render(scene, camera);
}

// Initialize everything when the page loads
window.addEventListener("load", init);
