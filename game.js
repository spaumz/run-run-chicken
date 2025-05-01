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
    bossGroup.add(leftHorn);
    
    const rightHorn = new THREE.Mesh(hornGeometry, hornMaterial);
    rightHorn.position.set(size * 0.4, size * 1.5, size * 0.2);
    rightHorn.rotation.x = -Math.PI / 6;
    rightHorn.rotation.z = Math.PI / 6;
    bossGroup.add(rightHorn);
    
    // Eyes (glowing)
    const eyeGeometry = new THREE.SphereGeometry(size * 0.15, 16, 16);
    const eyeMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 1,
        shininess: 100
    });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-size * 0.25, size * 1.2, size * 0.7);
    bossGroup.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(size * 0.25, size * 1.2, size * 0.7);
    bossGroup.add(rightEye);
    
    // Jaw/Mouth
    const jawGeometry = new THREE.BoxGeometry(size * 0.7, size * 0.3, size * 0.6);
    const jawMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x990000,
        shininess: 50
    });
    
    const jaw = new THREE.Mesh(jawGeometry, jawMaterial);
    jaw.position.set(0, size * 0.8, size * 0.5);
    bossGroup.add(jaw);
    
    // Teeth
    const teethGeometry = new THREE.BoxGeometry(size * 0.1, size * 0.1, size * 0.1);
    const teethMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xeeeeee,
        shininess: 100
    });
    
    for (let i = 0; i < 5; i++) {
        const tooth = new THREE.Mesh(teethGeometry, teethMaterial);
        tooth.position.set(
            (i - 2) * size * 0.15,
            size * 0.95,
            size * 0.8
        );
        bossGroup.add(tooth);
    }
    
    // Armor plates
    const plateGeometry = new THREE.BoxGeometry(size * 0.4, size * 0.4, size * 0.1);
    const plateMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x333333,
        metalness: 0.8,
        shininess: 90
    });
    
    // Add plates to chest
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 2; j++) {
            const plate = new THREE.Mesh(plateGeometry, plateMaterial);
            plate.position.set(
                (j === 0 ? -1 : 1) * size * 0.3,
                size * 0.5 - i * size * 0.4,
                size * 0.8
            );
            bossGroup.add(plate);
        }
    }
    
    // Add special features based on boss level
    if (level >= 2) {
        // Shoulder spikes
        const spikeGeometry = new THREE.ConeGeometry(size * 0.2, size * 0.7, 6);
        const spikeMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x880000,
            shininess: 70
        });
        
        const leftSpike = new THREE.Mesh(spikeGeometry, spikeMaterial);
        leftSpike.position.set(-size * 0.7, size * 0.8, 0);
        leftSpike.rotation.z = Math.PI / 3;
        bossGroup.add(leftSpike);
        
        const rightSpike = new THREE.Mesh(spikeGeometry, spikeMaterial);
        rightSpike.position.set(size * 0.7, size * 0.8, 0);
        rightSpike.rotation.z = -Math.PI / 3;
        bossGroup.add(rightSpike);
    }
    
    if (level >= 3) {
        // Back spikes
        for (let i = 0; i < 4; i++) {
            const spikeGeometry = new THREE.ConeGeometry(size * 0.15, size * 0.5, 6);
            const spike = new THREE.Mesh(spikeGeometry, hornMaterial);
            
            spike.position.set(
                (i % 2 === 0 ? -1 : 1) * size * 0.3,
                size * 0.7 - Math.floor(i/2) * size * 0.4,
                -size * 0.5
            );
            spike.rotation.x = Math.PI / 2;
            bossGroup.add(spike);
        }
        
        // Weapon
        const weaponGeometry = new THREE.BoxGeometry(size * 0.2, size * 0.2, size * 2);
        const weaponMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x444444,
            metalness: 0.9,
            shininess: 100
        });
        
        const weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
        weapon.position.set(size * 0.8, 0, 0);
        bossGroup.add(weapon);
        
        // Weapon blade
        const bladeGeometry = new THREE.ConeGeometry(size * 0.4, size * 0.8, 4);
        const bladeMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xaaaaaa,
            metalness: 0.9,
            shininess: 100
        });
        
        const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
        blade.position.set(size * 0.8, 0, size * 1.4);
        blade.rotation.x = Math.PI / 2;
        bossGroup.add(blade);
    }
    
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
