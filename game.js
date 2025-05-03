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
let lastBarrelSpawnTime = 0;
let barrelSpawnRate = 3; // Temps en secondes entre les apparitions de tonneaux
let mouseCursor;
let roadSegments = [];
let waterLeft, waterRight;
let effectsToUpdate = [];
let flashEffect; // Pour l'effet de flash
let screenBorderEffect; // Pour le contour rouge
let bridgeElements = []; // Tableau pour stocker tous les éléments de pont
let barrels = []; // Tableau pour stocker les tonneaux
let eggs = []; // Tableau pour stocker les œufs tirés
let lastShootTime = 0;
let shootCooldown = 0.5; // Temps en secondes entre les tirs

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
gameContainer.addEventListener("click", shootEgg); // Ajout d'un événement pour tirer des œufs

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
    
    // Create continuous road (système amélioré)
    createContinuousRoad();
    
    // Create rails - Route élargie et bordure saumon/corail
    const railMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xFF5733,  // Rouge plus vif
        shininess: 60
    });
    
    // Création de rambardes de pont réalistes sur les côtés
    createRealisticBridgeRailings(-15, 0); // Élargi à -15 au lieu de -13
    createRealisticBridgeRailings(15, 0);  // Élargi à 15 au lieu de 13
    
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
function createBridgePylons() {
    // Matériaux pour les pylônes
    const pylonMaterial = new THREE.MeshPhongMaterial({
        color: 0xFF5733, // Rouge plus vif
        shininess: 30
    });
    
    const metalMaterial = new THREE.MeshPhongMaterial({
        color: 0x888888,
        shininess: 80,
        metalness: 0.5
    });
    
    // Création des pylônes principaux (en forme de H)
    function createPylon(zPosition) {
        const pylonGroup = new THREE.Group();
        
        // Piliers verticaux
        const leftPillar = new THREE.Mesh(
            new THREE.BoxGeometry(2, 40, 2),
            pylonMaterial
        );
        leftPillar.position.set(-16, 10, zPosition);
        leftPillar.castShadow = true;
        pylonGroup.add(leftPillar);
        
        const rightPillar = new THREE.Mesh(
            new THREE.BoxGeometry(2, 40, 2),
            pylonMaterial
        );
        rightPillar.position.set(16, 10, zPosition);
        rightPillar.castShadow = true;
        pylonGroup.add(rightPillar);
        
        // Connexion horizontale
        const connector = new THREE.Mesh(
            new THREE.BoxGeometry(34, 2, 2),
            pylonMaterial
        );
        connector.position.set(0, 25, zPosition);
        connector.castShadow = true;
        pylonGroup.add(connector);
        
        // Détails métalliques
        for (let y = 5; y < 25; y += 5) {
            const leftDetail = new THREE.Mesh(
                new THREE.BoxGeometry(3, 0.5, 3),
                metalMaterial
            );
            leftDetail.position.set(-16, y, zPosition);
            pylonGroup.add(leftDetail);
            
            const rightDetail = new THREE.Mesh(
                new THREE.BoxGeometry(3, 0.5, 3),
                metalMaterial
            );
            rightDetail.position.set(16, y, zPosition);
            pylonGroup.add(rightDetail);
        }
        
        return pylonGroup;
    }
    
    // Créer plusieurs pylônes à différentes distances
    const pylon1 = createPylon(-60);
    scene.add(pylon1);
    
    const pylon2 = createPylon(-120);
    scene.add(pylon2);
    
    const pylon3 = createPylon(20);
    scene.add(pylon3);
    
    // Ajouter les pylônes au tableau des éléments du pont
    bridgeElements.push(pylon1);
    bridgeElements.push(pylon2);
    bridgeElements.push(pylon3);
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
    baseRail.position.set(0, 0.75, zPos - railingLength/2 + 60); // Position ajustée
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
        
        const postZ = zPos - railingLength/2 + 60 + i * segmentLength;
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
    
    // Ajouter à la liste des éléments du pont
    bridgeElements.push(railingGroup);
    
    // Ajouter le groupe à la scène
    scene.add(railingGroup);
    
    return railingGroup;
}

// Fonction améliorée pour créer une route continue sans sauts
function createContinuousRoad() {
    // Texture de route avec les nouvelles couleurs demandées
    const roadTexture = createRoadTexture();
    const roadMaterial = new THREE.MeshPhongMaterial({
        map: roadTexture,
        color: 0xAEADB2, // Nouvelle couleur demandée pour la route
        shininess: 20
    });
    
    // Créer une seule longue route en continu
    const roadLength = 1000; // Route très longue
    const visibleRoadLength = 200; // Portion visible de la route
    const roadSegmentLength = 25; // Longueur d'un segment de route
    const numSegments = Math.ceil(visibleRoadLength / roadSegmentLength) + 2; // +2 pour avoir de la marge

    // Création des segments pour la première fois
    for (let i = 0; i < numSegments; i++) {
        const segment = new THREE.Mesh(
            new THREE.BoxGeometry(30, 0.5, roadSegmentLength),
            roadMaterial
        );
        
        // Position initiale des segments
        segment.position.set(0, -0.25, -visibleRoadLength/2 + i * roadSegmentLength);
        segment.receiveShadow = true;
        scene.add(segment);
        
        // Stockage pour le recyclage
        segment.originalIndex = i;
        roadSegments.push(segment);
    }
}

// Fonction améliorée pour l'animation fluide de la route
function updateRoadSegments() {
    // Vitesse de déplacement commune
    const moveSpeed = 0.2;
    
    // Faire avancer tous les segments de route
    for (let i = 0; i < roadSegments.length; i++) {
        const segment = roadSegments[i];
        segment.position.z += moveSpeed;
        
        // Si le segment est complètement passé devant la caméra
        if (segment.position.z > 40) {
            // Trouver le segment le plus en arrière
            let farthestZ = 100;
            let farthestIndex = -1;
            
            for (let j = 0; j < roadSegments.length; j++) {
                if (roadSegments[j].position.z < farthestZ) {
                    farthestZ = roadSegments[j].position.z;
                    farthestIndex = j;
                }
            }
            
            // Calculer la nouvelle position pour un placement continu
            const segmentLength = segment.geometry.parameters.depth;
            const newZ = roadSegments[farthestIndex].position.z - segmentLength;
            
            // Positionner ce segment juste derrière le plus éloigné
            segment.position.z = newZ;
        }
    }

    // Appliquer la même technique pour les éléments du pont
    for (let i = 0; i < bridgeElements.length; i++) {
        const element = bridgeElements[i];
        element.position.z += moveSpeed;
        
        // Si l'élément est passé devant la caméra
        if (element.position.z > 100) {
            // Chercher l'élément le plus en arrière du même type
            let farthestZ = 100;
            let farthestSameTypeIndex = -1;
            
            for (let j = 0; j < bridgeElements.length; j++) {
                if (bridgeElements[j].constructor === element.constructor && 
                    bridgeElements[j].position.z < farthestZ) {
                    farthestZ = bridgeElements[j].position.z;
                    farthestSameTypeIndex = j;
                }
            }
            
            // Si on trouve un élément similaire, placer cet élément derrière
            if (farthestSameTypeIndex !== -1) {
                // Estimer la "taille" de l'élément pour un placement continu
                const estimatedDepth = 20; // Estimation de la profondeur d'un élément du pont
                const newZ = bridgeElements[farthestSameTypeIndex].position.z - estimatedDepth - 50;
                element.position.z = newZ;
            } else {
                // Sinon repositionner loin en arrière
                element.position.z = -200;
            }
        }
    }
}

// Create road texture with lane markings
function createRoadTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    
    // Road background avec la nouvelle couleur demandée
    ctx.fillStyle = "#AEADB2"; // Nouvelle couleur grise pour la route
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Lane markings (3 lanes) avec marquages plus longs
    ctx.strokeStyle = "#DCE7DF"; // Nouvelle couleur demandée pour les traits
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

// Fonction pour créer un tonneau avec des PV
function createBarrel() {
    // Groupe pour le tonneau
    const barrelGroup = new THREE.Group();
    
    // Matériaux pour le tonneau
    const woodMaterial = new THREE.MeshPhongMaterial({
        color: 0x8B4513, // Brun bois
        shininess: 40
    });
    
    const metalMaterial = new THREE.MeshPhongMaterial({
        color: 0x888888, // Gris métallique
        shininess: 80
    });
    
    // Corps du tonneau
    const barrelBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 0.8, 1.6, 16),
        woodMaterial
    );
    barrelBody.rotation.x = Math.PI / 2; // Rotation pour que le tonneau soit horizontal
    barrelBody.castShadow = true;
    barrelGroup.add(barrelBody);
    
    // Anneaux métalliques du tonneau
    const ringPositions = [-0.6, -0.2, 0.2, 0.6]; // Positions pour les anneaux
    
    for (let pos of ringPositions) {
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.81, 0.1, 8, 16),
            metalMaterial
        );
        ring.position.z = pos;
        ring.rotation.x = Math.PI / 2;
        ring.castShadow = true;
        barrelGroup.add(ring);
    }
    
    // Définir une position aléatoire sur la route
    const lane = Math.floor(Math.random() * 3) - 1; // -1, 0, ou 1
    const xPos = lane * 8; // Positionner dans une des trois voies
    
    barrelGroup.position.set(xPos, 0.8, -120); // Positionner loin derrière
    
    // Ajouter des propriétés pour le gameplay
    barrelGroup.userData = {
        health: 3, // Points de vie
        speed: 0.3 + Math.random() * 0.2, // Vitesse aléatoire
        rotationSpeed: 0.05 + Math.random() * 0.05 // Vitesse de rotation
    };
    
    // Ajouter un texte pour afficher les PV
    const healthDisplay = createHealthDisplay(barrelGroup.userData.health);
    healthDisplay.position.y = 1.5;
    barrelGroup.add(healthDisplay);
    barrelGroup.userData.healthDisplay = healthDisplay;
    
    scene.add(barrelGroup);
    barrels.push(barrelGroup);
    
    return barrelGroup;
}

// Créer un affichage des PV au-dessus du tonneau
function createHealthDisplay(health) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    
    // Fond transparent
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Texte des PV
    ctx.fillStyle = "#ff0000";
    ctx.font = "bold 40px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(health.toString(), canvas.width/2, canvas.height/2);
    
    // Créer une texture et un matériau
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    // Créer le plan d'affichage
    const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 0.5),
        material
    );
    
    return plane;
}

// Fonction pour mettre à jour l'affichage des PV
function updateHealthDisplay(barrel) {
    const health = barrel.userData.health;
    const healthDisplay = barrel.userData.healthDisplay;
    
    if (!healthDisplay) return;
    
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    
    // Fond transparent
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Texte des PV avec couleur basée sur la vie restante
    const color = health > 2 ? "#00ff00" : health > 1 ? "#ffff00" : "#ff0000";
    ctx.fillStyle = color;
    ctx.font = "bold 40px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(health.toString(), canvas.width/2, canvas.height/2);
    
    // Mettre à jour la texture
    const texture = new THREE.CanvasTexture(canvas);
    healthDisplay.material.map.dispose();
    healthDisplay.material.map = texture;
    healthDisplay.material.needsUpdate = true;
}

// Fonction pour créer un œuf tiré par un poulet
function createEgg(position) {
    // Géométrie et matériau pour l'œuf
    const eggGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    eggGeometry.scale(1, 1.3, 1); // Légèrement étiré pour forme d'œuf
    
    const eggMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xffffff, 
        shininess: 90 
    });
    
    const egg = new THREE.Mesh(eggGeometry, eggMaterial);
    egg.position.copy(position);
    egg.position.y += 0.5; // Ajuster la hauteur
    egg.position.z -= 1; // Devant le poulet
    egg.castShadow = true;
    
    // Propriétés de l'œuf
    egg.userData = {
        speed: 0.8, // Vitesse de l'œuf
        damage: 1 // Dégâts infligés
    };
    
    scene.add(egg);
    eggs.push(egg);
    
    return egg;
}

// Fonction pour tirer un œuf depuis le poulet leader
function shootEgg() {
    if (!gameStarted || gameOver || gamePaused || !player) return;
    
    // Vérifier si le cooldown est terminé
    const currentTime = Date.now() / 1000;
    if (currentTime - lastShootTime < shootCooldown) return;
    
    // Mettre à jour le temps du dernier tir
    lastShootTime = currentTime;
    
    // Créer l'œuf à la position du leader
    createEgg(player.position.clone());
    
    // Jouer un son (à implémenter)
    // playSound('shoot');
}

// Fonction pour créer une explosion de sang
function createBloodExplosion(position) {
    // Groupe pour contenir l'explosion
    const explosionGroup = new THREE.Group();
    explosionGroup.position.copy(position);
    
    // Matériau pour le sang
    const bloodMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.8
    });
    
    // Créer des gouttelettes de sang
    const dropletCount = 30;
    const droplets = [];
    
    for (let i = 0; i < dropletCount; i++) {
        const size = 0.05 + Math.random() * 0.15;
        const droplet = new THREE.Mesh(
            new THREE.SphereGeometry(size, 8, 8),
            bloodMaterial
        );
        
        // Position aléatoire autour du centre
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 0.2;
        droplet.position.set(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            Math.random() * 0.2 - 0.1
        );
        
        // Vélocité aléatoire pour l'animation
        droplet.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                Math.random() * 0.15,
                (Math.random() - 0.5) * 0.2
            ),
            gravity: 0.005,
            life: 30 + Math.floor(Math.random() * 20)
        };
        
        explosionGroup.add(droplet);
        droplets.push(droplet);
    }
    
    scene.add(explosionGroup);
    
    // Animation de l'explosion
    const bloodAnimation = {
        group: explosionGroup,
        droplets: droplets,
        life: 50, // Durée de vie de l'explosion
        update: function() {
            // Animer chaque gouttelette
            for (let droplet of this.droplets) {
                // Appliquer la vélocité
                droplet.position.x += droplet.userData.velocity.x;
                droplet.position.y += droplet.userData.velocity.y;
                droplet.position.z += droplet.userData.velocity.z;
                
                // Appliquer la gravité
                droplet.userData.velocity.y -= droplet.userData.gravity;
                
                // Réduire la vie et l'opacité
                droplet.userData.life--;
                if (droplet.userData.life <= 0) {
                    droplet.visible = false;
                } else {
                    droplet.material.opacity = droplet.userData.life / 50;
                }
            }
            
            // Réduire la vie de l'explosion
            this.life--;
            
            // Retirer l'explosion quand terminée
            if (this.life <= 0) {
                scene.remove(this.group);
                return false;
            }
            
            return true;
        }
    };
    
    effectsToUpdate.push(bloodAnimation);
    return bloodAnimation;
}

// Fonction pour créer une explosion du tonneau
function createBarrelExplosion(position) {
    // Groupe pour contenir l'explosion
    const explosionGroup = new THREE.Group();
    explosionGroup.position.copy(position);
    
    // Matériaux pour les débris
    const woodMaterial = new THREE.MeshPhongMaterial({
        color: 0x8B4513,
        transparent: true,
        opacity: 1
    });
    
    const metalMaterial = new THREE.MeshPhongMaterial({
        color: 0x888888,
        transparent: true,
        opacity: 1
    });
    
    // Créer des débris de bois
    const debrisCount = 20;
    const debris = [];
    
    for (let i = 0; i < debrisCount; i++) {
        // Alterner entre débris de bois et métal
        const material = i % 5 === 0 ? metalMaterial : woodMaterial;
        const size = 0.1 + Math.random() * 0.2;
        
        // Formes variées pour les débris
        let debrisGeometry;
        const shapeType = Math.floor(Math.random() * 3);
        
        if (shapeType === 0) {
            debrisGeometry = new THREE.BoxGeometry(size, size, size);
        } else if (shapeType === 1) {
            debrisGeometry = new THREE.SphereGeometry(size, 4, 4);
        } else {
            debrisGeometry = new THREE.ConeGeometry(size, size * 2, 4);
        }
        
        const debrisPiece = new THREE.Mesh(debrisGeometry, material);
        
        // Position aléatoire autour du centre
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 0.5;
        debrisPiece.position.set(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            Math.random() * 0.5 - 0.25
        );
        
        // Rotation aléatoire
        debrisPiece.rotation.set(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        );
        
        // Vélocité aléatoire pour l'animation
        debrisPiece.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.3,
                Math.random() * 0.2,
                (Math.random() - 0.5) * 0.3
            ),
            rotationSpeed: new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1
            ),
            gravity: 0.007,
            life: 40 + Math.floor(Math.random() * 30)
        };
        
        explosionGroup.add(debrisPiece);
        debris.push(debrisPiece);
    }
    
    scene.add(explosionGroup);
    
    // Animation de l'explosion
    const explosionAnimation = {
        group: explosionGroup,
        debris: debris,
        life: 60, // Durée de vie de l'explosion
        update: function() {
            // Animer chaque débris
            for (let debrisPiece of this.debris) {
                // Appliquer la vélocité
                debrisPiece.position.x += debrisPiece.userData.velocity.x;
                debrisPiece.position.y += debrisPiece.userData.velocity.y;
                debrisPiece.position.z += debrisPiece.userData.velocity.z;
                
                // Appliquer la rotation
                debrisPiece.rotation.x += debrisPiece.userData.rotationSpeed.x;
                debrisPiece.rotation.y += debrisPiece.userData.rotationSpeed.y;
                debrisPiece.rotation.z += debrisPiece.userData.rotationSpeed.z;
                
                // Appliquer la gravité
                debrisPiece.userData.velocity.y -= debrisPiece.userData.gravity;
                
                // Réduire la vie et l'opacité
                debrisPiece.userData.life--;
                if (debrisPiece.userData.life <= 0) {
                    debrisPiece.visible = false;
                } else {
                    debrisPiece.material.opacity = debrisPiece.userData.life / 60;
                }
            }
            
            // Réduire la vie de l'explosion
            this.life--;
            
            // Retirer l'explosion quand terminée
            if (this.life <= 0) {
                scene.remove(this.group);
                return false;
            }
            
            return true;
        }
    };
    
    effectsToUpdate.push(explosionAnimation);
    
    // Ajouter un effet de flash lumineux au centre de l'explosion
    const flashGeometry = new THREE.SphereGeometry(1, 16, 16);
    const flashMaterial = new THREE.MeshBasicMaterial({
        color: 0xff9933,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending
    });
    
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    explosionGroup.add(flash);
    
    // Animation pour le flash
    const flashAnimation = {
        mesh: flash,
        life: 10,
        scale: 0.1,
        update: function() {
            this.mesh.scale.set(this.scale, this.scale, this.scale);
            this.scale += 0.2;
            this.life--;
            this.mesh.material.opacity = this.life / 10;
            
            if (this.life <= 0) {
                explosionGroup.remove(this.mesh);
                return false;
            }
            
            return true;
        }
    };
    
    effectsToUpdate.push(flashAnimation);
    
    return explosionAnimation;
}

// Create a chicken based on level with more realistic model
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
    
    // Ailes simples mais visibles et fonctionnelles
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
