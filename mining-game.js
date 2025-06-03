class VoxelTerrain {
    constructor(width, height, voxelSize) {
        this.width = width;
        this.height = height;
        this.voxelSize = voxelSize;
        this.cols = Math.floor(width / voxelSize);
        this.voxels = {};
        this.generatedDepth = 0;
        this.surfaceHeight = 80; // Más abajo para dejar más cielo
        
        this.generateInitialTerrain();
    }
    
    generateInitialTerrain() {
        const initialRows = Math.floor(this.height / this.voxelSize) + 10;
        this.generateTerrainRows(0, initialRows);
        this.generatedDepth = initialRows;
    }
    
    generateTerrainRows(startRow, endRow) {
        // Primero generar el terreno base
        for (let y = startRow; y < endRow; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (!this.voxels[x]) this.voxels[x] = {};
                
                const noiseHeight = Math.sin(x * 0.1) * 5 + Math.sin(x * 0.05) * 10;
                const columnHeight = Math.floor(this.surfaceHeight + noiseHeight);
                
                if (y > columnHeight) {
                    const depth = y - columnHeight;
                    let type = 'dirt';
                    let health = 2;
                    
                    // Diferentes tipos de materiales según profundidad
                    if (depth > 2 && depth <= 8) {
                        // Piedra blanda cerca de la superficie
                        if (Math.random() < 0.3) {
                            type = 'softStone';
                            health = 2;
                        } else {
                            type = 'dirt';
                            health = 1;
                        }
                    } else if (depth > 8 && depth <= 15) {
                        // Mezcla de piedras
                        const rand = Math.random();
                        if (rand < 0.4) {
                            type = 'stone';
                            health = 3;
                        } else if (rand < 0.7) {
                            type = 'softStone';
                            health = 2;
                        } else {
                            type = 'dirt';
                            health = 1;
                        }
                    } else if (depth > 15) {
                        // Piedras más duras en profundidad
                        const rand = Math.random();
                        if (rand < 0.6) {
                            type = 'stone';
                            health = 3;
                        } else if (rand < 0.8) {
                            type = 'hardStone';
                            health = 4;
                        } else {
                            type = 'veryHardStone';
                            health = 5;
                        }
                    }
                    
                    this.voxels[x][y] = {
                        type: type,
                        health: health
                    };
                } else {
                    this.voxels[x][y] = null;
                }
            }
        }
        
        // Luego generar vetas de minerales
        this.generateOreVeins(startRow, endRow);
    }
    
    generateOreVeins(startRow, endRow) {
        // Generar vetas de mineral normal
        const oreVeinsPerChunk = 2;
        for (let i = 0; i < oreVeinsPerChunk; i++) {
            if (Math.random() < 0.7) {
                const veinX = Math.floor(Math.random() * this.cols);
                const veinY = Math.floor(Math.random() * (endRow - startRow) + startRow);
                
                // Solo generar si está lo suficientemente profundo
                if (veinY > this.surfaceHeight + 15 && veinY >= startRow && veinY < endRow) {
                    this.createVein(veinX, veinY, 'ore', 3 + Math.floor(Math.random() * 3));
                }
            }
        }
        
        // Generar vetas de oro (MUY POCAS pero ENORMES)
        if (Math.random() < 0.15) { // Solo 15% de probabilidad por chunk
            const veinX = Math.floor(Math.random() * this.cols);
            // Oro aparece en cualquier profundidad del chunk actual
            const veinY = Math.floor(Math.random() * (endRow - startRow) + startRow);
            
            // Solo generar si está bajo tierra, pero puede estar cerca de la superficie
            if (veinY > this.surfaceHeight + 2 && veinY >= startRow && veinY < endRow) {
                // Vetas ENORMES
                const depth = veinY - this.surfaceHeight;
                const baseSize = 15 + Math.floor(Math.random() * 10); // 15-25 bloques base
                const depthBonus = Math.min(10, Math.floor(depth / 10)); // Máximo +10 por profundidad
                this.createVein(veinX, veinY, 'gold', Math.min(35, baseSize + depthBonus));
            }
        }
    }
    
    createVein(centerX, centerY, oreType, size) {
        const health = oreType === 'gold' ? 5 : 4;
        
        // Crear veta con forma irregular
        for (let i = 0; i < size * 4; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * size;
            
            const x = Math.floor(centerX + Math.cos(angle) * distance);
            const y = Math.floor(centerY + Math.sin(angle) * distance);
            
            // Verificar límites - pueden reemplazar cualquier material sólido
            if (x >= 0 && x < this.cols && this.voxels[x] && this.voxels[x][y] && 
                this.voxels[x][y]) {
                this.voxels[x][y] = { type: oreType, health: health };
                
                // Añadir algunos bloques adyacentes para hacer la veta más densa
                if (Math.random() < 0.4) {
                    const adjacentX = x + Math.floor(Math.random() * 3 - 1);
                    const adjacentY = y + Math.floor(Math.random() * 3 - 1);
                    
                    if (adjacentX >= 0 && adjacentX < this.cols && 
                        this.voxels[adjacentX] && this.voxels[adjacentX][adjacentY] &&
                        this.voxels[adjacentX][adjacentY]) {
                        this.voxels[adjacentX][adjacentY] = { type: oreType, health: health };
                    }
                }
            }
        }
    }
    
    checkAndGenerateDepth(cameraY) {
        const bottomY = cameraY + this.height;
        const bottomRow = Math.floor(bottomY / this.voxelSize) + 10;
        
        if (bottomRow > this.generatedDepth) {
            this.generateTerrainRows(this.generatedDepth, bottomRow);
            this.generatedDepth = bottomRow;
        }
    }
    
    getVoxel(x, y) {
        const gridX = Math.floor(x / this.voxelSize);
        const gridY = Math.floor(y / this.voxelSize);
        
        if (gridX < 0 || gridX >= this.cols || gridY < 0) {
            return null;
        }
        
        if (!this.voxels[gridX]) return null;
        return this.voxels[gridX][gridY];
    }
    
    damageVoxel(x, y, damage) {
        const gridX = Math.floor(x / this.voxelSize);
        const gridY = Math.floor(y / this.voxelSize);
        
        // Prevenir excavar en los bordes del mapa (dejar 2 columnas de margen)
        if (gridX <= 1 || gridX >= this.cols - 2 || gridY < 0) {
            return null;
        }
        
        if (!this.voxels[gridX] || !this.voxels[gridX][gridY]) return null;
        
        const voxel = this.voxels[gridX][gridY];
        if (voxel) {
            voxel.health -= damage;
            if (voxel.health <= 0) {
                const type = voxel.type;
                this.voxels[gridX][gridY] = null;
                return type;
            }
        }
        
        return null;
    }
    
    draw(ctx, cameraY) {
        const startY = Math.floor(cameraY / this.voxelSize);
        const endY = Math.ceil((cameraY + this.height) / this.voxelSize);
        
        for (let x = 0; x < this.cols; x++) {
            if (!this.voxels[x]) continue;
            
            for (let y = startY; y <= endY; y++) {
                const voxel = this.voxels[x][y];
                if (voxel) {
                    const colors = {
                        dirt: '#8B4513',
                        softStone: '#A0A0A0',
                        stone: '#696969',
                        hardStone: '#4A4A4A',
                        veryHardStone: '#2F2F2F',
                        ore: '#708090',
                        gold: '#FFD700'
                    };
                    
                    ctx.fillStyle = colors[voxel.type];
                    ctx.fillRect(
                        x * this.voxelSize,
                        y * this.voxelSize,
                        this.voxelSize - 1,
                        this.voxelSize - 1
                    );
                    
                    if (voxel.type === 'gold') {
                        ctx.fillStyle = '#FFA500';
                        ctx.fillRect(
                            x * this.voxelSize + 2,
                            y * this.voxelSize + 2,
                            this.voxelSize - 5,
                            this.voxelSize - 5
                        );
                    }
                    
                    const maxHealthMap = {
                        dirt: 1,
                        softStone: 2,
                        stone: 3,
                        hardStone: 4,
                        veryHardStone: 5,
                        ore: 4,
                        gold: 5
                    };
                    const maxHealth = maxHealthMap[voxel.type] || 2;
                    if (voxel.health < maxHealth) {
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                        ctx.fillRect(
                            x * this.voxelSize,
                            y * this.voxelSize,
                            this.voxelSize - 1,
                            this.voxelSize - 1
                        );
                    }
                }
            }
        }
    }
}

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 16;
        this.height = 24;
        this.vx = 0;
        this.vy = 0;
        this.speed = 3;
        this.jumpPower = 8;
        this.onGround = false;
        this.mining = false;
        this.miningCooldown = 0;
        this.facing = 1; // 1 = derecha, -1 = izquierda
        this.money = 0;
        this.miningDirection = { x: 0, y: 1 }; // Por defecto hacia abajo
        
        // Sistema de combustible y mejoras
        this.fuel = 200;
        this.maxFuel = 200;
        this.fuelConsumption = 1;
        this.miningRange = 10;
        this.miningPower = 1;
        this.jumpLevel = 1;
        this.jumpPower = 6; // Reducido desde 8
        this.miningSpeedLevel = 1; // Nivel de velocidad de excavación
        
        // Estado del jugador
        this.isDead = false;
        this.deathTimer = 0;
        this.deathCause = 'fuel'; // 'fuel' o 'dynamite'
        
        // Dinamita
        this.dynamiteCount = 5; // Número inicial de dinamitas
        this.dynamiteCooldown = 0;
    }
    
    update(terrain, keys) {
        // Si está muerto, no hacer nada más
        if (this.isDead) {
            this.deathTimer++;
            return;
        }
        
        // Verificar si se quedó sin combustible mientras excavaba
        if (this.fuel <= 0 && this.mining) {
            this.explode();
            return;
        }
        
        this.vx = 0;
        
        // Calcular dirección del motopico basada en las flechas presionadas
        let miningDx = 0;
        let miningDy = 0;
        
        // Solo permitir movimiento horizontal, no vertical con flechas
        if (keys.ArrowLeft) {
            this.vx = -this.speed;
            this.facing = -1;
            miningDx = -1;
        }
        if (keys.ArrowRight) {
            this.vx = this.speed;
            this.facing = 1;
            miningDx = 1;
        }
        if (keys.ArrowUp) {
            miningDy = -1;
        }
        if (keys.ArrowDown) {
            miningDy = 1;
        }
        
        // Normalizar para diagonales
        if (miningDx !== 0 && miningDy !== 0) {
            const length = Math.sqrt(miningDx * miningDx + miningDy * miningDy);
            this.miningDirection = { 
                x: miningDx / length, 
                y: miningDy / length 
            };
        } else if (miningDx !== 0 || miningDy !== 0) {
            this.miningDirection = { x: miningDx, y: miningDy };
        } else {
            // Si no hay dirección, usar la última dirección o abajo por defecto
            if (!this.miningDirection) {
                this.miningDirection = { x: 0, y: 1 };
            }
        }
        
        if (keys[' '] && this.onGround) {
            this.vy = -this.jumpPower;
        }
        
        this.mining = (keys.f || keys.F) && this.fuel > 0;
        
        // Lanzar dinamita con G
        if ((keys.g || keys.G) && this.dynamiteCount > 0 && this.dynamiteCooldown <= 0) {
            const dynamite = new Dynamite(this.x, this.y - 10);
            dynamites.push(dynamite);
            this.dynamiteCount--;
            this.dynamiteCooldown = 60; // 1 segundo de cooldown
        }
        
        if (this.dynamiteCooldown > 0) {
            this.dynamiteCooldown--;
        }
        
        this.vy += 0.5;
        if (this.vy > 10) this.vy = 10;
        
        const nextX = this.x + this.vx;
        const nextY = this.y + this.vy;
        
        // const leftEdge = nextX - this.width / 2;
        // const rightEdge = nextX + this.width / 2;
        const topEdge = nextY - this.height / 2;
        const bottomEdge = nextY + this.height / 2;
        
        let canMoveX = true;
        let canMoveY = true;
        this.onGround = false;
        
        // Checar colisión vertical con más precisión
        for (let px = this.x - this.width/2 + 2; px <= this.x + this.width/2 - 2; px += 3) {
            // Colisión inferior
            if (terrain.getVoxel(px, bottomEdge + 1)) {
                canMoveY = false;
                this.onGround = true;
                if (this.vy > 0) {
                    this.vy = 0;
                    this.y = Math.floor((bottomEdge + 1) / terrain.voxelSize) * terrain.voxelSize - this.height / 2 - 1;
                }
            }
            
            // Colisión superior
            if (terrain.getVoxel(px, topEdge - 1)) {
                canMoveY = false;
                if (this.vy < 0) {
                    this.vy = 0;
                }
            }
        }
        
        // Checar colisión horizontal con más precisión - solo en el centro del personaje
        if (this.vx !== 0) {
            for (let py = this.y - this.height/2 + 4; py <= this.y + this.height/2 - 4; py += 4) {
                // Colisión derecha - checar exactamente en el borde
                if (this.vx > 0 && terrain.getVoxel(this.x + this.width/2 + 2, py)) {
                    canMoveX = false;
                }
                
                // Colisión izquierda - checar exactamente en el borde
                if (this.vx < 0 && terrain.getVoxel(this.x - this.width/2 - 2, py)) {
                    canMoveX = false;
                }
            }
        }
        
        if (canMoveX) {
            // Limitar movimiento dentro de los bordes del mapa
            this.x = Math.max(this.width/2 + 8, Math.min(nextX, terrain.width - this.width/2 - 8));
        }
        if (canMoveY) this.y = nextY;
        
        // Solo procesar mining si hay una dirección válida
        const hasValidDirection = this.miningDirection && (this.miningDirection.x !== 0 || this.miningDirection.y !== 0);
        
        if (this.mining && this.miningCooldown <= 0 && this.fuel > 0 && hasValidDirection) {
            const baseX = this.x;
            const baseY = this.y;
            let mined = false;
            
            // Consumir combustible
            this.fuel = Math.max(0, this.fuel - this.fuelConsumption);
            
            // Calcular posición base del área de minado según la dirección
            let distance = 12;
            // Mayor alcance hacia arriba para facilitar excavación
            if (this.miningDirection.y < 0) {
                distance = 18;
            }
            const centerX = baseX + this.miningDirection.x * distance;
            const centerY = baseY + this.miningDirection.y * distance;
            
            // Área de minado adaptada según la dirección
            const areaOffsets = [];
            
            // Si excavamos hacia los lados, hacer área vertical completa
            if (Math.abs(this.miningDirection.x) > Math.abs(this.miningDirection.y)) {
                // Excavación lateral - cubrir altura del personaje más margen
                for (let dx = -8; dx <= 8; dx += 4) {
                    for (let dy = -this.height/2 - 8; dy <= this.height/2 + 8; dy += 4) {
                        areaOffsets.push({ dx, dy });
                    }
                }
            } else if (Math.abs(this.miningDirection.y) > Math.abs(this.miningDirection.x)) {
                // Excavación vertical - cubrir ancho del personaje más margen
                const verticalRange = this.miningDirection.y < 0 ? 16 : 12; // Más rango hacia arriba
                for (let dx = -this.width/2 - 8; dx <= this.width/2 + 8; dx += 4) {
                    for (let dy = -verticalRange; dy <= verticalRange; dy += 4) {
                        areaOffsets.push({ dx, dy });
                    }
                }
            } else {
                // Excavación diagonal - área más grande para mejor navegación
                const diagonalRange = 16;
                
                for (let dx = -diagonalRange; dx <= diagonalRange; dx += 4) {
                    for (let dy = -diagonalRange; dy <= diagonalRange; dy += 4) {
                        areaOffsets.push({ dx, dy });
                    }
                }
            }
            
            for (const offset of areaOffsets) {
                const mineX = centerX + offset.dx;
                const mineY = centerY + offset.dy;
                
                const minedType = terrain.damageVoxel(mineX, mineY, this.miningPower);
                if (minedType) {
                    mined = true;
                    
                    // Dar dinero por oro
                    if (minedType === 'gold') {
                        this.money += 10;
                    }
                    
                    // Crear partículas al romper
                    const colors = {
                        dirt: '#8B4513',
                        softStone: '#A0A0A0',
                        stone: '#696969',
                        hardStone: '#4A4A4A',
                        veryHardStone: '#2F2F2F',
                        ore: '#708090',
                        gold: '#FFD700'
                    };
                    particleSystem.addParticles(mineX, mineY, colors[minedType] || '#888', 8);
                }
            }
            
            if (mined) {
                // Reducir cooldown basado en el nivel de velocidad
                this.miningCooldown = Math.max(3, 8 - (this.miningSpeedLevel - 1) * 1);
            } else {
                this.miningCooldown = Math.max(4, 12 - (this.miningSpeedLevel - 1) * 2);
            }
        }
        
        // Solo reducir cooldown si estamos intentando minar
        if (this.miningCooldown > 0 && this.mining) {
            this.miningCooldown--;
        }
    }
    
    explode() {
        this.isDead = true;
        this.deathCause = 'fuel'; // Muerte por falta de combustible
        
        // Crear explosión masiva de partículas rojas (sangre)
        for (let i = 0; i < 50; i++) {
            const bloodColor = i % 3 === 0 ? '#FF0000' : i % 3 === 1 ? '#CC0000' : '#990000';
            const particle = new Particle(this.x, this.y, bloodColor);
            // Hacer las partículas de sangre más violentas
            particle.vx = (Math.random() - 0.5) * 15;
            particle.vy = Math.random() * -10 - 5;
            particle.size = Math.random() * 6 + 2;
            particle.life = 60 + Math.random() * 40;
            particle.maxLife = particle.life;
            particleSystem.particles.push(particle);
        }
        
        // Crear algunas partículas de motopico (metal)
        for (let i = 0; i < 20; i++) {
            const metalColor = '#696969';
            const particle = new Particle(this.x, this.y, metalColor);
            particle.vx = (Math.random() - 0.5) * 12;
            particle.vy = Math.random() * -8 - 3;
            particle.size = Math.random() * 4 + 2;
            particleSystem.particles.push(particle);
        }
    }
    
    draw(ctx) {
        // Si está muerto, no dibujar nada
        if (this.isDead) return;
        
        // Dibujar área de impacto antes que el personaje
        if (this.fuel > 0 && this.miningDirection && (this.miningDirection.x !== 0 || this.miningDirection.y !== 0)) {
            ctx.save();
            
            // Calcular posición del área de impacto
            let distance = 12;
            if (this.miningDirection.y < 0) {
                distance = 18;
            }
            const centerX = this.x + this.miningDirection.x * distance;
            const centerY = this.y + this.miningDirection.y * distance;
            
            // Determinar el área según la dirección
            // Efecto de pulso para el área de impacto
            const pulse = Math.sin(Date.now() * 0.005) * 0.1 + 0.2;
            ctx.fillStyle = `rgba(255, 255, 100, ${pulse})`;
            ctx.strokeStyle = `rgba(255, 200, 0, ${pulse + 0.2})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            
            if (Math.abs(this.miningDirection.x) > Math.abs(this.miningDirection.y)) {
                // Excavación lateral
                const width = 16;
                const height = this.height + 16;
                ctx.fillRect(centerX - width/2, centerY - height/2, width, height);
                ctx.strokeRect(centerX - width/2, centerY - height/2, width, height);
            } else if (Math.abs(this.miningDirection.y) > Math.abs(this.miningDirection.x)) {
                // Excavación vertical
                const width = this.width + 16;
                const height = this.miningDirection.y < 0 ? 32 : 24;
                ctx.fillRect(centerX - width/2, centerY - height/2, width, height);
                ctx.strokeRect(centerX - width/2, centerY - height/2, width, height);
            } else {
                // Excavación diagonal
                const size = 32; // Mismo tamaño que el área real de impacto
                ctx.fillRect(centerX - size/2, centerY - size/2, size, size);
                ctx.strokeRect(centerX - size/2, centerY - size/2, size, size);
            }
            
            // Resetear el lineDash
            ctx.setLineDash([]);
            
            ctx.restore();
        }
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        ctx.fillStyle = '#4169E1';
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        
        ctx.fillStyle = '#FFB6C1';
        ctx.fillRect(-this.width/2 + 2, -this.height/2 + 2, this.width - 4, 6);
        
        ctx.fillStyle = '#000';
        if (this.facing > 0) {
            ctx.fillRect(2, -this.height/2 + 4, 2, 2);
        } else {
            ctx.fillRect(-4, -this.height/2 + 4, 2, 2);
        }
        
        if (this.mining) {
            // Dibujar motopico según la dirección
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 3;
            ctx.beginPath();
            
            const startX = this.miningDirection.x * 8;
            const startY = this.miningDirection.y * 8;
            const endX = this.miningDirection.x * 16;
            const endY = this.miningDirection.y * 16;
            
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            
            // Cabeza del motopico
            ctx.fillStyle = '#696969';
            ctx.beginPath();
            
            if (this.miningDirection.y !== 0) {
                // Vertical
                ctx.moveTo(endX - 4, endY - 2);
                ctx.lineTo(endX + 4, endY - 2);
                ctx.lineTo(endX + 4, endY + 2);
                ctx.lineTo(endX - 4, endY + 2);
            } else {
                // Horizontal
                ctx.moveTo(endX - 2, endY - 4);
                ctx.lineTo(endX + 2, endY - 4);
                ctx.lineTo(endX + 2, endY + 4);
                ctx.lineTo(endX - 2, endY + 4);
            }
            
            ctx.closePath();
            ctx.fill();
        }
        
        ctx.restore();
    }
}

class Dynamite {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20; // MUY GRANDE
        this.height = 36; // MUY ALTA
        this.fuseTime = 180; // 3 segundos a 60fps
        this.maxFuseTime = 180;
        this.exploded = false;
        this.blinkTimer = 0;
        this.vy = 0;
        this.onGround = false;
        this.explosionRadius = 80; // Radio de explosión ENORME
        this.hasExploded = false; // Flag para asegurar que solo explote una vez
    }
    
    update(terrain) {
        if (this.exploded) return;
        
        this.fuseTime--;
        this.blinkTimer++;
        
        // Física de caída
        if (!this.onGround) {
            this.vy += 0.5; // Gravedad
            this.y += this.vy;
            
            // Verificar colisión con el suelo
            if (terrain.getVoxel(this.x, this.y + this.height/2)) {
                this.onGround = true;
                this.vy = 0;
                // Ajustar posición para que esté encima del bloque
                const gridY = Math.floor((this.y + this.height/2) / terrain.voxelSize);
                this.y = gridY * terrain.voxelSize - this.height/2;
            }
        }
        
        // Explotar cuando se acabe el tiempo
        if (this.fuseTime <= 0 && !this.hasExploded) {
            this.explode(terrain);
            this.hasExploded = true;
        }
    }
    
    explode(terrain) {
        this.exploded = true;
        
        // Crear explosión masiva de partículas
        for (let i = 0; i < 80; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 12 + 3;
            const particle = new Particle(this.x, this.y, '#FF4500');
            particle.vx = Math.cos(angle) * speed;
            particle.vy = Math.sin(angle) * speed - Math.random() * 5;
            particle.size = Math.random() * 8 + 4;
            particle.life = 40 + Math.random() * 30;
            particle.maxLife = particle.life;
            particleSystem.particles.push(particle);
        }
        
        // Añadir partículas de humo
        for (let i = 0; i < 30; i++) {
            const particle = new Particle(this.x, this.y, '#666666');
            particle.vx = (Math.random() - 0.5) * 8;
            particle.vy = Math.random() * -8 - 2;
            particle.size = Math.random() * 12 + 8;
            particle.life = 60 + Math.random() * 40;
            particle.maxLife = particle.life;
            particleSystem.particles.push(particle);
        }
        
        // Destruir bloques en área circular MÁS GRANDE y recolectar oro
        let goldCollected = 0;
        for (let dx = -this.explosionRadius; dx <= this.explosionRadius; dx += 2) {
            for (let dy = -this.explosionRadius; dy <= this.explosionRadius; dy += 2) {
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance <= this.explosionRadius) {
                    const blockX = this.x + dx;
                    const blockY = this.y + dy;
                    
                    // Verificar si es oro antes de destruirlo
                    const voxel = terrain.getVoxel(blockX, blockY);
                    if (voxel && voxel.type === 'gold') {
                        goldCollected += 10; // Oro recogido por la explosión
                    }
                    
                    terrain.damageVoxel(blockX, blockY, 999); // Daño masivo que destruye cualquier bloque
                }
            }
        }
        
        // Guardar el oro para dárselo al jugador después
        this.goldToGive = goldCollected;
    }
    
    checkPlayerCollision(player) {
        const distance = Math.sqrt(
            Math.pow(this.x - player.x, 2) + 
            Math.pow(this.y - player.y, 2)
        );
        
        return distance <= this.explosionRadius;
    }
    
    draw(ctx) {
        if (this.exploded) return;
        
        // Parpadeo más rápido según se acerca la explosión
        const blinkSpeed = Math.max(2, Math.floor(this.fuseTime / 20));
        const shouldBlink = Math.floor(this.blinkTimer / blinkSpeed) % 2 === 0;
        
        if (!shouldBlink) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Cuerpo de la dinamita (rojo) - MÁS GRANDE
        ctx.fillStyle = '#CC0000';
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        
        // Bordes más oscuros para dar profundidad
        ctx.fillStyle = '#990000';
        ctx.fillRect(-this.width/2, -this.height/2, 2, this.height); // Izquierda
        ctx.fillRect(this.width/2 - 2, -this.height/2, 2, this.height); // Derecha
        
        // Etiqueta blanca más grande
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-this.width/2 + 2, -this.height/2 + 6, this.width - 4, 8);
        
        // Texto en la etiqueta
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('TNT', 0, -this.height/2 + 12);
        
        // Mecha (amarilla) más gruesa
        ctx.fillStyle = '#FFFF00';
        ctx.fillRect(-2, -this.height/2 - 6, 4, 8);
        
        // Chispa en la mecha más grande
        if (this.fuseTime > 0) {
            ctx.fillStyle = '#FF8800';
            const sparkY = -this.height/2 - 6 + (8 * (1 - this.fuseTime / this.maxFuseTime));
            ctx.fillRect(-3, sparkY, 6, 4);
            
            // Efectos de chispas
            ctx.fillStyle = '#FFFF00';
            ctx.fillRect(-4, sparkY - 1, 8, 2);
        }
        
        ctx.restore();
        
        // Dibujar área de explosión cuando quedan pocos segundos
        if (this.fuseTime < 60) {
            ctx.save();
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.explosionRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x + (Math.random() - 0.5) * 4;
        this.y = y + (Math.random() - 0.5) * 4;
        this.vx = (Math.random() - 0.5) * 6; // Velocidad moderada
        this.vy = Math.random() * -5 - 1; // Velocidad vertical moderada
        this.size = Math.random() * 4 + 2; // Tamaño medio
        this.life = 30 + Math.random() * 30; // Duración media
        this.maxLife = this.life;
        this.color = color;
        this.gravity = 0.35;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.life--;
        
        // Fricción más lenta para que duren más
        this.vx *= 0.95;
        
        // Reducir tamaño más lentamente
        this.size *= 0.97;
        
        // Rotar la partícula
        this.rotation += this.rotationSpeed;
    }
    
    draw(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        // Dibujar con gradiente para más efecto
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, this.color + '00');
        
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
        
        // Añadir brillo
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(-this.size/3, -this.size/3, this.size/3, this.size/3);
        
        ctx.restore();
    }
    
    isDead() {
        return this.life <= 0 || this.size < 0.5;
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
    }
    
    addParticles(x, y, color, count = 10) {
        // Cantidad moderada de partículas
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color));
        }
        
        // Solo 2 partículas extra para oro
        if (color === '#FFD700') {
            for (let i = 0; i < 2; i++) {
                const sparkle = new Particle(x, y, '#FFFF00');
                sparkle.size *= 0.7;
                sparkle.life *= 1.2;
                this.particles.push(sparkle);
            }
        }
    }
    
    update() {
        this.particles = this.particles.filter(particle => {
            particle.update();
            return !particle.isDead();
        });
    }
    
    draw(ctx) {
        this.particles.forEach(particle => particle.draw(ctx));
    }
}

class GoblinShop {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 50;
        this.height = 40;
        this.showShop = false;
        this.warningMessage = '';
        this.warningTimer = 0;
        
        this.upgrades = {
            refuel: { name: "Recarga Combustible", cost: 20, level: 0, maxLevel: 999 },
            fuelTank: { name: "Tanque Más Grande", cost: 50, level: 1, maxLevel: 5 },
            jumpBoots: { name: "Botas de Salto", cost: 60, level: 1, maxLevel: 5 },
            miningSpeed: { name: "Motopico Rápido", cost: 80, level: 1, maxLevel: 5 }
        };
    }
    
    isNearPlayer(player) {
        const distance = Math.sqrt(
            Math.pow(this.x - player.x, 2) + 
            Math.pow(this.y - player.y, 2)
        );
        return distance < 50;
    }
    
    buyUpgrade(player, upgradeKey) {
        const upgrade = this.upgrades[upgradeKey];
        
        // Verificar si es recarga de combustible y ya está lleno
        if (upgradeKey === 'refuel' && player.fuel >= player.maxFuel) {
            this.warningMessage = '¡Ya tienes el tanque lleno!';
            this.warningTimer = 120;
            return false;
        }
        
        if (player.money >= upgrade.cost && upgrade.level < upgrade.maxLevel) {
            player.money -= upgrade.cost;
            if (upgradeKey !== 'refuel') {
                upgrade.level++;
            }
            
            // Aplicar mejora
            switch(upgradeKey) {
                case 'refuel':
                    player.fuel = player.maxFuel;
                    break;
                case 'fuelTank':
                    player.maxFuel += 50;
                    upgrade.cost = Math.floor(upgrade.cost * 1.5);
                    break;
                case 'jumpBoots':
                    player.jumpPower += 2;
                    upgrade.cost = Math.floor(upgrade.cost * 1.4);
                    break;
                case 'miningSpeed':
                    // Aumentar nivel de velocidad de excavación
                    player.miningSpeedLevel++;
                    upgrade.cost = Math.floor(upgrade.cost * 1.6);
                    break;
            }
            return true;
        }
        return false;
    }
    
    draw(ctx) {
        // Dibujar goblin
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Cuerpo
        ctx.fillStyle = '#2d5016';
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        
        // Cabeza
        ctx.fillStyle = '#4a7c1a';
        ctx.beginPath();
        ctx.ellipse(0, -this.height/2 - 10, 16, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Ojos
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(-5, -this.height/2 - 10, 2, 0, Math.PI * 2);
        ctx.arc(5, -this.height/2 - 10, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Orejas puntiagudas
        ctx.fillStyle = '#4a7c1a';
        ctx.beginPath();
        ctx.moveTo(-13, -this.height/2 - 13);
        ctx.lineTo(-18, -this.height/2 - 23);
        ctx.lineTo(-10, -this.height/2 - 16);
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(13, -this.height/2 - 13);
        ctx.lineTo(18, -this.height/2 - 23);
        ctx.lineTo(10, -this.height/2 - 16);
        ctx.closePath();
        ctx.fill();
        
        // Sombrero de comerciante
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.ellipse(0, -this.height/2 - 23, 20, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-10, -this.height/2 - 33, 20, 10);
        
        // Letrero
        ctx.fillStyle = 'rgba(139, 69, 19, 0.9)';
        ctx.fillRect(-25, this.height/2 + 3, 50, 18);
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('TIENDA GOBLIN', 0, this.height/2 + 15);
        
        ctx.restore();
    }
    
    drawShopUI(ctx, player) {
        if (!this.showShop) return;
        
        // Reducir timer de advertencia
        if (this.warningTimer > 0) {
            this.warningTimer--;
        }
        
        // Fondo de la tienda
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(50, 50, 700, 500);
        
        // Título
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🏪 TIENDA DEL GOBLIN GRAXTOR 🏪', 400, 90);
        
        // Dinero del jugador
        ctx.fillStyle = '#00FF00';
        ctx.font = 'bold 18px Arial';
        ctx.fillText(`💰 Oro: ${player.money}`, 400, 120);
        
        // Mostrar mensaje de advertencia
        if (this.warningTimer > 0) {
            ctx.fillStyle = '#FF8800';
            ctx.fillRect(200, 130, 400, 30);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 16px Arial';
            ctx.fillText(this.warningMessage, 400, 150);
        }
        
        // Lista de mejoras
        let yPos = 160;
        const upgrades = Object.entries(this.upgrades);
        
        for (let i = 0; i < upgrades.length; i++) {
            const [key, upgrade] = upgrades[i];
            const x = 70 + (i % 2) * 320;
            const y = yPos + Math.floor(i / 2) * 80;
            
            // Fondo de la mejora
            const canAfford = player.money >= upgrade.cost;
            const maxed = upgrade.level >= upgrade.maxLevel;
            const fuelFull = key === 'refuel' && player.fuel >= player.maxFuel;
            
            ctx.fillStyle = (maxed || fuelFull) ? '#555' : canAfford ? '#2a5a2a' : '#5a2a2a';
            if (fuelFull && key === 'refuel') {
                ctx.fillStyle = '#CC5500'; // Naranja para tanque lleno
            }
            ctx.fillRect(x, y, 280, 70);
            
            // Nombre y nivel
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(upgrade.name, x + 10, y + 20);
            
            if (key !== 'refuel') {
                ctx.fillText(`Nivel: ${upgrade.level}/${upgrade.maxLevel}`, x + 10, y + 40);
            }
            
            // Costo
            ctx.fillStyle = (maxed || fuelFull) ? '#888' : canAfford ? '#FFD700' : '#FF6666';
            let costText = maxed ? 'MAX' : `💰 ${upgrade.cost}`;
            if (fuelFull) costText = 'TANQUE LLENO';
            ctx.fillText(costText, x + 10, y + 60);
            
            // Tecla para comprar
            if (!maxed && !fuelFull) {
                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'right';
                ctx.fillText(`[${i + 1}]`, x + 270, y + 60);
            }
        }
        
        // Instrucciones
        ctx.fillStyle = '#CCCCCC';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Presiona los números 1-4 para comprar | ESC para cerrar', 400, 520);
    }
}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const terrain = new VoxelTerrain(canvas.width, canvas.height, 4);

// Calcular posición de spawn en la superficie después de que el terreno esté generado
function findSurfacePosition(terrain, x) {
    const noiseHeight = Math.sin((x / terrain.voxelSize) * 0.1) * 5 + Math.sin((x / terrain.voxelSize) * 0.05) * 10;
    const surfaceY = (terrain.surfaceHeight + noiseHeight) * terrain.voxelSize;
    return surfaceY - 50; // Spawner bien arriba de la superficie
}

const spawnX = canvas.width / 2;
const spawnY = findSurfacePosition(terrain, spawnX);
const player = new Player(spawnX, spawnY);

// Crear goblin en la superficie
const goblinX = spawnX + 100;
const goblinY = findSurfacePosition(terrain, goblinX);
const goblinShop = new GoblinShop(goblinX, goblinY);

const particleSystem = new ParticleSystem();
const dynamites = []; // Array para almacenar las dinamitas

const keys = {};
let cameraY = 0;

document.addEventListener('keydown', (e) => {
    // Prevenir que las flechas muevan la ventana del navegador
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
    }
    
    keys[e.key] = true;
    
    // Manejar interacciones de la tienda
    if (goblinShop.showShop) {
        const upgradeKeys = ['refuel', 'fuelTank', 'jumpBoots', 'miningSpeed'];
        const numKey = parseInt(e.key);
        
        if (numKey >= 1 && numKey <= 4) {
            const upgradeKey = upgradeKeys[numKey - 1];
            goblinShop.buyUpgrade(player, upgradeKey);
        }
        
        if (e.key === 'Escape') {
            goblinShop.showShop = false;
        }
    } else {
        // Abrir tienda si está cerca del goblin
        if (e.key === 'e' || e.key === 'E') {
            if (goblinShop.isNearPlayer(player)) {
                goblinShop.showShop = true;
            }
        }
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

function gameLoop() {
    // Actualizar cámara para seguir al jugador en ambas direcciones
    const targetCameraY = player.y - canvas.height / 2;
    const cameraDiff = targetCameraY - cameraY;
    
    // Suavizar el movimiento de cámara en ambas direcciones
    if (Math.abs(cameraDiff) > 1) {
        cameraY += cameraDiff * 0.1;
    }
    
    // Limitar la cámara para no mostrar más allá del cielo
    cameraY = Math.max(0, cameraY);
    
    // Generar más terreno si es necesario
    terrain.checkAndGenerateDepth(cameraY);
    
    // Limpiar canvas
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Aplicar transformación de cámara
    ctx.save();
    ctx.translate(0, -cameraY);
    
    terrain.draw(ctx, cameraY);
    
    player.update(terrain, keys);
    player.draw(ctx);
    
    goblinShop.draw(ctx);
    
    // Actualizar y dibujar dinamitas
    for (let i = dynamites.length - 1; i >= 0; i--) {
        const dynamite = dynamites[i];
        const wasExploded = dynamite.exploded;
        
        dynamite.update(terrain);
        
        // Si la dinamita acaba de explotar (cambió de no explotada a explotada)
        if (!wasExploded && dynamite.exploded && !player.isDead) {
            console.log("¡Dinamita explotó! Verificando distancia...");
            const distance = Math.sqrt(
                Math.pow(dynamite.x - player.x, 2) + 
                Math.pow(dynamite.y - player.y, 2)
            );
            console.log(`Distancia: ${distance}, Radio: ${dynamite.explosionRadius}`);
            console.log(`Posición dinamita: (${dynamite.x}, ${dynamite.y})`);
            console.log(`Posición jugador: (${player.x}, ${player.y})`);
            
            if (distance <= dynamite.explosionRadius) {
                console.log("¡JUGADOR MUERTO POR DINAMITA!");
                // Forzar muerte inmediata por dinamita
                player.isDead = true;
                player.deathTimer = 0;
                player.deathCause = 'dynamite';
                
                // Crear explosión de sangre del jugador
                for (let i = 0; i < 50; i++) {
                    const bloodColor = i % 3 === 0 ? '#FF0000' : i % 3 === 1 ? '#CC0000' : '#990000';
                    const particle = new Particle(player.x, player.y, bloodColor);
                    particle.vx = (Math.random() - 0.5) * 15;
                    particle.vy = Math.random() * -10 - 5;
                    particle.size = Math.random() * 6 + 2;
                    particle.life = 60 + Math.random() * 40;
                    particle.maxLife = particle.life;
                    particleSystem.particles.push(particle);
                }
                
                // Dar oro al jugador si la dinamita recolectó algo
                if (dynamite.goldToGive && dynamite.goldToGive > 0) {
                    player.money += dynamite.goldToGive;
                }
            }
        }
        
        dynamite.draw(ctx);
        
        // Remover dinamitas que ya explotaron después de un tiempo
        if (dynamite.exploded && dynamite.fuseTime < -60) {
            dynamites.splice(i, 1);
        }
    }
    
    // Actualizar y dibujar partículas
    particleSystem.update();
    particleSystem.draw(ctx);
    
    ctx.restore();
    
    // Dibujar UI
    // Dinero
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 150, 30);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('💰 $' + player.money, 20, 30);
    
    // Combustible
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 50, 150, 30);
    const fuelPercent = (player.fuel / player.maxFuel) * 100;
    ctx.fillStyle = fuelPercent > 20 ? '#00FF00' : '#FF6666';
    ctx.fillText(`⛽ ${Math.floor(player.fuel)}/${player.maxFuel}`, 20, 70);
    
    // Barra de combustible
    ctx.fillStyle = '#333';
    ctx.fillRect(15, 75, 140, 5);
    ctx.fillStyle = fuelPercent > 20 ? '#00FF00' : '#FF6666';
    ctx.fillRect(15, 75, (140 * fuelPercent) / 100, 5);
    
    // Dinamitas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 90, 150, 30);
    ctx.fillStyle = '#FF4500';
    ctx.font = 'bold 18px Arial';
    ctx.fillText(`💣 ${player.dynamiteCount}`, 20, 110);
    
    // Profundidad
    const depth = Math.floor((player.y - 320) / 4);
    if (depth > 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(canvas.width - 160, 10, 150, 30);
        ctx.fillStyle = '#FFF';
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Profundidad: ' + depth + 'm', canvas.width - 150, 30);
    }
    
    // Indicador de tienda cerca
    if (goblinShop.isNearPlayer(player) && !goblinShop.showShop) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
        ctx.fillRect(canvas.width/2 - 100, 50, 200, 30);
        ctx.fillStyle = '#000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Presiona E para abrir tienda', canvas.width/2, 70);
    }
    
    // UI de la tienda
    goblinShop.drawShopUI(ctx, player);
    
    // Pantalla de Game Over
    if (player.isDead && player.deathTimer > 60) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('¡GAME OVER!', canvas.width/2, canvas.height/2 - 50);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '24px Arial';
        
        if (player.deathCause === 'dynamite') {
            ctx.fillText('¡Reventaste como una palomita! 🍿', canvas.width/2, canvas.height/2);
            ctx.fillText('La dinamita te voló en pedazos', canvas.width/2, canvas.height/2 + 30);
        } else {
            ctx.fillText('Te quedaste sin combustible', canvas.width/2, canvas.height/2);
            ctx.fillText('El motopico explotó', canvas.width/2, canvas.height/2 + 30);
        }
        
        ctx.font = '18px Arial';
        ctx.fillText('Recarga la página para volver a jugar', canvas.width/2, canvas.height/2 + 80);
    }
    
    requestAnimationFrame(gameLoop);
}

gameLoop();