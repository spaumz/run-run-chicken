// Import Three.js
import * as THREE from "https://unpkg.com/three@0.157.0/build/three.module.js";

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
let effectsToUpdate = [];

// Max troop visualization - Increased as requested
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

// Set up event listeners
startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", restartGame);
window.addEventListener("keydown", handleKeyDown);

// Initialize Three.js
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    
    // Create camera - Vue plus plongeante
camera = new THREE.PerspectiveCamera(
    80,  // Angle légèrement réduit pour un meilleur zoom
    gameContainer.clientWidth / gameContainer.clientHeight, 
    0.1, 
    1000
);
camera.position.set(0, 18, 5); // Position plus proche de la route (z réduit)
camera.lookAt(0, 0, -10);     // Point de focus plus proche
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(gameContainer.clientWidth, gameContainer.clientHeight);
    gameContainer.appendChild(renderer.domElement);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 0);
    scene.add(directionalLight);
    
    // Create water surfaces on both sides of the road
    createWaterSurfaces();
    
    // Create road segments (instead of a single bridge)
    createRoadSegments();
    
    // Create rails
    const leftRail = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 1.5, 100),
        new THREE.MeshPhongMaterial({ color: 0xcc3333 })
    );
    leftRail.position.set(-12, 0.75, -20);
    scene.add(leftRail);
    
    const rightRail = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 1.5, 100),
        new THREE.MeshPhongMaterial({ color: 0xcc3333 })
    );
    rightRail.position.set(12, 0.75, -20);
    scene.add(rightRail);
    
    // Create mouse cursor
    createMouseCursor();
    
    // Handle window resize
    window.addEventListener("resize", onWindowResize);
    
    // Add mouse controls
    gameContainer.addEventListener("mousemove", handleMouseMove);
    
    // Add initial troop
    updateTroops();
    
    // Start animation loop
    animate();
}

// Create water surfaces
function createWaterSurfaces() {
    const waterGeometry = new THREE.PlaneGeometry(100, 100);
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
    scene.add(waterLeft);
    
    // Right water
    waterRight = new THREE.Mesh(waterGeometry, waterMaterial);
    waterRight.rotation.x = -Math.PI / 2;
    waterRight.position.set(60, -1, 0);
    scene.add(waterRight);
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
            color: 0xaaaaaa
        });
        
        const segment = new THREE.Mesh(
    new THREE.BoxGeometry(24, 0.5, segmentLength),
    roadMaterial
);
        
        segment.position.set(0, -0.25, -20 + (i - numSegments/2) * segmentLength);
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
    ctx.fillStyle = "#555555";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Lane markings (3 lanes) avec marquages plus longs
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 8; // Ligne plus épaisse (était 5)
    ctx.setLineDash([40, 20]); // Marquages plus longs (était [20, 20])
    
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
    
    // Ajout de marquages au centre de chaque voie pour plus de détail
    ctx.setLineDash([10, 50]); // Marquages courts
    ctx.lineWidth = 4; // Ligne plus fine
    
    // Marquage centre voie gauche
    ctx.beginPath();
    ctx.moveTo(canvas.width / 6, 0);
    ctx.lineTo(canvas.width / 6, canvas.height);
    ctx.stroke();
    
    // Marquage centre voie centrale
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    
    // Marquage centre voie droite
    ctx.beginPath();
    ctx.moveTo(canvas.width * 5 / 6, 0);
    ctx.lineTo(canvas.width * 5 / 6, canvas.height);
    ctx.stroke();
    
    return new THREE.CanvasTexture(canvas);
}

// Create mouse cursor
function createMouseCursor() {
    const cursorGeometry = new THREE.RingGeometry(0.1, 0.2, 16);
    const cursorMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffffff,
        side: THREE.DoubleSide
    });
    mouseCursor = new THREE.Mesh(cursorGeometry, cursorMaterial);
    mouseCursor.rotation.x = Math.PI / 2;
    mouseCursor.position.set(0, 0.5, 5);
    scene.add(mouseCursor);
}

// Create text texture for door labels - Updated to match the reference image
function createTextTexture(text, backgroundColor, isPositive) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    
    const ctx = canvas.getContext("2d");
    
    // Background color (blue for multiplication, etc.)
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
    troopGroup.add(body);
    
    // Chicken head
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.25 * sizeMultiplier, 16, 16),
        new THREE.MeshPhongMaterial({ color: troopColors[level] })
    );
    head.position.set(0, 0.8 * sizeMultiplier, 0.3 * sizeMultiplier);
    troopGroup.add(head);
    
    // Beak
    const beak = new THREE.Mesh(
        new THREE.ConeGeometry(0.1 * sizeMultiplier, 0.3 * sizeMultiplier, 8),
        new THREE.MeshPhongMaterial({ color: 0xffaa00 })
    );
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.8 * sizeMultiplier, 0.5 * sizeMultiplier);
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
    troopGroup.add(leftWing);
    
    const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
    rightWing.position.set(0.4 * sizeMultiplier, 0.4 * sizeMultiplier, 0);
    rightWing.rotation.y = Math.PI / 6;
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
    
    // Set position
    troopGroup.position.set(position.x, 0, position.z);
    troopGroup.level = level;
    
    // Add to scene
    scene.add(troopGroup);
    
    return troopGroup;
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

// Create multiplier door - Final version with transparent halo only
function createMultiplier() {
    // Define multiplier types with more vibrant colors
    const types = [
        { op: "+", color: 0x00ddff, min: 1, max: 5, positive: true },  // Brighter blue for addition
        { op: "-", color: 0xff2222, min: 1, max: 10, positive: false }, // Vibrant red for subtraction
        { op: "×", color: 0x00ddff, min: 2, max: 5, positive: true },  // Brighter blue for multiplication
        { op: "÷", color: 0xff2222, min: 2, max: 3, positive: false }  // Vibrant red for division
    ];
    
    // Randomly select type
    const typeIndex = Math.floor(Math.random() * types.length);
    const type = types[typeIndex];
    
    // Generate value
    const value = Math.floor(Math.random() * (type.max - type.min + 1)) + type.min;
    
    // Create door group
    const doorGroup = new THREE.Group();
    
    // Create just the transparent halo (no pillars) with more vibrant color
    const haloGeometry = new THREE.PlaneGeometry(8, 6); // Less wide as requested
    const haloMaterial = new THREE.MeshBasicMaterial({
        color: type.color,
        transparent: true,
        opacity: 0.4, // Slightly more opaque for more vibrant look
        side: THREE.DoubleSide
    });
    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    halo.position.set(0, 4, 0);
    doorGroup.add(halo);
    
    // Add a brighter glowing edge to the halo
    const edgeGeometry = new THREE.EdgesGeometry(haloGeometry);
    const edgeMaterial = new THREE.LineBasicMaterial({
        color: type.color,
        linewidth: 3, // Thicker line for more visibility
        transparent: true,
        opacity: 0.9 // More visible
    });
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    edges.position.set(0, 4, 0.05);
    doorGroup.add(edges);
    
    // Create text for the multiplier value
    const valueText = document.createElement("canvas");
    valueText.width = 512;
    valueText.height = 512;
    const ctx = valueText.getContext("2d");
    
    // Clear canvas
    ctx.clearRect(0, 0, valueText.width, valueText.height);
    
    // Make the text more vibrant and prominent
    // Draw the value text with enhanced glow effects
    // First create a glow effect
    ctx.shadowColor = type.positive ? "rgba(0, 200, 255, 0.8)" : "rgba(255, 50, 50, 0.8)";
    ctx.shadowBlur = 25; // Increased blur for more glow
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Draw text in pure white for maximum contrast
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 300px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Format the text to match the reference (e.g., "-8" or "+5")
    const displayText = type.op + value;
    
    // Draw the text multiple times for stronger glow effect
    for (let i = 0; i < 3; i++) {
        ctx.shadowBlur = 15 + i * 10;
        ctx.fillText(displayText, valueText.width / 2, valueText.height / 2);
    }
    
    // Final text layer without shadow for crisp edges
    ctx.shadowBlur = 0;
    ctx.fillText(displayText, valueText.width / 2, valueText.height / 2);
    
    const textTexture = new THREE.CanvasTexture(valueText);
    const textMaterial = new THREE.MeshBasicMaterial({
        map: textTexture,
        transparent: true,
        depthWrite: false
    });
    
    const textPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(7, 5), // Proportional to the halo
        textMaterial
    );
    textPlane.position.set(0, 4, 0.2);
    doorGroup.add(textPlane);
    
    // Enhanced glowing effect around the halo - more vibrant
    const glowGeometry = new THREE.TorusGeometry(4.2, 0.3, 16, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: type.color,
        transparent: true,
        opacity: 0.7 // Brighter glow
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.set(0, 4, 0.1);
    glow.rotation.x = Math.PI / 2;
    doorGroup.add(glow);
    
    // Add an outer glow for more dramatic effect
    const outerGlowGeometry = new THREE.TorusGeometry(4.5, 0.2, 16, 32);
    const outerGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5
    });
    const outerGlow = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
    outerGlow.position.set(0, 4, 0.12);
    outerGlow.rotation.x = Math.PI / 2;
    doorGroup.add(outerGlow);
    
    // Add particle effect for more visual impact
    const particleCount = 50;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        // Position particles in a circular pattern around the halo
        const angle = Math.random() * Math.PI * 2;
        const radius = 3.8 + Math.random() * 1.5;
        particlePositions[i3] = Math.cos(angle) * radius;
        particlePositions[i3 + 1] = 4 + (Math.random() * 2 - 1) * 2.5; // y position around center
        particlePositions[i3 + 2] = Math.sin(angle) * radius * 0.2; // slight depth
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        color: type.color,
        size: 0.1,
        transparent: true,
        opacity: 0.7
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    doorGroup.add(particles);
    
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
    
    // Store multiplier info with the object for animation
    multipliers.push({
        mesh: doorGroup,
        type: type.op,
        value: value,
        effect: effect,
        color: type.color,
        positive: type.positive,
        particles: particles,
        outerGlow: outerGlow,
        glow: glow,
        createTime: Date.now()
    });
    
    return doorGroup;
}

// Function for portal entry effect
function createPortalEntryEffect(x, z, color) {
    // Create particles bursting outward
    const particleCount = 100;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleVelocities = [];
    
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        // Start particles at player position
        particlePositions[i3] = x;
        particlePositions[i3 + 1] = 0.5 + Math.random();
        particlePositions[i3 + 2] = z;
        
        // Random velocity in all directions
        particleVelocities.push({
            x: (Math.random() - 0.5) * 0.4,
            y: Math.random() * 0.2,
            z: (Math.random() - 0.5) * 0.4
        });
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        color: color,
        size: 0.2,
        transparent: true,
        opacity: 0.8
    });
    
    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);
    
    // Create animation for the particles
    const particleAnimation = {
        system: particleSystem,
        geometry: particleGeometry,
        velocities: particleVelocities,
        life: 60,  // Frames to live
        update: function() {
            const positions = this.geometry.attributes.position.array;
            
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                const vel = this.velocities[i];
                
                // Update position with velocity
                positions[i3] += vel.x;
                positions[i3 + 1] += vel.y;
                positions[i3 + 2] += vel.z;
                
                // Add gravity effect
                vel.y -= 0.01;
            }
            
            this.geometry.attributes.position.needsUpdate = true;
            
            // Fade out
            this.system.material.opacity = this.life / 60;
            
            // Decrease life
            this.life--;
            
            // Remove when done
            if (this.life <= 0) {
                scene.remove(this.system);
                return false;
            }
            
            return true;
        }
    };
    
    // Add to array of effects to update
    effectsToUpdate.push(particleAnimation);
    
    return particleAnimation;
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
    targetPlayerX = mouseX * 10;
    
    // Update cursor position
    if (mouseCursor) {
        mouseCursor.position.x = targetPlayerX;
    }
}

// Keyboard controls for pause
function handleKeyDown(event) {
    // Handle pause toggle with "P" key
    if (event.key === "p" || event.key === "P") {
        if (gameStarted && !gameOver) {
            gamePaused = !gamePaused;
            pauseScreenElement.style.display = gamePaused ? "block" : "none";
        }
    }
}

// Start game
function startGame() {
    gameStarted = true;
    menu.style.display = "none";
    ui.style.display = "block";
    controlsInfo.style.display = "block";
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
    
    // Remove all multipliers
    for (let i = 0; i < multipliers.length; i++) {
        scene.remove(multipliers[i].mesh);
    }
    multipliers = [];
    
    // Reset troops
    updateTroops();
    
    // Hide game over, show UI
    gameOverScreen.style.display = "none";
    pauseScreenElement.style.display = "none";
    ui.style.display = "block";
    controlsInfo.style.display = "block";
    
    updateUI();
}

// Update UI
function updateUI() {
    troopsCount.textContent = troops;
    scoreCount.textContent = score;
    fusionRateElement.textContent = fusionRate;
    finalScore.textContent = score;
    finalFusionRate.textContent = fusionRate;
}

// Check for game over
function checkGameOver() {
    if (troops <= 0 && !gameOver) {
        gameOver = true;
        ui.style.display = "none";
        controlsInfo.style.display = "none";
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
        const now = time * 0.001;
        const deltaTime = now - timeElapsed;
        timeElapsed = now;
        
        // Smooth player movement (lerp)
        if (player) {
            // Gradually move towards target position
            player.position.x += (targetPlayerX - player.position.x) * 0.05;
            
            // Limit position (wider limits for wider road)
            player.position.x = Math.max(-11, Math.min(11, player.position.x)); 
            
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
            createMultiplier();
            
            // Increase spawn rate with score
            multiplierSpawnRate = Math.max(0.8, 2 - (score / 1000));
        }
        
        // Update multipliers
        for (let i = multipliers.length - 1; i >= 0; i--) {
            const multiplier = multipliers[i];
            
            // Move multiplier towards player
            multiplier.mesh.position.z += 0.2;
            
            // Animate portal elements
            if (multiplier.glow) {
                // Pulse the glow
                const pulseSpeed = 0.003;
                const elapsedTime = (Date.now() - multiplier.createTime) * pulseSpeed;
                const pulseFactor = 0.2 * Math.sin(elapsedTime) + 1;
                
                multiplier.glow.scale.set(pulseFactor, pulseFactor, 1);
                
                // Make outer glow rotate
                if (multiplier.outerGlow) {
                    multiplier.outerGlow.rotation.z += 0.01;
                }
            }
            
            // Animate particles if they exist
            if (multiplier.particles) {
                // Make particles slowly rotate
                multiplier.particles.rotation.z += 0.005;
            }
            
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
                } else {
                    // Some points even for negative multipliers
                    score += 5;
                }
                
                // Update troops visualization
                updateTroops();
                
                // Add visual effect for entering portal
                createPortalEntryEffect(player.position.x, player.position.z, multiplier.color);
                
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
        
        // Update visual effects
        for (let i = effectsToUpdate.length - 1; i >= 0; i--) {
            const stillAlive = effectsToUpdate[i].update();
            if (!stillAlive) {
                effectsToUpdate.splice(i, 1);
            }
        }
    }
    
    renderer.render(scene, camera);
}

// Initialize everything
init();
