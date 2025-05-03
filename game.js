// Import Three.js
import * as THREE from "https://unpkg.com/three@0.157.0/build/three.module.js";

// Game variables
let scene, camera, renderer, player;
let gameStarted = false;
let gameOver = false;
let gamePaused = false;
let troops = 1;
let score = 0; // Maintenu pour compatibilité mais non utilisé
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
let flashEffect; // Pour l'effet de flash
let screenBorderEffect; // Pour le contour rouge
let bridgeElements = []; // Tableau pour stocker tous les éléments de pont

// Max troop visualization
const MAX_TROOPS_DISPLAYED = 30;

// Colors for evolved troops - Beaucoup plus de niveaux avec des couleurs vives
const troopColors = [
    0xffff00,  // Jaune vif - Level 1
    0xff6600,  // Orange vif - Level 2
    0xff3399,  // Rose vif - Level 3
    0x66ff33,  // Vert lime - Level 4
    0x00ffff,  // Cyan - Level 5
    0xff00ff,  // Magenta - Level 6
    0x9933ff,  // Violet - Level 7
    0xff3300,  // Rouge-orange - Level 8
    0x0099ff,  // Bleu ciel - Level 9
    0x33cc33   // Vert émeraude - Level 10
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
    camera.position.set(0, 18, 5); // Position plus proche de la route
    camera.lookAt(0, 0, -10);     // Point de focus plus proche
    
    // Create renderer with shadow support
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(gameContainer.clientWidth, gameContainer.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows
    gameContainer.appendChild(renderer.domElement);
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // Réduite pour accentuer les ombres
    scene.add(ambientLight);
    
    // Add directional light with shadows (soleil)
    const directionalLight = new THREE.DirectionalLight(0xffffcc, 1.0); // Lumière plus forte et légèrement jaune
    directionalLight.position.set(15, 30, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -30;
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.bottom = -30;
    scene.add(directionalLight);
    
    // Add secondary light for fill (lumière d'ambiance, moins forte)
    const fillLight = new THREE.DirectionalLight(0xccccff, 0.4); // Légèrement bleutée
    fillLight.position.set(-10, 10, -10);
    scene.add(fillLight);
    
    // Create enhanced bridge environment
    createBridgeEnvironment();
    
    // Create water surfaces
    createWaterSurfaces();
    
    // Create road segments (instead of a single bridge)
    createRoadSegments();
    
    // Create rails - Route élargie et bordure saumon/corail
    const railMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xFF5733,  // Rouge plus vif
        shininess: 60
    });
    
    // Création de rambardes de pont réalistes sur les côtés
    createRealisticBridgeRailings(-15, -40); // Élargi à -15 au lieu de -13
    createRealisticBridgeRailings(15, -40);  // Élargi à 15 au lieu de 13
    
    // Après la création des éléments du pont, enregistrer leurs positions initiales
    for (let i = 0; i < bridgeElements.length; i++) {
        const element = bridgeElements[i];
        if (!element.userData) {
            element.userData = {};
        }
        element.userData.initialZ = element.position.z;
    }
    
    // Create mouse cursor
    createMouseCursor();
    
    // Create screen effects for bonus/malus
    createScreenEffects();
    
    // Handle window resize
    window.addEventListener("resize", onWindowResize);
    
    // Add mouse controls
    gameContainer.addEventListener("mousemove", handleMouseMove);
    
    // Add initial troop
    updateTroops();
    
    // Start animation loop
    animate();
}

// Fonction pour créer l'ensemble du décor du pont
function createBridgeEnvironment() {
    // Créer le brouillard pour l'atmosphère (effet de profondeur)
    scene.fog = new THREE.Fog(0x87CEEB, 50, 150);
    
    // Créer le ciel avec dégradé
    createSkybox();
    
    // Ajouter des pylônes de pont
    createBridgePylons();
    
    // Ajouter des nuages
    createClouds();
    
    // Ajouter des oiseaux qui volent au loin
    createFlyingBirds();
    
    // Ajouter des câbles de suspension pour le pont
    createSuspensionCables();
}

// Fonction pour créer un skybox avec dégradé
function createSkybox() {
    const vertexShader = `
    varying vec3 vWorldPosition;
    void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`;

    const fragmentShader = `
    uniform vec3 topColor;
    uniform vec3 bottomColor;
    uniform float offset;
    uniform float exponent;
    varying vec3 vWorldPosition;
    void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
    }`;

    const uniforms = {
        topColor: { value: new THREE.Color(0x0077ff) },
        bottomColor: { value: new THREE.Color(0x89cff0) },
        offset: { value: 10 },
        exponent: { value: 0.6 }
    };

    const skyGeo = new THREE.SphereGeometry(500, 32, 15);
    const skyMat = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        uniforms: uniforms,
        side: THREE.BackSide
    });

    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);
}

// Fonction pour créer des pylônes de pont
// Fonction pour créer des pylônes de pont plus réguliers
function createBridgePylons() {
    // Nettoyons d'abord les éléments existants
    bridgeElements = [];
    
    // Matériaux 
    const pylonMaterial = new THREE.MeshPhongMaterial({
        color: 0xFF5733,
        shininess: 30
    });
    
    const metalMaterial = new THREE.MeshPhongMaterial({
        color: 0x888888,
        shininess: 80,
        metalness: 0.5
    });
    
    // Définir l'espacement exact entre les pylônes
    const pylonSpacing = 60; // Distance fixe entre chaque pylône
    const numPylons = 4; // Nombre de pylônes
    
    // Créer des pylônes à distances égales et exactes
    for (let i = 0; i < numPylons; i++) {
        const pylonGroup = new THREE.Group();
        
        // Position exacte de ce pylône
        const zPosition = -200 + (i * pylonSpacing);
        
        // Construire le pylône
        // Piliers verticaux
        const leftPillar = new THREE.Mesh(
            new THREE.BoxGeometry(2, 40, 2),
            pylonMaterial
        );
        leftPillar.position.set(-16, 10, 0);
        leftPillar.castShadow = true;
        pylonGroup.add(leftPillar);
        
        const rightPillar = new THREE.Mesh(
            new THREE.BoxGeometry(2, 40, 2),
            pylonMaterial
        );
        rightPillar.position.set(16, 10, 0);
        rightPillar.castShadow = true;
        pylonGroup.add(rightPillar);
        
        // Connexion horizontale
        const connector = new THREE.Mesh(
            new THREE.BoxGeometry(34, 2, 2),
            pylonMaterial
        );
        connector.position.set(0, 25, 0);
        connector.castShadow = true;
        pylonGroup.add(connector);
        
        // Détails métalliques
        for (let y = 5; y < 25; y += 5) {
            const leftDetail = new THREE.Mesh(
                new THREE.BoxGeometry(3, 0.5, 3),
                metalMaterial
            );
            leftDetail.position.set(-16, y, 0);
            pylonGroup.add(leftDetail);
            
            const rightDetail = new THREE.Mesh(
                new THREE.BoxGeometry(3, 0.5, 3),
                metalMaterial
            );
            rightDetail.position.set(16, y, 0);
            pylonGroup.add(rightDetail);
        }
        
        // Positionner le groupe de pylône
        pylonGroup.position.z = zPosition;
        
        // Enregistrer la position initiale exacte
        pylonGroup.userData = { 
            initialZ: zPosition,
            pylonSpacing: pylonSpacing,
            totalLength: pylonSpacing * numPylons
        };
        
        scene.add(pylonGroup);
        bridgeElements.push(pylonGroup);
    }
    
    // Créer les câbles de suspension en fonction des pylônes
    createSuspensionCables();
}

// Fonction pour créer les câbles de suspension
function createSuspensionCables() {
    // Matériau pour les câbles
    const cableMaterial = new THREE.MeshPhongMaterial({
        color: 0xDD3333,
        shininess: 80
    });
    
    // Groupe pour contenir tous les câbles
    const cablesGroup = new THREE.Group();
    
    // Créer les câbles principaux horizontaux (exactement de pylône à pylône)
    const leftMainCable = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 250, 8),
        cableMaterial
    );
    leftMainCable.rotation.z = Math.PI / 2;
    leftMainCable.position.set(-15, 25, -50);
    leftMainCable.castShadow = true;
    cablesGroup.add(leftMainCable);
    
    const rightMainCable = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 250, 8),
        cableMaterial
    );
    rightMainCable.rotation.z = Math.PI / 2;
    rightMainCable.position.set(15, 25, -50);
    rightMainCable.castShadow = true;
    cablesGroup.add(rightMainCable);
    
    // Câbles verticaux - placés exactement
    for (let z = -150; z <= 40; z += 10) {
        // Câble gauche
        const leftCable = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, 25, 4),
            cableMaterial
        );
        leftCable.position.set(-15, 12.5, z);
        leftCable.castShadow = true;
        cablesGroup.add(leftCable);
        
        // Câble droit
        const rightCable = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, 25, 4),
            cableMaterial
        );
        rightCable.position.set(15, 12.5, z);
        rightCable.castShadow = true;
        cablesGroup.add(rightCable);
    }
    
    scene.add(cablesGroup);
    
    // Enregistrer les informations exactes
    cablesGroup.userData = { 
        initialZ: -50,
        totalLength: 200
    };
    
    // Ajouter aux éléments du pont
    bridgeElements.push(cablesGroup);
}

// Fonction pour créer des nuages
function createClouds() {
    const cloudGroup = new THREE.Group();
    
    // Matériau pour les nuages
    const cloudMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8
    });
    
    // Fonction pour créer un nuage individuel
    function createCloud(x, y, z, scale) {
        const cloud = new THREE.Group();
        
        // Ajouter plusieurs sphères pour former un nuage
        const geometries = [
            new THREE.SphereGeometry(2, 8, 8),
            new THREE.SphereGeometry(1.5, 8, 8),
            new THREE.SphereGeometry(1.8, 8, 8),
            new THREE.SphereGeometry(1.7, 8, 8),
            new THREE.SphereGeometry(1.6, 8, 8)
        ];
        
        const positions = [
            [0, 0, 0],
            [-2, 0.3, 0.2],
            [2, 0.1, 0.3],
            [0, 0.5, -2],
            [0.3, 0.4, 2]
        ];
        
        for (let i = 0; i < geometries.length; i++) {
            const part = new THREE.Mesh(geometries[i], cloudMaterial);
            part.position.set(positions[i][0], positions[i][1], positions[i][2]);
            cloud.add(part);
        }
        
        cloud.position.set(x, y, z);
        cloud.scale.set(scale, scale, scale);
        
        return cloud;
    }
    
    // Créer plusieurs nuages à différentes positions
    for (let i = 0; i < 20; i++) {
        const x = (Math.random() - 0.5) * 200;
        const y = 30 + Math.random() * 20;
        const z = (Math.random() - 0.5) * 300;
        const scale = 2 + Math.random() * 3;
        
        const cloud = createCloud(x, y, z, scale);
        cloudGroup.add(cloud);
    }
    
    scene.add(cloudGroup);
    
    // Animation des nuages
    function animateClouds() {
        cloudGroup.children.forEach(cloud => {
            cloud.position.z += 0.02;
            if (cloud.position.z > 150) {
                cloud.position.z = -150;
            }
        });
        
        requestAnimationFrame(animateClouds);
    }
    
    animateClouds();
}

// Fonction pour créer des oiseaux volants
function createFlyingBirds() {
    const birdsGroup = new THREE.Group();
    
    // Matériau pour les oiseaux (silhouettes simplement)
    const birdMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000
    });
    
    // Forme simple d'oiseau
    function createBird() {
        const birdGroup = new THREE.Group();
        
        // Corps
        const body = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 8, 8),
            birdMaterial
        );
        birdGroup.add(body);
        
        // Ailes (simples plans triangulaires)
        const wingGeometry = new THREE.BufferGeometry();
        const vertices = new Float32Array([
            0, 0, 0,
            1, 0.2, 0,
            0.8, 0, 0.2
        ]);
        wingGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        
        const leftWing = new THREE.Mesh(wingGeometry, birdMaterial);
        leftWing.position.set(-0.2, 0, 0);
        birdGroup.add(leftWing);
        
        const rightWing = new THREE.Mesh(wingGeometry, birdMaterial);
        rightWing.position.set(0.2, 0, 0);
        rightWing.scale.x = -1;
        birdGroup.add(rightWing);
        
        return birdGroup;
    }
    
    // Créer un vol d'oiseaux
    for (let i = 0; i < 15; i++) {
        const bird = createBird();
        
        // Position dans une formation en V
        const angle = (i % 2 === 0) ? (i / 15) * Math.PI * 0.2 : -(i / 15) * Math.PI * 0.2;
        const distance = (i / 15) * 10;
        
        bird.position.set(
            Math.sin(angle) * distance,
            40 + Math.random() * 10,
            -Math.cos(angle) * distance - 50
        );
        
        // Rotation pour qu'ils "volent" dans la bonne direction
        bird.rotation.y = angle;
        
        // Animation des ailes
        bird.wingAngle = Math.random() * Math.PI;
        bird.wingSpeed = 0.1 + Math.random() * 0.1;
        
        birdsGroup.add(bird);
    }
    
    scene.add(birdsGroup);
    
    // Animation du vol
    function animateBirds() {
        birdsGroup.position.z += 0.1;
        
        if (birdsGroup.position.z > 100) {
            birdsGroup.position.z = -200;
        }
        
        birdsGroup.children.forEach(bird => {
            bird.wingAngle += bird.wingSpeed;
            
            // Mouvement des ailes
            if (bird.children[1] && bird.children[2]) {
                bird.children[1].rotation.z = Math.sin(bird.wingAngle) * 0.3;
                bird.children[2].rotation.z = -Math.sin(bird.wingAngle) * 0.3;
            }
        });
        
        requestAnimationFrame(animateBirds);
    }
    
    animateBirds();
}

// Fonction pour créer les câbles de suspension
function createSuspensionCables() {
    // Matériau pour les câbles
    const cableMaterial = new THREE.MeshPhongMaterial({
        color: 0xDD3333, // Rouge plus foncé pour les câbles
        shininess: 80
    });
    
    // Groupe pour contenir tous les câbles
    const cablesGroup = new THREE.Group();
    
    // Câbles principaux horizontaux (de chaque côté)
    const leftMainCable = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 250, 8),
        cableMaterial
    );
    leftMainCable.rotation.z = Math.PI / 2;
    leftMainCable.position.set(-15, 25, -50); // Élargi à -15 au lieu de -13
    leftMainCable.castShadow = true;
    cablesGroup.add(leftMainCable);
    
    const rightMainCable = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 250, 8),
        cableMaterial
    );
    rightMainCable.rotation.z = Math.PI / 2;
    rightMainCable.position.set(15, 25, -50); // Élargi à 15 au lieu de 13
    rightMainCable.castShadow = true;
    cablesGroup.add(rightMainCable);
    
    // Câbles verticaux (qui relient le câble principal à la route)
    for (let z = -150; z <= 40; z += 10) {
        // Câble gauche
        const leftCable = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, 25, 4),
            cableMaterial
        );
        leftCable.position.set(-15, 12.5, z); // Élargi à -15 au lieu de -13
        leftCable.castShadow = true;
        cablesGroup.add(leftCable);
        
        // Câble droit
        const rightCable = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, 25, 4),
            cableMaterial
        );
        rightCable.position.set(15, 12.5, z); // Élargi à 15 au lieu de 13
        rightCable.castShadow = true;
        cablesGroup.add(rightCable);
    }
    
    scene.add(cablesGroup);
    
    // Stocker la position initiale
    cablesGroup.userData = { initialZ: -50 };
    
    // Ajouter le groupe de câbles au tableau des éléments du pont
    bridgeElements.push(cablesGroup);
}

// Create water surfaces
function createWaterSurfaces() {
    const waterGeometry = new THREE.PlaneGeometry(150, 150); // Agrandi à 150x150 au lieu de 100x100
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
    waterLeft.position.set(-80, -1, -20); // Position reculée (-20 en z)
    waterLeft.receiveShadow = true; // Reçoit les ombres des autres objets
    scene.add(waterLeft);
    
    // Right water
    waterRight = new THREE.Mesh(waterGeometry, waterMaterial);
    waterRight.rotation.x = -Math.PI / 2;
    waterRight.position.set(80, -1, -20); // Position reculée (-20 en z)
    waterRight.receiveShadow = true; // Reçoit les ombres des autres objets
    scene.add(waterRight);
}

// Fonction pour créer les rambardes de pont réalistes
function createRealisticBridgeRailings(xPos, zPos) {
    // Groupe pour les rambardes
    const railingGroup = new THREE.Group();
    
    // Matériau pour les rambardes principales (rouge plus vif)
    const railingMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xFF5733, // Rouge plus vif
        shininess: 60
    });
    
    // Matériau pour les câbles
    const cableMaterial = new THREE.MeshPhongMaterial({
        color: 0xDD3333, // Rouge plus foncé pour les câbles
        shininess: 80
    });
    
    // Longueur totale des rambardes - augmentée pour couvrir toute la route
    const railingLength = 200; // Était 150
    const segmentLength = 10;
    const numSegments = Math.floor(railingLength / segmentLength);
    
    // Base de la rambarde (barre horizontale du bas)
    const baseRail = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, railingLength),
        railingMaterial
    );
    baseRail.position.set(0, 0.75, zPos + railingLength/2 - 60); // Ajusté pour couvrir plus de longueur
    baseRail.castShadow = true;
    baseRail.receiveShadow = true;
    railingGroup.add(baseRail);
    
    // Créer les supports verticaux et la barre du haut
    for (let i = 0; i <= numSegments; i++) {
        // Support vertical
        const verticalPost = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 1.5, 0.5),
            railingMaterial
        );
        
        const postZ = zPos + i * segmentLength - 60;
        verticalPost.position.set(0, 1.5, postZ);
        verticalPost.castShadow = true;
        verticalPost.receiveShadow = true;
        railingGroup.add(verticalPost);
        
        // Barres horizontales supplémentaires (rambarde supérieure)
        if (i < numSegments) {
            const topRail = new THREE.Mesh(
                new THREE.BoxGeometry(0.5, 0.5, segmentLength + 0.1),
                railingMaterial
            );
            topRail.position.set(0, 2.25, postZ + segmentLength/2);
            topRail.castShadow = true;
            topRail.receiveShadow = true;
            railingGroup.add(topRail);
            
            // Ajouter des câbles diagonaux entre les supports
            const cable = new THREE.Mesh(
                new THREE.CylinderGeometry(0.05, 0.05, Math.sqrt(Math.pow(segmentLength, 2) + Math.pow(1.5, 2))),
                cableMaterial
            );
            
            // Positionner et orienter le câble diagonal
            cable.position.set(0, 1.5, postZ + segmentLength/2);
            
            // Calculer l'angle pour orienter les câbles
            const angle = Math.atan2(1.5, segmentLength);
            cable.rotation.x = Math.PI/2 - angle;
            
            cable.castShadow = true;
            railingGroup.add(cable);
        }
    }
    
    // Positionner le groupe complet à l'emplacement x demandé
    railingGroup.position.x = xPos;
    
    // Stocker la position initiale pour l'animation fluide
    railingGroup.userData = { initialZ: zPos };
    
    // Ajouter à la liste des éléments du pont au lieu de roadSegments
    bridgeElements.push(railingGroup);
    
    // Ajouter le groupe à la scène
    scene.add(railingGroup);
    
    return railingGroup;
}

// Fonction améliorée pour créer des segments de route sans trous
function createRoadSegments() {
    // Utilisons une taille fixe pour tous les segments
    const segmentLength = 25;
    const numSegments = 20;
    
    // Textures avec les nouvelles couleurs
    const roadTexture = createRoadTexture();
    const roadMaterial = new THREE.MeshPhongMaterial({
        map: roadTexture,
        color: 0xffffff, // Blanc pour préserver la texture
        shininess: 20
    });
    
    // CHANGEMENTS IMPORTANTS: Plus de chevauchement, alignement parfait
    roadSegments = []; // Vider le tableau pour éviter les doublons
    
    // Créer un groupe unique pour tous les segments de route
    const roadGroup = new THREE.Group();
    scene.add(roadGroup);
    
    // Créer les segments en les positionnant exactement bout à bout
    for (let i = 0; i < numSegments; i++) {
        const segment = new THREE.Mesh(
            new THREE.BoxGeometry(30, 0.5, segmentLength),
            roadMaterial
        );
        
        // Position exacte: chaque segment est placé exactement à la fin du précédent
        segment.position.set(0, -0.25, -150 + (i * segmentLength));
        segment.receiveShadow = true;
        
        // Stocker la position z initiale
        segment.userData = { 
            initialZ: segment.position.z,
            segmentLength: segmentLength
        };
        
        roadGroup.add(segment);
        roadSegments.push(segment);
    }
    
    // Ajouter des segments de transition pour assurer la continuité - PLUS LARGES
    const transitionSegment1 = new THREE.Mesh(
        new THREE.BoxGeometry(30, 0.5, 15), // Plus long (10 → 15)
        roadMaterial
    );
    transitionSegment1.position.set(0, -0.25, 25); // Légèrement plus loin
    transitionSegment1.receiveShadow = true;
    scene.add(transitionSegment1);
    roadSegments.push(transitionSegment1);
    
    const transitionSegment2 = new THREE.Mesh(
        new THREE.BoxGeometry(30, 0.5, 15), // Plus long (10 → 15)
        roadMaterial
    );
    transitionSegment2.position.set(0, -0.25, -150); // Plus loin en arrière
    transitionSegment2.receiveShadow = true;
    scene.add(transitionSegment2);
    roadSegments.push(transitionSegment2);
}

// Update road segments to avoid gaps
function updateRoadSegments() {
    if (gamePaused) return;
    
    // Vitesse de déplacement commune
    const moveSpeed = 0.2;
    
    // Calculer la longueur totale de tous les segments de route
    const totalRoadLength = roadSegments[0].userData.segmentLength * roadSegments.length;
    
    // Déplacer tous les segments de route ensemble
    for (let i = 0; i < roadSegments.length; i++) {
        const segment = roadSegments[i];
        
        // Avancer le segment
        segment.position.z += moveSpeed;
        
        // Si le segment est trop avancé, le replacer exactement à l'arrière
        if (segment.position.z > 50) {
            segment.position.z -= totalRoadLength;
        }
    }
    
    // Animation des éléments du pont - simplifiée pour éviter les sauts
    for (let i = 0; i < bridgeElements.length; i++) {
        const element = bridgeElements[i];
        
        // Avancer l'élément
        element.position.z += moveSpeed;
        
        // Si l'élément a dépassé la caméra, calculer son repositionnement exact
        if (element.position.z > 80) {
            // Déterminer la distance totale du cycle (tous les ponts alignés)
            const totalPontLength = 200; // Longueur du cycle complet des ponts
            
            // Repositionner à la fin exacte de tous les ponts visibles
            element.position.z -= totalPontLength;
        }
    }
}
    
    // Animation fluide des éléments du pont - Même méthode que pour les segments de route
    const bridgeLength = 200; // Même valeur utilisée dans le code original
    
    // Faire avancer tous les éléments du pont de manière coordonnée
    for (let i = 0; i < bridgeElements.length; i++) {
        const element = bridgeElements[i];
        
        // Position initiale de l'élément
        const initialZ = element.userData?.initialZ || 0;
        
        // Avancer l'élément
        element.position.z += moveSpeed;
        
        // Si l'élément a dépassé la caméra, le repositionner de manière fluide
        if (element.position.z > 80) {
            // Calculer le décalage exact pour le ramener en arrière
            const offset = Math.ceil((element.position.z - initialZ) / bridgeLength) * bridgeLength;
            element.position.z -= offset;
        }
    }
}

// Create road texture with lane markings
function createRoadTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    
    // Road background - Nouvelle couleur demandée
    ctx.fillStyle = "#AEADB2"; // Couleur de route demandée
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Lane markings (3 lanes) avec marquages plus longs et nouvelle couleur
    ctx.strokeStyle = "#DCE7DF"; // Nouvelle couleur pour les marquages
    ctx.lineWidth = 8; // Ligne plus épaisse
    ctx.setLineDash([40, 20]); // Marquages plus longs
    
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

// Create screen effects for bonus/malus
function createScreenEffects() {
    // White flash effect for bonuses - vide, effet supprimé
    const flashGeometry = new THREE.PlaneGeometry(100, 100);
    const flashMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthTest: false,
        blending: THREE.AdditiveBlending // Pour un effet plus lumineux
    });
    flashEffect = new THREE.Mesh(flashGeometry, flashMaterial);
    flashEffect.position.set(0, 0, -10);
    flashEffect.renderOrder = 999; // Render on top of everything
    scene.add(flashEffect);
    
    // Red border effect for maluses
    const borderGeometry = new THREE.RingGeometry(30, 35, 32);
    const borderMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthTest: false
    });
    screenBorderEffect = new THREE.Mesh(borderGeometry, borderMaterial);
    screenBorderEffect.position.set(0, 0, -10);
    screenBorderEffect.renderOrder = 999; // Render on top of everything
    scene.add(screenBorderEffect);
}

// Show white flash effect - supprimé
function showFlashEffect() {
    // Ne rien faire - effet supprimé
}

// Show red border effect
function showBorderEffect() {
    // Reset opacity
    screenBorderEffect.material.opacity = 0.7;
    
    // Create animation
    const borderAnimation = {
        life: 30, // Frames to live
        update: function() {
            // Fade out
            screenBorderEffect.material.opacity *= 0.95;
            
            // Decrease life
            this.life--;
            
            // Remove when done
            if (this.life <= 0) {
                screenBorderEffect.material.opacity = 0;
                return false;
            }
            
            return true;
        }
    };
    
    // Add to array of effects to update
    effectsToUpdate.push(borderAnimation);
}

// Create a chicken based on level with more realistic model - Version corrigée
function createTroopMesh(level = 0, position = { x: 0, z: 0 }) {
    const troopGroup = new THREE.Group();
    
    // Rotation des poulets pour qu'ils regardent vers la caméra
    troopGroup.rotation.y = Math.PI; // Cette ligne fait tourner le poulet de 180°
    
    // Size increases with level
    const sizeMultiplier = 1 + (level * 0.25);
    
    // CORPS DU POULET AMÉLIORÉ
    
    // Corps principal (plus ovale et réaliste)
    const bodyGeometry = new THREE.SphereGeometry(0.4 * sizeMultiplier, 24, 24);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: troopColors[level],
        shininess: 30
    });
    
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.scale.set(0.9, 1.2, 1.1); // Plus allongé verticalement
    body.position.y = 0.5 * sizeMultiplier;
    body.castShadow = true;
    troopGroup.add(body);
    
    // Ajout d'un torse/poitrine plus bombé
    const chestGeometry = new THREE.SphereGeometry(0.35 * sizeMultiplier, 24, 24);
    const chest = new THREE.Mesh(chestGeometry, bodyMaterial);
    chest.scale.set(1.1, 1, 0.9);
    chest.position.set(0, 0.6 * sizeMultiplier, 0.15 * sizeMultiplier);
    chest.castShadow = true;
    troopGroup.add(chest);
    
    // Tête plus détaillée
    const headGeometry = new THREE.SphereGeometry(0.28 * sizeMultiplier, 24, 24);
    const headMaterial = new THREE.MeshPhongMaterial({ 
        color: troopColors[level],
        shininess: 40
    });
    
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, 0.9 * sizeMultiplier, 0.3 * sizeMultiplier);
    head.castShadow = true;
    troopGroup.add(head);
    
    // Crête plus réaliste
    const combGeometry = new THREE.BoxGeometry(
        0.15 * sizeMultiplier, 
        0.2 * sizeMultiplier,
        0.1 * sizeMultiplier
    );
    const combMaterial = new THREE.MeshPhongMaterial({
        color: 0xff3333,
        shininess: 80
    });
    
    const comb = new THREE.Mesh(combGeometry, combMaterial);
    comb.position.set(0, 1.1 * sizeMultiplier, 0.3 * sizeMultiplier);
    comb.castShadow = true;
    troopGroup.add(comb);
    
    // Barbillon (wattle) sous le bec
    const wattleGeometry = new THREE.SphereGeometry(0.15 * sizeMultiplier, 16, 16);
    const wattleMaterial = new THREE.MeshPhongMaterial({
        color: 0xff3333,
        shininess: 70
    });
    
    const wattle = new THREE.Mesh(wattleGeometry, wattleMaterial);
    wattle.scale.set(0.6, 1, 0.5);
    wattle.position.set(0, 0.7 * sizeMultiplier, 0.5 * sizeMultiplier);
    wattle.castShadow = true;
    troopGroup.add(wattle);
    
    // Bec plus réaliste
    const beakUpperGeometry = new THREE.ConeGeometry(0.1 * sizeMultiplier, 0.25 * sizeMultiplier, 16);
    const beakLowerGeometry = new THREE.ConeGeometry(0.09 * sizeMultiplier, 0.2 * sizeMultiplier, 16);
    const beakMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xffb700,
        shininess: 60
    });
    
    const beakUpper = new THREE.Mesh(beakUpperGeometry, beakMaterial);
    beakUpper.rotation.x = Math.PI / 2;
    beakUpper.position.set(0, 0.85 * sizeMultiplier, 0.55 * sizeMultiplier);
    beakUpper.scale.set(1, 1, 0.5); // Aplatir le bec
    beakUpper.castShadow = true;
    troopGroup.add(beakUpper);
    
    const beakLower = new THREE.Mesh(beakLowerGeometry, beakMaterial);
    beakLower.rotation.x = Math.PI / 2;
    beakLower.position.set(0, 0.75 * sizeMultiplier, 0.55 * sizeMultiplier);
    beakLower.scale.set(1, 1, 0.4); // Aplatir le bec inférieur
    beakLower.castShadow = true;
    troopGroup.add(beakLower);
    
    // Yeux plus réalistes
    const eyeGeometry = new THREE.SphereGeometry(0.06 * sizeMultiplier, 16, 16);
    const eyeWhiteMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyePupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const eyeHighlightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
    // Left eye
    const leftEyeWhite = new THREE.Mesh(eyeGeometry, eyeWhiteMaterial);
    leftEyeWhite.position.set(-0.15 * sizeMultiplier, 0.9 * sizeMultiplier, 0.42 * sizeMultiplier);
    troopGroup.add(leftEyeWhite);
    
    const leftEyePupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.03 * sizeMultiplier, 12, 12),
        eyePupilMaterial
    );
    leftEyePupil.position.set(-0.15 * sizeMultiplier, 0.9 * sizeMultiplier, 0.47 * sizeMultiplier);
    troopGroup.add(leftEyePupil);
    
    const leftEyeHighlight = new THREE.Mesh(
        new THREE.SphereGeometry(0.01 * sizeMultiplier, 8, 8),
        eyeHighlightMaterial
    );
    leftEyeHighlight.position.set(-0.145 * sizeMultiplier, 0.91 * sizeMultiplier, 0.49 * sizeMultiplier);
    troopGroup.add(leftEyeHighlight);
    
    // Right eye
    const rightEyeWhite = new THREE.Mesh(eyeGeometry, eyeWhiteMaterial);
    rightEyeWhite.position.set(0.15 * sizeMultiplier, 0.9 * sizeMultiplier, 0.42 * sizeMultiplier);
    troopGroup.add(rightEyeWhite);
    
    const rightEyePupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.03 * sizeMultiplier, 12, 12),
        eyePupilMaterial
    );
    rightEyePupil.position.set(0.15 * sizeMultiplier, 0.9 * sizeMultiplier, 0.47 * sizeMultiplier);
    troopGroup.add(rightEyePupil);
    
    const rightEyeHighlight = new THREE.Mesh(
        new THREE.SphereGeometry(0.01 * sizeMultiplier, 8, 8),
        eyeHighlightMaterial
    );
    rightEyeHighlight.position.set(0.145 * sizeMultiplier, 0.91 * sizeMultiplier, 0.49 * sizeMultiplier);
    troopGroup.add(rightEyeHighlight);
    
    // Ailes simples mais visibles et fonctionnelles (corrigé)
    const wingGeometry = new THREE.BoxGeometry(
        0.3 * sizeMultiplier,
        0.5 * sizeMultiplier,
        0.1 * sizeMultiplier
    );
    
    const wingMaterial = new THREE.MeshPhongMaterial({
        color: troopColors[level],
        shininess: 30
    });
    
    // Left wing - simplifiée mais fonctionnelle
    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
    leftWing.position.set(-0.4 * sizeMultiplier, 0.6 * sizeMultiplier, 0);
    leftWing.rotation.z = -0.3; // Angle initial
    leftWing.castShadow = true;
    troopGroup.add(leftWing);
    
    // Right wing - simplifiée mais fonctionnelle
    const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
    rightWing.position.set(0.4 * sizeMultiplier, 0.6 * sizeMultiplier, 0);
    rightWing.rotation.z = 0.3; // Angle initial
    rightWing.castShadow = true;
    troopGroup.add(rightWing);
    
    // Pattes plus réalistes
    const legMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xffaa00,
        shininess: 30
    });
    
    function createLeg(xPos) {
        // Cuisse
        const thighGeometry = new THREE.CylinderGeometry(
            0.05 * sizeMultiplier, 
            0.04 * sizeMultiplier, 
            0.2 * sizeMultiplier
        );
        const thigh = new THREE.Mesh(thighGeometry, legMaterial);
        thigh.position.set(xPos, 0.3 * sizeMultiplier, 0);
        thigh.rotation.z = 0.3; // Légère inclinaison
        thigh.castShadow = true;
        troopGroup.add(thigh);
        
        // Partie inférieure de la patte
        const shinGeometry = new THREE.CylinderGeometry(
            0.03 * sizeMultiplier, 
            0.02 * sizeMultiplier, 
            0.25 * sizeMultiplier
        );
        const shin = new THREE.Mesh(shinGeometry, legMaterial);
        shin.position.set(xPos, 0.13 * sizeMultiplier, 0);
        shin.castShadow = true;
        troopGroup.add(shin);
        
        // Pied
        const footGeometry = new THREE.BoxGeometry(
            0.12 * sizeMultiplier, 
            0.02 * sizeMultiplier, 
            0.15 * sizeMultiplier
        );
        const foot = new THREE.Mesh(footGeometry, legMaterial);
        foot.position.set(xPos, 0 * sizeMultiplier, 0.05 * sizeMultiplier);
        foot.castShadow = true;
        troopGroup.add(foot);
        
        // Orteils
        for (let i = 0; i < 3; i++) {
            const toeGeometry = new THREE.CylinderGeometry(
                0.015 * sizeMultiplier,
                0.01 * sizeMultiplier,
                0.08 * sizeMultiplier
            );
            const toe = new THREE.Mesh(toeGeometry, legMaterial);
            toe.rotation.x = Math.PI / 2;
            toe.position.set(
                xPos + (i - 1) * 0.04 * sizeMultiplier,
                0,
                0.13 * sizeMultiplier
            );
            toe.castShadow = true;
            troopGroup.add(toe);
        }
    }
    
    // Créer les deux pattes
    createLeg(-0.15 * sizeMultiplier);
    createLeg(0.15 * sizeMultiplier);
    
    // Queue
    const tailGeometry = new THREE.SphereGeometry(0.2 * sizeMultiplier, 16, 16);
    const tail = new THREE.Mesh(tailGeometry, new THREE.MeshPhongMaterial({
        color: troopColors[level],
        shininess: 30
    }));
    tail.position.set(0, 0.7 * sizeMultiplier, -0.4 * sizeMultiplier);
    tail.scale.set(1, 1.2, 0.8);
    tail.castShadow = true;
    troopGroup.add(tail);
    
    // Plumes de queue simplifiées
    const tailFeathersGroup = new THREE.Group();
    for (let i = 0; i < 5; i++) {
        const tailFeatherGeometry = new THREE.BoxGeometry(
            0.08 * sizeMultiplier,
            0.3 * sizeMultiplier,
            0.02 * sizeMultiplier
        );
        const tailFeather = new THREE.Mesh(tailFeatherGeometry, new THREE.MeshPhongMaterial({
            color: troopColors[level],
            shininess: 30
        }));
        
        const angle = (i - 2) * 0.2;
        tailFeather.position.set(
            0.15 * sizeMultiplier * Math.sin(angle),
            0.1 * sizeMultiplier,
            -0.1 * sizeMultiplier * Math.cos(angle)
        );
        tailFeather.rotation.y = angle;
        tailFeather.rotation.x = -0.8;
        tailFeather.castShadow = true;
        tailFeathersGroup.add(tailFeather);
    }
    tailFeathersGroup.position.set(0, 0.7 * sizeMultiplier, -0.4 * sizeMultiplier);
    troopGroup.add(tailFeathersGroup);
    
    // Special accessories for higher levels
    if (level >= 3) {
        // Add a crown for level 3+
        const crownGeometry = new THREE.CylinderGeometry(
            0.2 * sizeMultiplier, 
            0.25 * sizeMultiplier, 
            0.15 * sizeMultiplier, 
            16, 
            1, 
            true
        );
        const crownMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xffdd00, 
            shininess: 100 
        });
        const crown = new THREE.Mesh(crownGeometry, crownMaterial);
        crown.position.set(0, 1.2 * sizeMultiplier, 0.2 * sizeMultiplier);
        crown.castShadow = true;
        troopGroup.add(crown);
        
        // Ajout de pointes à la couronne
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const spike = new THREE.Mesh(
                new THREE.ConeGeometry(0.03 * sizeMultiplier, 0.1 * sizeMultiplier, 8),
                crownMaterial
            );
            spike.position.set(
                Math.cos(angle) * 0.2 * sizeMultiplier,
                1.3 * sizeMultiplier,
                Math.sin(angle) * 0.2 * sizeMultiplier + 0.2 * sizeMultiplier
            );
            spike.castShadow = true;
            troopGroup.add(spike);
        }
        
        // Ajout d'un médaillon/gemme sur la couronne
        const gemGeometry = new THREE.SphereGeometry(0.06 * sizeMultiplier, 16, 16);
        const gemMaterial = new THREE.MeshPhongMaterial({
            color: 0x00ffff,
            shininess: 100,
            specular: 0xffffff
        });
        const gem = new THREE.Mesh(gemGeometry, gemMaterial);
        gem.position.set(0, 1.2 * sizeMultiplier, 0.4 * sizeMultiplier);
        gem.castShadow = true;
        troopGroup.add(gem);
    }
    
    // Ajout d'un effet de particules pour les poulets évolués
    if (level >= 2) {
        // Ajout d'un effet de particules pour les poulets évolués
        const particleCount = 10 + level * 5;
        const particleGeometry = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            const angle = Math.random() * Math.PI * 2;
            const radius = 0.6 * sizeMultiplier + Math.random() * 0.3;
            particlePositions[i3] = Math.cos(angle) * radius;
            particlePositions[i3 + 1] = 0.5 * sizeMultiplier + Math.random() * 0.5;
            particlePositions[i3 + 2] = Math.sin(angle) * radius;
        }
        
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
            color: troopColors[level],
            size: 0.05 * sizeMultiplier,
            transparent: true,
            opacity: 0.7
        });
        
        const particles = new THREE.Points(particleGeometry, particleMaterial);
        troopGroup.add(particles);
        
        // Stocker les particules pour l'animation
        troopGroup.particles = particles;
    }
    
    // Set position
    troopGroup.position.set(position.x, 0, position.z);
    troopGroup.level = level;
    
    // Add to scene
    scene.add(troopGroup);
    
    return troopGroup;
}

// Update troops visualization with better spacing
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
    let troopCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // Level 1-10
    
    // Calculate troop distribution using fusion rate
    while (remainingTroops > 0) {
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
        
        // Limit total visualized troops
        if (troopMeshes.length + troopCounts.reduce((a, b) => a + b, 0) > MAX_TROOPS_DISPLAYED) {
            break;
        }
    }
    
    // Create troops of each level in formation with better spacing
    // Position légèrement reculée
    let xPos = -6;
    let zPos = -3; // Reculé de -2 à -3
    const xSpacing = 2.5; 
    const zSpacing = 2.5; 
    
    // Create highest level troops first (bigger ones in back)
    for (let level = 9; level >= 0; level--) {
        const count = troopCounts[level];
        for (let i = 0; i < count && troopMeshes.length < MAX_TROOPS_DISPLAYED; i++) {
            const troop = createTroopMesh(level, { x: xPos, z: zPos });
            troopMeshes.push(troop);
            
            // Set the first troop as player
            if (!player) player = troop;
            
            // Update position for next troop with better spacing
            xPos += xSpacing;
            if (xPos > 6) {
                xPos = -6;
                zPos -= zSpacing;
            }
        }
    }
    
    // If no troops were created, create at least one
    if (troopMeshes.length === 0) {
        const troop = createTroopMesh(0, { x: 0, z: -3 }); // Reculé de -2 à -3
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
        { op: "×", color: 0x00ddff, min: 2, max: 3, positive: true },  // Multiplication max 3 au lieu de 5
        { op: "÷", color: 0xff2222, min: 2, max: 3, positive: false }  // Vibrant red for division
    ];
    
    // Randomly select type - plus de malus que de bonus
    let typeIndex;
    if (Math.random() < 0.65) { // 65% de chance d'avoir un malus
        // Sélection parmi les malus (index 1 et 3)
        typeIndex = Math.random() < 0.5 ? 1 : 3; // - ou ÷
    } else {
        // Sélection parmi les bonus (index 0 et 2)
        typeIndex = Math.random() < 0.5 ? 0 : 2; // + ou ×
    }
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
    
    // Set random position on x-axis et très loin en z pour apparition
    const x = Math.random() * 20 - 10; // Entre -10 et 10
    doorGroup.position.set(x, 0, -120); // -120 au lieu de -80 pour apparaître beaucoup plus loin
    
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
    targetPlayerX = mouseX * 10; // Multiplier par 10 au lieu de 8 pour la route plus large
    
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
    fusionRateElement.textContent = fusionRate;
    finalScore.textContent = troops; // Le score final est le nombre de poulets
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
            player.position.x = Math.max(-12, Math.min(12, player.position.x)); // Limites plus larges
            
            // Move all troops to follow the leader in formation with better spacing
            for (let i = 1; i < troopMeshes.length; i++) {
                const troop = troopMeshes[i];
                
                // Calculate positions in a grid pattern with more space
                const row = Math.floor(i / 4); // 4 poulets par rangée au lieu de 5
                const col = i % 4;
                
                // Position offset from leader with more space
                const offsetX = (col - 1.5) * 2.5; // Plus d'espace (2.5 au lieu de 2.0)
                const offsetZ = -row * 2.5; // Plus d'espace (2.5 au lieu de 2.0)
                
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
                    troop.children[5].rotation.z = Math.sin(now * 10 + i) * 0.2 - 0.3;
                }
                if (troop.children[6]) { // Right wing
                    troop.children[6].rotation.z = -Math.sin(now * 10 + i) * 0.2 + 0.3;
                }
            }
            
            // Add chicken waddle animation to leader too
            player.position.y = Math.sin(now * 8) * 0.1;
            
            // Wing flapping for leader
            if (player.children[5]) { // Left wing
                player.children[5].rotation.z = Math.sin(now * 10) * 0.2 - 0.3;
            }
            if (player.children[6]) { // Right wing
                player.children[6].rotation.z = -Math.sin(now * 10) * 0.2 + 0.3;
            }
            
            // Animer les particules des poulets évolués
            for (let i = 0; i < troopMeshes.length; i++) {
                const troop = troopMeshes[i];
                if (troop.particles) {
                    troop.particles.rotation.y += 0.02; // Rotation des particules
                }
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
            
            // Check for collision with player - ZONE DE COLLISION AGRANDIE
            if (player && 
                multiplier.mesh.position.z > -2 && multiplier.mesh.position.z < 2 &&
                Math.abs(multiplier.mesh.position.x - player.position.x) < 3) { // Agrandie de 2 à 3
                
                // Apply multiplier effect
                const oldTroops = troops;
                troops = multiplier.effect(troops);
                
                // Fusion rate ne change que sur gain important
                if (troops > oldTroops * 2 && troops > 50) {
                    fusionRate = Math.min(fusionRate + 1, 10);
                }
                
                // Update troops visualization
                updateTroops();
                
                // Add visual effect for entering portal (conservé)
                createPortalEntryEffect(player.position.x, player.position.z, multiplier.color);
                
                // Suppression des effets de flash
                // Plus d'appel à showFlashEffect() ou showBorderEffect()
                
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
        
        // Update road segments - Fonction améliorée
        updateRoadSegments();
        
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
