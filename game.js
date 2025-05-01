// Configuration de base
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Couleurs
const BLUE_TEAM = 0x1E90FF;
const RED_TEAM = 0xFF4500;

// Création du pont
function createBridge() {
    const bridgeGeometry = new THREE.BoxGeometry(5, 0.2, 30);
    const bridgeMaterial = new THREE.MeshPhongMaterial({ color: 0xCCCCCC });
    const bridge = new THREE.Mesh(bridgeGeometry, bridgeMaterial);
    
    // Ajout des structures du pont (pylônes et câbles)
    const pylonGeometry = new THREE.CylinderGeometry(0.2, 0.2, 10);
    const pylonMaterial = new THREE.MeshPhongMaterial({ color: 0xFF0000 });
    
    const pylon1 = new THREE.Mesh(pylonGeometry, pylonMaterial);
    pylon1.position.set(-3, -5, -10);
    
    const pylon2 = new THREE.Mesh(pylonGeometry, pylonMaterial);
    pylon2.position.set(3, -5, -10);
    
    const pylon3 = new THREE.Mesh(pylonGeometry, pylonMaterial);
    pylon3.position.set(-3, -5, 10);
    
    const pylon4 = new THREE.Mesh(pylonGeometry, pylonMaterial);
    pylon4.position.set(3, -5, 10);
    
    scene.add(bridge, pylon1, pylon2, pylon3, pylon4);
    
    // Création de l'eau
    const waterGeometry = new THREE.PlaneGeometry(100, 100);
    const waterMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x0077be, 
        transparent: true,
        opacity: 0.8
    });
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -5;
    scene.add(water);
    
    return bridge;
}

// Création d'un soldat
function createSoldier(team, position) {
    const group = new THREE.Group();
    
    // Corps
    const bodyGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.6);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xFFD700 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    
    // Tête
    const headGeometry = new THREE.SphereGeometry(0.2);
    const headMaterial = new THREE.MeshPhongMaterial({ color: 0xFFE4C4 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.5;
    
    // Casque
    const helmetGeometry = new THREE.SphereGeometry(0.25, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const helmetMaterial = new THREE.MeshPhongMaterial({ color: team });
    const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
    helmet.position.y = 0.5;
    
    group.add(body, head, helmet);
    group.position.copy(position);
    scene.add(group);
    
    return group;
}

// Création des équipes
function createTeam(team, count, startZ) {
    const soldiers = [];
    const teamColor = team === 'blue' ? BLUE_TEAM : RED_TEAM;
    
    for (let i = 0; i < count; i++) {
        const row = Math.floor(i / 5);
        const col = i % 5;
        const x = col * 0.5 - 1;
        const z = startZ + row * 0.5;
        
        const soldier = createSoldier(teamColor, new THREE.Vector3(x, 0.5, z));
        soldiers.push({
            mesh: soldier,
            health: 100,
            team: team,
            attacking: false
        });
    }
    
    return soldiers;
}

// Initialisation de la scène
function initScene() {
    // Lumières
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);
    
    // Création du pont
    const bridge = createBridge();
    
    // Création des équipes
    const blueTeam = createTeam('blue', 20, -10);
    const redTeam = createTeam('red', 10, 5);
    
    // Position de la caméra
    camera.position.set(0, 10, -15);
    camera.lookAt(0, 0, 0);
    
    return { bridge, blueTeam, redTeam };
}

// Variables de jeu
let gameObjects = initScene();
let gameState = {
    score: 0,
    running: true
};

// Animation et logique de jeu
function animate() {
    requestAnimationFrame(animate);
    
    if (gameState.running) {
        // Mise à jour des positions des soldats
        updateSoldiers(gameObjects.blueTeam, gameObjects.redTeam);
        
        // Vérification des collisions
        checkCollisions(gameObjects.blueTeam, gameObjects.redTeam);
        
        // Mise à jour du score
        document.getElementById('score').textContent = gameState.score;
    }
    
    renderer.render(scene, camera);
}

// Mise à jour des positions des soldats
function updateSoldiers(blueTeam, redTeam) {
    // Les soldats bleus avancent
    blueTeam.forEach(soldier => {
        if (soldier.health > 0 && !soldier.attacking) {
            soldier.mesh.position.z += 0.03;
        }
    });
    
    // Les soldats rouges avancent
    redTeam.forEach(soldier => {
        if (soldier.health > 0 && !soldier.attacking) {
            soldier.mesh.position.z -= 0.02;
        }
    });
}

// Vérification des collisions
function checkCollisions(blueTeam, redTeam) {
    blueTeam.forEach(blueSoldier => {
        if (blueSoldier.health <= 0) return;
        
        redTeam.forEach(redSoldier => {
            if (redSoldier.health <= 0) return;
            
            const distance = blueSoldier.mesh.position.distanceTo(redSoldier.mesh.position);
            
            if (distance < 0.7) {
                blueSoldier.attacking = true;
                redSoldier.attacking = true;
                
                // Combat
                if (Math.random() > 0.5) {
                    redSoldier.health -= 25;
                    if (redSoldier.health <= 0) {
                        scene.remove(redSoldier.mesh);
                        gameState.score += 10;
                        blueSoldier.attacking = false;
                    }
                } else {
                    blueSoldier.health -= 25;
                    if (blueSoldier.health <= 0) {
                        scene.remove(blueSoldier.mesh);
                        gameState.score -= 5;
                        redSoldier.attacking = false;
                    }
                }
            }
        });
    });
}

// Gestion du redimensionnement de la fenêtre
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Démarrer l'animation
animate();
