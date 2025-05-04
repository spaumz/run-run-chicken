// Import Three.js
import * as THREE from "https://unpkg.com/three@0.157.0/build/three.module.js";

// Game variables
let scene, camera, renderer, player;
let gameStarted = false;
let gameOver = false;
let gamePaused = false;
let troops = 1;
let fusionRate = 1;
let multipliers = [];
let troopMeshes = [];
let targetPlayerX = 0;
let timeElapsed = 0;
let lastSpawnTime = 0;
let portalSpawnRate = 2;
let mouseCursor;
let spaceTrack = [];
let galaxyBg;
let particleSystems = [];
let starField;
let sunLight;
let effectsToUpdate = [];
let spaceDust = [];

// Max troop visualization
const MAX_TROOPS_DISPLAYED = 40;

// Colors for evolved troops - vibrant cosmic colors
const troopColors = [
    0x00ffff, // Cyan - Level 1
    0x00ff80, // Teal - Level 2
    0x80ff00, // Lime - Level 3
    0xffff00, // Yellow - Level 4
    0xff8000, // Orange - Level 5
    0xff0080, // Magenta - Level 6
    0xff00ff, // Fuchsia - Level 7
    0x8000ff, // Purple - Level 8
    0x0080ff, // Azure - Level 9
    0x00ffff  // Cyan - Level 10 (highest)
];

// Materials library for cosmic elements
const materials = {
    cosmic: new THREE.MeshPhongMaterial({
        color: 0x3366ff,
        emissive: 0x111133,
        shininess: 100,
        transparent: true,
        opacity: 0.9
    }),
    energy: new THREE.MeshPhongMaterial({
        color: 0x00ffff,
        emissive: 0x00aaff,
        shininess: 100,
        transparent: true,
        opacity: 0.8
    }),
    star: new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8
    }),
    trail: new THREE.MeshBasicMaterial({
        color: 0x8080ff,
        transparent: true,
        opacity: 0.5
    }),
    portal: {
        positive: new THREE.MeshPhongMaterial({
            color: 0x00ffff,
            emissive: 0x0088ff,
            shininess: 100,
            transparent: true,
            opacity: 0.7
        }),
        negative: new THREE.MeshPhongMaterial({
            color: 0xff3366,
            emissive: 0xaa2244,
            shininess: 100,
            transparent: true,
            opacity: 0.7
        })
    }
};

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
const fusionRateElement = document.getElementById("fusion-rate");
const finalScore = document.getElementById("final-score");
const finalFusionRate = document.getElementById("final-fusion-rate");
const loadingProgress = document.getElementById("loading-progress");

// Sound effects
let audioContext;
let audioBuffers = {};
let audioInitialized = false;

// Set up event listeners
startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", restartGame);
window.addEventListener("keydown", handleKeyDown);

// MAIN INITIALIZATION
init();

// Initialize Three.js
function init() {
    updateLoadingProgress(10);
    
    // Create scene
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000033, 0.001);
    
    updateLoadingProgress(20);
    
    // Create camera with wide field of view for cosmic perspective
    camera = new THREE.PerspectiveCamera(
        75,
        gameContainer.clientWidth / gameContainer.clientHeight,
        0.1,
        2000
    );
    camera.position.set(0, 15, 10);
    camera.lookAt(0, 0, -20);
    
    updateLoadingProgress(30);
    
    // Create renderer with enhanced settings
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(gameContainer.clientWidth, gameContainer.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    gameContainer.appendChild(renderer.domElement);
    
    updateLoadingProgress(40);
    
    // Create cosmic lighting
    createLighting();
    
    updateLoadingProgress(50);
    
    // Create galactic environment
    createGalacticEnvironment();
    
    updateLoadingProgress(60);
    
    // Create space track
    createSpaceTrack();
    
    updateLoadingProgress(70);
    
    // Create mouse cursor
    createMouseCursor();
    
    updateLoadingProgress(80);
    
    // Initialize audio
    initAudio();
    
    updateLoadingProgress(90);
    
    // Handle window resize
    window.addEventListener("resize", onWindowResize);
    
    // Add mouse controls
    gameContainer.addEventListener("mousemove", handleMouseMove);
    
    // Add initial troop
    updateTroops();
    
    updateLoadingProgress(100);
    
    // Start animation loop
    animate();
    
    // Set game as initialized
    window.gameInitialized = true;
}

// Update loading progress
function updateLoadingProgress(progress) {
    if (loadingProgress) {
        loadingProgress.style.width = progress + '%';
    }
}

// Initialize audio context and load sounds
function initAudio() {
    try {
        // Create audio context
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Define sounds to load
        const sounds = {
            portal_positive: 'https://assets.codepen.io/21542/portal-positive.mp3',
            portal_negative: 'https://assets.codepen.io/21542/portal-negative.mp3',
            ambient: 'https://assets.codepen.io/21542/space-ambient.mp3'
        };
        
        // Load each sound
        Object.entries(sounds).forEach(([name, url]) => {
            loadSound(url, name);
        });
        
        audioInitialized = true;
    } catch (e) {
        console.error('Audio initialization failed:', e);
    }
}

// Load a sound file
function loadSound(url, name) {
    // Use fetch to get sound data
    fetch(url)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => {
            // Decode audio data
            audioContext.decodeAudioData(arrayBuffer, 
                buffer => {
                    audioBuffers[name] = buffer;
                },
                error => console.error('Error decoding audio', error)
            );
        })
        .catch(error => {
            console.error('Error loading sound:', error);
        });
}

// Play sound with optional parameters
function playSound(name, options = {}) {
    if (!audioInitialized || !audioBuffers[name]) return;
    
    try {
        // Create source
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffers[name];
        
        // Create gain node for volume control
        const gainNode = audioContext.createGain();
        gainNode.gain.value = options.volume || 0.5;
        
        // Connect nodes
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Set loop if needed
        if (options.loop) {
            source.loop = true;
        }
        
        // Play sound
        source.start(0);
        
        return { source, gainNode };
    } catch (e) {
        console.error('Error playing sound:', e);
        return null;
    }
}

// Create cosmic lighting
function createLighting() {
    // Ambient light for overall scene illumination
    const ambientLight = new THREE.AmbientLight(0x111133, 0.2);
    scene.add(ambientLight);
    
    // Main directional light (sun-like)
    sunLight = new THREE.DirectionalLight(0xffffdd, 1.0);
    sunLight.position.set(-50, 80, -50);
    sunLight.castShadow = true;
    
    // Configure shadow properties
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 200;
    sunLight.shadow.camera.left = -50;
    sunLight.shadow.camera.right = 50;
    sunLight.shadow.camera.top = 50;
    sunLight.shadow.camera.bottom = -50;
    sunLight.shadow.bias = -0.0005;
    
    scene.add(sunLight);
    
    // Add point lights for energy portals
    const blueLight = new THREE.PointLight(0x00aaff, 1, 100);
    blueLight.position.set(30, 20, -40);
    scene.add(blueLight);
    
    const purpleLight = new THREE.PointLight(0x8800ff, 1, 100);
    purpleLight.position.set(-30, 15, -60);
    scene.add(purpleLight);
}

// Create galactic environment with stars and nebulae
function createGalacticEnvironment() {
    // Create starfield background
    createStarfield();
    
    // Create distant galaxies
    createGalaxies();
    
    // Create nebula clouds
    createNebulaClouds();
    
    // Create space dust particles
    createSpaceDust();
}

// Create star field with thousands of stars
function createStarfield() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true
    });
    
    // Create stars (more stars and farther away for immersion)
    const starsCount = 5000;
    const starsPositions = new Float32Array(starsCount * 3);
    const starsSizes = new Float32Array(starsCount);
    
    for (let i = 0; i < starsCount; i++) {
        const i3 = i * 3;
        // Position stars in a large sphere around the scene
        const radius = 100 + Math.random() * 900; // 100 to 1000 units
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        // Convert spherical coordinates to cartesian
        starsPositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        starsPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        starsPositions[i3 + 2] = radius * Math.cos(phi);
        
        // Randomize star sizes
        starsSizes[i] = Math.random() * 2;
    }
    
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3));
    starsGeometry.setAttribute('size', new THREE.BufferAttribute(starsSizes, 1));
    
    starField = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starField);
}

// Create distant galaxies
function createGalaxies() {
    // Galaxy texture (spiral galaxy)
    const galaxyTexture = createGalaxyTexture();
    
    // Create several galaxies in the background
    for (let i = 0; i < 5; i++) {
        const galaxyMaterial = new THREE.MeshBasicMaterial({
            map: galaxyTexture,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        
        const galaxy = new THREE.Mesh(
            new THREE.PlaneGeometry(200, 200),
            galaxyMaterial
        );
        
        // Random position far away
        const distance = 500 + Math.random() * 500;
        const angle = Math.random() * Math.PI * 2;
        const height = (Math.random() - 0.5) * 400;
        
        galaxy.position.set(
            Math.cos(angle) * distance,
            height,
            Math.sin(angle) * distance
        );
        
        // Face the galaxy toward the center
        galaxy.lookAt(0, 0, 0);
        
        // Random rotation
        galaxy.rotation.z = Math.random() * Math.PI * 2;
        
        // Random scale
        const scale = 1 + Math.random() * 3;
        galaxy.scale.set(scale, scale, scale);
        
        scene.add(galaxy);
    }
}

// Create galaxy texture
function createGalaxyTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Create background
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Create galaxy center glow
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Outer glow
    const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, canvas.width / 2
    );
    
    // Add colors with transparency
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.1, 'rgba(120, 180, 255, 0.6)');
    gradient.addColorStop(0.2, 'rgba(80, 100, 255, 0.4)');
    gradient.addColorStop(0.4, 'rgba(40, 50, 180, 0.2)');
    gradient.addColorStop(0.7, 'rgba(20, 30, 80, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 0, 30, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Create spiral arms
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        
        // Draw spiral arm
        ctx.beginPath();
        for (let r = 10; r < canvas.width / 2; r += 3) {
            const spiralAngle = angle + (r / 30);
            const x = centerX + Math.cos(spiralAngle) * r;
            const y = centerY + Math.sin(spiralAngle) * r;
            
            if (r === 10) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        // Style and draw arm
        ctx.strokeStyle = 'rgba(180, 200, 255, 0.3)';
        ctx.lineWidth = 20;
        ctx.stroke();
        
        // Redraw with brighter inner line
        ctx.strokeStyle = 'rgba(220, 230, 255, 0.5)';
        ctx.lineWidth = 8;
        ctx.stroke();
    }
    
    // Add stars in the galaxy
    for (let i = 0; i < 300; i++) {
        const r = Math.random() * canvas.width / 2;
        const angle = Math.random() * Math.PI * 2;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        
        // Star brightness depends on position
        const brightness = Math.max(0, 1 - (r / (canvas.width / 2)));
        
        // Draw star
        ctx.beginPath();
        ctx.arc(x, y, 1 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.8})`;
        ctx.fill();
    }
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
}

// Create nebula clouds
function createNebulaClouds() {
    // Create several colorful nebula clouds
    const colors = [
        0x3366ff, // Blue
        0xff33cc, // Pink
        0x33ccff, // Cyan
        0x9933ff  // Purple
    ];
    
    for (let i = 0; i < 8; i++) {
        const nebulaTexture = createNebulaTexture(colors[i % colors.length]);
        
        const nebulaMaterial = new THREE.MeshBasicMaterial({
            map: nebulaTexture,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        
        const nebula = new THREE.Mesh(
            new THREE.PlaneGeometry(150, 150),
            nebulaMaterial
        );
        
        // Random position
        const distance = 100 + Math.random() * 200;
        const angle = Math.random() * Math.PI * 2;
        const height = (Math.random() - 0.5) * 150;
        
        nebula.position.set(
            Math.cos(angle) * distance,
            height,
            Math.sin(angle) * distance
        );
        
        // Face toward the center with slight randomization
        nebula.lookAt(0, 0, 0);
        nebula.rotation.z = Math.random() * Math.PI * 2;
        
        // Random scale
        const scale = 1 + Math.random() * 2;
        nebula.scale.set(scale, scale, scale);
        
        scene.add(nebula);
    }
}

// Create nebula texture
function createNebulaTexture(baseColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Convert hex color to rgb
    const r = (baseColor >> 16) & 255;
    const g = (baseColor >> 8) & 255;
    const b = baseColor & 255;
    
    // Create cloud-like pattern
    for (let i = 0; i < 20; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = 50 + Math.random() * 100;
        
        // Create radial gradient
        const gradient = ctx.createRadialGradient(
            x, y, 0,
            x, y, radius
        );
        
        // Add color with transparency
        const alpha = 0.05 + Math.random() * 0.1;
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Add some noise/stars
    for (let i = 0; i < 200; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = 1 + Math.random() * 2;
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.3})`;
        ctx.fill();
    }
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
}

// Create space dust particles
function createSpaceDust() {
    const dustGeometry = new THREE.BufferGeometry();
    const dustMaterial = new THREE.PointsMaterial({
        color: 0xaaaaff,
        size: 0.5,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });
    
    // Create dust particles
    const dustCount = 1000;
    const dustPositions = new Float32Array(dustCount * 3);
    const dustVelocities = [];
    
    for (let i = 0; i < dustCount; i++) {
        const i3 = i * 3;
        // Distribute particles in a cylinder shape along the track
        const radius = 20 + Math.random() * 30;
        const theta = Math.random() * Math.PI * 2;
        const z = (Math.random() - 0.5) * 200;
        
        dustPositions[i3] = Math.cos(theta) * radius;
        dustPositions[i3 + 1] = (Math.random() - 0.5) * 20;
        dustPositions[i3 + 2] = z;
        
        // Add velocity for animation
        dustVelocities.push({
            x: (Math.random() - 0.5) * 0.05,
            y: (Math.random() - 0.5) * 0.05,
            z: (Math.random() - 0.5) * 0.05
        });
    }
    
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    
    const dust = new THREE.Points(dustGeometry, dustMaterial);
    scene.add(dust);
    
    // Store for animation
    spaceDust = {
        mesh: dust,
        geometry: dustGeometry,
        velocities: dustVelocities
    };
}

// Create space track (the path where cosmic chickens run)
function createSpaceTrack() {
    // Create the main track with energy fields
    createEnergyTrack();
    
    // Add cosmic pylons along the track
    createCosmicPylons();
    
    // Add decorative elements
    createTrackDecorations();
}

// Create the main energy track
function createEnergyTrack() {
    // Create a segmented track for better visual effects
    const trackLength = 300;
    const segmentLength = 20;
    const numSegments = Math.ceil(trackLength / segmentLength);
    
    // Track materials
    const trackMaterial = new THREE.MeshPhongMaterial({
        color: 0x3366ff,
        emissive: 0x112244,
        transparent: true,
        opacity: 0.8,
        shininess: 80
    });
    
    const edgeMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ffff,
        emissive: 0x006688,
        transparent: true,
        opacity: 0.9,
        shininess: 100
    });
    
    // Create track segments
    for (let i = 0; i < numSegments; i++) {
        // Central track platform
        const track = new THREE.Mesh(
            new THREE.BoxGeometry(30, 0.5, segmentLength),
            trackMaterial
        );
        
        track.position.set(0, -0.25, -150 + (i * segmentLength) + segmentLength/2);
        track.receiveShadow = true;
        
        // Store segment data
        track.userData = {
            initialZ: track.position.z,
            segmentLength: segmentLength
        };
        
        // Add to scene and segments array
        scene.add(track);
        spaceTrack.push(track);
        
        // Add glowing edges
        const leftEdge = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.8, segmentLength),
            edgeMaterial
        );
        leftEdge.position.set(-15, -0.1, track.position.z);
        scene.add(leftEdge);
        spaceTrack.push(leftEdge);
        
        const rightEdge = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.8, segmentLength),
            edgeMaterial
        );
        rightEdge.position.set(15, -0.1, track.position.z);
        scene.add(rightEdge);
        spaceTrack.push(rightEdge);
        
        // Add energy pulse lights (every few segments)
        if (i % 3 === 0) {
            // Add energy pulses
            createEnergyPulse(track.position.z);
        }
    }
}

// Create energy pulse effect
function createEnergyPulse(zPosition) {
    // Create light sources that will move along the track
    const pulseLight = new THREE.PointLight(0x00ffff, 2, 20);
    pulseLight.position.set(0, 1, zPosition);
    scene.add(pulseLight);
    
    // Add to effects to update
    effectsToUpdate.push({
        type: 'pulse',
        light: pulseLight,
        initialZ: zPosition,
        speed: 0.2,
        update: function() {
            if (gamePaused) return true;
            
            // Move light forward
            this.light.position.z += this.speed;
            
            // Reset if too far ahead
            if (this.light.position.z > 20) {
                this.light.position.z = -200;
            }
            
            return true;
        }
    });
}

// Create cosmic pylons along the track
function createCosmicPylons() {
    // Material for the cosmic pylons
    const pylonMaterial = new THREE.MeshPhongMaterial({
        color: 0x3366ff,
        emissive: 0x112233,
        shininess: 80
    });
    
    const energyMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ffff,
        emissive: 0x0088aa,
        transparent: true,
        opacity: 0.8,
        shininess: 100
    });
    
    // Create pylons at regular intervals
    const pylonSpacing = 50;
    const numPylons = 5;
    
    for (let i = 0; i < numPylons; i++) {
        // Create pylon group
        const pylonGroup = new THREE.Group();
        
        // Position
        const zPosition = -200 + (i * pylonSpacing);
        pylonGroup.position.z = zPosition;
        
        // Left and right pillars
        const createPillar = (xPos) => {
            // Main pillar
            const pillar = new THREE.Mesh(
                new THREE.CylinderGeometry(1, 1, 30, 8),
                pylonMaterial
            );
            pillar.position.set(xPos, 15, 0);
            pillar.castShadow = true;
            pylonGroup.add(pillar);
            
            // Energy rings around pillar
            for (let j = 0; j < 5; j++) {
                const ring = new THREE.Mesh(
                    new THREE.TorusGeometry(1.5, 0.3, 8, 16),
                    energyMaterial
                );
                ring.position.set(xPos, 5 + j * 5, 0);
                ring.rotation.x = Math.PI / 2;
                pylonGroup.add(ring);
                
                // Add to effects for animation
                effectsToUpdate.push({
                    type: 'ring',
                    mesh: ring,
                    speed: 0.02,
                    update: function() {
                        if (gamePaused) return true;
                        this.mesh.rotation.z += this.speed;
                        return true;
                    }
                });
            }
            
            // Energy orb on top
            const orb = new THREE.Mesh(
                new THREE.SphereGeometry(1.8, 16, 16),
                energyMaterial
            );
            orb.position.set(xPos, 30, 0);
            pylonGroup.add(orb);
            
            // Pulsating effect for orb
            effectsToUpdate.push({
                type: 'orb',
                mesh: orb,
                pulseSpeed: 0.03,
                time: Math.random() * Math.PI * 2, // Random start phase
                update: function() {
                    if (gamePaused) return true;
                    this.time += this.pulseSpeed;
                    this.mesh.scale.set(
                        1 + Math.sin(this.time) * 0.2,
                        1 + Math.sin(this.time) * 0.2,
                        1 + Math.sin(this.time) * 0.2
                    );
                    return true;
                }
            });
        };
        
        // Create left and right pillars
        createPillar(-20);
        createPillar(20);
        
        // Create energy beam between pillars
        const beam = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.5, 40, 8),
            energyMaterial
        );
        beam.rotation.z = Math.PI / 2;
        beam.position.set(0, 30, 0);
        pylonGroup.add(beam);
        
        // Store pylon data
        pylonGroup.userData = {
            initialZ: zPosition,
            pylonSpacing: pylonSpacing
        };
        
        // Add to scene
        scene.add(pylonGroup);
        spaceTrack.push(pylonGroup);
    }
}

// Create decorative elements around the track
function createTrackDecorations() {
    // Add floating crystals
    createFloatingCrystals();
    
    // Add space rocks
    createSpaceRocks();
}

// Create floating cosmic crystals
function createFloatingCrystals() {
    // Crystal material
    const crystalMaterial = new THREE.MeshPhongMaterial({
        color: 0x88ddff,
        emissive: 0x0066aa,
        transparent: true,
        opacity: 0.8,
        shininess: 100
    });
    
    // Create several crystal clusters
    for (let i = 0; i < 15; i++) {
        const crystalGroup = new THREE.Group();
        
        // Random position near the track
        const side = Math.random() > 0.5 ? 1 : -1;
        const distance = 25 + Math.random() * 20;
        const zPos = -180 + Math.random() * 160;
        
        crystalGroup.position.set(side * distance, -2 + Math.random() * 5, zPos);
        
        // Create 3-7 crystals in a cluster
        const numCrystals = 3 + Math.floor(Math.random() * 5);
        
        for (let j = 0; j < numCrystals; j++) {
            // Create crystal using cone geometry
            const height = 3 + Math.random() * 5;
            const crystal = new THREE.Mesh(
                new THREE.ConeGeometry(0.8, height, 5),
                crystalMaterial
            );
            
            // Random position in cluster
            crystal.position.set(
                (Math.random() - 0.5) * 3,
                height / 2,
                (Math.random() - 0.5) * 3
            );
            
            // Random rotation
            crystal.rotation.x = (Math.random() - 0.5) * 0.5;
            crystal.rotation.z = (Math.random() - 0.5) * 0.5;
            
            crystal.castShadow = true;
            crystalGroup.add(crystal);
        }
        
        // Add floating animation
        effectsToUpdate.push({
            type: 'crystal',
            group: crystalGroup,
            initialY: crystalGroup.position.y,
            floatSpeed: 0.2 + Math.random() * 0.3,
            time: Math.random() * Math.PI * 2, // Random start phase
            update: function() {
                if (gamePaused) return true;
                this.time += 0.02;
                this.group.position.y = this.initialY + Math.sin(this.time) * 0.5;
                this.group.rotation.y += 0.005;
                return true;
            }
        });
        
        scene.add(crystalGroup);
    }
}

// Create space rocks
function createSpaceRocks() {
    // Rock material
    const rockMaterial = new THREE.MeshPhongMaterial({
        color: 0x888899,
        emissive: 0x222233,
        shininess: 30
    });
    
    // Create several rock formations
    for (let i = 0; i < 20; i++) {
        const rockGroup = new THREE.Group();
        
        // Random position far from the track
        const side = Math.random() > 0.5 ? 1 : -1;
        const distance = 40 + Math.random() * 30;
        const zPos = -180 + Math.random() * 160;
        
        rockGroup.position.set(side * distance, -5, zPos);
        
        // Create 2-5 rocks in a formation
        const numRocks = 2 + Math.floor(Math.random() * 4);
        
        for (let j = 0; j < numRocks; j++) {
            // Create irregular rock using dodecahedron
            const size = 1 + Math.random() * 4;
            const rock = new THREE.Mesh(
                new THREE.DodecahedronGeometry(size, 0),
                rockMaterial
            );
            
            // Distort vertices for more natural shape
            const positions = rock.geometry.attributes.position;
            for (let v = 0; v < positions.count; v++) {
                positions.setXYZ(
                    v,
                    positions.getX(v) * (0.8 + Math.random() * 0.4),
                    positions.getY(v) * (0.8 + Math.random() * 0.4),
                    positions.getZ(v) * (0.8 + Math.random() * 0.4)
                );
            }
            rock.geometry.computeVertexNormals();
            
            // Random position in formation
            rock.position.set(
                (Math.random() - 0.5) * 5,
                size / 2 + Math.random() * 2,
                (Math.random() - 0.5) * 5
            );
            
            // Random rotation
            rock.rotation.x = Math.random() * Math.PI * 2;
            rock.rotation.y = Math.random() * Math.PI * 2;
            rock.rotation.z = Math.random() * Math.PI * 2;
            
            rock.castShadow = true;
            rock.receiveShadow = true;
            rockGroup.add(rock);
        }
        
        // Add slow spinning animation
        if (Math.random() > 0.7) {
            effectsToUpdate.push({
                type: 'rock',
                group: rockGroup,
                rotSpeed: (Math.random() - 0.5) * 0.002,
                update: function() {
                    if (gamePaused) return true;
                    this.group.rotation.y += this.rotSpeed;
                    return true;
                }
            });
        }
        
        scene.add(rockGroup);
    }
}

// Create mouse cursor
function createMouseCursor() {
    // Create a sci-fi cursor with orbital rings
    const cursorGroup = new THREE.Group();
    
    // Inner circle (bright core)
    const innerMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.8
    });
    
    const innerCircle = new THREE.Mesh(
        new THREE.CircleGeometry(0.3, 16),
        innerMaterial
    );
    innerCircle.rotation.x = -Math.PI / 2;
    cursorGroup.add(innerCircle);
    
    // Outer ring
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0x0088ff,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
    });
    
    const outerRing = new THREE.Mesh(
        new THREE.RingGeometry(0.7, 0.9, 32),
        ringMaterial
    );
    outerRing.rotation.x = -Math.PI / 2;
    cursorGroup.add(outerRing);
    
    // Orbital ring
    const orbitalRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.2, 0.05, 8, 32),
        ringMaterial
    );
    orbitalRing.rotation.x = Math.PI / 4;
    cursorGroup.add(orbitalRing);
    
    // Second orbital ring
    const orbitalRing2 = new THREE.Mesh(
        new THREE.TorusGeometry(1.2, 0.05, 8, 32),
        ringMaterial
    );
    orbitalRing2.rotation.x = -Math.PI / 4;
    orbitalRing2.rotation.y = Math.PI / 4;
    cursorGroup.add(orbitalRing2);
    
    // Position the cursor
    cursorGroup.position.set(0, 0.1, 5);
    
    // Add to scene
    scene.add(cursorGroup);
    mouseCursor = cursorGroup;
    
    // Add animation for the cursor
    effectsToUpdate.push({
        type: 'cursor',
        group: cursorGroup,
        time: 0,
        update: function() {
            this.time += 0.03;
            
            // Rotate orbital rings
            if (this.group.children[2]) {
                this.group.children[2].rotation.z += 0.02;
            }
            if (this.group.children[3]) {
                this.group.children[3].rotation.z -= 0.02;
            }
            
            return true;
        }
    });
}

// Create cosmic chicken models
function createTroopMesh(level, position) {
    // Size increases with level
    const sizeMultiplier = 1 + level * 0.15;
    
    // Create group for the chicken
    const troopGroup = new THREE.Group();
    
    // Body material with level-based color
    const bodyMaterial = new THREE.MeshPhongMaterial({
        color: troopColors[level],
        emissive: new THREE.Color(troopColors[level]).multiplyScalar(0.2),
        shininess: 70
    });
    
    // Create cosmic chicken body (egg-shaped)
    const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.5 * sizeMultiplier, 16, 16),
        bodyMaterial
    );
    body.scale.set(1, 1.2, 1.5);
    body.position.set(0, 0.6 * sizeMultiplier, 0);
    body.castShadow = true;
    troopGroup.add(body);
    
    // Space helmet (transparent dome)
    const helmetMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3,
        shininess: 100,
        side: THREE.DoubleSide
    });
    
    const helmet = new THREE.Mesh(
        new THREE.SphereGeometry(0.7 * sizeMultiplier, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        helmetMaterial
    );
    helmet.position.set(0, 1.0 * sizeMultiplier, 0.2 * sizeMultiplier);
    helmet.rotation.x = 0.2;
    troopGroup.add(helmet);
    
    // Head (inside helmet)
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.35 * sizeMultiplier, 16, 16),
        bodyMaterial
    );
    head.position.set(0, 1.0 * sizeMultiplier, 0.4 * sizeMultiplier);
    head.castShadow = true;
    troopGroup.add(head);
    
    // Beak
    const beakMaterial = new THREE.MeshPhongMaterial({
        color: 0xff9900,
        shininess: 70
    });
    
    const beak = new THREE.Mesh(
        new THREE.ConeGeometry(0.1 * sizeMultiplier, 0.3 * sizeMultiplier, 8),
        beakMaterial
    );
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 1.0 * sizeMultiplier, 0.7 * sizeMultiplier);
    beak.castShadow = true;
    troopGroup.add(beak);
    
    // Wings - modified for space suit style
    const wingMaterial = new THREE.MeshPhongMaterial({
        color: new THREE.Color(troopColors[level]).multiplyScalar(0.8),
        shininess: 50
    });
    
    // Function to create a wing
    function createWing(side) {
        const wingGroup = new THREE.Group();
        
        // Main wing part
        const wing = new THREE.Mesh(
            new THREE.BoxGeometry(0.8 * sizeMultiplier, 0.2 * sizeMultiplier, 1.0 * sizeMultiplier),
            wingMaterial
        );
        wing.position.set(0, 0, 0);
        wingGroup.add(wing);
        
        // Position the wing group
        wingGroup.position.set(side * 0.7 * sizeMultiplier, 0.6 * sizeMultiplier, 0);
        troopGroup.add(wingGroup);
        
        return wingGroup;
    }
    
    // Create left and right wings
    const leftWing = createWing(-1);
    const rightWing = createWing(1);
    
    // Space suit jetpack
    const jetpackMaterial = new THREE.MeshPhongMaterial({
        color: 0x888888,
        shininess: 80
    });
    
    const jetpack = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3 * sizeMultiplier, 0.3 * sizeMultiplier, 0.8 * sizeMultiplier, 8),
        jetpackMaterial
    );
    jetpack.position.set(0, 0.7 * sizeMultiplier, -0.5 * sizeMultiplier);
    troopGroup.add(jetpack);
    
    // Jetpack flames
    const flameMaterial = new THREE.MeshBasicMaterial({
        color: 0xff8800,
        transparent: true,
        opacity: 0.7
    });
    
    const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.2 * sizeMultiplier, 0.5 * sizeMultiplier, 8),
        flameMaterial
    );
    flame.position.set(0, 0.2 * sizeMultiplier, -0.5 * sizeMultiplier);
    flame.rotation.x = Math.PI;
    troopGroup.add(flame);
    
    // Add flame animation
    effectsToUpdate.push({
        type: 'flame',
        mesh: flame,
        time: Math.random() * Math.PI * 2,
        update: function() {
            if (gamePaused) return true;
            
            this.time += 0.2;
            
            // Pulsate flame size
            const scale = 0.8 + Math.sin(this.time) * 0.3;
            this.mesh.scale.set(scale, scale + 0.2, scale);
            
            return true;
        }
    });
    
    // Legs with space boots
    const legMaterial = new THREE.MeshPhongMaterial({
        color: 0x888888,
        shininess: 70
    });
    
    // Function to create a leg
    function createLeg(side) {
        // Leg
        const leg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08 * sizeMultiplier, 0.08 * sizeMultiplier, 0.5 * sizeMultiplier),
            legMaterial
        );
        leg.position.set(side * 0.2 * sizeMultiplier, 0.3 * sizeMultiplier, 0);
        troopGroup.add(leg);
        
        // Space boot
        const boot = new THREE.Mesh(
            new THREE.BoxGeometry(0.15 * sizeMultiplier, 0.1 * sizeMultiplier, 0.25 * sizeMultiplier),
            legMaterial
        );
        boot.position.set(side * 0.2 * sizeMultiplier, 0.05 * sizeMultiplier, 0.05 * sizeMultiplier);
        troopGroup.add(boot);
    }
    
    // Create legs
    createLeg(-1);
    createLeg(1);
    
    // Special accessories for higher levels
    if (level >= 3) {
        // Add a space commander helmet antenna
        const antennaMaterial = new THREE.MeshPhongMaterial({
            color: 0xffcc00,
            emissive: 0x882200,
            shininess: 100
        });
        
        const antenna = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02 * sizeMultiplier, 0.02 * sizeMultiplier, 0.4 * sizeMultiplier),
            antennaMaterial
        );
        antenna.position.set(0.3 * sizeMultiplier, 1.3 * sizeMultiplier, 0.2 * sizeMultiplier);
        troopGroup.add(antenna);
        
        // Add antenna tip light
        const antennaLight = new THREE.Mesh(
            new THREE.SphereGeometry(0.05 * sizeMultiplier, 8, 8),
            new THREE.MeshBasicMaterial({
                color: 0xff0000,
                transparent: true,
                opacity: 0.8
            })
        );
        antennaLight.position.set(0.3 * sizeMultiplier, 1.5 * sizeMultiplier, 0.2 * sizeMultiplier);
        troopGroup.add(antennaLight);
        
        // Add blinking effect
        effectsToUpdate.push({
            type: 'light',
            mesh: antennaLight,
            time: 0,
            update: function() {
                if (gamePaused) return true;
                
                this.time += 0.1;
                this.mesh.material.opacity = 0.4 + Math.sin(this.time) * 0.4;
                
                return true;
            }
        });
    }
    
    // Add level-based energy aura for higher levels
    if (level >= 2) {
        // Energy aura
        const auraMaterial = new THREE.MeshBasicMaterial({
            color: troopColors[level],
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        
        const aura = new THREE.Mesh(
            new THREE.SphereGeometry(1.2 * sizeMultiplier, 16, 16),
            auraMaterial
        );
        aura.position.set(0, 0.7 * sizeMultiplier, 0);
        troopGroup.add(aura);
        
        // Add pulsating effect
        effectsToUpdate.push({
            type: 'aura',
            mesh: aura,
            time: Math.random() * Math.PI * 2,
            update: function() {
                if (gamePaused) return true;
                
                this.time += 0.05;
                const scale = 1 + Math.sin(this.time) * 0.1;
                this.mesh.scale.set(scale, scale, scale);
                
                return true;
            }
        });
        
        // Add orbiting particles for highest levels
        if (level >= 5) {
            createOrbitingParticles(troopGroup, level, sizeMultiplier);
        }
    }
    
    // Make chicken face forward
    troopGroup.rotation.y = Math.PI;
    
    // Set position
    troopGroup.position.set(position.x, 0, position.z);
    troopGroup.level = level;
    
    // Add to scene
    scene.add(troopGroup);
    
    return troopGroup;
}

// Create orbiting particles around high-level cosmic chickens
function createOrbitingParticles(troopGroup, level, size) {
    // Create a particle system
    const particleCount = 20 + level * 5;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    
    // Initial positions in a sphere around the chicken
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const angle = Math.random() * Math.PI * 2;
        const height = (Math.random() - 0.5) * 2;
        const radius = (1 + Math.random() * 0.5) * size;
        
        particlePositions[i3] = Math.cos(angle) * radius;
        particlePositions[i3 + 1] = 0.7 * size + height * size;
        particlePositions[i3 + 2] = Math.sin(angle) * radius;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    
    // Particle material with chicken's color
    const particleMaterial = new THREE.PointsMaterial({
        color: troopColors[level],
        size: 0.08 * size,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    troopGroup.add(particles);
    
    // Add orbital animation
    effectsToUpdate.push({
        type: 'particles',
        geometry: particleGeometry,
        time: Math.random() * Math.PI * 2,
        speed: 0.02,
        update: function() {
            if (gamePaused) return true;
            
            this.time += this.speed;
            
            const positions = this.geometry.attributes.position.array;
            
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                
                // Get current position
                const x = positions[i3];
                const y = positions[i3 + 1];
                const z = positions[i3 + 2];
                
                // Calculate distance from center (ignoring y-axis)
                const distance = Math.sqrt(x * x + z * z);
                
                // Calculate current angle
                let angle = Math.atan2(z, x);
                
                // Update angle based on time and position
                // Different particles have different speeds
                angle += 0.02 + (i % 5) * 0.005;
                
                // Update position, keeping same distance from center
                positions[i3] = Math.cos(angle) * distance;
                positions[i3 + 2] = Math.sin(angle) * distance;
                
                // Add small vertical oscillation
                positions[i3 + 1] = y + Math.sin(this.time + i * 0.2) * 0.02;
            }
            
            this.geometry.attributes.position.needsUpdate = true;
            
            return true;
        }
    });
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
    
    // Calculate troop distribution based on fusion rate
    let remainingTroops = troops;
    let troopCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // Level 1-10
    
    // Distribute troops by level using fusion rate
    while (remainingTroops > 0 && troopMeshes.length < MAX_TROOPS_DISPLAYED) {
        if (remainingTroops >= 500 * fusionRate) {
            troopCounts[9]++;
            remainingTroops -= 500 * fusionRate;
        } else if (remainingTroops >= 300 * fusionRate) {
            troopCounts[8]++;
            remainingTroops -= 300 * fusionRate;
        } else if (remainingTroops >= 200 * fusionRate) {
            troopCounts[7]++;
            remainingTroops -= 200 * fusionRate;
        } else if (remainingTroops >= 150 * fusionRate) {
            troopCounts[6]++;
            remainingTroops -= 150 * fusionRate;
        } else if (remainingTroops >= 100 * fusionRate) {
            troopCounts[5]++;
            remainingTroops -= 100 * fusionRate;
        } else if (remainingTroops >= 50 * fusionRate) {
            troopCounts[4]++;
            remainingTroops -= 50 * fusionRate;
        } else if (remainingTroops >= 20 * fusionRate) {
            troopCounts[3]++;
            remainingTroops -= 20 * fusionRate;
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
    }
    
    // Create troops in formation
    let xPos = -8;
    let zPos = -3;
    const xSpacing = 2.8;
    const zSpacing = 2.8;
    
    // Create highest level troops first (bigger ones in back)
    for (let level = 9; level >= 0; level--) {
        const count = troopCounts[level];
        for (let i = 0; i < count && troopMeshes.length < MAX_TROOPS_DISPLAYED; i++) {
            const troop = createTroopMesh(level, { x: xPos, z: zPos });
            troopMeshes.push(troop);
            
            // Set the first troop as player
            if (!player) player = troop;
            
            // Update position for next troop
            xPos += xSpacing;
            if (xPos > 8) {
                xPos = -8;
                zPos -= zSpacing;
            }
        }
    }
    
    // If no troops were created, create at least one
    if (troopMeshes.length === 0) {
        const troop = createTroopMesh(0, { x: 0, z: -3 });
        troopMeshes.push(troop);
        player = troop;
    }
}

// Create cosmic portal (multiplier)
function createPortal() {
    // Define portal types
    const types = [
        { op: "+", color: 0x00ddff, min: 1, max: 5, positive: true },    // Addition portal
        { op: "-", color: 0xff3366, min: 1, max: 10, positive: false },  // Subtraction portal
        { op: "×", color: 0x00ffaa, min: 2, max: 3, positive: true },    // Multiplication portal
        { op: "÷", color: 0xff3366, min: 2, max: 3, positive: false }    // Division portal
    ];
    
    // Randomly select portal type with more chances for negative portals
    let typeIndex;
    if (Math.random() < 0.65) {
        // Select among negative types (index 1 and 3)
        typeIndex = Math.random() < 0.5 ? 1 : 3;
    } else {
        // Select among positive types (index 0 and 2)
        typeIndex = Math.random() < 0.5 ? 0 : 2;
    }
    
    const type = types[typeIndex];
    
    // Generate value
    const value = Math.floor(Math.random() * (type.max - type.min + 1)) + type.min;
    
    // Create portal group
    const portalGroup = new THREE.Group();
    
    // Create outer ring
    const ringGeometry = new THREE.TorusGeometry(3, 0.3, 16, 64);
    const ringMaterial = new THREE.MeshPhongMaterial({
        color: type.color,
        emissive: new THREE.Color(type.color).multiplyScalar(0.5),
        shininess: 100,
        transparent: true,
        opacity: 0.9
    });
    
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    portalGroup.add(ring);
    
    // Create inner ring (rotating opposite direction)
    const innerRingGeometry = new THREE.TorusGeometry(2.5, 0.15, 16, 64);
    const innerRing = new THREE.Mesh(innerRingGeometry, ringMaterial);
    innerRing.rotation.x = Math.PI / 2;
    portalGroup.add(innerRing);
    
    // Create portal center
    const centerGeometry = new THREE.CircleGeometry(2.3, 32);
    const centerMaterial = new THREE.MeshBasicMaterial({
        color: type.color,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    
    const center = new THREE.Mesh(centerGeometry, centerMaterial);
    center.rotation.x = Math.PI / 2;
    center.position.z = 0.1; // Slight offset to prevent z-fighting
    portalGroup.add(center);
    
    // Create text for the multiplier value
    const textCanvas = document.createElement("canvas");
    textCanvas.width = 512;
    textCanvas.height = 512;
    const ctx = textCanvas.getContext("2d");
    
    // Clear canvas
    ctx.clearRect(0, 0, textCanvas.width, textCanvas.height);
    
    // Make the text glow with shadows
    ctx.shadowColor = type.positive ? "rgba(0, 200, 255, 0.8)" : "rgba(255, 50, 80, 0.8)";
    ctx.shadowBlur = 25;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Draw text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 250px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Format the text
    const displayText = type.op + value;
    
    // Draw multiple layers for stronger glow
    for (let i = 0; i < 3; i++) {
        ctx.shadowBlur = 15 + i * 10;
        ctx.fillText(displayText, textCanvas.width / 2, textCanvas.height / 2);
    }
    
    // Final layer without shadow
    ctx.shadowBlur = 0;
    ctx.fillText(displayText, textCanvas.width / 2, textCanvas.height / 2);
    
    const textTexture = new THREE.CanvasTexture(textCanvas);
    const textMaterial = new THREE.MeshBasicMaterial({
        map: textTexture,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    
    const textPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 4),
        textMaterial
    );
    textPlane.rotation.x = Math.PI / 2;
    textPlane.position.z = 0.2;
    portalGroup.add(textPlane);
    
    // Add energy particles inside the portal
    const particleCount = 150;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleVelocities = [];
    
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        // Position particles within the portal
        const radius = Math.random() * 2.2;
        const angle = Math.random() * Math.PI * 2;
        const height = (Math.random() - 0.5) * 0.5;
        
        particlePositions[i3] = Math.cos(angle) * radius;
        particlePositions[i3 + 1] = height;
        particlePositions[i3 + 2] = Math.sin(angle) * radius;
        
        // Add velocity for animation
        particleVelocities.push({
            radial: (Math.random() - 0.5) * 0.05,
            angular: (Math.random() * 0.05) + 0.01,
            vertical: (Math.random() - 0.5) * 0.01
        });
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        color: type.color,
        size: 0.1,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    portalGroup.add(particles);
    
    // Set random position on x-axis and far away on z-axis
    const x = Math.random() * 20 - 10; // Between -10 and 10
    portalGroup.position.set(x, 4, -120); // Start far away
    
    // Set rotation for the entire portal
    portalGroup.rotation.x = Math.PI / 12; // Slight tilt
    
    // Add the portal to the scene
    scene.add(portalGroup);
    
    // Define effect function based on operator
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
    
    // Store portal info with animations
    multipliers.push({
        mesh: portalGroup,
        type: type.op,
        value: value,
        effect: effect,
        color: type.color,
        positive: type.positive,
        rings: [ring, innerRing],
        center: center,
        particles: {
            system: particles,
            geometry: particleGeometry,
            velocities: particleVelocities
        },
        createTime: Date.now()
    });
    
    return portalGroup;
}

// Create portal entry effect
function createPortalEntryEffect(x, z, color) {
    // Create particles bursting outward
    const particleCount = 200;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleVelocities = [];
    
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        // Start particles at player position
        particlePositions[i3] = x;
        particlePositions[i3 + 1] = 1 + Math.random();
        particlePositions[i3 + 2] = z;
        
        // Random velocity in all directions
        const speed = 0.2 + Math.random() * 0.3;
        const angle = Math.random() * Math.PI * 2;
        const elevation = Math.random() * Math.PI - Math.PI / 2;
        
        particleVelocities.push({
            x: Math.cos(angle) * Math.cos(elevation) * speed,
            y: Math.sin(elevation) * speed,
            z: Math.sin(angle) * Math.cos(elevation) * speed
        });
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        color: color,
        size: 0.15,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });
    
    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);
    
    // Create shockwave effect
    const shockwaveMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    });
    
    const shockwave = new THREE.Mesh(
        new THREE.RingGeometry(0, 0.5, 32),
        shockwaveMaterial
    );
    shockwave.position.set(x, 0.5, z);
    shockwave.rotation.x = -Math.PI / 2;
    scene.add(shockwave);
    
    // Create animation for the effects
    const portalEffect = {
        particleSystem: particleSystem,
        particleGeometry: particleGeometry,
        particleVelocities: particleVelocities,
        shockwave: shockwave,
        life: 60,  // Frames to live
        update: function() {
            if (gamePaused) return true;
            
            // Update particles
            const positions = this.particleGeometry.attributes.position.array;
            
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                const vel = this.particleVelocities[i];
                
                // Update position with velocity
                positions[i3] += vel.x;
                positions[i3 + 1] += vel.y;
                positions[i3 + 2] += vel.z;
                
                // Add gravity effect
                vel.y -= 0.01;
            }
            
            this.particleGeometry.attributes.position.needsUpdate = true;
            
            // Update shockwave
            const scale = this.shockwave.scale.x + 0.2;
            this.shockwave.scale.set(scale, scale, scale);
            this.shockwave.material.opacity = this.life / 60;
            
            // Fade out both effects
            this.particleSystem.material.opacity = this.life / 60;
            
            // Decrease life
            this.life--;
            
            // Remove when done
            if (this.life <= 0) {
                scene.remove(this.particleSystem);
                scene.remove(this.shockwave);
                return false;
            }
            
            return true;
        }
    };
    
    // Add to array of effects to update
    effectsToUpdate.push(portalEffect);
    
    // Play sound effect
    playPortalEntrySound(color);
    
    return portalEffect;
}

// Play portal entry sound based on portal type
function playPortalEntrySound(color) {
    // Determine if this is a positive or negative portal based on color
    const isPositive = (color === 0x00ddff || color === 0x00ffaa);
    
    // Play appropriate sound
    if (audioInitialized) {
        const soundName = isPositive ? 'portal_positive' : 'portal_negative';
        playSound(soundName, { volume: 0.4 });
        
        // Also show CSS effect
        if (isPositive) {
            window.showPositiveEffect();
        } else {
            window.showNegativeEffect();
        }
    }
}

// Update space track segments
function updateSpaceTrack() {
    if (gamePaused) return;
    
    // Common movement speed
    const moveSpeed = 0.2;
    
    // Calculate the length of the track segments
    const segmentLength = 20;
    const totalTrackLength = segmentLength * (spaceTrack.length / 3); // Approximate calculation
    
    // Move all track elements
    for (let i = 0; i < spaceTrack.length; i++) {
        const element = spaceTrack[i];
        
        // Move forward
        element.position.z += moveSpeed;
        
        // Recycle elements that move too far ahead
        if (element.position.z > 30) {
            element.position.z -= totalTrackLength;
        }
    }
}

// Update space dust particles
function updateSpaceDust() {
    if (gamePaused || !spaceDust) return;
    
    const positions = spaceDust.geometry.attributes.position.array;
    const velocities = spaceDust.velocities;
    
    for (let i = 0; i < velocities.length; i++) {
        const i3 = i * 3;
        const vel = velocities[i];
        
        // Update position
        positions[i3] += vel.x;
        positions[i3 + 1] += vel.y;
        positions[i3 + 2] += vel.z + 0.1; // Extra z movement to simulate flying through dust
        
        // Recycle particles that move too far
        if (positions[i3 + 2] > 20) {
            positions[i3] = (Math.random() - 0.5) * 50;
            positions[i3 + 1] = (Math.random() - 0.5) * 20;
            positions[i3 + 2] = -100 - Math.random() * 100;
        }
    }
    
    spaceDust.geometry.attributes.position.needsUpdate = true;
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
    
    // Convert to world coordinates
    targetPlayerX = mouseX * 12;
    
    // Update cursor position
    if (mouseCursor) {
        mouseCursor.position.x = targetPlayerX;
    }
}

// Keyboard controls
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
    // Resume audio context if suspended
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    gameStarted = true;
    menu.style.display = "none";
    ui.style.display = "block";
    controlsInfo.style.display = "block";
    updateUI();
    
    // Start ambient sound
    if (audioInitialized && audioBuffers['ambient']) {
        playSound('ambient', { loop: true, volume: 0.2 });
    }
}

// Restart game
function restartGame() {
    // Reset game state
    gameOver = false;
    gamePaused = false;
    troops = 1;
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
    fusionRateElement.textContent = fusionRate;
    finalScore.textContent = troops;
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
    if (gamePaused && gameStarted) {
        renderer.render(scene, camera);
        return;
    }
    
    if (gameStarted && !gameOver) {
        // Convert time to seconds
        const now = time * 0.001;
        const deltaTime = now - timeElapsed;
        timeElapsed = now;
        
        // Smooth player movement
        if (player) {
            // Gradually move towards target position
            player.position.x += (targetPlayerX - player.position.x) * 0.05;
            
            // Limit position
            player.position.x = Math.max(-14, Math.min(14, player.position.x));
            
            // Slightly tilt when moving
            const tiltAmount = (player.position.x - targetPlayerX) * 0.03;
            player.rotation.z = tiltAmount;
            
            // Move all troops to follow the leader
            for (let i = 1; i < troopMeshes.length; i++) {
                const troop = troopMeshes[i];
                
                // Calculate positions in a grid pattern
                const row = Math.floor(i / 4);
                const col = i % 4;
                
                // Position offset from leader
                const offsetX = (col - 1.5) * 2.8;
                const offsetZ = -row * 2.8;
                
                // Target position
                const targetX = player.position.x + offsetX;
                const targetZ = player.position.z + offsetZ;
                
                // Smoother movement for followers
                troop.position.x += (targetX - troop.position.x) * 0.05;
                troop.position.z += (targetZ - troop.position.z) * 0.05;
                
                // Add gentle hovering motion
                troop.position.y = Math.sin(now * 3 + i) * 0.2;
                
                // Tilt in the direction of movement
                const followerTilt = (troop.position.x - targetX) * 0.03;
                troop.rotation.z = followerTilt;
            }
            
            // Add hovering motion to leader too
            player.position.y = Math.sin(now * 3) * 0.2;
        }
        
        // Spawn portals
        if (now - lastSpawnTime > portalSpawnRate) {
            lastSpawnTime = now;
            createPortal();
            
            // Gradually increase spawn rate with score
            portalSpawnRate = Math.max(0.8, 2 - (troops / 1000) * 0.5);
        }
        
        // Update portals
        for (let i = multipliers.length - 1; i >= 0; i--) {
            const portal = multipliers[i];
            
            // Move portal towards player
            portal.mesh.position.z += 0.3;
            
            // Animate portal rings
            if (portal.rings) {
                portal.rings[0].rotation.z += 0.01;
                portal.rings[1].rotation.z -= 0.015;
            }
            
            // Animate portal center
            if (portal.center) {
                portal.center.scale.x = 1 + Math.sin(now * 2) * 0.1;
                portal.center.scale.y = 1 + Math.sin(now * 2) * 0.1;
            }
            
            // Animate particles
            if (portal.particles) {
                const positions = portal.particles.geometry.attributes.position.array;
                const velocities = portal.particles.velocities;
                
                for (let j = 0; j < velocities.length; j++) {
                    const j3 = j * 3;
                    const vel = velocities[j];
                    
                    // Get current position
                    const x = positions[j3];
                    const y = positions[j3 + 1];
                    const z = positions[j3 + 2];
                    
                    // Calculate distance from center (ignoring y)
                    const distance = Math.sqrt(x * x + z * z);
                    
                    // Calculate current angle
                    let angle = Math.atan2(z, x);
                    
                    // Update angle and distance
                    angle += vel.angular;
                    const newDistance = distance + vel.radial;
                    
                    // If particle gets too far or too close, reverse direction
                    if (newDistance > 2.2 || newDistance < 0.2) {
                        vel.radial = -vel.radial;
                    }
                    
                    // Update position
                    positions[j3] = Math.cos(angle) * newDistance;
                    positions[j3 + 1] = y + vel.vertical;
                    positions[j3 + 2] = Math.sin(angle) * newDistance;
                    
                    // If particle moves too high or low, reverse vertical direction
                    if (y > 0.5 || y < -0.5) {
                        vel.vertical = -vel.vertical;
                    }
                }
                
                portal.particles.geometry.attributes.position.needsUpdate = true;
            }
            
            // Check for collision with player
            if (player && 
                portal.mesh.position.z > -2 && portal.mesh.position.z < 2 &&
                Math.abs(portal.mesh.position.x - player.position.x) < 4) {
                
                // Apply portal effect
                const oldTroops = troops;
                troops = portal.effect(troops);
                
                // Update fusion rate on significant gain
                if (troops > oldTroops * 2 && troops > 50) {
                    fusionRate = Math.min(fusionRate + 1, 10);
                }
                
                // Update troops visualization
                updateTroops();
                
                // Add visual effect for entering portal
                createPortalEntryEffect(player.position.x, player.position.z, portal.color);
                
                // Remove portal
                scene.remove(portal.mesh);
                multipliers.splice(i, 1);
                
                updateUI();
                checkGameOver();
            }
            // Remove if passed player
            else if (portal.mesh.position.z > 15) {
                scene.remove(portal.mesh);
                multipliers.splice(i, 1);
            }
        }
        
        // Update mouse cursor
        if (mouseCursor) {
            mouseCursor.position.z = 5;
        }
        
        // Update space track
        updateSpaceTrack();
        
        // Update space dust
        updateSpaceDust();
        
        // Update visual effects
        for (let i = effectsToUpdate.length - 1; i >= 0; i--) {
            const stillAlive = effectsToUpdate[i].update();
            if (!stillAlive) {
                effectsToUpdate.splice(i, 1);
            }
        }
        
        // Rotate starfield for subtle motion
        if (starField) {
            starField.rotation.y += 0.0001;
        }
    }
    
    renderer.render(scene, camera);
}

// Expose functions to global scope
window.startGame = startGame;
window.restartGame = restartGame;
window.gameInitialized = true;
