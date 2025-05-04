// Constantes et configuration globale
// Constantes et configuration globale
const GAME_CONFIG = {
    // Configuration inchangée
};

// Classes principales
class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x87CEEB); // Couleur du ciel
        document.getElementById('gameContainer').appendChild(this.renderer.domElement);

        // État du jeu
        this.gameState = {
            isPlaying: true,
            distance: 0,
            coins: 0,
            stars: 0,
            time: GAME_CONFIG.levelDuration,
            level: 1,
            activePowerUps: [],
            lastPlayerShoot: 0,
            lastEnemySpawn: 0,
            lastPowerUpSpawn: 0
        };
        
        // Collection d'objets - DÉPLACÉ AVANT les appels aux méthodes setup
        this.objects = {
            player: null,
            enemies: [],
            projectiles: [],
            powerUps: [],
            particles: [],
            drones: []
        };

        // Initialisation
        this.setupLights();
        this.setupEnvironment();
        this.setupCamera();
        this.setupJoystick();
        this.setupPlayer();
        this.setupEnemies();
        this.setupProjectiles();
        this.setupPowerUps();
        this.setupEventListeners();
        this.setupUI();
        
        // Lancer la boucle de jeu
        this.gameLoop();
    }
    
    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 20, 10);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
    }
    
    setupEnvironment() {
        // Création de la route
        const roadGeometry = new THREE.BoxGeometry(10, 0.5, GAME_CONFIG.levelLength);
        const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x999999 });
        this.road = new THREE.Mesh(roadGeometry, roadMaterial);
        this.road.position.set(0, -0.25, -GAME_CONFIG.levelLength / 2);
        this.road.receiveShadow = true;
        this.scene.add(this.road);
        
        // Création des bords de la route
        const borderGeometry = new THREE.BoxGeometry(0.5, 1, GAME_CONFIG.levelLength);
        const borderMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        
        this.leftBorder = new THREE.Mesh(borderGeometry, borderMaterial);
        this.leftBorder.position.set(-5.25, 0, -GAME_CONFIG.levelLength / 2);
        this.scene.add(this.leftBorder);
        
        this.rightBorder = new THREE.Mesh(borderGeometry, borderMaterial);
        this.rightBorder.position.set(5.25, 0, -GAME_CONFIG.levelLength / 2);
        this.scene.add(this.rightBorder);
        
        // Création de l'eau (environnement)
        const waterGeometry = new THREE.PlaneGeometry(100, GAME_CONFIG.levelLength);
        const waterMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x0077be,
            transparent: true,
            opacity: 0.8
        });
        this.water = new THREE.Mesh(waterGeometry, waterMaterial);
        this.water.rotation.x = -Math.PI / 2;
        this.water.position.set(0, -1, -GAME_CONFIG.levelLength / 2);
        this.scene.add(this.water);
        
        // Ajout d'éléments décoratifs (ponts, câbles, etc.)
        this.createBridgeElements();
    }
    
    createBridgeElements() {
        // Créer les piliers de pont
        const pillarGeometry = new THREE.CylinderGeometry(0.5, 0.5, 10, 8);
        const pillarMaterial = new THREE.MeshStandardMaterial({ color: 0x882222 });
        
        const pillarSpacing = 50;
        const pillarCount = Math.floor(GAME_CONFIG.levelLength / pillarSpacing);
        
        for (let i = 0; i < pillarCount; i++) {
            // Pilier gauche
            const leftPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
            leftPillar.position.set(-8, -5, -i * pillarSpacing);
            this.scene.add(leftPillar);
            
            // Pilier droit
            const rightPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
            rightPillar.position.set(8, -5, -i * pillarSpacing);
            this.scene.add(rightPillar);
            
            // Créer un câble entre les piliers
            this.createCableBetweenPillars(leftPillar, rightPillar);
        }
    }
    
    createCableBetweenPillars(pillar1, pillar2) {
        const cableGeometry = new THREE.CylinderGeometry(0.1, 0.1, 16, 8);
        cableGeometry.rotateZ(Math.PI / 2);
        const cableMaterial = new THREE.MeshStandardMaterial({ color: 0xcc3333 });
        const cable = new THREE.Mesh(cableGeometry, cableMaterial);
        
        // Position au milieu entre les deux piliers
        cable.position.set(0, 4, pillar1.position.z);
        
        this.scene.add(cable);
    }
    
    setupCamera() {
        // Vue Third Person avec angle incliné
        this.camera.position.set(0, 8, 15);
        this.camera.rotation.x = -Math.PI / 8;
        
        // La caméra suivra le joueur
        this.cameraOffset = new THREE.Vector3(0, 8, 15);
    }
    
    setupJoystick() {
        this.joystick = {
            element: document.getElementById('joystick'),
            knob: document.getElementById('joystickKnob'),
            active: false,
            startPos: { x: 0, y: 0 },
            currentPos: { x: 0, y: 0 },
            value: { x: 0, y: 0 },
            maxDistance: 50  // Distance maximale du joystick en pixels
        };
        
        // Gestionnaires d'événements
        this.joystick.element.addEventListener('touchstart', this.onJoystickStart.bind(this));
        this.joystick.element.addEventListener('touchmove', this.onJoystickMove.bind(this));
        this.joystick.element.addEventListener('touchend', this.onJoystickEnd.bind(this));
        
        // Aussi pour la souris (pour test sur desktop)
        this.joystick.element.addEventListener('mousedown', this.onJoystickStart.bind(this));
        document.addEventListener('mousemove', this.onJoystickMove.bind(this));
        document.addEventListener('mouseup', this.onJoystickEnd.bind(this));
    }
    
    onJoystickStart(event) {
        event.preventDefault();
        this.joystick.active = true;
        
        if (event.type === 'touchstart') {
            const touch = event.touches[0];
            const rect = this.joystick.element.getBoundingClientRect();
            this.joystick.startPos = {
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top
            };
        } else {
            const rect = this.joystick.element.getBoundingClientRect();
            this.joystick.startPos = {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top
            };
        }
        
        this.joystick.currentPos = { ...this.joystick.startPos };
    }
    
    onJoystickMove(event) {
        if (!this.joystick.active) return;
        
        event.preventDefault();
        
        if (event.type === 'touchmove') {
            const touch = event.touches[0];
            const rect = this.joystick.element.getBoundingClientRect();
            this.joystick.currentPos = {
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top
            };
        } else {
            const rect = this.joystick.element.getBoundingClientRect();
            this.joystick.currentPos = {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top
            };
        }
        
        // Calculer la distance et normaliser
        const dx = this.joystick.currentPos.x - this.joystick.startPos.x;
        const dy = this.joystick.currentPos.y - this.joystick.startPos.y;
        
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        if (distance > this.joystick.maxDistance) {
            this.joystick.currentPos.x = this.joystick.startPos.x + Math.cos(angle) * this.joystick.maxDistance;
            this.joystick.currentPos.y = this.joystick.startPos.y + Math.sin(angle) * this.joystick.maxDistance;
        }
        
        // Mettre à jour la position du knob
        const knobX = this.joystick.currentPos.x - this.joystick.startPos.x + 25;
        const knobY = this.joystick.currentPos.y - this.joystick.startPos.y + 25;
        
        this.joystick.knob.style.transform = `translate(${knobX - 25}px, ${knobY - 25}px)`;
        
        // Calculer les valeurs de contrôle (-1 à 1)
        this.joystick.value.x = (this.joystick.currentPos.x - this.joystick.startPos.x) / this.joystick.maxDistance;
        this.joystick.value.y = (this.joystick.currentPos.y - this.joystick.startPos.y) / this.joystick.maxDistance;
    }
    
    onJoystickEnd(event) {
        if (!this.joystick.active) return;
        
        this.joystick.active = false;
        
        // Réinitialiser le knob
        this.joystick.knob.style.transform = `translate(0px, 0px)`;
        
        // Réinitialiser les valeurs
        this.joystick.value = { x: 0, y: 0 };
    }
    
    setupPlayer() {
        // Créer un groupe pour le joueur et ses soldats
        this.objects.player = new THREE.Group();
        this.objects.player.position.set(0, 0, 0);
        
        // Créer le modèle du joueur (pour maintenant, une simple forme)
        const playerGeometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
        const playerMaterial = new THREE.MeshStandardMaterial({ color: 0x3366ff });
        
        // Créer plusieurs soldats en formation
        const formation = [
            { x: 0, z: 0 },    // Leader au centre
            { x: -1, z: 0 },   // Soldats à gauche
            { x: 1, z: 0 },    // Soldats à droite
            { x: -0.5, z: 1 }, // Rangée derrière
            { x: 0.5, z: 1 },
            { x: -1.5, z: 1 },
            { x: 1.5, z: 1 },
            { x: -1, z: 2 },   // Dernière rangée
            { x: 0, z: 2 },
            { x: 1, z: 2 },
        ];
        
        for (const pos of formation) {
            const soldier = new THREE.Mesh(playerGeometry, playerMaterial);
            soldier.position.set(pos.x, 0.75, pos.z);
            soldier.castShadow = true;
            
            // Ajouter un chapeau bleu
            const hatGeometry = new THREE.SphereGeometry(0.3, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
            const hatMaterial = new THREE.MeshStandardMaterial({ color: 0x3399ff });
            const hat = new THREE.Mesh(hatGeometry, hatMaterial);
            hat.position.y = 0.7;
            soldier.add(hat);
            
            // Ajouter une arme
            const gunGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.5);
            const gunMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
            const gun = new THREE.Mesh(gunGeometry, gunMaterial);
            gun.position.set(0.3, 0.2, -0.4);
            soldier.add(gun);
            
            // Ajouter au groupe principal
            this.objects.player.add(soldier);
        }
        
        // Définir les propriétés du joueur
        this.objects.player.health = GAME_CONFIG.playerHealth;
        this.objects.player.damage = 10;
        this.objects.player.shootRate = GAME_CONFIG.playerShootRate;
        
        // Ajouter à la scène
        this.scene.add(this.objects.player);
        
        // Créer un collider pour le joueur
        this.objects.player.collider = new THREE.Box3().setFromObject(this.objects.player);
    }
    
    setupEnemies() {
        // Les ennemis seront créés dynamiquement pendant le jeu
        this.enemyPool = [];
        
        // Créer des ennemis pour le pool d'objets (reutilisation)
        for (let i = 0; i < GAME_CONFIG.maxEnemiesOnScreen; i++) {
            this.createEnemyForPool('basic');
            this.createEnemyForPool('shooter');
            this.createEnemyForPool('tank');
        }
    }
    
    createEnemyForPool(type) {
        const enemyConfig = GAME_CONFIG.enemyTypes[type];
        
        // Groupe pour l'ennemi
        const enemy = new THREE.Group();
        
        // Corps principal
        const bodyGeometry = new THREE.CapsuleGeometry(0.5 * enemyConfig.scale, 1 * enemyConfig.scale, 4, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: enemyConfig.color });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.75 * enemyConfig.scale;
        body.castShadow = true;
        enemy.add(body);
        
        // Chapeau rouge
        const hatGeometry = new THREE.SphereGeometry(0.3 * enemyConfig.scale, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const hatMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const hat = new THREE.Mesh(hatGeometry, hatMaterial);
        hat.position.y = 0.7 * enemyConfig.scale;
        body.add(hat);
        
        // Ajouter une arme si c'est un tireur
        if (enemyConfig.shootsBack) {
            const gunGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.5);
            const gunMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
            const gun = new THREE.Mesh(gunGeometry, gunMaterial);
            gun.position.set(0.3, 0.2, 0.4);
            body.add(gun);
        }
        
        // Propriétés de l'ennemi
        enemy.type = type;
        enemy.health = enemyConfig.health;
        enemy.maxHealth = enemyConfig.health;
        enemy.damage = enemyConfig.damage;
        enemy.speed = enemyConfig.speed;
        enemy.points = enemyConfig.points;
        enemy.shootsBack = enemyConfig.shootsBack;
        enemy.lastShot = 0;
        enemy.shootRate = enemyConfig.shootRate || 0;
        enemy.active = false;
        enemy.scale = enemyConfig.scale;
        
        // Cacher l'ennemi
        enemy.visible = false;
        
        // Ajouter à la scène et au pool
        this.scene.add(enemy);
        this.enemyPool.push(enemy);
        
        return enemy;
    }
    
    setupProjectiles() {
        // Pool de projectiles
        this.projectilePool = {
            player: [],
            enemy: []
        };
        
        // Créer les projectiles pour le pool
        for (let i = 0; i < 50; i++) {
            this.createProjectileForPool('player');
            this.createProjectileForPool('enemy');
        }
    }
    
    createProjectileForPool(type) {
        let color, size;
        
        if (type === 'player') {
            color = 0x00ffff;
            size = 0.1;
        } else { // enemy
            color = 0xff5500;
            size = 0.15;
        }
        
        // Créer un projectile
        const projectileGeometry = new THREE.CylinderGeometry(size, size, 0.5, 8);
        projectileGeometry.rotateX(Math.PI / 2); // Orienter le cylindre vers l'avant
        
        const projectileMaterial = new THREE.MeshStandardMaterial({ 
            color: color,
            emissive: color,
            emissiveIntensity: 0.5
        });
        
        const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
        projectile.castShadow = true;
        
        // Ajouter un effet de lumière
        const light = new THREE.PointLight(color, 0.5, 2);
        light.position.set(0, 0, 0);
        projectile.add(light);
        
        // Propriétés du projectile
        projectile.type = type;
        projectile.damage = type === 'player' ? 10 : 5;
        projectile.speed = type === 'player' ? 20 : -15;
        projectile.active = false;
        
        // Cacher le projectile
        projectile.visible = false;
        
        // Ajouter à la scène et au pool
        this.scene.add(projectile);
        this.projectilePool[type].push(projectile);
        
        return projectile;
    }
    
    setupPowerUps() {
        // Pool de power-ups
        this.powerUpPool = [];
        
        // Créer les power-ups pour le pool
        for (const type in GAME_CONFIG.powerUps) {
            for (let i = 0; i < 3; i++) { // 3 de chaque type
                this.createPowerUpForPool(type);
            }
        }
    }
    
    createPowerUpForPool(type) {
        const powerUpConfig = GAME_CONFIG.powerUps[type];
        
        // Créer un power-up
        const powerUpGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const powerUpMaterial = new THREE.MeshStandardMaterial({ 
            color: powerUpConfig.color,
            emissive: powerUpConfig.color,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.8
        });
        
        const powerUp = new THREE.Mesh(powerUpGeometry, powerUpMaterial);
        powerUp.castShadow = true;
        
        // Ajouter un effet de lumière
        const light = new THREE.PointLight(powerUpConfig.color, 1, 3);
        light.position.set(0, 0, 0);
        powerUp.add(light);
        
        // Un symbole pour identifier le type
        let symbol;
        switch (type) {
            case 'shield':
                symbol = '🛡️';
                break;
            case 'speedBoost':
                symbol = '⚡';
                break;
            case 'attackBoost':
                symbol = '💥';
                break;
            case 'drone':
                symbol = '🤖';
                break;
        }
        
        // Propriétés du power-up
        powerUp.type = type;
        powerUp.duration = powerUpConfig.duration;
        powerUp.multiplier = powerUpConfig.multiplier || 1;
        powerUp.symbol = symbol;
        powerUp.active = false;
        
        // Cacher le power-up
        powerUp.visible = false;
        
        // Ajouter à la scène et au pool
        this.scene.add(powerUp);
        this.powerUpPool.push(powerUp);
        
        return powerUp;
    }
    
    setupEventListeners() {
        // Gestion du redimensionnement de la fenêtre
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // Gestion des boutons UI
        document.getElementById('restartButton').addEventListener('click', this.restartGame.bind(this));
        document.getElementById('nextLevelButton').addEventListener('click', this.nextLevel.bind(this));
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    setupUI() {
        // Initialiser l'UI
        document.getElementById('coins').textContent = this.gameState.coins;
        document.getElementById('stars').textContent = this.gameState.stars;
        document.getElementById('time').textContent = this.gameState.time;
        document.getElementById('progress').style.width = '0%';
    }
    
    // Fonctions principales
    gameLoop() {
        if (!this.gameState.isPlaying) return;
        
        const now = Date.now() / 1000; // Temps actuel en secondes
        const deltaTime = Math.min(0.1, (now - (this.lastUpdate || now))); // Limiter deltaTime
        this.lastUpdate = now;
        
        // Mettre à jour les états
        this.updatePlayer(deltaTime);
        this.updateEnemies(deltaTime);
        this.updateProjectiles(deltaTime);
        this.updatePowerUps(deltaTime);
        this.updateCamera();
        this.updateUI(deltaTime);
        this.checkCollisions();
        this.spawnEntities(deltaTime);
        
        // Rendu
        this.renderer.render(this.scene, this.camera);
        
        // Continuer la boucle
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    updatePlayer(deltaTime) {
        if (!this.objects.player) return;
        
        // Déplacement automatique vers l'avant
        let speedMultiplier = 1;
        
        // Vérifier si le powerup de vitesse est actif
        const speedPowerUp = this.gameState.activePowerUps.find(p => p.type === 'speedBoost');
        if (speedPowerUp) {
            speedMultiplier = speedPowerUp.multiplier;
        }
        
        // Avancer automatiquement
        this.objects.player.position.z -= GAME_CONFIG.playerSpeed * speedMultiplier * deltaTime;
        
        // Déplacement latéral (joystick)
        if (this.joystick.active) {
            // Utiliser seulement l'axe X du joystick
            const lateralMove = this.joystick.value.x * GAME_CONFIG.playerSideSpeed * deltaTime;
            
            // Limiter le déplacement aux bords de la route (avec marge)
            const newX = this.objects.player.position.x + lateralMove;
            if (newX > -4.5 && newX < 4.5) {
                this.objects.player.position.x = newX;
            }
        }
        
        // Mise à jour du collider
        this.objects.player.collider.setFromObject(this.objects.player);
        
        // Tir automatique
        this.handlePlayerShooting(deltaTime);
        
        // Mettre à jour les drones
        this.updateDrones(deltaTime);
        
        // Vérifier la progression
        this.gameState.distance = -this.objects.player.position.z;
        
        // Vérifier si le niveau est terminé
        if (this.gameState.distance >= GAME_CONFIG.levelLength) {
            this.levelComplete();
        }
    }
    
    handlePlayerShooting(deltaTime) {
        const now = Date.now() / 1000;
        
        // Vérifier si le joueur peut tirer
        if (now - this.gameState.lastPlayerShoot < GAME_CONFIG.playerShootRate) return;
        
        // Trouver les ennemis à portée de tir
        const enemiesInRange = this.objects.enemies
            .filter(enemy => enemy.active)
            .filter(enemy => {
                // Vérifier si l'ennemi est devant le joueur
                if (enemy.position.z > this.objects.player.position.z - 2) return false;
                
                // Vérifier si l'ennemi est dans le champ de vision (cône de 45 degrés)
                const dx = enemy.position.x - this.objects.player.position.x;
                const dz = enemy.position.z - this.objects.player.position.z;
                const angle = Math.abs(Math.atan2(dx, dz));
                
                return angle < Math.PI / 4; // 45 degrés
            })
            .sort((a, b) => {
                // Priorité aux ennemis les plus proches
                const distA = this.objects.player.position.distanceTo(a.position);
                const distB = this.objects.player.position.distanceTo(b.position);
                return distA - distB;
            });
        
        // Tirer sur l'ennemi le plus proche s'il y en a
        if (enemiesInRange.length > 0) {
            // Mise à jour du temps de dernir tir
            this.gameState.lastPlayerShoot = now;
            
            // Créer un projectile pour chaque soldat en première ligne
            const frontLine = this.objects.player.children.slice(0, 3);
            
            frontLine.forEach(soldier => {
                // Utiliser le système de pooling
                const projectile = this.getProjectileFromPool('player');
                if (!projectile) return;
                
                // Position initiale
                const worldPos = new THREE.Vector3();
                soldier.getWorldPosition(worldPos);
                
                projectile.position.copy(worldPos);
                projectile.position.y = 0.5; // Ajuster la hauteur
                
                // Augmenter les dégâts si le powerup d'attaque est actif
                const attackPowerUp = this.gameState.activePowerUps.find(p => p.type === 'attackBoost');
                if (attackPowerUp) {
                    projectile.damage = 10 * attackPowerUp.multiplier;
                } else {
                    projectile.damage = 10;
                }
                
                // Effet de lumière
                this.createMuzzleFlash(worldPos);
                
                // Jouer un son (à implémenter)
                // this.playSound('playerShoot');
            });
        }
    }
    
    createMuzzleFlash(position) {
        // Créer une lumière ponctuelle pour simuler un flash de tir
        const light = new THREE.PointLight(0x00ffff, 2, 3);
        light.position.copy(position);
        this.scene.add(light);
        
        // Supprimer la lumière après un court délai
        setTimeout(() => {
            this.scene.remove(light);
        }, 50);
    }
    
    updateDrones(deltaTime) {
        // Mettre à jour les drones si présents
        this.objects.drones.forEach(drone => {
            // Mouvement orbital autour du joueur
            drone.angle = (drone.angle || 0) + deltaTime * 2;
            
            const radius = 3;
            drone.position.x = this.objects.player.position.x + Math.cos(drone.angle) * radius;
            drone.position.z = this.objects.player.position.z + Math.sin(drone.angle) * radius;
            drone.position.y = 2;
            
            // Vérifier s'il faut tirer
            const now = Date.now() / 1000;
            if (now - drone.lastShot > 0.5) { // Tir toutes les 0.5 secondes
                drone.lastShot = now;
                
                // Trouver un ennemi à portée
                const enemies = this.objects.enemies
                    .filter(e => e.active)
                    .filter(e => drone.position.distanceTo(e.position) < 10)
                    .sort((a, b) => {
                        return drone.position.distanceTo(a.position) - drone.position.distanceTo(b.position);
                    });
                
                if (enemies.length > 0) {
                    // Créer un projectile
                    const projectile = this.getProjectileFromPool('player');
                    if (projectile) {
                        projectile.position.copy(drone.position);
                        projectile.damage = 5; // Dégâts réduits pour le drone
                        
                        // Effet de lumière
                        this.createMuzzleFlash(drone.position);
                    }
                }
            }
        });
    }
    
    getProjectileFromPool(type) {
        // Récupérer un projectile du pool
        const projectile = this.projectilePool[type].find(p => !p.active);
        
        if (projectile) {
            projectile.active = true;
            projectile.visible = true;
            return projectile;
        }
        
        return null;
    }
    
    updateEnemies(deltaTime) {
        // Mettre à jour les ennemis actifs
        this.objects.enemies.forEach(enemy => {
            if (!enemy.active) return;
            
            // Mouvement vers le joueur
            const directionToPlayer = new THREE.Vector3()
                .subVectors(this.objects.player.position, enemy.position)
                .normalize();
            
            // Déplacer l'ennemi
            enemy.position.x += directionToPlayer.x * enemy.speed * deltaTime;
            enemy.position.z += directionToPlayer.z * enemy.speed * deltaTime;
            
            // Orientation vers le joueur
            enemy.lookAt(this.objects.player.position);
            
            // Mise à jour du collider
            enemy.collider = new THREE.Box3().setFromObject(enemy);
            
            // Tir si c'est un shooter
            if (enemy.shootsBack) {
                const now = Date.now() / 1000;
                
                if (now - enemy.lastShot > enemy.shootRate) {
                    enemy.lastShot = now;
                    
                    // Créer un projectile
                    const projectile = this.getProjectileFromPool('enemy');
                    if (projectile) {
                        projectile.position.copy(enemy.position);
                        projectile.position.y = 0.5; // Ajuster la hauteur
                        
                        // Effet de lumière
                        const light = new THREE.PointLight(0xff5500, 1, 2);
                        light.position.copy(enemy.position);
                        this.scene.add(light);
                        
                        // Supprimer la lumière après un court délai
                        setTimeout(() => {
                            this.scene.remove(light);
                        }, 50);
                    }
                }
            }
        });
    }
    
    updateProjectiles(deltaTime) {
        // Mettre à jour les projectiles actifs
        [...this.projectilePool.player, ...this.projectilePool.enemy].forEach(projectile => {
            if (!projectile.active) return;
            
            // Déplacer le projectile
            projectile.position.z -= projectile.speed * deltaTime;
            
            // Vérifier si le projectile est hors de l'écran
            if (projectile.position.z < -100 || projectile.position.z > 20) {
                this.returnProjectileToPool(projectile);
            }
        });
    }
    
    returnProjectileToPool(projectile) {
        projectile.active = false;
        projectile.visible = false;
    }
    
    updatePowerUps(deltaTime) {
        // Mettre à jour les power-ups actifs
        this.objects.powerUps.forEach(powerUp => {
            if (!powerUp.active) return;
            
            // Faire tourner le power-up sur lui-même
            powerUp.rotation.y += deltaTime * 2;
            
            // Mouvement de flottement
            powerUp.position.y = 1 + Math.sin(Date.now() / 500) * 0.2;
            
            // Mise à jour du collider
            powerUp.collider = new THREE.Box3().setFromObject(powerUp);
        });
        
        // Vérifier les power-ups actifs
        for (let i = this.gameState.activePowerUps.length - 1; i >= 0; i--) {
            const powerUp = this.gameState.activePowerUps[i];
            
            // Diminuer la durée
            powerUp.timeLeft -= deltaTime;
            
            // Vérifier si le power-up est terminé
            if (powerUp.timeLeft <= 0) {
                // Effet de fin de power-up
                this.deactivatePowerUp(powerUp);
                
                // Retirer de la liste
                this.gameState.activePowerUps.splice(i, 1);
                
                // Mettre à jour l'UI
                this.updatePowerUpUI();
            }
        }
    }
    
    deactivatePowerUp(powerUp) {
        switch (powerUp.type) {
            case 'shield':
                // Désactiver l'effet de bouclier
                if (this.shieldEffect) {
                    this.scene.remove(this.shieldEffect);
                    this.shieldEffect = null;
                }
                break;
                
            case 'drone':
                // Supprimer les drones
                this.objects.drones.forEach(drone => {
                    this.scene.remove(drone);
                });
                this.objects.drones = [];
                break;
        }
    }
    
    activatePowerUp(powerUp) {
        // Créer une entrée dans les power-ups actifs
        this.gameState.activePowerUps.push({
            type: powerUp.type,
            timeLeft: powerUp.duration,
            multiplier: powerUp.multiplier || 1
        });
        
        // Effets spéciaux selon le type
        switch (powerUp.type) {
            case 'shield':
                // Créer un effet de bouclier
                const shieldGeometry = new THREE.SphereGeometry(3, 16, 16);
                const shieldMaterial = new THREE.MeshBasicMaterial({
                    color: 0x00ffff,
                    transparent: true,
                    opacity: 0.3,
                    side: THREE.DoubleSide
                });
                
                this.shieldEffect = new THREE.Mesh(shieldGeometry, shieldMaterial);
                this.objects.player.add(this.shieldEffect);
                break;
                
            case 'drone':
                // Créer des drones d'assistance
                for (let i = 0; i < 2; i++) {
                    const droneGeometry = new THREE.SphereGeometry(0.3, 8, 8);
                    const droneMaterial = new THREE.MeshStandardMaterial({ color: 0xffcc00 });
                    const drone = new THREE.Mesh(droneGeometry, droneMaterial);
                    
                    // Position initiale
                    drone.position.copy(this.objects.player.position);
                    drone.position.y = 2;
                    
                    // Ajouter à la scène
                    this.scene.add(drone);
                    
                    // Propriétés
                    drone.lastShot = 0;
                    drone.angle = Math.PI * i; // Répartir les drones
                    
                    // Ajouter au tableau des drones
                    this.objects.drones.push(drone);
                }
                break;
        }
        
        // Mettre à jour l'UI
        this.updatePowerUpUI();
    }
    
    updatePowerUpUI() {
        // Vider le conteneur
        const container = document.getElementById('powerUpIndicator');
        container.innerHTML = '';
        
        // Ajouter chaque power-up actif
        this.gameState.activePowerUps.forEach(powerUp => {
            const element = document.createElement('div');
            element.className = 'powerUp';
            
            // Afficher le symbole
            let symbol;
            switch (powerUp.type) {
                case 'shield': symbol = '🛡️'; break;
                case 'speedBoost': symbol = '⚡'; break;
                case 'attackBoost': symbol = '💥'; break;
                case 'drone': symbol = '🤖'; break;
            }
            
            element.textContent = symbol;
            
            // Ajouter au conteneur
            container.appendChild(element);
        });
    }
    
    updateCamera() {
        // La caméra suit le joueur
        this.camera.position.x = this.objects.player.position.x + this.cameraOffset.x;
        this.camera.position.z = this.objects.player.position.z + this.cameraOffset.z;
        
        // Ajuster le zoom en fonction du nombre d'ennemis
        const enemyCount = this.objects.enemies.filter(e => e.active).length;
        const targetY = this.cameraOffset.y + Math.min(2, enemyCount / 5);
        
        // Smoothing
        this.camera.position.y += (targetY - this.camera.position.y) * 0.1;
    }
    
    updateUI(deltaTime) {
        // Mettre à jour le temps
        this.gameState.time -= deltaTime;
        if (this.gameState.time <= 0) {
            this.gameState.time = 0;
            this.gameOver();
        }
        
        // Afficher les valeurs
        document.getElementById('coins').textContent = this.gameState.coins;
        document.getElementById('stars').textContent = this.gameState.stars;
        document.getElementById('time').textContent = Math.ceil(this.gameState.time);
        
        // Mettre à jour la barre de progression
        const progress = (this.gameState.distance / GAME_CONFIG.levelLength) * 100;
        document.getElementById('progress').style.width = `${progress}%`;
        
        // Mettre à jour la barre de vie
        const healthPercent = (this.objects.player.health / GAME_CONFIG.playerHealth) * 100;
        document.getElementById('health').style.width = `${healthPercent}%`;
    }
    
    checkCollisions() {
        if (!this.objects.player) return;
        
        const playerCollider = this.objects.player.collider;
        
        // Vérifier les collisions avec les ennemis
        this.objects.enemies.forEach(enemy => {
            if (!enemy.active) return;
            
            const enemyCollider = enemy.collider;
            
            if (playerCollider.intersectsBox(enemyCollider)) {
                // Dégâts au joueur
                this.damagePlayer(enemy.damage);
                
                // Dégâts à l'ennemi
                this.damageEnemy(enemy, 20);
                
                // Effet de knockback
                this.knockbackEffect(enemy);
            }
        });
        
        // Vérifier les collisions avec les projectiles
        this.projectilePool.enemy.forEach(projectile => {
            if (!projectile.active) return;
            
            const projectileCollider = new THREE.Box3().setFromObject(projectile);
            
            // Collision avec le joueur
            if (playerCollider.intersectsBox(projectileCollider)) {
                this.damagePlayer(projectile.damage);
                this.returnProjectileToPool(projectile);
                
                // Effet visuel
                this.createExplosion(projectile.position, 0xff0000, 0.5);
            }
        });
        
        // Vérifier les collisions projectiles joueur -> ennemis
        this.projectilePool.player.forEach(projectile => {
            if (!projectile.active) return;
            
            const projectileCollider = new THREE.Box3().setFromObject(projectile);
            
            // Vérifier tous les ennemis
            for (const enemy of this.objects.enemies) {
                if (!enemy.active) continue;
                
                const enemyCollider = enemy.collider || new THREE.Box3().setFromObject(enemy);
                
                if (projectileCollider.intersectsBox(enemyCollider)) {
                    // Dégâts à l'ennemi
                    this.damageEnemy(enemy, projectile.damage);
                    
                    // Retourner le projectile au pool
                    this.returnProjectileToPool(projectile);
                    
                    // Effet visuel
                    this.createExplosion(projectile.position, 0x00ffff, 0.3);
                    
                    // Afficher les dégâts
                    this.showFloatingDamage(enemy.position, projectile.damage);
                    
                    // Un seul ennemi par projectile
                    break;
                }
            }
        });
        
        // Vérifier les collisions avec les power-ups
        this.objects.powerUps.forEach(powerUp => {
            if (!powerUp.active) return;
            
            const powerUpCollider = powerUp.collider || new THREE.Box3().setFromObject(powerUp);
            
            if (playerCollider.intersectsBox(powerUpCollider)) {
                // Activer le power-up
                this.activatePowerUp(powerUp);
                
                // Retourner le power-up au pool
                powerUp.active = false;
                powerUp.visible = false;
                
                // Effet visuel
                this.createExplosion(powerUp.position, powerUp.material.color.getHex(), 1);
                
                // Message
                this.showFloatingText(this.objects.player.position, `${powerUp.symbol} Power Up!`, 0xffff00);
            }
        });
    }
    
    damagePlayer(damage) {
        // Vérifier si le bouclier est actif
        const hasShield = this.gameState.activePowerUps.some(p => p.type === 'shield');
        
        if (hasShield) {
            // Réduire les dégâts avec le bouclier
            damage = Math.floor(damage * 0.2);
            
            // Effet visuel
            if (this.shieldEffect) {
                // Flash du bouclier
                const originalOpacity = this.shieldEffect.material.opacity;
                this.shieldEffect.material.opacity = 0.8;
                
                setTimeout(() => {
                    if (this.shieldEffect) {
                        this.shieldEffect.material.opacity = originalOpacity;
                    }
                }, 200);
            }
        }
        
        // Appliquer les dégâts
        this.objects.player.health -= damage;
        
        // Vérifier si le joueur est mort
        if (this.objects.player.health <= 0) {
            this.objects.player.health = 0;
            this.gameOver();
            return;
        }
        
        // Effet visuel (écran rouge)
        const damageIndicator = document.getElementById('damageIndicator');
        damageIndicator.style.opacity = '0.7';
        
        setTimeout(() => {
            damageIndicator.style.opacity = '0';
        }, 200);
    }
    
    damageEnemy(enemy, damage) {
        // Appliquer les dégâts
        enemy.health -= damage;
        
        // Vérifier si l'ennemi est mort
        if (enemy.health <= 0) {
            // Ajouter les points
            this.gameState.coins += enemy.points;
            
            // Effet visuel
            this.createExplosion(enemy.position, enemy.children[0].material.color.getHex(), 1);
            
            // Message
            this.showFloatingText(enemy.position, `+${enemy.points}`, 0xffcc00);
            
            // Retourner l'ennemi au pool
            enemy.active = false;
            enemy.visible = false;
            
            // Chance de laisser tomber un bonus
            if (Math.random() < 0.1) { // 10% de chance
                this.spawnPowerUp(enemy.position);
            }
        } else {
            // Effet visuel
            enemy.children[0].material.emissive.setHex(0xff0000);
            
            setTimeout(() => {
                enemy.children[0].material.emissive.setHex(0x000000);
            }, 100);
        }
    }
    
    knockbackEffect(enemy) {
        // Direction du knockback (opposé au joueur)
        const knockbackDir = new THREE.Vector3()
            .subVectors(enemy.position, this.objects.player.position)
            .normalize()
            .multiplyScalar(2);
        
        // Appliquer le knockback
        enemy.position.add(knockbackDir);
    }
    
    createExplosion(position, color, size = 1) {
        // Créer une sphère pour l'explosion
        const explosionGeometry = new THREE.SphereGeometry(size, 8, 8);
        const explosionMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.8
        });
        
        const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
        explosion.position.copy(position);
        
        // Ajouter à la scène
        this.scene.add(explosion);
        
        // Animation
        const startTime = Date.now();
        const duration = 300; // ms
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                this.scene.remove(explosion);
                return;
            }
            
            explosion.scale.set(
                1 + progress * 2,
                1 + progress * 2,
                1 + progress * 2
            );
            explosion.material.opacity = 0.8 * (1 - progress);
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    showFloatingDamage(position, damage) {
        // Créer un élément HTML pour les dégâts
        const element = document.createElement('div');
        element.className = 'floatingNumber';
        element.textContent = `-${damage}`;
        element.style.color = '#ff5555';
        
        // Convertir la position 3D en position écran
        const screenPosition = this.getScreenPosition(position);
        
        // Positionner l'élément
        element.style.left = `${screenPosition.x}px`;
        element.style.top = `${screenPosition.y}px`;
        
        // Ajouter à la scène
        document.getElementById('floatingNumbers').appendChild(element);
        
        // Supprimer après l'animation
        setTimeout(() => {
            element.remove();
        }, 1000);
    }
    
    showFloatingText(position, text, color) {
        // Créer un élément HTML pour le texte
        const element = document.createElement('div');
        element.className = 'floatingNumber';
        element.textContent = text;
        element.style.color = `#${color.toString(16)}`;
        
        // Convertir la position 3D en position écran
        const screenPosition = this.getScreenPosition(position);
        
        // Positionner l'élément
        element.style.left = `${screenPosition.x}px`;
        element.style.top = `${screenPosition.y}px`;
        
        // Ajouter à la scène
        document.getElementById('floatingNumbers').appendChild(element);
        
        // Supprimer après l'animation
        setTimeout(() => {
            element.remove();
        }, 1000);
    }
    
    getScreenPosition(position) {
        // Convertir une position 3D en coordonnées écran
        const vector = position.clone();
        vector.project(this.camera);
        
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (vector.y * -0.5 + 0.5) * window.innerHeight;
        
        return { x, y };
    }
    
    spawnEntities(deltaTime) {
        const now = Date.now() / 1000;
        
        // Spawn des ennemis
        if (now - this.gameState.lastEnemySpawn > GAME_CONFIG.enemySpawnRate) {
            this.gameState.lastEnemySpawn = now;
            
            // Nombre d'ennemis actifs
            const activeEnemies = this.objects.enemies.filter(e => e.active).length;
            
            // Limiter le nombre d'ennemis à l'écran
            if (activeEnemies < GAME_CONFIG.maxEnemiesOnScreen) {
                // Déterminer le type d'ennemi selon la progression du niveau
                let enemyType;
                const progress = this.gameState.distance / GAME_CONFIG.levelLength;
                
                if (progress < 0.3) {
                    enemyType = 'basic';
                } else if (progress < 0.6) {
                    enemyType = Math.random() < 0.7 ? 'basic' : 'shooter';
                } else {
                    const roll = Math.random();
                    if (roll < 0.5) enemyType = 'basic';
                    else if (roll < 0.8) enemyType = 'shooter';
                    else enemyType = 'tank';
                }
                
                // Spawn de l'ennemi
                this.spawnEnemy(enemyType);
            }
        }
        
        // Spawn des power-ups
        if (now - this.gameState.lastPowerUpSpawn > GAME_CONFIG.powerUpSpawnRate) {
            this.gameState.lastPowerUpSpawn = now;
            
            // Chance de spawn (25%)
            if (Math.random() < 0.25) {
                // Position aléatoire sur la route
                const position = new THREE.Vector3(
                    (Math.random() * 8 - 4), // -4 à 4
                    0,
                    this.objects.player.position.z - 20 - Math.random() * 10
                );
                
                this.spawnPowerUp(position);
            }
        }
    }
    
    spawnEnemy(type) {
        // Trouver un ennemi dans le pool
        const enemy = this.enemyPool.find(e => !e.active && e.type === type);
        
        if (!enemy) return; // Aucun ennemi disponible
        
        // Position de spawn devant le joueur
        const spawnZ = this.objects.player.position.z - 30 - Math.random() * 10;
        const spawnX = Math.random() * 8 - 4; // -4 à 4
        
        // Réinitialiser l'ennemi
        enemy.position.set(spawnX, 0, spawnZ);
        enemy.health = enemy.maxHealth;
        enemy.active = true;
        enemy.visible = true;
        
        // Ajouter à la liste des ennemis actifs
        if (!this.objects.enemies.includes(enemy)) {
            this.objects.enemies.push(enemy);
        }
    }
    
    spawnPowerUp(position) {
        // Choisir un type de power-up aléatoire
        const types = Object.keys(GAME_CONFIG.powerUps);
        const type = types[Math.floor(Math.random() * types.length)];
        
        // Trouver un power-up dans le pool
        const powerUp = this.powerUpPool.find(p => !p.active && p.type === type);
        
        if (!powerUp) return; // Aucun power-up disponible
        
        // Position
        powerUp.position.copy(position);
        powerUp.position.y = 1; // Hauteur
        
        // Activer
        powerUp.active = true;
        powerUp.visible = true;
        
        // Ajouter à la liste des power-ups actifs
        if (!this.objects.powerUps.includes(powerUp)) {
            this.objects.powerUps.push(powerUp);
        }
    }
    
    gameOver() {
        // Arrêter le jeu
        this.gameState.isPlaying = false;
        
        // Afficher l'écran de game over
        document.getElementById('gameOver').style.display = 'flex';
    }
    
    levelComplete() {
        // Arrêter le jeu
        this.gameState.isPlaying = false;
        
        // Afficher l'écran de fin de niveau
        document.getElementById('finalCoins').textContent = this.gameState.coins;
        document.getElementById('finalStars').textContent = this.gameState.stars;
        document.getElementById('levelComplete').style.display = 'flex';
        
        // Ajouter des étoiles selon la performance
        this.gameState.stars += Math.ceil(this.gameState.time / 10);
    }
    
    restartGame() {
        // Cacher les menus
        document.getElementById('gameOver').style.display = 'none';
        document.getElementById('levelComplete').style.display = 'none';
        
        // Réinitialiser les états
        this.resetGame();
        
        // Redémarrer le jeu
        this.gameState.isPlaying = true;
        this.lastUpdate = Date.now() / 1000;
        this.gameLoop();
    }
    
    nextLevel() {
        // Cacher le menu
        document.getElementById('levelComplete').style.display = 'none';
        
        // Augmenter le niveau
        this.gameState.level++;
        
        // Augmenter la difficulté
        GAME_CONFIG.enemySpawnRate *= 0.9;
        GAME_CONFIG.levelLength += 200;
        
        // Réinitialiser le niveau
        this.resetGame();
        
        // Redémarrer le jeu
        this.gameState.isPlaying = true;
        this.lastUpdate = Date.now() / 1000;
        this.gameLoop();
    }
    
    resetGame() {
        // Réinitialiser la position du joueur
        this.objects.player.position.set(0, 0, 0);
        this.objects.player.health = GAME_CONFIG.playerHealth;
        
        // Désactiver tous les ennemis
        this.objects.enemies.forEach(enemy => {
            enemy.active = false;
            enemy.visible = false;
        });
        
        // Désactiver tous les projectiles
        [...this.projectilePool.player, ...this.projectilePool.enemy].forEach(projectile => {
            projectile.active = false;
            projectile.visible = false;
        });
        
        // Désactiver tous les power-ups
        this.objects.powerUps.forEach(powerUp => {
            powerUp.active = false;
            powerUp.visible = false;
        });
        
        // Réinitialiser les power-ups actifs
        this.gameState.activePowerUps.forEach(powerUp => {
            this.deactivatePowerUp(powerUp);
        });
        this.gameState.activePowerUps = [];
        
        // Supprimer les drones
        this.objects.drones.forEach(drone => {
            this.scene.remove(drone);
        });
        this.objects.drones = [];
        
        // Réinitialiser l'UI
        this.updatePowerUpUI();
        
        // Réinitialiser les valeurs
        this.gameState.distance = 0;
        this.gameState.time = GAME_CONFIG.levelDuration;
        this.gameState.lastEnemySpawn = 0;
        this.gameState.lastPowerUpSpawn = 0;
        this.gameState.lastPlayerShoot = 0;
    }
}

// Démarrer le jeu
window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
});
