leftShoulder.position.set(-1.05, 1.8, 0);
    model.add(leftShoulder);
    
    const rightShoulder = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.6, 1),
        armorMaterial
    );
    rightShoulder.position.set(1.05, 1.8, 0);
    model.add(rightShoulder);
    
    // Massive arms
    const leftArm = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.3, 0.8, 4, 8),
        bodyMaterial
    );
    leftArm.position.set(-1, 1.4, 0);
    leftArm.rotation.z = -Math.PI / 6;
    model.add(leftArm);
    
    const rightArm = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.3, 0.8, 4, 8),
        bodyMaterial
    );
    rightArm.position.set(1, 1.4, 0);
    rightArm.rotation.z = Math.PI / 6;
    model.add(rightArm);
    
    // Heavy legs
    const leftLeg = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.3, 1, 4, 8),
        bodyMaterial
    );
    leftLeg.position.set(-0.5, 0.6, 0);
    model.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.3, 1, 4, 8),
        bodyMaterial
    );
    rightLeg.position.set(0.5, 0.6, 0);
    model.add(rightLeg);
    
    // Glowing parts
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff3300,
        transparent: true,
        opacity: 0.8
    });
    
    // Chest core
    const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 16, 16),
        glowMaterial
    );
    core.position.set(0, 1.7, -0.5);
    model.add(core);
    
    // Eye
    const eye = new THREE.Mesh(
        new THREE.PlaneGeometry(0.6, 0.2),
        glowMaterial
    );
    eye.position.set(0, 2.4, -0.4);
    model.add(eye);
    
    // Twin cannons
    const cannonMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.4,
        metalness: 0.8
    });
    
    const leftCannon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8),
        cannonMaterial
    );
    leftCannon.position.set(-0.3, 2.4, -0.7);
    leftCannon.rotation.x = Math.PI / 2;
    model.add(leftCannon);
    
    const rightCannon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8),
        cannonMaterial
    );
    rightCannon.position.set(0.3, 2.4, -0.7);
    rightCannon.rotation.x = Math.PI / 2;
    model.add(rightCannon);
    
    // Add shadows
    model.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    
    // Store cannons reference for shooting
    model.userData = { 
        leftCannon: leftCannon,
        rightCannon: rightCannon,
        lastCannonUsed: 'right' // Track which cannon to fire next (alternating)
    };
    
    // Face model toward player
    model.rotation.y = Math.PI;
    
    return model;
}

// Update enemies behavior
function updateEnemies(deltaTime) {
    if (gamePaused || gameOver) return;
    
    const now = Date.now() * 0.001; // Convert to seconds
    
    // Auto-spawn enemies if needed
    if (gameStarted && enemies.length < maxEnemiesOnScreen) {
        if (now - lastEnemySpawnTime > enemySpawnRate) {
            // Choose random enemy type from active types
            const randomType = activeEnemyTypes[Math.floor(Math.random() * activeEnemyTypes.length)];
            createEnemy(randomType);
            lastEnemySpawnTime = now;
            
            // Adjust spawn rate based on progress
            enemySpawnRate = Math.max(0.5, 1.5 - (waveNumber * 0.1));
        }
    }
    
    // Find closest enemy for auto-aim
    let closestEnemy = null;
    let closestDistance = Infinity;
    let closestAngle = Infinity;
    
    // Loop through all enemies for updates
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        // Skip if enemy is already removed
        if (!enemy.parent) {
            enemies.splice(i, 1);
            continue;
        }
        
        // Get type-specific data
        const enemyData = enemy.userData;
        
        // Move enemy toward player
        const enemyPos = enemy.position;
        const playerPos = playerGroup.position;
        
        // Calculate direction to player
        const directionToPlayer = new THREE.Vector3(
            playerPos.x - enemyPos.x,
            0,
            playerPos.z - enemyPos.z
        );
        
        const distanceToPlayer = directionToPlayer.length();
        directionToPlayer.normalize();
        
        // Calculate angle to player (for auto-aim)
        // Use dot product to find angle between enemy direction and player forward direction
        const playerForward = new THREE.Vector3(0, 0, -1); // Player looks along negative Z
        const angleToPlayer = Math.acos(playerForward.dot(directionToPlayer)) * (180 / Math.PI);
        
        // Check if this is the closest enemy in front of player (within 45 degrees)
        if (distanceToPlayer < closestDistance && angleToPlayer < 45) {
            closestEnemy = enemy;
            closestDistance = distanceToPlayer;
            closestAngle = angleToPlayer;
        }
        
        // Enemy behavior based on type
        switch(enemyData.type) {
            case 'runner':
                // Runners move directly toward player
                enemyPos.x += directionToPlayer.x * enemyData.speed;
                enemyPos.z += directionToPlayer.z * enemyData.speed;
                
                // Attack if very close
                if (distanceToPlayer < 2 && playerGroup) {
                    // Deal damage to player
                    takeDamage(enemyData.damage);
                    
                    // Remove enemy after attack
                    createExplosionEffect(enemyPos.x, enemyPos.y + 1, enemyPos.z);
                    scene.remove(enemy);
                    enemies.splice(i, 1);
                }
                break;
                
            case 'shooter':
                // Shooters move to a medium distance and then shoot
                if (distanceToPlayer > 15) {
                    // Move closer if too far
                    enemyPos.x += directionToPlayer.x * enemyData.speed;
                    enemyPos.z += directionToPlayer.z * enemyData.speed;
                } else if (distanceToPlayer < 10) {
                    // Back away if too close
                    enemyPos.x -= directionToPlayer.x * enemyData.speed * 0.5;
                    enemyPos.z -= directionToPlayer.z * enemyData.speed * 0.5;
                } else {
                    // Shoot if in range
                    if (now - enemyData.lastFireTime > enemyData.fireRate) {
                        enemyShoot(enemy);
                        enemyData.lastFireTime = now;
                    }
                }
                break;
                
            case 'tank':
                // Tanks move slowly but have powerful attacks
                enemyPos.x += directionToPlayer.x * enemyData.speed;
                enemyPos.z += directionToPlayer.z * enemyData.speed;
                
                // Shoot when in range
                if (distanceToPlayer < 20 && now - enemyData.lastFireTime > enemyData.fireRate) {
                    enemyShoot(enemy);
                    enemyData.lastFireTime = now;
                }
                break;
        }
        
        // Always face player
        if (directionToPlayer.x !== 0 || directionToPlayer.z !== 0) {
            const targetRotation = Math.atan2(directionToPlayer.x, directionToPlayer.z);
            enemy.rotation.y = targetRotation;
        }
        
        // Apply simple animations based on enemy type
        animateEnemy(enemy, deltaTime);
        
        // Check if enemy is too far behind
        if (enemyPos.z > 20) {
            scene.remove(enemy);
            enemies.splice(i, 1);
        }
    }
    
    // Update auto-aim target
    autoAimTarget = closestEnemy;
    
    // Auto-fire if enemy in sight
    if (autoAimTarget && now - lastShootTime > shootRate) {
        firePlayerProjectile();
    }
}

// Animate enemy based on type
function animateEnemy(enemy, deltaTime) {
    const type = enemy.userData.type;
    
    // Get first child (model)
    const model = enemy.children[0];
    if (!model) return;
    
    switch(type) {
        case 'runner':
            // Bobbing motion
            model.position.y = Math.sin(Date.now() * 0.01) * 0.1;
            
            // Swinging arms
            for (let i = 2; i < 4; i++) {
                if (model.children[i]) {
                    model.children[i].rotation.x = Math.sin(Date.now() * 0.01 + i) * 0.3;
                }
            }
            break;
            
        case 'shooter':
            // Slight sway
            model.rotation.y = Math.sin(Date.now() * 0.002) * 0.1;
            break;
            
        case 'tank':
            // Slow heavy movement
            model.position.y = Math.sin(Date.now() * 0.005) * 0.05;
            
            // Glowing core pulsing
            if (model.children[11]) { // Core is typically at index 11
                const scale = 1 + Math.sin(Date.now() * 0.005) * 0.2;
                model.children[11].scale.set(scale, scale, scale);
            }
            break;
    }
}

// Enemy shooting function
function enemyShoot(enemy) {
    const enemyData = enemy.userData;
    const model = enemy.children[0];
    
    // Different projectile based on enemy type
    let projectileGeometry, projectileMaterial, speed, damage;
    let position = new THREE.Vector3();
    
    switch(enemyData.type) {
        case 'shooter':
            // Get gun position
            if (model.userData.gun) {
                model.userData.gun.getWorldPosition(position);
            } else {
                enemy.getWorldPosition(position);
                position.y += 1.5;
            }
            
            // Create laser projectile
            projectileGeometry = new THREE.CapsuleGeometry(0.05, 0.3, 4, 8);
            projectileMaterial = new THREE.MeshBasicMaterial({
                color: 0xff0000,
                transparent: true,
                opacity: 0.8
            });
            
            speed = 0.8;
            damage = enemyData.damage;
            break;
            
        case 'tank':
            // Get cannon position - alternating between cannons
            if (model.userData.lastCannonUsed === 'right') {
                model.userData.leftCannon.getWorldPosition(position);
                model.userData.lastCannonUsed = 'left';
            } else {
                model.userData.rightCannon.getWorldPosition(position);
                model.userData.lastCannonUsed = 'right';
            }
            
            // Create heavy projectile
            projectileGeometry = new THREE.SphereGeometry(0.15, 8, 8);
            projectileMaterial = new THREE.MeshBasicMaterial({
                color: 0xff3300,
                transparent: true,
                opacity: 0.8
            });
            
            speed = 0.6;
            damage = enemyData.damage;
            break;
            
        default:
            // Default projectile
            enemy.getWorldPosition(position);
            position.y += 1.5;
            
            projectileGeometry = new THREE.SphereGeometry(0.1, 8, 8);
            projectileMaterial = new THREE.MeshBasicMaterial({
                color: 0xff6600,
                transparent: true,
                opacity: 0.7
            });
            
            speed = 0.5;
            damage = 5;
    }
    
    // Create projectile
    const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
    projectile.position.copy(position);
    
    // Add light effect
    const light = new THREE.PointLight(projectileMaterial.color, 1, 3);
    light.position.set(0, 0, 0);
    projectile.add(light);
    
    // Get direction to player
    const direction = new THREE.Vector3();
    playerGroup.getWorldPosition(direction);
    direction.sub(position);
    direction.normalize();
    
    // Add to scene
    scene.add(projectile);
    
    // Add to projectiles array
    enemyProjectiles.push({
        mesh: projectile,
        velocity: new THREE.Vector3(
            direction.x * speed,
            direction.y * speed,
            direction.z * speed
        ),
        damage: damage
    });
    
    // Sound effect
    playSound('shoot', {
        volume: 0.1,
        position: position
    });
    
    return projectile;
}

// Update player and enemy projectiles
function updateProjectiles() {
    if (gamePaused) return;
    
    // Update player projectiles
    for (let i = playerProjectiles.length - 1; i >= 0; i--) {
        const projectile = playerProjectiles[i];
        
        // Move projectile
        projectile.mesh.position.add(projectile.velocity);
        
        // Check for collision with enemies
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            
            // Get enemy hitbox (second child)
            const hitbox = enemy.children[1];
            if (!hitbox) continue;
            
            // Calculate distance
            const distance = projectile.mesh.position.distanceTo(
                new THREE.Vector3(
                    enemy.position.x,
                    enemy.position.y + hitbox.position.y,
                    enemy.position.z
                )
            );
            
            // Check collision
            if (distance < 1) {
                // Apply damage
                enemy.userData.health -= projectile.damage;
                
                // Create hit effect
                createHitEffect(
                    projectile.mesh.position.x,
                    projectile.mesh.position.y,
                    projectile.mesh.position.z
                );
                
                // Remove projectile
                scene.remove(projectile.mesh);
                playerProjectiles.splice(i, 1);
                
                // Check if enemy is destroyed
                if (enemy.userData.health <= 0) {
                    // Add score
                    score += enemy.userData.score;
                    
                    // Create destruction effect
                    createExplosionEffect(
                        enemy.position.x,
                        enemy.position.y + 1.5,
                        enemy.position.z
                    );
                    
                    // Remove enemy
                    scene.remove(enemy);
                    enemies.splice(j, 1);
                    
                    // Update UI
                    updateUI();
                    
                    // Increment kill count
                    killCount++;
                    
                    // Update wave progress
                    waveProgress = Math.min(1, killCount / (10 + waveNumber * 5));
                    updateWaveProgress();
                    
                    // Check if wave is complete
                    if (waveProgress >= 1 && !waveComplete) {
                        completeWave();
                    }
                    
                    // Random chance to spawn power-up
                    if (Math.random() < 0.2) {
                        createPowerUp(
                            enemy.position.x,
                            enemy.position.y,
                            enemy.position.z
                        );
                    }
                }
                
                break;
            }
        }
        
        // Remove if out of bounds
        if (projectile.mesh.position.z < -100 ||
            projectile.mesh.position.z > 20 ||
            projectile.mesh.position.x < -50 ||
            projectile.mesh.position.x > 50) {
            scene.remove(projectile.mesh);
            playerProjectiles.splice(i, 1);
        }
    }
    
    // Update enemy projectiles
    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
        const projectile = enemyProjectiles[i];
        
        // Move projectile
        projectile.mesh.position.add(projectile.velocity);
        
        // Check for collision with player
        if (playerHitBox) {
            const distance = projectile.mesh.position.distanceTo(
                new THREE.Vector3(
                    playerGroup.position.x,
                    playerGroup.position.y + playerHitBox.position.y,
                    playerGroup.position.z
                )
            );
            
            if (distance < 1) {
                // Apply damage to player
                takeDamage(projectile.damage);
                
                // Create hit effect
                createHitEffect(
                    projectile.mesh.position.x,
                    projectile.mesh.position.y,
                    projectile.mesh.position.z
                );
                
                // Remove projectile
                scene.remove(projectile.mesh);
                enemyProjectiles.splice(i, 1);
                continue;
            }
        }
        
        // Remove if out of bounds
        if (projectile.mesh.position.z < -100 ||
            projectile.mesh.position.z > 20 ||
            projectile.mesh.position.x < -50 ||
            projectile.mesh.position.x > 50) {
            scene.remove(projectile.mesh);
            enemyProjectiles.splice(i, 1);
        }
    }
}

// Deal damage to player
function takeDamage(amount) {
    if (gameOver) return;
    
    // Check for shield power-up
    if (activePowerUps.shield) {
        // Reduce shield instead of health
        activePowerUps.shield.duration -= amount * 2;
        
        // Create shield impact effect
        createShieldImpactEffect();
        
        // Remove shield if depleted
        if (activePowerUps.shield.duration <= 0) {
            removePowerUpEffect('shield');
        }
        
        // Update UI
        updatePowerUpUI();
        
        // Play shield hit sound
        playSound('hit', { volume: 0.3 });
        
        return;
    }
    
    // Apply damage
    health -= amount;
    
    // Update UI
    updateHealthBar();
    
    // Play damage sound
    playSound('damage', { volume: 0.4 });
    
    // Screen flash effect
    createScreenFlashEffect(0xff0000, 0.3);
    
    // Damage animation
    playerGroup.position.y += 0.2;
    setTimeout(() => {
        if (playerGroup) playerGroup.position.y -= 0.2;
    }, 100);
    
    // Check if player is dead
    if (health <= 0) {
        gameOver = true;
        
        // Death animation
        createExplosionEffect(
            playerGroup.position.x,
            playerGroup.position.y + 1,
            playerGroup.position.z
        );
        
        // Hide player model
        if (playerModel) playerModel.visible = false;
        
        // Show game over screen
        showGameOver();
    }
}

// Complete current wave
function completeWave() {
    waveComplete = true;
    
    // Increment wave number
    waveNumber++;
    
    // Update UI
    waveText.textContent = `Wave ${waveNumber}/${totalWaves}`;
    
    // Create wave complete effect
    createScreenFlashEffect(0x00ffff, 0.2);
    
    // Play sound
    playSound('powerUp', { volume: 0.5 });
    
    // Show wave complete message
    showWaveCompleteMessage();
    
    // Add enemies based on wave number
    if (waveNumber === 2) {
        // Add shooters at wave 2
        activeEnemyTypes.push('shooter');
    } else if (waveNumber === 4) {
        // Add tanks at wave 4
        activeEnemyTypes.push('tank');
    }
    
    // Reset wave progress
    setTimeout(() => {
        waveComplete = false;
        waveProgress = 0;
        killCount = 0;
        updateWaveProgress();
        
        // Victory if all waves complete
        if (waveNumber > totalWaves) {
            victory();
        }
    }, 2000);
}

// Victory function
function victory() {
    // Game complete
    gameOver = true;
    
    // Show victory screen (could be customized like the game over screen)
    showVictory();
}

// Show wave complete message
function showWaveCompleteMessage() {
    const message = document.createElement('div');
    message.className = 'wave-complete';
    message.textContent = `WAVE ${waveNumber - 1} COMPLETE!`;
    
    gameContainer.appendChild(message);
    
    // Remove after animation
    setTimeout(() => {
        message.remove();
    }, 2000);
}

// Create a screen flash effect
function createScreenFlashEffect(color, opacity) {
    const flash = document.createElement('div');
    flash.className = 'screen-flash';
    flash.style.backgroundColor = new THREE.Color(color).getStyle();
    flash.style.opacity = opacity;
    
    gameContainer.appendChild(flash);
    
    // Fade out
    setTimeout(() => {
        flash.style.opacity = 0;
    }, 50);
    
    // Remove after animation
    setTimeout(() => {
        flash.remove();
    }, 300);
}

// Create hit effect
function createHitEffect(x, y, z) {
    // Create flash
    const flashGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const flashMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8
    });
    
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.set(x, y, z);
    scene.add(flash);
    
    // Create particles
    const particleCount = 10;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleVelocities = [];
    
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // Start at hit position
        particlePositions[i3] = x;
        particlePositions[i3 + 1] = y;
        particlePositions[i3 + 2] = z;
        
        // Random velocity in all directions
        const speed = 0.05 + Math.random() * 0.1;
        const angle = Math.random() * Math.PI * 2;
        const height = (Math.random() - 0.5) * 2;
        
        particleVelocities.push({
            x: Math.cos(angle) * speed,
            y: height * speed,
            z: Math.sin(angle) * speed
        });
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        color: 0xff6600,
        size: 0.1,
        transparent: true,
        opacity: 0.8
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
    
    // Add hit effect to update
    effectsToUpdate.push({
        type: 'hit',
        flash: flash,
        particles: particles,
        geometry: particleGeometry,
        velocities: particleVelocities,
        life: 20,
        update: function(delta) {
            if (gamePaused) return true;
            
            // Expand and fade flash
            this.flash.scale.multiplyScalar(1.1);
            this.flash.material.opacity *= 0.9;
            
            // Update particles
            const positions = this.geometry.attributes.position.array;
            
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                const vel = this.velocities[i];
                
                // Update position
                positions[i3] += vel.x;
                positions[i3 + 1] += vel.y;
                positions[i3 + 2] += vel.z;
                
                // Add gravity
                vel.y -= 0.002;
            }
            
            this.geometry.attributes.position.needsUpdate = true;
            
            // Fade particles
            this.particles.material.opacity = this.life / 20;
            
            // Decrease life
            this.life--;
            
            // Remove when done
            if (this.life <= 0) {
                scene.remove(this.flash);
                scene.remove(this.particles);
                return false;
            }
            
            return true;
        }
    });
    
    // Play hit sound
    playSound('hit', {
        volume: 0.2,
        position: new THREE.Vector3(x, y, z)
    });
}

// Create shield impact effect
function createShieldImpactEffect() {
    if (!playerGroup) return;
    
    // Create shield sphere
    const shieldGeometry = new THREE.SphereGeometry(1.5, 16, 16);
    const shieldMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    });
    
    const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
    shield.position.y = 1.5;
    
    playerGroup.add(shield);
    
    // Add shield effect to update
    effectsToUpdate.push({
        type: 'shield-impact',
        shield: shield,
        life: 10,
        update: function(delta) {
            if (gamePaused) return true;
            
            // Expand shield
            this.shield.scale.multiplyScalar(1.05);
            
            // Fade shield
            this.shield.material.opacity = this.life / 10 * 0.5;
            
            // Decrease life
            this.life--;
            
            // Remove when done
            if (this.life <= 0) {
                playerGroup.remove(this.shield);
                return false;
            }
            
            return true;
        }
    });
}

// Create explosion effect
function createExplosionEffect(x, y, z, scale = 1) {
    // Create flash sphere
    const flashGeometry = new THREE.SphereGeometry(0.5 * scale, 16, 16);
    const flashMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8
    });
    
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.set(x, y, z);
    scene.add(flash);
    
    // Create explosion sphere
    const explosionGeometry = new THREE.SphereGeometry(0.4 * scale, 16, 16);
    const explosionMaterial = new THREE.MeshBasicMaterial({
        color: 0xff6600,
        transparent: true,
        opacity: 0.8
    });
    
    const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
    explosion.position.set(x, y, z);
    scene.add(explosion);
    
    // Create particles
    const particleCount = 30 * scale;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleVelocities = [];
    
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // Start at explosion center
        particlePositions[i3] = x;
        particlePositions[i3 + 1] = y;
        particlePositions[i3 + 2] = z;
        
        // Random velocity in all directions
        const speed = (0.1 + Math.random() * 0.1) * scale;
        const angle = Math.random() * Math.PI * 2;
        const height = (Math.random() - 0.5) * 2;
        
        particleVelocities.push({
            x: Math.cos(angle) * speed,
            y: height * speed,
            z: Math.sin(angle) * speed
        });
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        color: 0xff6600,
        size: 0.15 * scale,
        transparent: true,
        opacity: 0.8
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
    
    // Create smoke particles
    const smokeCount = 20 * scale;
    const smokeGeometry = new THREE.BufferGeometry();
    const smokePositions = new Float32Array(smokeCount * 3);
    const smokeVelocities = [];
    
    for (let i = 0; i < smokeCount; i++) {
        const i3 = i * 3;
        
        // Start at explosion center
        smokePositions[i3] = x;
        smokePositions[i3 + 1] = y;
        smokePositions[i3 + 2] = z;
        
        // Random velocity - smoke rises
        const speed = (0.05 + Math.random() * 0.05) * scale;
        const angle = Math.random() * Math.PI * 2;
        
        smokeVelocities.push({
            x: Math.cos(angle) * speed * 0.7,
            y: speed * 1.5, // Smoke rises faster
            z: Math.sin(angle) * speed * 0.7
        });
    }
    
    smokeGeometry.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3));
    
    const smokeMaterial = new THREE.PointsMaterial({
        color: 0x444444,
        size: 0.2 * scale,
        transparent: true,
        opacity: 0.5
    });
    
    const smoke = new THREE.Points(smokeGeometry, smokeMaterial);
    scene.add(smoke);
    
    // Add light at explosion
    const light = new THREE.PointLight(0xff6600, 2, 10 * scale);
    light.position.set(x, y, z);
    scene.add(light);
    
    // Add explosion to update
    effectsToUpdate.push({
        type: 'explosion',
        flash: flash,
        explosion: explosion,
        particles: particles,
        smoke: smoke,
        light: light,
        geometry: particleGeometry,
        smokeGeometry: smokeGeometry,
        particleVelocities: particleVelocities,
        smokeVelocities: smokeVelocities,
        life: 30,
        update: function(delta) {
            if (gamePaused) return true;
            
            // Grow and fade flash
            this.flash.scale.multiplyScalar(1.1);
            this.flash.material.opacity *= 0.9;
            
            // Grow and fade explosion
            this.explosion.scale.multiplyScalar(1.05);
            this.explosion.material.opacity = this.life / 30;
            
            // Update particles
            const positions = this.geometry.attributes.position.array;
            
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                const vel = this.particleVelocities[i];
                
                // Update position
                positions[i3] += vel.x;
                positions[i3 + 1] += vel.y;
                positions[i3 + 2] += vel.z;
                
                // Add gravity and friction
                vel.y -= 0.003;
                vel.x *= 0.98;
                vel.y *= 0.98;
                vel.z *= 0.98;
            }
            
            this.geometry.attributes.position.needsUpdate = true;
            
            // Update smoke
            const smokePositions = this.smokeGeometry.attributes.position.array;
            
            for (let i = 0; i < smokeCount; i++) {
                const i3 = i * 3;
                const vel = this.smokeVelocities[i];
                
                // Update position
                smokePositions[i3] += vel.x;
                smokePositions[i3 + 1] += vel.y;
                smokePositions[i3 + 2] += vel.z;
                
                // Slow down
                vel.x *= 0.99;
                vel.y *= 0.99;
                vel.z *= 0.99;
            }
            
            this.smokeGeometry.attributes.position.needsUpdate = true;
            
            // Fade smoke and particles
            const fadeRatio = this.life / 30;
            this.particles.material.opacity = fadeRatio;
            this.smoke.material.opacity = fadeRatio * 0.5;
            
            // Dim light
            this.light.intensity = fadeRatio * 2;
            
            // Decrease life
            this.life--;
            
            // Remove when done
            if (this.life <= 0) {
                scene.remove(this.flash);
                scene.remove(this.explosion);
                scene.remove(this.particles);
                scene.remove(this.smoke);
                scene.remove(this.light);
                return false;
            }
            
            return true;
        }
    });
    
    // Play explosion sound
    playSound('explosion', {
        volume: 0.3 * scale,
        position: new THREE.Vector3(x, y, z)
    });
}

// Create power-up
function createPowerUp(x, y, z) {
    // Define power-up types
    const powerUpTypes = [
        { 
            type: 'health', 
            color: 0xff0000, 
            effect: () => {
                health = Math.min(maxHealth, health + 25);
                updateHealthBar();
            }
        },
        { 
            type: 'shield', 
            color: 0x00ffff, 
            effect: () => {
                activatePowerUp('shield', 30); // 30 seconds duration
            }
        },
        { 
            type: 'damage', 
            color: 0xffff00, 
            effect: () => {
                activatePowerUp('damage', 20); // 20 seconds duration
            }
        },
        { 
            type: 'speed', 
            color: 0x00ff00, 
            effect: () => {
                activatePowerUp('speed', 15); // 15 seconds duration
            }
        }
    ];
    
    // Choose random power-up type
    const powerUpType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
    
    // Create power-up mesh
    const powerUpGroup = new THREE.Group();
    
    // Base sphere
    const geometry = new THREE.SphereGeometry(0.5, 16, 16);
    const material = new THREE.MeshStandardMaterial({
        color: powerUpType.color,
        emissive: powerUpType.color,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.8
    });
    
    const sphere = new THREE.Mesh(geometry, material);
    powerUpGroup.add(sphere);
    
    // Outer glow
    const glowGeometry = new THREE.SphereGeometry(0.7, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: powerUpType.color,
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide
    });
    
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    powerUpGroup.add(glow);
    
    // Light
    const light = new THREE.PointLight(powerUpType.color, 1, 5);
    powerUpGroup.add(light);
    
    // Set position
    powerUpGroup.position.set(x, y + 1, z);
    
    // Add to scene
    scene.add(powerUpGroup);
    
    // Store power-up data
    const powerUp = {
        mesh: powerUpGroup,
        type: powerUpType.type,
        color: powerUpType.color,
        effect: powerUpType.effect
    };
    
    // Add to power-ups array
    powerUps.push(powerUp);
    
    // Add animation
    effectsToUpdate.push({
        type: 'power-up',
        powerUp: powerUp,
        time: 0,
        update: function(delta) {
            if (gamePaused) return true;
            
            // Float and rotate
            this.time += delta;
            this.powerUp.mesh.position.y = y + 1 + Math.sin(this.time * 3) * 0.3;
            this.powerUp.mesh.rotation.y += delta * 2;
            
            // Check for collection by player
            const distance = this.powerUp.mesh.position.distanceTo(playerGroup.position);
            
            if (distance < 2) {
                // Apply power-up effect
                this.powerUp.effect();
                
                // Create collection effect
                createPowerUpCollectEffect(
                    this.powerUp.mesh.position.x,
                    this.powerUp.mesh.position.y,
                    this.powerUp.mesh.position.z,
                    this.powerUp.color
                );
                
                // Remove power-up
                scene.remove(this.powerUp.mesh);
                const index = powerUps.indexOf(this.powerUp);
                if (index > -1) {
                    powerUps.splice(index, 1);
                }
                
                return false;
            }
            
            // Remove if too far behind player
            if (this.powerUp.mesh.position.z > 15) {
                scene.remove(this.powerUp.mesh);
                const index = powerUps.indexOf(this.powerUp);
                if (index > -1) {
                    powerUps.splice(index, 1);
                }
                return false;
            }
            
            return true;
        }
    });
}

// Create power-up collection effect
function createPowerUpCollectEffect(x, y, z, color) {
    // Create expanding ring
    const ringGeometry = new THREE.RingGeometry(0.5, 0.6, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
    });
    
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.set(x, y, z);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);
    
    // Create particles
    const particleCount = 20;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleVelocities = [];
    
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // Start at collection position
        particlePositions[i3] = x;
        particlePositions[i3 + 1] = y;
        particlePositions[i3 + 2] = z;
        
        // Random velocity in all directions
        const speed = 0.1 + Math.random() * 0.1;
        const angle = Math.random() * Math.PI * 2;
        const height = (Math.random() - 0.5) * 2;
        
        particleVelocities.push({
            x: Math.cos(angle) * speed,
            y: height * speed,
            z: Math.sin(angle) * speed
        });
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        color: color,
        size: 0.1,
        transparent: true,
        opacity: 0.8
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
    
    // Add effect to update
    effectsToUpdate.push({
        type: 'power-up-collect',
        ring: ring,
        particles: particles,
        geometry: particleGeometry,
        velocities: particleVelocities,
        life: 20,
        update: function(delta) {
            if (gamePaused) return true;
            
            // Expand ring
            this.ring.scale.multiplyScalar(1.1);
            this.ring.material.opacity *= 0.9;
            
            // Update particles
            const positions = this.geometry.attributes.position.array;
            
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                const vel = this.velocities[i];
                
                // Update position
                positions[i3] += vel.x;
                positions[i3 + 1] += vel.y;
                positions[i3 + 2] += vel.z;
                
                // Slow down
                vel.x *= 0.95;
                vel.y *= 0.95;
                vel.z *= 0.95;
            }
            
            this.geometry.attributes.position.needsUpdate = true;
            
            // Fade particles
            this.particles.material.opacity = this.life / 20;
            
            // Decrease life
            this.life--;
            
            // Remove when done
            if (this.life <= 0) {
                scene.remove(this.ring);
                scene.remove(this.particles);
                return false;
            }
            
            return true;
        }
    });
    
    // Play power-up sound
    playSound('powerUp', {
        volume: 0.4,
        position: new THREE.Vector3(x, y, z)
    });
}

// Activate power-up
function activatePowerUp(type, duration) {
    // Check if power-up already active
    if (activePowerUps[type]) {
        // Extend duration
        activePowerUps[type].duration += duration;
    } else {
        // Apply power-up effect
        switch(type) {
            case 'shield':
                // Create shield mesh
                const shieldGeometry = new THREE.SphereGeometry(1.2, 16, 16);
                const shieldMaterial = new THREE.MeshBasicMaterial({
                    color: 0x00ffff,
                    transparent: true,
                    opacity: 0.3,
                    side: THREE.DoubleSide
                });
                
                playerShield = new THREE.Mesh(shieldGeometry, shieldMaterial);
                playerShield.position.y = 1;
                playerGroup.add(playerShield);
                break;
                
            case 'damage':
                // Increase projectile damage
                playerProjectileDamage *= 2;
                break;
                
            case 'speed':
                // Increase movement speed
                playerMoveSpeed *= 1.5;
                break;
        }
        
        // Store power-up
        activePowerUps[type] = {
            type: type,
            duration: duration,
            mesh: type === 'shield' ? playerShield : null
        };
    }
    
    // Update UI
    updatePowerUpUI();
}

// Update power-ups
function updatePowerUps(deltaTime) {
    if (gamePaused || gameOver) return;
    
    // Update each active power-up
    for (const type in activePowerUps) {
        if (activePowerUps.hasOwnProperty(type)) {
            const powerUp = activePowerUps[type];
            
            // Decrease duration
            powerUp.duration -= deltaTime;
            
            // Check if expired
            if (powerUp.duration <= 0) {
                removePowerUpEffect(type);
            }
        }
    }
    
    // Update UI
    updatePowerUpUI();
}

// Remove power-up effect
function removePowerUpEffect(type) {
    if (!activePowerUps[type]) return;
    
    // Remove effect based on type
    switch(type) {
        case 'shield':
            // Remove shield mesh
            if (playerShield) {
                playerGroup.remove(playerShield);
                playerShield = null;
            }
            break;
            
        case 'damage':
            // Reset projectile damage
            playerProjectileDamage = 10;
            break;
            
        case 'speed':
            // Reset movement speed
            playerMoveSpeed = 0.3;
            break;
    }
    
    // Remove from active power-ups
    delete activePowerUps[type];
}

// Update power-up UI indicator
function updatePowerUpUI() {
    // Clear existing indicators
    powerUpIndicator.innerHTML = '';
    
    // Add indicator for each active power-up
    for (const type in activePowerUps) {
        if (activePowerUps.hasOwnProperty(type)) {
            const powerUp = activePowerUps[type];
            
            // Create indicator
            const indicator = document.createElement('div');
            indicator.className = 'power-up-icon';
            
            // Set icon based on type
            switch(type) {
                case 'shield':
                    indicator.innerHTML = '<i class="fa fa-shield"></i>';
                    indicator.style.color = '#00ffff';
                    break;
                case 'damage':
                    indicator.innerHTML = '<i class="fa fa-bolt"></i>';
                    indicator.style.color = '#ffff00';
                    break;
                case 'speed':
                    indicator.innerHTML = '<i class="fa fa-tachometer"></i>';
                    indicator.style.color = '#00ff00';
                    break;
            }
            
            // Add duration
            const duration = Math.ceil(powerUp.duration);
            const durationSpan = document.createElement('span');
            durationSpan.textContent = duration;
            indicator.appendChild(durationSpan);
            
            // Add to UI
            powerUpIndicator.appendChild(indicator);
        }
    }
}

// Update player animation
function updatePlayerAnimation() {
    // Determine appropriate animation based on player state
    let newAnimation = 'run';
    
    if (isPlayerShooting) {
        newAnimation = 'shootRun';
    }
    
    // Check if animation changed
    if (newAnimation !== currentAnimation) {
        currentAnimation = newAnimation;
        
        // Apply animation (simplified as we don't have actual animation clips)
        // In a full implementation, this would use Three.js AnimationMixer
    }
}

// Update player movement
function updatePlayerMovement(deltaTime) {
    if (!playerGroup || gamePaused || gameOver) return;
    
    // Keyboard controls
    if (isMovingLeft) {
        targetPlayerX -= playerMoveSpeed * 15 * deltaTime;
    }
    if (isMovingRight) {
        targetPlayerX += playerMoveSpeed * 15 * deltaTime;
    }
    
    // Limit target position
    targetPlayerX = Math.max(-10, Math.min(10, targetPlayerX));
    
    // Smooth movement toward target
    playerGroup.position.x += (targetPlayerX - playerGroup.position.x) * playerMoveSpeed * 5 * deltaTime;
    
    // Add slight tilt when moving
    const tiltFactor = (playerGroup.position.x - targetPlayerX) * 0.1;
    playerGroup.rotation.z = -tiltFactor;
    
    // Update camera to follow player
    updateCameraPosition();
    
    // Animate player based on movement
    animatePlayerRunning(deltaTime);
}

// Animate player running
function animatePlayerRunning(deltaTime) {
    if (!playerModel) return;
    
    // Simple run animation by moving legs
    playerRunAnimationTime += deltaTime * 5;
    
    // Get legs (children 6 and 7)
    const leftLeg = playerModel.children[6];
    const rightLeg = playerModel.children[7];
    
    if (leftLeg && rightLeg) {
        leftLeg.rotation.x = Math.sin(playerRunAnimationTime) * 0.5;
        rightLeg.rotation.x = -Math.sin(playerRunAnimationTime) * 0.5;
    }
}

// Update camera position to follow player
function updateCameraPosition() {
    if (!playerGroup) return;
    
    // Adjust camera position to follow player
    camera.position.x = playerGroup.position.x * 0.5; // Half of player's X to smooth camera movement
    
    // Slightly adjust camera height based on player movement (for dynamic feeling)
    camera.position.y = 7 + Math.sin(Date.now() * 0.002) * 0.05;
}

// Update environment scrolling
function updateEnvironment(deltaTime) {
    if (gamePaused || !gameStarted) return;
    
    // Update ground segments
    for (let i = 0; i < groundSegments.length; i++) {
        const segment = groundSegments[i];
        
        // Move segment forward
        segment.mesh.position.z += gameSpeed * deltaTime * 15;
        
        // Reset if passed player
        if (segment.mesh.position.z > 15) {
            segment.mesh.position.z = segment.initialZ;
            
            // Update segment appearance
            addGroundDetails(segment.mesh, segment.mesh.position.z);
        }
    }
    
    // Update environment objects
    for (let i = 0; i < environmentObjects.length; i++) {
        const object = environmentObjects[i];
        
        // Different behavior based on object type
        switch(object.type) {
            case 'mountains':
                // Parallax scrolling (slow movement)
                object.mesh.position.z += gameSpeed * deltaTime * object.scrollSpeed * 15;
                
                // Reset if passed view distance
                if (object.mesh.position.z > 100) {
                    object.mesh.position.z = -200;
                }
                break;
                
            case 'pathside':
                // Standard scrolling with game
                object.mesh.position.z += gameSpeed * deltaTime * object.scrollSpeed * 15;
                
                // Reset if passed player
                if (object.mesh.position.z > 20) {
                    object.mesh.position.z = object.initialZ;
                }
                break;
        }
    }
    
    // Increment distance traveled
    distance += gameSpeed * deltaTime * 15;
}

// Update UI elements
function updateUI() {
    // Update score
    scoreElement.textContent = score;
    
    // Update health bar
    updateHealthBar();
    
    // Update wave progress
    updateWaveProgress();
}

// Update health bar
function updateHealthBar() {
    if (!healthBarInner) return;
    
    // Calculate health percentage
    const healthPercent = Math.max(0, Math.min(100, (health / maxHealth) * 100));
    
    // Update health bar width
    healthBarInner.style.width = healthPercent + '%';
    
    // Change color based on health
    if (healthPercent < 25) {
        healthBarInner.style.backgroundColor = '#ff0000';
    } else if (healthPercent < 50) {
        healthBarInner.style.backgroundColor = '#ff7700';
    } else {
        healthBarInner.style.backgroundColor = '#00ff00';
    }
}

// Update wave progress
function updateWaveProgress() {
    if (!waveProgressInner) return;
    
    // Update progress bar width
    waveProgressInner.style.width = (waveProgress * 100) + '%';
}

// Show game over screen
function showGameOver() {
    // Update final score
    finalScoreElement.textContent = score;
    finalWaveElement.textContent = waveNumber;
    
    // Show game over screen
    gameOverScreen.style.display = 'block';
    
    // Hide UI
    uiContainer.style.display = 'none';
}

// Show victory screen
function showVictory() {
    // Could use same screen as game over but with different message
    gameOverScreen.querySelector('h1').textContent = 'VICTORY!';
    
    // Update final score
    finalScoreElement.textContent = score;
    finalWaveElement.textContent = waveNumber;
    
    // Show game over screen
    gameOverScreen.style.display = 'block';
    
    // Hide UI
    uiContainer.style.display = 'none';
}

// Start game
function startGame() {
    // Resume audio context if suspended
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    // Play background music
    playBackgroundMusic();
    
    // Hide menu
    menu.style.display = 'none';
    
    // Show UI
    uiContainer.style.display = 'block';
    
    // Reset game state
    gameStarted = true;
    gameOver = false;
    gamePaused = false;
    health = maxHealth;
    score = 0;
    waveNumber = 1;
    waveProgress = 0;
    killCount = 0;
    
    // Update UI
    waveText.textContent = `Wave ${waveNumber}/${totalWaves}`;
    updateUI();
}

// Restart game
function restartGame() {
    // Remove all enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        scene.remove(enemies[i]);
    }
    enemies = [];
    
    // Remove all projectiles
    for (let i = playerProjectiles.length - 1; i >= 0; i--) {
        scene.remove(playerProjectiles[i].mesh);
    }
    playerProjectiles = [];
    
    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
        scene.remove(enemyProjectiles[i].mesh);
    }
    enemyProjectiles = [];
    
    // Remove all power-ups
    for (let i = powerUps.length - 1; i >= 0; i--) {
        scene.remove(powerUps[i].mesh);
    }
    powerUps = [];
    
    // Reset active power-ups
    for (const type in activePowerUps) {
        if (activePowerUps.hasOwnProperty(type)) {
            removePowerUpEffect(type);
        }
    }
    
    // Reset enemy types to initial state
    activeEnemyTypes = ['runner'];
    
    // Reset player
    if (playerGroup) {
        playerGroup.position.set(0, 0, 0);
        targetPlayerX = 0;
        
        // Show player model
        if (playerModel) playerModel.visible = true;
    }
    
    // Reset game state
    gameOver = false;
    health = maxHealth;
    score = 0;
    waveNumber = 1;
    waveProgress = 0;
    killCount = 0;
    
    // Hide game over screen
    gameOverScreen.style.display = 'none';
    
    // Show UI
    uiContainer.style.display = 'block';
    
    // Update UI
    waveText.textContent = `Wave ${waveNumber}/${totalWaves}`;
    updateUI();
}

// Animation loop
function animate() {
    // Calculate delta time
    const now = Date.now() * 0.001; // Convert to seconds
    const deltaTime = Math.min(0.1, now - timeElapsed); // Cap delta time to avoid large jumps
    timeElapsed = now;
    
    // Request next frame
    requestAnimationFrame(animate);
    
    // Skip updates if paused
    if (gamePaused) {
        renderer.render(scene, camera);
        return;
    }
    
    if (gameStarted && !gameOver) {
        // Update player
        updatePlayerMovement(deltaTime);
        
        // Update enemies
        updateEnemies(deltaTime);
        
        // Update projectiles
        updateProjectiles();
        
        // Update power-ups
        updatePowerUps(deltaTime);
        
        // Update environment
        updateEnvironment(deltaTime);
        
        // Auto reset player shooting state
        isPlayerShooting = false;
        
        // Update visual effects
        for (let i = effectsToUpdate.length - 1; i >= 0; i--) {
            const effect = effectsToUpdate[i];
            const stillAlive = effect.update(deltaTime);
            
            if (!stillAlive) {
                effectsToUpdate.splice(i, 1);
            }
        }
    }
    
    // Render scene
    renderer.render(scene, camera);
}

// Export functions to window scope
window.startGame = startGame;
window.restartGame = restartGame;
window.gameInitialized = true;
// Import Three.js
import * as THREE from "https://unpkg.com/three@0.157.0/build/three.module.js";

// GAME VARIABLES
// Core game state
let scene, camera, renderer, player;
let gameStarted = false;
let gameOver = false;
let gamePaused = false;
let timeElapsed = 0;
let distance = 0;
let score = 0;
let health = 100;
let maxHealth = 100;
let levelMap = [];
let level = 1;
let waveNumber = 0;
let waveProgress = 0;
let totalWaves = 5;
let waveComplete = false;
let gameSpeed = 1.0;

// Player-related
let playerGroup;
let playerModel;
let playerGun;
let playerShield;
let playerHitBox;
let targetPlayerX = 0;
let isPlayerShooting = false;
let shootingCooldown = 0;
let lastShootTime = 0;
let shootRate = 0.3; // Seconds between shots
let isMovingLeft = false;
let isMovingRight = false;
let playerMoveSpeed = 0.3;
let playerRunAnimationTime = 0;
let autoAimTarget = null;

// Environment
let groundSegments = [];
let environmentObjects = [];
let skybox;
let groundMaterial;
let lightIntensityOriginal;
let ambientLightIntensityOriginal;
let fogDensityOriginal;

// Effects
let effectsToUpdate = [];
let particleSystems = [];
let muzzleFlash;

// Power-ups
let powerUps = [];
let activePowerUps = {};
let lastPowerUpSpawnTime = 0;
let powerUpSpawnRate = 10; // Seconds

// Enemies
let enemies = [];
let enemyProjectiles = [];
let enemySpawnPoints = [];
let lastEnemySpawnTime = 0;
let enemySpawnRate = 1.5; // Seconds
let enemyTypes = [
    { type: 'runner', health: 20, speed: 0.2, damage: 10, score: 50, color: 0xff4040 },
    { type: 'shooter', health: 30, speed: 0.1, damage: 5, score: 100, color: 0x40a0ff, fireRate: 2.0 },
    { type: 'tank', health: 80, speed: 0.05, damage: 20, score: 200, color: 0x808080 }
];
let activeEnemyTypes = ['runner']; // Start with basic enemies
let maxEnemiesOnScreen = 10;
let killCount = 0;

// Projectiles
let playerProjectiles = [];
let projectileSpeed = 2.0;
let playerProjectileDamage = 10;

// Obstacles and collectibles
let obstacles = [];
let collectibles = [];
let lastObstacleSpawnTime = 0;
let obstacleSpawnRate = 3.0; // Seconds

// Animations
let playerAnimations = {
    idle: null,
    run: null,
    shoot: null,
    shootRun: null,
    die: null
};
let currentAnimation = 'run';
let animationMixer;

// Level design
let currentLevelSegment = 0;
let levelSegments = [
    { type: 'normal', length: 50, enemies: ['runner'], obstacle: false, powerUp: false },
    { type: 'obstacles', length: 30, enemies: [], obstacle: true, powerUp: false },
    { type: 'combat', length: 80, enemies: ['runner', 'shooter'], obstacle: false, powerUp: true },
    { type: 'boss', length: 30, enemies: ['tank'], obstacle: false, powerUp: true }
];

// UI Elements
const uiContainer = document.getElementById("ui");
const gameContainer = document.getElementById("game-container");
const healthBar = document.getElementById("health-bar");
const healthBarInner = document.getElementById("health-bar-inner");
const scoreElement = document.getElementById("score");
const waveProgressBar = document.getElementById("wave-progress-bar");
const waveProgressInner = document.getElementById("wave-progress-inner");
const waveText = document.getElementById("wave-text");
const powerUpIndicator = document.getElementById("power-up-indicator");
const gameOverScreen = document.getElementById("game-over");
const finalScoreElement = document.getElementById("final-score");
const finalWaveElement = document.getElementById("final-wave");
const joystick = document.getElementById("joystick");
const joystickKnob = document.getElementById("joystick-knob");

// Sound effects
let audioContext;
let audioBuffers = {};
let audioSources = {};
let musicPlaying = false;

// DOM ELEMENTS
const menu = document.getElementById("menu");
const startButton = document.getElementById("start-button");
const pauseScreen = document.getElementById("pause-screen");
const restartButton = document.getElementById("restart-button");
const loadingProgress = document.getElementById("loading-progress");

// INITIALIZATION
init();

// Initialize the game
function init() {
    updateLoadingProgress(10);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(gameContainer.clientWidth, gameContainer.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    gameContainer.appendChild(renderer.domElement);
    
    updateLoadingProgress(20);
    
    // Create scene
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x223344, 0.015);
    fogDensityOriginal = scene.fog.density;
    
    updateLoadingProgress(30);
    
    // Create camera - third-person with slight overhead view
    camera = new THREE.PerspectiveCamera(
        70,
        gameContainer.clientWidth / gameContainer.clientHeight,
        0.1,
        1000
    );
    camera.position.set(0, 7, 10); // Positioned behind and above player
    camera.lookAt(0, 2, -10); // Looking ahead
    
    updateLoadingProgress(40);
    
    // Create lighting
    createLighting();
    
    updateLoadingProgress(50);
    
    // Create skybox and environment
    createEnvironment();
    
    updateLoadingProgress(60);
    
    // Create ground
    createGround();
    
    updateLoadingProgress(70);
    
    // Create player
    createPlayer();
    
    updateLoadingProgress(80);
    
    // Initialize audio
    initAudio();
    
    updateLoadingProgress(90);
    
    // Set up event listeners
    setupEventListeners();
    
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

// Set up event listeners
function setupEventListeners() {
    // Window resize
    window.addEventListener('resize', onWindowResize);
    
    // Game controls
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Touch controls
    setupTouchControls();
    
    // Game buttons
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', restartGame);
}

// Set up touch controls (mobile)
function setupTouchControls() {
    // Joystick handling
    let joystickActive = false;
    let joystickPosition = { x: 0, y: 0 };
    const joystickMaxRadius = 50;
    
    // Joystick touch start
    joystick.addEventListener('touchstart', function(e) {
        e.preventDefault();
        joystickActive = true;
        updateJoystickPosition(e.touches[0]);
    });
    
    // Joystick touch move
    joystick.addEventListener('touchmove', function(e) {
        e.preventDefault();
        if (joystickActive) {
            updateJoystickPosition(e.touches[0]);
        }
    });
    
    // Joystick touch end
    joystick.addEventListener('touchend', function(e) {
        e.preventDefault();
        joystickActive = false;
        joystickKnob.style.transform = 'translate(-50%, -50%)';
        joystickPosition = { x: 0, y: 0 };
        isMovingLeft = false;
        isMovingRight = false;
    });
    
    // Update joystick position
    function updateJoystickPosition(touch) {
        const joystickRect = joystick.getBoundingClientRect();
        const centerX = joystickRect.left + joystickRect.width / 2;
        const centerY = joystickRect.top + joystickRect.height / 2;
        
        let deltaX = touch.clientX - centerX;
        let deltaY = touch.clientY - centerY;
        
        // Calculate distance from center
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Limit to joystick radius
        if (distance > joystickMaxRadius) {
            deltaX = deltaX * joystickMaxRadius / distance;
            deltaY = deltaY * joystickMaxRadius / distance;
        }
        
        // Update knob position
        joystickKnob.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
        
        // Calculate normalized position (-1 to 1)
        joystickPosition.x = deltaX / joystickMaxRadius;
        joystickPosition.y = deltaY / joystickMaxRadius;
        
        // Set movement flags
        isMovingLeft = joystickPosition.x < -0.2;
        isMovingRight = joystickPosition.x > 0.2;
        
        // Update player's target position
        targetPlayerX = joystickPosition.x * 10; // 10 units full joystick deflection
    }
    
    // Swipe handling for larger screen area
    let touchStartX = 0;
    let touchStartY = 0;
    
    gameContainer.addEventListener('touchstart', function(e) {
        if (e.target === gameContainer || e.target === renderer.domElement) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }
    });
    
    gameContainer.addEventListener('touchmove', function(e) {
        if (!joystickActive && (e.target === gameContainer || e.target === renderer.domElement)) {
            const touchX = e.touches[0].clientX;
            const deltaX = touchX - touchStartX;
            
            // Convert delta to game world units
            targetPlayerX = (deltaX / gameContainer.clientWidth) * 20;
            
            // Limit target position
            targetPlayerX = Math.max(-10, Math.min(10, targetPlayerX));
        }
    });
}

// Handle keyboard down
function handleKeyDown(event) {
    switch(event.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
            isMovingLeft = true;
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            isMovingRight = true;
            break;
        case ' ':
        case 'k':
        case 'K':
            // Manual shooting (for testing)
            firePlayerProjectile();
            break;
        case 'p':
        case 'P':
            // Toggle pause
            if (gameStarted && !gameOver) {
                gamePaused = !gamePaused;
                pauseScreen.style.display = gamePaused ? 'block' : 'none';
                
                // Pause/resume audio
                if (gamePaused) {
                    pauseAudio();
                } else {
                    resumeAudio();
                }
            }
            break;
    }
}

// Handle keyboard up
function handleKeyUp(event) {
    switch(event.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
            isMovingLeft = false;
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            isMovingRight = false;
            break;
    }
}

// Handle window resize
function onWindowResize() {
    camera.aspect = gameContainer.clientWidth / gameContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(gameContainer.clientWidth, gameContainer.clientHeight);
}

// Initialize audio system
function initAudio() {
    try {
        // Create audio context
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Define sounds to load
        const sounds = {
            shoot: 'https://assets.codepen.io/21542/laser-shoot.mp3',
            hit: 'https://assets.codepen.io/21542/hit-sound.mp3',
            explosion: 'https://assets.codepen.io/21542/explosion.mp3',
            powerUp: 'https://assets.codepen.io/21542/powerup.mp3',
            damage: 'https://assets.codepen.io/21542/damage.mp3',
            music: 'https://assets.codepen.io/21542/game-music.mp3'
        };
        
        // Load each sound
        Object.entries(sounds).forEach(([name, url]) => {
            loadSound(url, name);
        });
    } catch (e) {
        console.error('Audio initialization failed:', e);
    }
}

// Load a sound
function loadSound(url, name) {
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

// Play sound with options
function playSound(name, options = {}) {
    if (!audioContext || !audioBuffers[name]) return null;
    
    try {
        // Create source
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffers[name];
        
        // Create gain node for volume control
        const gainNode = audioContext.createGain();
        gainNode.gain.value = options.volume || 0.5;
        
        // Create panner for 3D positioning
        let panner = null;
        if (options.position) {
            panner = audioContext.createPanner();
            panner.panningModel = 'HRTF';
            panner.distanceModel = 'inverse';
            panner.refDistance = 1;
            panner.maxDistance = 100;
            panner.rolloffFactor = 1;
            panner.coneInnerAngle = 360;
            panner.coneOuterAngle = 360;
            panner.coneOuterGain = 0;
            
            // Set position
            panner.setPosition(
                options.position.x || 0,
                options.position.y || 0,
                options.position.z || 0
            );
        }
        
        // Connect nodes
        if (panner) {
            source.connect(panner);
            panner.connect(gainNode);
        } else {
            source.connect(gainNode);
        }
        gainNode.connect(audioContext.destination);
        
        // Set loop if needed
        if (options.loop) {
            source.loop = true;
        }
        
        // Play sound
        source.start(0);
        
        // Store source if it has a key (for later control)
        if (options.key) {
            audioSources[options.key] = {
                source: source,
                gainNode: gainNode,
                panner: panner
            };
        }
        
        // Return sound objects for control
        return {
            source: source,
            gainNode: gainNode,
            panner: panner
        };
    } catch (e) {
        console.error('Error playing sound:', e);
        return null;
    }
}

// Update sound position
function updateSoundPosition(key, position) {
    if (audioSources[key] && audioSources[key].panner) {
        audioSources[key].panner.setPosition(
            position.x || 0,
            position.y || 0,
            position.z || 0
        );
    }
}

// Pause all audio
function pauseAudio() {
    if (audioContext) {
        audioContext.suspend();
    }
}

// Resume all audio
function resumeAudio() {
    if (audioContext) {
        audioContext.resume();
    }
}

// Play background music
function playBackgroundMusic() {
    if (musicPlaying || !audioBuffers.music) return;
    
    const music = playSound('music', {
        volume: 0.3,
        loop: true,
        key: 'backgroundMusic'
    });
    
    if (music) {
        musicPlaying = true;
    }
}

// Create lighting setup
function createLighting() {
    // Ambient light for overall scene illumination
    const ambientLight = new THREE.AmbientLight(0x404050, 0.5);
    scene.add(ambientLight);
    ambientLightIntensityOriginal = ambientLight.intensity;
    
    // Main directional light (sun)
    const sunLight = new THREE.DirectionalLight(0xffffcc, 1.0);
    sunLight.position.set(10, 20, 10);
    sunLight.castShadow = true;
    
    // Configure shadow properties
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 50;
    sunLight.shadow.camera.left = -20;
    sunLight.shadow.camera.right = 20;
    sunLight.shadow.camera.top = 20;
    sunLight.shadow.camera.bottom = -20;
    sunLight.shadow.bias = -0.0005;
    
    scene.add(sunLight);
    lightIntensityOriginal = sunLight.intensity;
    
    // Additional fill lights
    const fillLight = new THREE.PointLight(0x8888ff, 0.5, 20);
    fillLight.position.set(-5, 5, 5);
    scene.add(fillLight);
}

// Create skybox and environment
function createEnvironment() {
    // Create skybox
    const skyGeometry = new THREE.BoxGeometry(1000, 1000, 1000);
    const skyMaterials = [
        new THREE.MeshBasicMaterial({ 
            map: createSkyTexture('right'), 
            side: THREE.BackSide 
        }),
        new THREE.MeshBasicMaterial({ 
            map: createSkyTexture('left'), 
            side: THREE.BackSide 
        }),
        new THREE.MeshBasicMaterial({ 
            map: createSkyTexture('top'), 
            side: THREE.BackSide 
        }),
        new THREE.MeshBasicMaterial({ 
            map: createSkyTexture('bottom'), 
            side: THREE.BackSide 
        }),
        new THREE.MeshBasicMaterial({ 
            map: createSkyTexture('front'), 
            side: THREE.BackSide 
        }),
        new THREE.MeshBasicMaterial({ 
            map: createSkyTexture('back'), 
            side: THREE.BackSide 
        }),
    ];
    
    skybox = new THREE.Mesh(skyGeometry, skyMaterials);
    scene.add(skybox);
    
    // Create distant mountains (parallax background)
    createDistantMountains();
    
    // Create debris and environment props
    createEnvironmentProps();
}

// Create a sky texture for the skybox
function createSkyTexture(side) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    
    // Different gradient based on side
    let gradient;
    
    switch(side) {
        case 'top':
            gradient = ctx.createLinearGradient(0, 0, 0, 1024);
            gradient.addColorStop(0, '#000510');
            gradient.addColorStop(0.5, '#001122');
            break;
        case 'bottom':
            gradient = ctx.createLinearGradient(0, 0, 0, 1024);
            gradient.addColorStop(0, '#001122');
            gradient.addColorStop(1, '#000510');
            break;
        case 'front':
        case 'back':
            gradient = ctx.createLinearGradient(0, 0, 0, 1024);
            gradient.addColorStop(0, '#001028');
            gradient.addColorStop(0.7, '#102040');
            break;
        default:
            gradient = ctx.createLinearGradient(0, 0, 0, 1024);
            gradient.addColorStop(0, '#001028');
            gradient.addColorStop(0.7, '#102040');
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 1024);
    
    // Add stars if it's the top or sides
    if (side !== 'bottom') {
        addStarsToCanvas(ctx, canvas.width, canvas.height);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

// Add stars to the sky canvas
function addStarsToCanvas(ctx, width, height) {
    // Add stars
    const starCount = 200;
    ctx.fillStyle = '#ffffff';
    
    for (let i = 0; i < starCount; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const radius = Math.random() * 1.5;
        
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Add a few brighter stars
    ctx.fillStyle = '#aaccff';
    for (let i = 0; i < 20; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const radius = 1 + Math.random() * 1.5;
        
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Create distant mountains for parallax effect
function createDistantMountains() {
    // Create a mountain silhouette
    const mountainGeometry = new THREE.PlaneGeometry(500, 80);
    const mountainTexture = createMountainTexture();
    const mountainMaterial = new THREE.MeshBasicMaterial({
        map: mountainTexture,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    
    const mountains = new THREE.Mesh(mountainGeometry, mountainMaterial);
    mountains.position.set(0, 30, -100);
    scene.add(mountains);
    
    // Create a second row of mountains
    const mountains2 = new THREE.Mesh(mountainGeometry, mountainMaterial);
    mountains2.position.set(-200, 30, -120);
    scene.add(mountains2);
    
    const mountains3 = new THREE.Mesh(mountainGeometry, mountainMaterial);
    mountains3.position.set(200, 30, -120);
    scene.add(mountains3);
    
    // Add to environment objects for update
    environmentObjects.push({
        mesh: mountains,
        type: 'mountains',
        scrollSpeed: 0.02
    });
    
    environmentObjects.push({
        mesh: mountains2,
        type: 'mountains',
        scrollSpeed: 0.015
    });
    
    environmentObjects.push({
        mesh: mountains3,
        type: 'mountains',
        scrollSpeed: 0.015
    });
}

// Create mountain silhouette texture
function createMountainTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Create gradient for mountains
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#102040');
    gradient.addColorStop(1, 'rgba(16, 32, 64, 0)');
    
    ctx.fillStyle = gradient;
    
    // Draw mountain silhouette
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    
    // Create jagged mountain peaks
    let x = 0;
    while (x < canvas.width) {
        const peakHeight = Math.random() * canvas.height * 0.8;
        ctx.lineTo(x, canvas.height - peakHeight);
        x += Math.random() * 50 + 50;
    }
    
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fill();
    
    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    
    return texture;
}

// Create environment props (debris, barricades, etc.)
function createEnvironmentProps() {
    // Distant props (static in background)
    createDistantProps();
    
    // Near-path props (will scroll)
    createPathsideProps();
}

// Create distant environment props
function createDistantProps() {
    // Create destroyed buildings in the distance
    for (let i = 0; i < 10; i++) {
        const size = 10 + Math.random() * 15;
        const destroyedBuilding = createDestroyedBuilding(size);
        
        // Position randomly in the distance
        const angle = Math.random() * Math.PI * 2;
        const dist = 80 + Math.random() * 100;
        
        destroyedBuilding.position.set(
            Math.cos(angle) * dist,
            size / 2 - 5, // Partially buried
            Math.sin(angle) * dist
        );
        
        // Random rotation
        destroyedBuilding.rotation.y = Math.random() * Math.PI * 2;
        
        scene.add(destroyedBuilding);
    }
    
    // Add distant smoke columns
    for (let i = 0; i < 5; i++) {
        const smokeColumn = createSmokeColumn();
        
        const angle = Math.random() * Math.PI * 2;
        const dist = 60 + Math.random() * 100;
        
        smokeColumn.position.set(
            Math.cos(angle) * dist,
            0,
            Math.sin(angle) * dist
        );
        
        scene.add(smokeColumn);
        
        // Add to effects to update
        effectsToUpdate.push({
            type: 'smoke',
            system: smokeColumn,
            update: function(delta) {
                // Smoke columns continue even when game is paused (distant backdrop)
                updateSmokeParticles(smokeColumn, delta);
                return true;
            }
        });
    }
}

// Create a destroyed building for background
function createDestroyedBuilding(size) {
    const building = new THREE.Group();
    
    // Create basic structure - irregular shape
    const baseGeometry = new THREE.BoxGeometry(size, size * 2, size);
    const baseMaterial = new THREE.MeshPhongMaterial({
        color: 0x404040,
        roughness: 0.8,
        metalness: 0.2
    });
    
    // Distort geometry to look damaged
    const positions = baseGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
        // Only distort certain vertices for partial destruction
        if (Math.random() > 0.7) {
            const factor = (Math.random() - 0.5) * 0.3;
            positions.setXYZ(
                i,
                positions.getX(i) * (1 + factor),
                positions.getY(i) * (1 + factor),
                positions.getZ(i) * (1 + factor)
            );
        }
    }
    
    baseGeometry.computeVertexNormals();
    
    const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
    building.add(baseMesh);
    
    // Add some debris around the base
    for (let i = 0; i < 5; i++) {
        const debrisSize = size * 0.2 * Math.random();
        const debrisGeometry = new THREE.BoxGeometry(
            debrisSize, 
            debrisSize, 
            debrisSize
        );
        
        // Distort debris
        const debrisPositions = debrisGeometry.attributes.position;
        for (let j = 0; j < debrisPositions.count; j++) {
            const factor = (Math.random() - 0.5) * 0.5;
            debrisPositions.setXYZ(
                j,
                debrisPositions.getX(j) * (1 + factor),
                debrisPositions.getY(j) * (1 + factor),
                debrisPositions.getZ(j) * (1 + factor)
            );
        }
        
        debrisGeometry.computeVertexNormals();
        
        const debris = new THREE.Mesh(debrisGeometry, baseMaterial);
        
        // Position debris around the building
        const angle = Math.random() * Math.PI * 2;
        const distance = size * 0.6 + Math.random() * size * 0.4;
        
        debris.position.set(
            Math.cos(angle) * distance,
            -size + debrisSize/2 + Math.random() * 2,
            Math.sin(angle) * distance
        );
        
        debris.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        
        building.add(debris);
    }
    
    return building;
}

// Create a smoke column particle system
function createSmokeColumn() {
    const particleCount = 100;
    const particleSystem = new THREE.Group();
    
    // Create particle geometry
    const particlesGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSizes = new Float32Array(particleCount);
    const particleColors = new Float32Array(particleCount * 3);
    const particleData = [];
    
    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // Initial position - clustered at bottom
        const radius = Math.random() * 2;
        const angle = Math.random() * Math.PI * 2;
        
        particlePositions[i3] = Math.cos(angle) * radius;
        particlePositions[i3 + 1] = Math.random() * 2;
        particlePositions[i3 + 2] = Math.sin(angle) * radius;
        
        // Size
        particleSizes[i] = 1 + Math.random() * 3;
        
        // Color - smoke gradient from dark to light
        const brightness = 0.2 + Math.random() * 0.3;
        particleColors[i3] = brightness;
        particleColors[i3 + 1] = brightness;
        particleColors[i3 + 2] = brightness;
        
        // Additional data for animation
        particleData.push({
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                0.5 + Math.random() * 0.5,
                (Math.random() - 0.5) * 0.1
            ),
            opacity: 0.7 + Math.random() * 0.3,
            life: Math.random() * 2,
            maxLife: 2 + Math.random() * 3
        });
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particlesGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    
    // Create material
    const particlesMaterial = new THREE.PointsMaterial({
        color: 0xaaaaaa,
        size: 1,
        transparent: true,
        opacity: 0.6,
        vertexColors: true,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending
    });
    
    // Create particle system
    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    particleSystem.add(particles);
    
    // Store particle data
    particles.userData = {
        particleData: particleData
    };
    
    return particleSystem;
}

// Update smoke particles
function updateSmokeParticles(smokeSystem, delta) {
    const particles = smokeSystem.children[0];
    const geometry = particles.geometry;
    const positions = geometry.attributes.position.array;
    const sizes = geometry.attributes.size.array;
    const colors = geometry.attributes.color.array;
    const particleData = particles.userData.particleData;
    
    for (let i = 0; i < particleData.length; i++) {
        const i3 = i * 3;
        const data = particleData[i];
        
        // Update life
        data.life += delta;
        
        // Reset particle if it's reached max life
        if (data.life >= data.maxLife) {
            // Reset position to bottom
            const radius = Math.random() * 2;
            const angle = Math.random() * Math.PI * 2;
            
            positions[i3] = Math.cos(angle) * radius;
            positions[i3 + 1] = Math.random() * 2;
            positions[i3 + 2] = Math.sin(angle) * radius;
            
            // Reset size
            sizes[i] = 1 + Math.random() * 3;
            
            // Reset color
            const brightness = 0.2 + Math.random() * 0.3;
            colors[i3] = brightness;
            colors[i3 + 1] = brightness;
            colors[i3 + 2] = brightness;
            
            // Reset life and velocity
            data.life = 0;
            data.maxLife = 2 + Math.random() * 3;
            data.velocity.set(
                (Math.random() - 0.5) * 0.1,
                0.5 + Math.random() * 0.5,
                (Math.random() - 0.5) * 0.1
            );
        } else {
            // Update position based on velocity
            positions[i3] += data.velocity.x;
            positions[i3 + 1] += data.velocity.y;
            positions[i3 + 2] += data.velocity.z;
            
            // Gradually increase size
            sizes[i] += 0.05;
            
            // Fade out color as it rises
            const lifeRatio = data.life / data.maxLife;
            const fadeFactor = 1 - lifeRatio;
            colors[i3] = Math.max(0.1, colors[i3] * fadeFactor);
            colors[i3 + 1] = Math.max(0.1, colors[i3 + 1] * fadeFactor);
            colors[i3 + 2] = Math.max(0.1, colors[i3 + 2] * fadeFactor);
            
            // Add some turbulence
            data.velocity.x += (Math.random() - 0.5) * 0.01;
            data.velocity.z += (Math.random() - 0.5) * 0.01;
            
            // Slow down as it rises
            data.velocity.y *= 0.99;
        }
    }
    
    // Update geometry attributes
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.size.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
}

// Create props along the path sides
function createPathsideProps() {
    // Create rock formations
    for (let i = 0; i < 20; i++) {
        const rockFormation = createRockFormation();
        
        // Position along the path
        const side = Math.random() > 0.5 ? 1 : -1;
        rockFormation.position.set(
            side * (15 + Math.random() * 10),
            0,
            -50 - i * 30
        );
        
        // Random rotation
        rockFormation.rotation.y = Math.random() * Math.PI * 2;
        
        scene.add(rockFormation);
        
        // Add to environment objects for scrolling
        environmentObjects.push({
            mesh: rockFormation,
            type: 'pathside',
            scrollSpeed: 1.0,
            initialZ: rockFormation.position.z
        });
    }
    
    // Create destroyed vehicles
    for (let i = 0; i < 10; i++) {
        const vehicle = createDestroyedVehicle();
        
        // Position along the path
        const side = Math.random() > 0.5 ? 1 : -1;
        const distance = 12 + Math.random() * 20;
        
        vehicle.position.set(
            side * distance,
            0,
            -80 - i * 60
        );
        
        // Random rotation
        vehicle.rotation.y = Math.random() * Math.PI * 2;
        
        scene.add(vehicle);
        
        // Add to environment objects for scrolling
        environmentObjects.push({
            mesh: vehicle,
            type: 'pathside',
            scrollSpeed: 1.0,
            initialZ: vehicle.position.z
        });
    }
    
    // Create barricades
    for (let i = 0; i < 15; i++) {
        const barricade = createBarricade();
        
        // Position along the path
        const side = Math.random() > 0.5 ? 1 : -1;
        const distance = 10 + Math.random() * 15;
        
        barricade.position.set(
            side * distance,
            0,
            -100 - i * 40
        );
        
        // Random rotation - facing slightly toward the path
        barricade.rotation.y = (side > 0 ? Math.PI : 0) + (Math.random() - 0.5) * 0.5;
        
        scene.add(barricade);
        
        // Add to environment objects for scrolling
        environmentObjects.push({
            mesh: barricade,
            type: 'pathside',
            scrollSpeed: 1.0,
            initialZ: barricade.position.z
        });
    }
}

// Create a rock formation
function createRockFormation() {
    const rocks = new THREE.Group();
    
    // Create several rocks in a cluster
    const rockCount = 3 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < rockCount; i++) {
        // Random rock size
        const size = 1 + Math.random() * 3;
        
        // Create rock geometry - use icosahedron for natural look
        const rockGeometry = new THREE.IcosahedronGeometry(size, 1);
        
        // Distort vertices for more irregular shape
        const positions = rockGeometry.attributes.position;
        for (let j = 0; j < positions.count; j++) {
            positions.setXYZ(
                j,
                positions.getX(j) * (0.8 + Math.random() * 0.4),
                positions.getY(j) * (0.8 + Math.random() * 0.4),
                positions.getZ(j) * (0.8 + Math.random() * 0.4)
            );
        }
        
        rockGeometry.computeVertexNormals();
        
        // Rock material
        const rockMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0.3 + Math.random() * 0.1, 0.3 + Math.random() * 0.1, 0.3 + Math.random() * 0.1),
            roughness: 0.8,
            metalness: 0.2
        });
        
        // Create rock mesh
        const rock = new THREE.Mesh(rockGeometry, rockMaterial);
        
        // Position within cluster
        rock.position.set(
            (Math.random() - 0.5) * 3,
            size / 2 - 0.5 + Math.random(),
            (Math.random() - 0.5) * 3
        );
        
        // Random rotation
        rock.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        
        // Add shadow casting
        rock.castShadow = true;
        rock.receiveShadow = true;
        
        rocks.add(rock);
    }
    
    return rocks;
}

// Create a destroyed vehicle
function createDestroyedVehicle() {
    const vehicle = new THREE.Group();
    
    // Determine vehicle type (tank, jeep, truck)
    const vehicleType = Math.floor(Math.random() * 3);
    
    // Base color - darkened and desaturated
    const baseColor = new THREE.Color(0.2 + Math.random() * 0.1, 0.2 + Math.random() * 0.1, 0.2 + Math.random() * 0.1);
    
    // Vehicle base material
    const vehicleMaterial = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.8,
        metalness: 0.3
    });
    
    switch (vehicleType) {
        case 0: // Tank
            // Tank body
            const tankBody = new THREE.Mesh(
                new THREE.BoxGeometry(4, 1.5, 6),
                vehicleMaterial
            );
            tankBody.position.y = 1;
            vehicle.add(tankBody);
            
            // Tank turret
            const turretGeometry = new THREE.CylinderGeometry(1.5, 1.5, 1, 8);
            const turret = new THREE.Mesh(turretGeometry, vehicleMaterial);
            turret.position.set(0, 2.25, 0);
            turret.rotation.x = Math.PI / 2;
            tankBody.add(turret);
            
            // Tank cannon
            const cannonGeometry = new THREE.CylinderGeometry(0.3, 0.3, 4, 8);
            const cannon = new THREE.Mesh(cannonGeometry, vehicleMaterial);
            cannon.position.set(0, 0, 2);
            cannon.rotation.x = Math.PI / 2;
            turret.add(cannon);
            
            // Tank treads
            const leftTread = new THREE.Mesh(
                new THREE.BoxGeometry(1, 1, 6),
                vehicleMaterial
            );
            leftTread.position.set(-2, 0, 0);
            vehicle.add(leftTread);
            
            const rightTread = new THREE.Mesh(
                new THREE.BoxGeometry(1, 1, 6),
                vehicleMaterial
            );
            rightTread.position.set(2, 0, 0);
            vehicle.add(rightTread);
            
            // Damage the tank - shifted turret
            turret.rotation.z = (Math.random() - 0.5) * 0.5;
            turret.position.x = (Math.random() - 0.5) * 0.5;
            cannon.rotation.y = (Math.random() - 0.5) * 0.3;
            
            break;
            
        case 1: // Jeep
            // Jeep body
            const jeepBody = new THREE.Mesh(
                new THREE.BoxGeometry(3, 1, 5),
                vehicleMaterial
            );
            jeepBody.position.y = 0.8;
            vehicle.add(jeepBody);
            
            // Jeep top
            const jeepTop = new THREE.Mesh(
                new THREE.BoxGeometry(2.8, 1, 2),
                vehicleMaterial
            );
            jeepTop.position.set(0, 1.8, -1);
            vehicle.add(jeepTop);
            
            // Wheels
            const wheelMaterial = new THREE.MeshStandardMaterial({
                color: 0x111111,
                roughness: 0.9,
                metalness: 0.1
            });
            
            const wheelPositions = [
                [-1.7, 0.5, 1.5],  // Front left
                [1.7, 0.5, 1.5],   // Front right
                [-1.7, 0.5, -1.5], // Back left
                [1.7, 0.5, -1.5]   // Back right
            ];
            
            for (const position of wheelPositions) {
                const wheel = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.5, 0.5, 0.4, 8),
                    wheelMaterial
                );
                wheel.position.set(...position);
                wheel.rotation.z = Math.PI / 2;
                vehicle.add(wheel);
            }
            
            // Damage the jeep - tilt it and make a wheel missing
            vehicle.rotation.z = (Math.random() - 0.5) * 0.3;
            if (Math.random() > 0.5) {
                const randomWheel = Math.floor(Math.random() * 4);
                vehicle.children[2 + randomWheel].visible = false;
            }
            
            break;
            
        case 2: // Truck
            // Truck cab
            const truckCab = new THREE.Mesh(
                new THREE.BoxGeometry(3, 2.5, 3),
                vehicleMaterial
            );
            truckCab.position.set(0, 1.5, 2);
            vehicle.add(truckCab);
            
            // Truck bed
            const truckBed = new THREE.Mesh(
                new THREE.BoxGeometry(3, 1.5, 5),
                vehicleMaterial
            );
            truckBed.position.set(0, 1, -1.5);
            vehicle.add(truckBed);
            
            // Wheels
            const truckWheelMaterial = new THREE.MeshStandardMaterial({
                color: 0x111111,
                roughness: 0.9,
                metalness: 0.1
            });
            
            const truckWheelPositions = [
                [-1.7, 0.7, 2.5],  // Front left
                [1.7, 0.7, 2.5],   // Front right
                [-1.7, 0.7, -1.5], // Middle left
                [1.7, 0.7, -1.5],  // Middle right
                [-1.7, 0.7, -3.5], // Back left
                [1.7, 0.7, -3.5]   // Back right
            ];
            
            for (const position of truckWheelPositions) {
                const wheel = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.7, 0.7, 0.5, 8),
                    truckWheelMaterial
                );
                wheel.position.set(...position);
                wheel.rotation.z = Math.PI / 2;
                vehicle.add(wheel);
            }
            
            // Damage the truck - rotate and dent the cab
            truckCab.rotation.y = (Math.random() - 0.5) * 0.3;
            truckCab.position.y += (Math.random() - 0.5) * 0.5;
            
            // Sometimes make the truck tipped over
            if (Math.random() > 0.7) {
                vehicle.rotation.z = Math.PI / 2 * (Math.random() > 0.5 ? 1 : -1);
                vehicle.position.y = 1.5;
            }
            
            break;
    }
    
    // Add burn marks (dark patches)
    const burnMarkGeometry = new THREE.PlaneGeometry(4, 4);
    const burnMarkMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    
    const burnMark = new THREE.Mesh(burnMarkGeometry, burnMarkMaterial);
    burnMark.rotation.x = -Math.PI / 2;
    burnMark.position.y = 0.01; // Just above ground
    vehicle.add(burnMark);
    
    // Set shadow casting
    vehicle.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    
    return vehicle;
}

// Create a barricade
function createBarricade() {
    const barricade = new THREE.Group();
    
    // Sandbags or concrete blocks
    const barrierType = Math.random() > 0.5 ? 'sandbags' : 'concrete';
    
    if (barrierType === 'sandbags') {
        // Create sandbag wall
        const sandbagMaterial = new THREE.MeshStandardMaterial({
            color: 0x9a8569,
            roughness: 0.9,
            metalness: 0.1
        });
        
        // Bottom row
        for (let i = 0; i < 6; i++) {
            const sandbag = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.4, 1, 4, 8),
                sandbagMaterial
            );
            sandbag.position.set((i - 2.5) * 0.9, 0.4, 0);
            sandbag.rotation.z = Math.PI / 2;
            barricade.add(sandbag);
        }
        
        // Middle row
        for (let i = 0; i < 5; i++) {
            const sandbag = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.4, 1, 4, 8),
                sandbagMaterial
            );
            sandbag.position.set((i - 2) * 0.9, 0.4 + 0.8, 0);
            sandbag.rotation.z = Math.PI / 2;
            barricade.add(sandbag);
        }
        
        // Top row
        for (let i = 0; i < 4; i++) {
            const sandbag = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.4, 1, 4, 8),
                sandbagMaterial
            );
            sandbag.position.set((i - 1.5) * 0.9, 0.4 + 1.6, 0);
            sandbag.rotation.z = Math.PI / 2;
            barricade.add(sandbag);
        }
    } else {
        // Create concrete barrier
        const concreteMaterial = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            roughness: 0.8,
            metalness: 0.2
        });
        
        // Main barrier
        const barrier = new THREE.Mesh(
            new THREE.BoxGeometry(5, 1.5, 1),
            concreteMaterial
        );
        barrier.position.y = 0.75;
        barricade.add(barrier);
        
        // Add some variation
        const cracks = [
            [0.8, 0.6, 0.5],
            [-1.2, 0.8, 0.5],
            [1.9, 0.3, 0.5]
        ];
        
        for (const pos of cracks) {
            const crack = new THREE.Mesh(
                new THREE.PlaneGeometry(0.5, 0.8),
                new THREE.MeshBasicMaterial({
                    color: 0x333333,
                    transparent: true,
                    opacity: 0.7
                })
            );
            crack.position.set(...pos);
            crack.rotation.y = Math.PI / 2;
            barricade.add(crack);
        }
        
        // Add rebar sticking out
        const rebarMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.6,
            metalness: 0.8
        });
        
        for (let i = 0; i < 3; i++) {
            const rebar = new THREE.Mesh(
                new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6),
                rebarMaterial
            );
            rebar.position.set(
                -2 + i * 2,
                1.2,
                0
            );
            rebar.rotation.x = Math.PI / 4;
            barricade.add(rebar);
        }
    }
    
    // Set shadow casting
    barricade.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    
    return barricade;
}

// Create the game ground
function createGround() {
    // Create main ground plane
    const groundSize = 30;
    const segmentSize = 30;
    const totalLength = 300;
    
    // Create ground material
    groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.8,
        metalness: 0.2
    });
    
    // Create ground segments
    for (let z = 0; z > -totalLength; z -= segmentSize) {
        const groundGeometry = new THREE.PlaneGeometry(groundSize, segmentSize);
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        
        // Position ground
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(0, 0, z - segmentSize / 2);
        
        // Add details to ground
        addGroundDetails(ground, z);
        
        // Add shadow receiving
        ground.receiveShadow = true;
        
        // Add to scene
        scene.add(ground);
        
        // Store for scrolling
        groundSegments.push({
            mesh: ground,
            initialZ: ground.position.z
        });
    }
    
    // Create side areas (wider than main path)
    const sideMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.9,
        metalness: 0.1
    });
    
    const leftSide = new THREE.Mesh(
        new THREE.PlaneGeometry(100, totalLength),
        sideMaterial
    );
    leftSide.rotation.x = -Math.PI / 2;
    leftSide.position.set(-50 - groundSize / 2, -0.01, -totalLength / 2);
    scene.add(leftSide);
    
    const rightSide = new THREE.Mesh(
        new THREE.PlaneGeometry(100, totalLength),
        sideMaterial
    );
    rightSide.rotation.x = -Math.PI / 2;
    rightSide.position.set(50 + groundSize / 2, -0.01, -totalLength / 2);
    scene.add(rightSide);
}

// Add details to ground segment
function addGroundDetails(ground, z) {
    // Determine segment type based on z position
    const segmentIndex = Math.floor(-z / 30);
    const levelType = levelSegments[segmentIndex % levelSegments.length].type;
    
    // Create texture for the ground
    const texture = createGroundTexture(levelType);
    ground.material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.8,
        metalness: 0.2
    });
    
    // Add 3D details based on type
    switch (levelType) {
        case 'obstacles':
            // Add cracks and holes
            addCracksToGround(ground);
            break;
        case 'combat':
            // Add bullet impact marks
            addBulletImpactsToGround(ground);
            break;
        case 'boss':
            // Add warning markings
            addWarningMarkingsToGround(ground);
            break;
    }
}

// Create ground texture
function createGroundTexture(type) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Base color
    let baseColor;
    switch (type) {
        case 'obstacles':
            baseColor = '#383838';
            break;
        case 'combat':
            baseColor = '#353535';
            break;
        case 'boss':
            baseColor = '#3A3530';
            break;
        default:
            baseColor = '#333333';
    }
    
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add noise texture
    addNoiseTexture(ctx, canvas.width, canvas.height, 0.1);
    
    // Add details based on type
    switch (type) {
        case 'normal':
            // Add some asphalt-like texture
            addAsphaltTexture(ctx, canvas.width, canvas.height);
            break;
        case 'obstacles':
            // Add cracked concrete texture
            addCrackedTexture(ctx, canvas.width, canvas.height);
            break;
        case 'combat':
            // Add bullet marks and scorch marks
            addCombatTexture(ctx, canvas.width, canvas.height);
            break;
        case 'boss':
            // Add warning patterns
            addWarningTexture(ctx, canvas.width, canvas.height);
            break;
    }
    
    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    
    return texture;
}

// Add noise texture to canvas
function addNoiseTexture(ctx, width, height, intensity) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        // Add noise to each pixel
        const noise = (Math.random() - 0.5) * intensity * 255;
        data[i] = Math.max(0, Math.min(255, data[i] + noise));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
    
    ctx.putImageData(imageData, 0, 0);
}

// Add asphalt-like texture
function addAsphaltTexture(ctx, width, height) {
    // Add random small stones
    for (let i = 0; i < 2000; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = Math.random() * 2 + 1;
        
        ctx.fillStyle = `rgba(${50 + Math.random() * 20}, ${50 + Math.random() * 20}, ${50 + Math.random() * 20}, 0.5)`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Add some road lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 5;
    
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
}

    // Add cracked texture
function addCrackedTexture(ctx, width, height) {
    // Draw cracks
    ctx.strokeStyle = 'rgba(20, 20, 20, 0.8)';
    
    // Create several cracks
    for (let i = 0; i < 5; i++) {
        const startX = Math.random() * width;
        const startY = Math.random() * height;
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        
        // Create jagged path
        let currentX = startX;
        let currentY = startY;
        
        // Main crack
        for (let j = 0; j < 10; j++) {
            const newX = currentX + (Math.random() - 0.5) * 100;
            const newY = currentY + (Math.random() - 0.5) * 100;
            
            ctx.lineTo(newX, newY);
            currentX = newX;
            currentY = newY;
        }
        
        ctx.lineWidth = 1 + Math.random() * 2;
        ctx.stroke();
        
        // Add some branches
        for (let j = 0; j < 3; j++) {
            const branchPoint = Math.floor(Math.random() * 8) + 1;
            const branchX = startX + (currentX - startX) * (branchPoint / 10);
            const branchY = startY + (currentY - startY) * (branchPoint / 10);
            
            ctx.beginPath();
            ctx.moveTo(branchX, branchY);
            
            // Create branch
            for (let k = 0; k < 3; k++) {
                const newX = branchX + (Math.random() - 0.5) * 50 * (k + 1);
                const newY = branchY + (Math.random() - 0.5) * 50 * (k + 1);
                
                ctx.lineTo(newX, newY);
            }
            
            ctx.lineWidth = 0.5 + Math.random();
            ctx.stroke();
        }
    }
    
    // Add a couple of small holes/potholes
    ctx.fillStyle = 'rgba(20, 20, 20, 0.7)';
    
    for (let i = 0; i < 8; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = 5 + Math.random() * 20;
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Add combat texture with bullet marks
function addCombatTexture(ctx, width, height) {
    // Add bullet impact marks
    for (let i = 0; i < 30; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = 2 + Math.random() * 5;
        
        // Dark center
        ctx.fillStyle = 'rgba(10, 10, 10, 0.8)';
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Light rim
        ctx.strokeStyle = 'rgba(150, 150, 150, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, size + 1, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Add some scorch marks
    for (let i = 0; i < 5; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = 10 + Math.random() * 30;
        
        // Create radial gradient for scorch mark
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
        gradient.addColorStop(0, 'rgba(10, 10, 10, 0.8)');
        gradient.addColorStop(1, 'rgba(30, 30, 30, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Add warning texture for boss areas
function addWarningTexture(ctx, width, height) {
    // Draw caution stripes
    const stripeWidth = 50;
    
    ctx.fillStyle = 'rgba(200, 150, 0, 0.3)';
    
    for (let i = 0; i < width * 2; i += stripeWidth * 2) {
        // Diagonal stripes
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i - height, height);
        ctx.lineTo(i - height + stripeWidth, height);
        ctx.lineTo(i + stripeWidth, 0);
        ctx.closePath();
        ctx.fill();
    }
    
    // Add some warning text elements
    ctx.fillStyle = 'rgba(200, 50, 0, 0.4)';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    
    // "WARNING" text scattered around
    for (let i = 0; i < 3; i++) {
        const x = 100 + Math.random() * (width - 200);
        const y = 100 + Math.random() * (height - 200);
        const rotation = (Math.random() - 0.5) * 0.5;
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.fillText('WARNING', 0, 0);
        ctx.restore();
    }
}

// Add cracks to ground (3D details)
function addCracksToGround(ground) {
    // Create crack geometries
    for (let i = 0; i < 3; i++) {
        const crackGeometry = new THREE.PlaneGeometry(1 + Math.random() * 3, 0.2);
        const crackMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        
        const crack = new THREE.Mesh(crackGeometry, crackMaterial);
        
        // Position randomly on ground surface
        const groundGeometry = ground.geometry;
        const groundWidth = 30;
        const groundLength = 30;
        
        crack.position.set(
            (Math.random() - 0.5) * groundWidth,
            0.02, // Just above ground
            (Math.random() - 0.5) * groundLength
        );
        
        crack.rotation.x = -Math.PI / 2;
        crack.rotation.z = Math.random() * Math.PI;
        
        ground.add(crack);
    }
}

// Add bullet impacts to ground (3D details)
function addBulletImpactsToGround(ground) {
    // Create bullet impact geometries
    for (let i = 0; i < 10; i++) {
        const impactGeometry = new THREE.CircleGeometry(0.15 + Math.random() * 0.1, 8);
        const impactMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        
        const impact = new THREE.Mesh(impactGeometry, impactMaterial);
        
        // Position randomly on ground surface
        const groundGeometry = ground.geometry;
        const groundWidth = 30;
        const groundLength = 30;
        
        impact.position.set(
            (Math.random() - 0.5) * groundWidth,
            0.01, // Just above ground
            (Math.random() - 0.5) * groundLength
        );
        
        impact.rotation.x = -Math.PI / 2;
        
        ground.add(impact);
    }
}

// Add warning markings to ground (3D details)
function addWarningMarkingsToGround(ground) {
    // Create warning line geometry
    const lineGeometry = new THREE.PlaneGeometry(20, 0.5);
    const lineMaterial = new THREE.MeshBasicMaterial({
        color: 0xffcc00,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    
    // Add lines across the ground
    for (let i = -12; i <= 12; i += 6) {
        const line = new THREE.Mesh(lineGeometry, lineMaterial);
        line.position.set(0, 0.01, i);
        line.rotation.x = -Math.PI / 2;
        ground.add(line);
    }
}

// Create player character
function createPlayer() {
    // Create player group
    playerGroup = new THREE.Group();
    
    // Create player model
    playerModel = createPlayerModel();
    playerGroup.add(playerModel);
    
    // Create hitbox for collision detection
    const hitboxGeometry = new THREE.CapsuleGeometry(0.6, 2, 4, 8);
    const hitboxMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.0, // Invisible
        wireframe: true
    });
    
    playerHitBox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
    playerHitBox.position.y = 1;
    playerGroup.add(playerHitBox);
    
    // Create gun effects
    createPlayerGunEffects();
    
    // Position player
    playerGroup.position.set(0, 0, 0);
    
    // Add to scene
    scene.add(playerGroup);
}

// Create player model
function createPlayerModel() {
    const model = new THREE.Group();
    
    // Create simple soldier model
    // Body
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333, // Dark gray for soldier outfit
        roughness: 0.7,
        metalness: 0.3
    });
    
    const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.5, 1, 4, 8),
        bodyMaterial
    );
    body.position.y = 1.5;
    model.add(body);
    
    // Head
    const headMaterial = new THREE.MeshStandardMaterial({
        color: 0xd2b48c, // Tan for skin
        roughness: 0.5,
        metalness: 0.1
    });
    
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 16, 16),
        headMaterial
    );
    head.position.y = 2.5;
    model.add(head);
    
    // Helmet
    const helmetMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.5,
        metalness: 0.5
    });
    
    const helmet = new THREE.Mesh(
        new THREE.SphereGeometry(0.45, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        helmetMaterial
    );
    helmet.position.y = 2.6;
    model.add(helmet);
    
    // Arms
    const leftArm = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.2, 0.8, 4, 8),
        bodyMaterial
    );
    leftArm.position.set(-0.7, 1.7, 0);
    leftArm.rotation.z = -Math.PI / 4;
    model.add(leftArm);
    
    const rightArm = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.2, 0.8, 4, 8),
        bodyMaterial
    );
    rightArm.position.set(0.7, 1.7, 0);
    rightArm.rotation.z = Math.PI / 4;
    model.add(rightArm);
    
    // Legs
    const leftLeg = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.25, 1, 4, 8),
        bodyMaterial
    );
    leftLeg.position.set(-0.3, 0.6, 0);
    model.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.25, 1, 4, 8),
        bodyMaterial
    );
    rightLeg.position.set(0.3, 0.6, 0);
    model.add(rightLeg);
    
    // Create gun
    const gunMaterial = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.5,
        metalness: 0.8
    });
    
    playerGun = new THREE.Group();
    
    const gunBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.15, 0.6),
        gunMaterial
    );
    gunBody.position.z = -0.3;
    playerGun.add(gunBody);
    
    const gunBarrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8),
        gunMaterial
    );
    gunBarrel.rotation.x = Math.PI / 2;
    gunBarrel.position.z = -0.6;
    playerGun.add(gunBarrel);
    
    // Position gun in right hand
    playerGun.position.set(0.6, 1.7, 0.3);
    model.add(playerGun);
    
    // Add shadows
    model.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    
    return model;
}

// Create player gun effects
function createPlayerGunEffects() {
    // Create muzzle flash
    const flashGeometry = new THREE.CircleGeometry(0.15, 8);
    const flashMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffaa,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide
    });
    
    muzzleFlash = new THREE.Mesh(flashGeometry, flashMaterial);
    muzzleFlash.position.z = -0.8;
    muzzleFlash.rotation.y = Math.PI / 2;
    
    playerGun.add(muzzleFlash);
}

// Fire player projectile
function firePlayerProjectile() {
    if (!player || gameOver || gamePaused) return;
    
    const now = Date.now() * 0.001; // Convert to seconds
    
    // Check cooldown
    if (now - lastShootTime < shootRate) return;
    
    lastShootTime = now;
    
    // Create projectile
    const projectileGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const projectileMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        emissive: 0x00aaff
    });
    
    const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
    
    // Get gun position in world space
    const gunWorldPosition = new THREE.Vector3();
    playerGun.getWorldPosition(gunWorldPosition);
    
    // Set projectile position
    projectile.position.copy(gunWorldPosition);
    projectile.position.z -= 0.8; // Adjust to gun barrel
    
    // Add light effect
    const light = new THREE.PointLight(0x00ffff, 1, 5);
    light.position.copy(projectile.position);
    projectile.add(light);
    
    // Add trail effect
    const trailGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.3);
    const trailMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.7
    });
    
    const trail = new THREE.Mesh(trailGeometry, trailMaterial);
    trail.position.z = 0.15;
    projectile.add(trail);
    
    // Add to scene
    scene.add(projectile);
    
    // Add to projectiles array
    playerProjectiles.push({
        mesh: projectile,
        velocity: new THREE.Vector3(0, 0, -projectileSpeed),
        damage: playerProjectileDamage
    });
    
    // Activate muzzle flash
    muzzleFlash.material.opacity = 1;
    
    // Reset muzzle flash after short time
    setTimeout(() => {
        if (muzzleFlash) muzzleFlash.material.opacity = 0;
    }, 50);
    
    // Play shot sound
    playSound('shoot', { 
        volume: 0.2, 
        position: gunWorldPosition
    });
    
    // Set shooting state
    isPlayerShooting = true;
    
    // Update player animation
    updatePlayerAnimation();
    
    return projectile;
}

// Create enemy
function createEnemy(type) {
    // Find enemy type data
    const enemyData = enemyTypes.find(e => e.type === type);
    if (!enemyData) return null;
    
    // Create enemy group
    const enemy = new THREE.Group();
    enemy.userData = { 
        ...enemyData,
        lastFireTime: 0
    };
    
    // Create enemy model based on type
    let enemyModel;
    
    switch (type) {
        case 'runner':
            enemyModel = createRunnerEnemy(enemyData.color);
            break;
        case 'shooter':
            enemyModel = createShooterEnemy(enemyData.color);
            break;
        case 'tank':
            enemyModel = createTankEnemy(enemyData.color);
            break;
        default:
            // Default to runner
            enemyModel = createRunnerEnemy(enemyData.color);
    }
    
    enemy.add(enemyModel);
    
    // Create enemy hitbox
    const hitboxSize = type === 'tank' ? 1.2 : 0.6;
    const hitboxHeight = type === 'tank' ? 2.5 : 2;
    
    const hitboxGeometry = new THREE.CapsuleGeometry(hitboxSize, hitboxHeight, 4, 8);
    const hitboxMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.0, // Invisible
        wireframe: true
    });
    
    const hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
    hitbox.position.y = hitboxHeight / 2;
    enemy.add(hitbox);
    
    // Position enemy - random X position ahead of player
    const spawnZ = -50; // Spawn ahead
    const spawnX = (Math.random() - 0.5) * 20; // Random X position
    
    enemy.position.set(spawnX, 0, spawnZ);
    
    // Add to scene and enemies array
    scene.add(enemy);
    enemies.push(enemy);
    
    return enemy;
}

// Create runner enemy
function createRunnerEnemy(color) {
    const model = new THREE.Group();
    
    // Materials
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.7,
        metalness: 0.3
    });
    
    const headMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.5,
        metalness: 0.2
    });
    
    // Body
    const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.4, 1, 4, 8),
        bodyMaterial
    );
    body.position.y = 1.3;
    model.add(body);
    
    // Head - masked/helmet
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 16, 16),
        headMaterial
    );
    head.position.y = 2.1;
    model.add(head);
    
    // Arms
    const leftArm = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.15, 0.7, 4, 8),
        bodyMaterial
    );
    leftArm.position.set(-0.6, 1.5, 0);
    leftArm.rotation.z = -Math.PI / 3;
    model.add(leftArm);
    
    const rightArm = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.15, 0.7, 4, 8),
        bodyMaterial
    );
    rightArm.position.set(0.6, 1.5, 0);
    rightArm.rotation.z = Math.PI / 3;
    model.add(rightArm);
    
    // Legs
    const leftLeg = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.2, 0.9, 4, 8),
        bodyMaterial
    );
    leftLeg.position.set(-0.25, 0.5, 0);
    model.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.2, 0.9, 4, 8),
        bodyMaterial
    );
    rightLeg.position.set(0.25, 0.5, 0);
    model.add(rightLeg);
    
    // Add claws or weapons to hands
    const clawMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.5,
        metalness: 0.7
    });
    
    // Left claw
    const leftClaw = new THREE.Mesh(
        new THREE.ConeGeometry(0.15, 0.5, 4),
        clawMaterial
    );
    leftClaw.position.set(-0.9, 1.2, 0);
    leftClaw.rotation.z = -Math.PI / 4;
    model.add(leftClaw);
    
    // Right claw
    const rightClaw = new THREE.Mesh(
        new THREE.ConeGeometry(0.15, 0.5, 4),
        clawMaterial
    );
    rightClaw.position.set(0.9, 1.2, 0);
    rightClaw.rotation.z = Math.PI / 4;
    model.add(rightClaw);
    
    // Add glowing eyes
    const eyeMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.8
    });
    
    const leftEye = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 8, 8),
        eyeMaterial
    );
    leftEye.position.set(-0.15, 2.15, -0.25);
    model.add(leftEye);
    
    const rightEye = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 8, 8),
        eyeMaterial
    );
    rightEye.position.set(0.15, 2.15, -0.25);
    model.add(rightEye);
    
    // Add shadows
    model.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    
    // Face model toward player
    model.rotation.y = Math.PI;
    
    return model;
}

// Create shooter enemy
function createShooterEnemy(color) {
    const model = new THREE.Group();
    
    // Materials
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.6,
        metalness: 0.4
    });
    
    const headMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        roughness: 0.5,
        metalness: 0.5
    });
    
    // Body
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 1.1, 0.5),
        bodyMaterial
    );
    body.position.y = 1.3;
    model.add(body);
    
    // Head with helmet
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 16, 16),
        headMaterial
    );
    head.position.y = 2.1;
    model.add(head);
    
    // Visor
    const visorMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.7
    });
    
    const visor = new THREE.Mesh(
        new THREE.PlaneGeometry(0.4, 0.15),
        visorMaterial
    );
    visor.position.set(0, 2.1, -0.35);
    model.add(visor);
    
    // Shoulder pads
    const leftShoulder = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 16, 16, 0, Math.PI, 0, Math.PI),
        bodyMaterial
    );
    leftShoulder.position.set(-0.45, 1.75, 0);
    leftShoulder.rotation.z = -Math.PI / 2;
    model.add(leftShoulder);
    
    const rightShoulder = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 16, 16, 0, Math.PI, 0, Math.PI),
        bodyMaterial
    );
    rightShoulder.position.set(0.45, 1.75, 0);
    rightShoulder.rotation.z = Math.PI / 2;
    model.add(rightShoulder);
    
    // Arms
    const leftArm = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.15, 0.7, 4, 8),
        bodyMaterial
    );
    leftArm.position.set(-0.6, 1.5, 0);
    leftArm.rotation.z = -Math.PI / 6;
    model.add(leftArm);
    
    const rightArm = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.15, 0.7, 4, 8),
        bodyMaterial
    );
    rightArm.position.set(0.6, 1.5, 0);
    rightArm.rotation.z = Math.PI / 6;
    model.add(rightArm);
    
    // Legs
    const leftLeg = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.2, 0.9, 4, 8),
        bodyMaterial
    );
    leftLeg.position.set(-0.25, 0.5, 0);
    model.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.2, 0.9, 4, 8),
        bodyMaterial
    );
    rightLeg.position.set(0.25, 0.5, 0);
    model.add(rightLeg);
    
    // Gun
    const gunMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.4,
        metalness: 0.8
    });
    
    const gun = new THREE.Group();
    
    const gunBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.15, 0.6),
        gunMaterial
    );
    gunBody.position.z = 0.3;
    gun.add(gunBody);
    
    const gunBarrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8),
        gunMaterial
    );
    gunBarrel.rotation.x = Math.PI / 2;
    gunBarrel.position.z = 0.6;
    gun.add(gunBarrel);
    
    // Position gun in right hand
    gun.position.set(0.6, 1.4, -0.3);
    model.add(gun);
    
    // Add shadows
    model.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    
    // Store gun reference for shooting
    model.userData = { gun: gun };
    
    // Face model toward player
    model.rotation.y = Math.PI;
    
    return model;
}

// Create tank enemy
function createTankEnemy(color) {
    const model = new THREE.Group();
    
    // Materials
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.7,
        metalness: 0.5
    });
    
    const armorMaterial = new THREE.MeshStandardMaterial({
        color: 0x555555,
        roughness: 0.5,
        metalness: 0.7
    });
    
    // Heavy body
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 1.8, 1),
        bodyMaterial
    );
    body.position.y = 1.5;
    model.add(body);
    
    // Armored head
    const head = new THREE.Mesh(
        new THREE.BoxGeometry(1, 0.8, 0.8),
        armorMaterial
    );
    head.position.y = 2.4;
    model.add(head);
    
    // Shoulder armor
    const leftShoulder = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.6, 1),
        armorMaterial
    );
    leftShoulder.position.set(-1.05, 1.8, 0);
    model.add(leftShoulder);
    
    const rightShoulder = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.6, 1),
        armorMaterial
    );
    rightShoulder.position.set(1.05, 1.8, 0);
    model.add(rightShoulder);
    
    // Massive arms
    const leftArm = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.3, 0.8, 4, 8),
        bodyMaterial
    );
    leftArm.position.set(-1, 1.4, 0);
    leftArm.rotation.z = -Math.PI / 6;
    model.add(leftArm);
    
    const rightArm = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.3, 0.8, 4, 8),
        bodyMaterial
    );
    rightArm.position.set(1, 1.4, 0);
    rightArm.rotation.z = Math.PI / 6;
    model.add(rightArm);
    
    // Heavy legs
    const leftLeg = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.3, 1, 4, 8),
        bodyMaterial
    );
    leftLeg.position.set(-0.5, 0.6, 0);
    model.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.3, 1, 4, 8),
        bodyMaterial
    );
    rightLeg.position.set(0.5, 0.6, 0);
    model.add(rightLeg);
    
    // Glowing parts
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff3300,
        transparent: true,
        opacity: 0.8
    });
    
    // Chest core
    const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 16, 16),
        glowMaterial
    );
    core.position.set(0, 1.7, -0.5);
    model.add(core);
    
    // Eye
    const eye = new THREE.Mesh(
        new THREE.PlaneGeometry(0.6, 0.2),
        glowMaterial
    );
    eye.position.set(0, 2.4, -0.4);
    model.add(eye);
    
    // Twin cannons
    const cannonMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.4,
        metalness: 0.8
    });
    
    const leftCannon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8),
        cannonMaterial
    );
    leftCannon.position.set(-0.3, 2.4, -0.7);
    leftCannon.rotation.x = Math.PI / 2;
    model.add(leftCannon);
    
    const rightCannon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8),
        cannonMaterial
    );
    rightCannon.position.set(0.3, 2.4, -0.7);
    rightCannon.rotation.x = Math.PI / 2;
    model.add(rightCannon);
    
    // Add shadows
    model.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    
    // Store cannons reference for shooting
    model.userData = { 
        leftCannon: leftCannon,
        rightCannon: rightCannon,
        lastCannonUsed: 'right' // Track which cannon to fire next (alternating)
    };
    
    // Face model toward player
    model.rotation.y = Math.PI;
    
    return model;
}
