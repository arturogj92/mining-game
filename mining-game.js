class VoxelTerrain {
    constructor(width, height, voxelSize) {
        this.width = width;
        this.height = height;
        this.voxelSize = voxelSize;
        this.cols = Math.floor(width / voxelSize);
        this.voxels = {};
        this.generatedDepth = 0;
        this.surfaceHeight = 80; // Más abajo para dejar más cielo
        this.generatedLeft = -this.cols; // Límite izquierdo generado
        this.generatedRight = this.cols; // Límite derecho generado
        
        this.generateInitialTerrain();
    }
    
    generateInitialTerrain() {
        const initialRows = Math.floor(this.height / this.voxelSize) + 10;
        // Generar terreno inicial en un área mucho más grande para evitar vacíos
        const initialCols = this.cols * 2; // Área más grande
        this.generateTerrainRows(0, initialRows, -initialCols, initialCols);
        this.generatedDepth = initialRows;
        this.generatedLeft = -initialCols;
        this.generatedRight = initialCols;
    }
    
    createLadder(centerX, startY, height) {
        const gridX = Math.floor(centerX / this.voxelSize);
        const startGridY = Math.floor(startY / this.voxelSize);
        
        // Crear escalera hacia arriba
        for (let i = 0; i < height; i++) {
            const y = startGridY - i;
            if (y >= 0 && this.voxels[gridX]) {
                // Bloque de escalera indestructible
                this.voxels[gridX][y] = {
                    type: 'ladder',
                    health: 9999,
                    indestructible: true
                };
                
                // Añadir bloques laterales para hacer la escalera más ancha
                if (gridX > 0 && this.voxels[gridX - 1]) {
                    this.voxels[gridX - 1][y] = {
                        type: 'ladder',
                        health: 9999,
                        indestructible: true
                    };
                }
                if (gridX < this.cols - 1 && this.voxels[gridX + 1]) {
                    this.voxels[gridX + 1][y] = {
                        type: 'ladder',
                        health: 9999,
                        indestructible: true
                    };
                }
            }
        }
        
        // Crear plataforma en la base
        for (let dx = -3; dx <= 3; dx++) {
            const platformX = gridX + dx;
            if (platformX >= 0 && platformX < this.cols && this.voxels[platformX]) {
                this.voxels[platformX][startGridY + 1] = {
                    type: 'ladder',
                    health: 9999,
                    indestructible: true
                };
            }
        }
    }
    
    generateTerrainRows(startRow, endRow, startCol = this.generatedLeft, endCol = this.generatedRight) {
        // Primero generar el terreno base sin minerales dispersos
        for (let y = startRow; y < endRow; y++) {
            for (let x = startCol; x < endCol; x++) {
                if (!this.voxels[x]) this.voxels[x] = {};
                
                // Usar una función de ruido más suave y consistente
                const noiseHeight = Math.sin(x * 0.02) * 3 + Math.sin(x * 0.008) * 6;
                const columnHeight = Math.floor(this.surfaceHeight + noiseHeight);
                
                if (y > columnHeight) {
                    const depth = y - columnHeight;
                    let type = 'dirt';
                    let health = 2;
                    
                    // Solo generar tipos de roca, sin minerales dispersos
                    if (depth <= 5) {
                        // Cerca de la superficie - tierra y piedra blanda
                        const rand = Math.random();
                        if (rand < 0.3) {
                            type = 'softStone';
                            health = 2;
                        } else {
                            type = 'dirt';
                            health = 1;
                        }
                    } else if (depth > 5 && depth <= 15) {
                        // Profundidad media - piedras
                        const rand = Math.random();
                        if (rand < 0.5) {
                            type = 'stone';
                            health = 3;
                        } else if (rand < 0.8) {
                            type = 'softStone';
                            health = 2;
                        } else {
                            type = 'dirt';
                            health = 1;
                        }
                    } else if (depth > 15 && depth <= 30) {
                        // Profundidad media-alta - piedra dura
                        const rand = Math.random();
                        if (rand < 0.4) {
                            type = 'stone';
                            health = 3;
                        } else if (rand < 0.8) {
                            type = 'hardStone';
                            health = 4;
                        } else {
                            type = 'veryHardStone';
                            health = 5;
                        }
                    } else if (depth > 30) {
                        // Profundidad extrema - piedra muy dura
                        const rand = Math.random();
                        if (rand < 0.4) {
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
        
        // Generar vetas de minerales basadas en profundidad
        this.generateOreVeins(startRow, endRow, startCol, endCol);
    }
    
    generateOreVeins(startRow, endRow, startCol, endCol) {
        // Generar vetas basadas en profundidad con distribución más uniforme
        // Usar un espaciado mínimo entre vetas para evitar acumulaciones
        
        const chunkSize = 20; // Tamaño de chunk para distribuir vetas
        const veinsPerChunk = {
            coal: 1,    // 1 veta de carbón por chunk
            silver: 1,  // 1 veta de plata por chunk  
            gold: 1,    // 1 veta de oro por chunk
            diamond: 0.5 // 0.5 veta de diamante por chunk (50% probabilidad)
        };
        
        // Procesar por chunks para mejor distribución
        for (let chunkY = Math.floor(startRow / chunkSize); chunkY <= Math.floor(endRow / chunkSize); chunkY++) {
            for (let chunkX = Math.floor(startCol / chunkSize); chunkX <= Math.floor(endCol / chunkSize); chunkX++) {
                const chunkStartY = chunkY * chunkSize;
                const chunkEndY = (chunkY + 1) * chunkSize;
                const chunkStartX = chunkX * chunkSize;
                const chunkEndX = (chunkX + 1) * chunkSize;
                
                // Solo procesar chunks que intersectan con la región generada
                if (chunkEndY < startRow || chunkStartY >= endRow) continue;
                if (chunkEndX < startCol || chunkStartX >= endCol) continue;
                
                const depthInMeters = (chunkStartY - this.surfaceHeight) * 1;
                
                // Generar vetas según la profundidad del chunk
                // Vetas de carbón: 0-50 metros
                if (depthInMeters >= 0 && depthInMeters <= 50) {
                    for (let i = 0; i < veinsPerChunk.coal; i++) {
                        if (Math.random() < 0.7) { // 70% probabilidad por chunk
                            const veinX = chunkStartX + Math.floor(Math.random() * chunkSize);
                            const veinY = chunkStartY + Math.floor(Math.random() * chunkSize);
                            if (veinY >= startRow && veinY < endRow && veinX >= startCol && veinX < endCol) {
                                this.createVein(veinX, veinY, 'coal', 4 + Math.floor(Math.random() * 3));
                            }
                        }
                    }
                }
                
                // Vetas de plata: 50-100 metros
                if (depthInMeters >= 50 && depthInMeters <= 100) {
                    for (let i = 0; i < veinsPerChunk.silver; i++) {
                        if (Math.random() < 0.6) { // 60% probabilidad por chunk
                            const veinX = chunkStartX + Math.floor(Math.random() * chunkSize);
                            const veinY = chunkStartY + Math.floor(Math.random() * chunkSize);
                            if (veinY >= startRow && veinY < endRow && veinX >= startCol && veinX < endCol) {
                                this.createVein(veinX, veinY, 'silver', 3 + Math.floor(Math.random() * 3));
                            }
                        }
                    }
                }
                
                // Vetas de oro: 100+ metros
                if (depthInMeters >= 100) {
                    for (let i = 0; i < veinsPerChunk.gold; i++) {
                        if (Math.random() < 0.5) { // 50% probabilidad por chunk
                            const veinX = chunkStartX + Math.floor(Math.random() * chunkSize);
                            const veinY = chunkStartY + Math.floor(Math.random() * chunkSize);
                            if (veinY >= startRow && veinY < endRow && veinX >= startCol && veinX < endCol) {
                                this.createVein(veinX, veinY, 'gold', 2 + Math.floor(Math.random() * 3));
                            }
                        }
                    }
                }
                
                // Vetas de diamante: 150+ metros (muy raras)
                if (depthInMeters >= 150) {
                    if (Math.random() < veinsPerChunk.diamond) { // 50% probabilidad por chunk
                        const veinX = chunkStartX + Math.floor(Math.random() * chunkSize);
                        const veinY = chunkStartY + Math.floor(Math.random() * chunkSize);
                        if (veinY >= startRow && veinY < endRow && veinX >= startCol && veinX < endCol) {
                            this.createVein(veinX, veinY, 'diamond', 1 + Math.floor(Math.random() * 2));
                        }
                    }
                }
            }
        }
    }
    
    createVein(centerX, centerY, oreType, size) {
        const healthMap = {
            coal: 2,
            silver: 4,
            gold: 5,
            diamond: 6
        };
        const health = healthMap[oreType] || 4;
        
        // Crear veta con tamaño moderado
        for (let i = 0; i < size * 4; i++) { // Moderada cantidad de bloques por veta
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * size; // Tamaño normal
            
            const x = Math.floor(centerX + Math.cos(angle) * distance);
            const y = Math.floor(centerY + Math.sin(angle) * distance);
            
            // Verificar límites - pueden reemplazar cualquier material sólido
            if (this.voxels[x] && this.voxels[x][y]) {
                this.voxels[x][y] = { type: oreType, health: health };
                
                // Añadir algunos bloques adyacentes para hacer la veta más densa
                if (Math.random() < 0.4) { // Probabilidad moderada de bloques adyacentes
                    for (let dx = -1; dx <= 1; dx++) {
                        for (let dy = -1; dy <= 1; dy++) {
                            if (dx === 0 && dy === 0) continue;
                            
                            const adjacentX = x + dx;
                            const adjacentY = y + dy;
                            
                            if (this.voxels[adjacentX] && this.voxels[adjacentX][adjacentY] &&
                                this.voxels[adjacentX][adjacentY] && Math.random() < 0.3) {
                                this.voxels[adjacentX][adjacentY] = { type: oreType, health: health };
                            }
                        }
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
    
    checkAndGenerateWidth(cameraX) {
        const leftX = cameraX;
        const rightX = cameraX + this.width;
        const leftCol = Math.floor(leftX / this.voxelSize) - 50; // Expandir más temprano
        const rightCol = Math.floor(rightX / this.voxelSize) + 50; // Expandir más temprano
        
        // Expandir hacia la izquierda
        if (leftCol < this.generatedLeft) {
            this.generateTerrainRows(0, this.generatedDepth, leftCol, this.generatedLeft);
            this.generatedLeft = leftCol;
        }
        
        // Expandir hacia la derecha
        if (rightCol > this.generatedRight) {
            this.generateTerrainRows(0, this.generatedDepth, this.generatedRight, rightCol);
            this.generatedRight = rightCol;
        }
    }
    
    getVoxel(x, y) {
        const gridX = Math.floor(x / this.voxelSize);
        const gridY = Math.floor(y / this.voxelSize);
        
        if (gridY < 0) {
            return null; // Cielo
        }
        
        // Si no existe el voxel, generar terreno bajo demanda
        if (!this.voxels[gridX] || !this.voxels[gridX][gridY]) {
            // Generar terreno en esa área si está dentro de límites razonables
            if (gridX < this.generatedLeft || gridX > this.generatedRight) {
                // Expandir área si es necesario
                const newLeft = Math.min(this.generatedLeft, gridX - 50);
                const newRight = Math.max(this.generatedRight, gridX + 50);
                this.generateTerrainRows(0, Math.max(this.generatedDepth, gridY + 50), newLeft, newRight);
                this.generatedLeft = newLeft;
                this.generatedRight = newRight;
            }
        }
        
        if (!this.voxels[gridX]) return null;
        return this.voxels[gridX][gridY];
    }
    
    damageVoxel(x, y, damage) {
        const gridX = Math.floor(x / this.voxelSize);
        const gridY = Math.floor(y / this.voxelSize);
        
        // Prevenir excavar demasiado cerca del cielo
        if (gridY < 0) {
            return null;
        }
        
        if (!this.voxels[gridX] || !this.voxels[gridX][gridY]) return null;
        
        const voxel = this.voxels[gridX][gridY];
        if (voxel) {
            // No permitir dañar bloques indestructibles
            if (voxel.indestructible) {
                return null;
            }
            
            voxel.health -= damage;
            if (voxel.health <= 0) {
                const type = voxel.type;
                this.voxels[gridX][gridY] = null;
                return type;
            }
        }
        
        return null;
    }
    
    draw(ctx, cameraX, cameraY) {
        const startY = Math.floor(cameraY / this.voxelSize);
        const endY = Math.ceil((cameraY + this.height) / this.voxelSize);
        const startX = Math.floor(cameraX / this.voxelSize) - 5;
        const endX = Math.ceil((cameraX + this.width) / this.voxelSize) + 5;
        
        for (let x = startX; x <= endX; x++) {
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
                        coal: '#1a1a1a',
                        silver: '#C0C0C0',
                        gold: '#FFD700',
                        diamond: '#B9F2FF',
                        ladder: '#654321'
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
                        coal: 2,
                        silver: 4,
                        gold: 5,
                        diamond: 6
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
    
    // Sistema de físicas para voxels flotantes (optimizado)
    applyVoxelPhysics(cameraX, cameraY) {
        // Solo procesar área muy pequeña alrededor del jugador
        const startY = Math.floor(cameraY / this.voxelSize);
        const endY = Math.ceil((cameraY + this.height) / this.voxelSize);
        const startX = Math.floor(cameraX / this.voxelSize) - 5;
        const endX = Math.ceil((cameraX + this.width) / this.voxelSize) + 5;
        
        const fallingVoxels = [];
        
        // Buscar voxels flotantes (de abajo hacia arriba para evitar cascadas)
        // Aumentar límite para procesar más bloques flotantes
        let processedCount = 0;
        const maxProcessPerFrame = 15;
        
        for (let y = endY; y >= startY && processedCount < maxProcessPerFrame; y--) {
            for (let x = startX; x <= endX && processedCount < maxProcessPerFrame; x++) {
                if (!this.voxels[x] || !this.voxels[x][y]) continue;
                
                const voxel = this.voxels[x][y];
                if (!voxel || voxel.indestructible) continue; // No aplicar física a bloques indestructibles
                
                // Verificar si tiene soporte debajo
                const hasSupport = this.hasSupport(x, y);
                
                if (!hasSupport) {
                    // Encontrar donde debe caer
                    const fallY = this.findFallPosition(x, y);
                    if (fallY > y) {
                        fallingVoxels.push({
                            x: x,
                            originalY: y,
                            targetY: fallY,
                            voxel: { ...voxel }
                        });
                        processedCount++;
                    }
                }
            }
        }
        
        // Aplicar las caídas
        fallingVoxels.forEach(falling => {
            // Remover voxel de posición original
            this.voxels[falling.x][falling.originalY] = null;
            
            // Colocar en nueva posición
            if (!this.voxels[falling.x]) this.voxels[falling.x] = {};
            this.voxels[falling.x][falling.targetY] = falling.voxel;
            
            // Crear partículas de caída
            const worldX = falling.x * this.voxelSize + this.voxelSize/2;
            const worldY = falling.targetY * this.voxelSize + this.voxelSize/2;
            const colors = {
                dirt: '#8B4513',
                softStone: '#A0A0A0',
                stone: '#696969',
                hardStone: '#4A4A4A',
                veryHardStone: '#2F2F2F',
                coal: '#1a1a1a',
                silver: '#C0C0C0',
                gold: '#FFD700',
                diamond: '#B9F2FF'
            };
            
            particleSystem.addParticles(worldX, worldY, colors[falling.voxel.type] || '#888', 3);
        });
        
        return fallingVoxels.length; // Retornar número de bloques que cayeron
    }
    
    // Verificar si un voxel tiene soporte (directo o a través de cadena horizontal)
    hasSupport(x, y) {
        // Primero verificar soporte directo
        if (this.voxels[x] && this.voxels[x][y + 1]) {
            return true;
        }
        
        // Verificar si hay cadena horizontal hacia bloques con soporte
        // Buscar en ambas direcciones hasta 20 bloques
        const maxDistance = 20;
        
        // Verificar hacia la derecha
        for (let dx = 1; dx <= maxDistance; dx++) {
            const checkX = x + dx;
            
            // Si no hay bloque en esta posición horizontal, romper la cadena
            if (!this.voxels[checkX] || !this.voxels[checkX][y]) {
                break;
            }
            
            // Si este bloque tiene soporte directo, toda la cadena tiene soporte
            if (this.voxels[checkX] && this.voxels[checkX][y + 1]) {
                return true;
            }
        }
        
        // Verificar hacia la izquierda
        for (let dx = 1; dx <= maxDistance; dx++) {
            const checkX = x - dx;
            
            // Si no hay bloque en esta posición horizontal, romper la cadena
            if (!this.voxels[checkX] || !this.voxels[checkX][y]) {
                break;
            }
            
            // Si este bloque tiene soporte directo, toda la cadena tiene soporte
            if (this.voxels[checkX] && this.voxels[checkX][y + 1]) {
                return true;
            }
        }
        
        return false; // No hay soporte directo ni a través de cadena horizontal
    }
    
    // Encontrar la posición donde debe caer un voxel
    findFallPosition(x, y) {
        // Buscar la primera posición sólida debajo
        for (let checkY = y + 1; checkY < this.generatedDepth; checkY++) {
            if (this.voxels[x] && this.voxels[x][checkY]) {
                return checkY - 1; // Caer encima del bloque sólido
            }
        }
        
        // Si no encuentra nada sólido, caer al fondo generado
        return this.generatedDepth - 1;
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
        this.dynamiteCount = 10; // Número inicial de dinamitas
        this.dynamiteCooldown = 0;
        this.explosionRadiusLevel = 1; // Nivel de radio de explosión
        
        // Jetpack
        this.jetpackActive = false;
        this.jetpackPower = 2.4; // Fuerza del jetpack (más lento)
        this.jetpackFuelConsumption = 0.4; // Combustible por frame (balanceado)
        this.jetpackEfficiencyLevel = 1; // Nivel de eficiencia
        this.jetpackPowerLevel = 1; // Nivel de potencia
        
        // Mochila de recursos
        this.inventory = {
            coal: 0,
            silver: 0,
            gold: 0,
            diamond: 0
        };
        this.maxInventoryTotal = 20; // Capacidad total de la mochila
        this.backpackLevel = 1; // Nivel de la mochila
    }
    
    getTotalInventoryCount() {
        return this.inventory.coal + this.inventory.silver + this.inventory.gold + this.inventory.diamond;
    }
    
    canAddToInventory(amount = 1) {
        return this.getTotalInventoryCount() + amount <= this.maxInventoryTotal;
    }
    
    update(terrain, keys) {
        // Si está muerto, no hacer nada más
        if (this.isDead) {
            this.deathTimer++;
            return;
        }
        
        // Verificar si se quedó sin combustible mientras excavaba o usando jetpack
        if (this.fuel <= 0 && (this.mining || this.jetpackActive)) {
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
        
        // Salto normal solo si está en el suelo
        if (keys[' '] && this.onGround) {
            this.vy = -this.jumpPower;
        }
        
        // Jetpack: volar con aceleración progresiva manteniendo espacio en el aire
        this.jetpackActive = false;
        if (keys[' '] && !this.onGround && this.fuel > 0) {
            this.jetpackActive = true;
            
            // Calcular potencia y eficiencia basada en niveles
            const actualPower = this.jetpackPower + (this.jetpackPowerLevel - 1) * 0.15;
            const actualConsumption = this.jetpackFuelConsumption - (this.jetpackEfficiencyLevel - 1) * 0.05;
            
            this.vy -= actualPower; // Impulso basado en nivel de potencia
            this.fuel = Math.max(0, this.fuel - Math.max(0.1, actualConsumption));
            
            // Limitar velocidad máxima del jetpack
            const maxSpeed = -5 - (this.jetpackPowerLevel - 1) * 0.5;
            if (this.vy < maxSpeed) {
                this.vy = maxSpeed;
            }
        }
        
        this.mining = (keys.f || keys.F) && this.fuel > 0;
        
        // Lanzar dinamita con G
        if ((keys.g || keys.G) && this.dynamiteCount > 0 && this.dynamiteCooldown <= 0) {
            const dynamite = new Dynamite(this.x, this.y - 10, this.explosionRadiusLevel);
            // Dar velocidad inicial en la dirección que mira el jugador
            dynamite.vx = this.facing * 3; // Velocidad horizontal
            dynamite.vy = -2; // Pequeño impulso hacia arriba
            dynamites.push(dynamite);
            this.dynamiteCount--;
            this.dynamiteCooldown = 20; // 0.33 segundos de cooldown
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
        let groundCollisions = 0;
        let totalChecks = 0;
        
        // Optimizar puntos de verificación para voxels de 6px
        for (let px = this.x - this.width/2 + 2; px <= this.x + this.width/2 - 2; px += 3) {
            totalChecks++;
            
            // Colisión inferior - verificar con tolerancia ajustada para voxels más grandes
            const groundVoxel = terrain.getVoxel(px, bottomEdge + 3);
            if (groundVoxel) {
                groundCollisions++;
                if (this.vy > 0) {
                    canMoveY = false;
                    this.onGround = true;
                    this.vy = 0;
                    // Ajustar posición con mejor precisión para voxels de 6px
                    const blockGridY = Math.floor((bottomEdge + 3) / terrain.voxelSize);
                    const blockY = blockGridY * terrain.voxelSize;
                    this.y = blockY - this.height / 2 - 3;
                }
            }
            
            // Colisión superior con tolerancia ajustada
            if (terrain.getVoxel(px, topEdge - 3)) {
                canMoveY = false;
                if (this.vy < 0) {
                    this.vy = 0;
                }
            }
        }
        
        // Con un solo punto de contacto es suficiente para saltar
        if (groundCollisions === 0) {
            this.onGround = false;
        }
        
        // Prevenir enterramiento mejorado - solo si está completamente enterrado
        const centerVoxel = terrain.getVoxel(this.x, this.y);
        const headVoxel = terrain.getVoxel(this.x, this.y - this.height/2);
        const feetVoxel = terrain.getVoxel(this.x, this.y + this.height/2);
        
        // Solo activar anti-enterramiento si está completamente rodeado
        if (centerVoxel && headVoxel && feetVoxel) {
            // Buscar el espacio libre más cercano hacia arriba, pero con límite
            let foundSpace = false;
            const maxPushDistance = terrain.voxelSize * 2; // Máximo 2 bloques
            
            for (let checkY = this.y; checkY >= this.y - maxPushDistance; checkY -= terrain.voxelSize) {
                if (!terrain.getVoxel(this.x, checkY) && !terrain.getVoxel(this.x, checkY - this.height/2)) {
                    this.y = checkY;
                    this.vy = 0;
                    foundSpace = true;
                    break;
                }
            }
            
            // Si no encuentra espacio cercano, empujar solo un poco
            if (!foundSpace) {
                this.y -= terrain.voxelSize;
            }
        }
        
        // Sistema de auto-escalado para obstáculos pequeños
        if (this.vx !== 0 && canMoveX) {
            const checkX = this.vx > 0 ? this.x + this.width/2 + 2 : this.x - this.width/2 - 2;
            let obstacleHeight = 0;
            
            // Verificar si hay obstáculo en el nivel de los pies
            const feetY = this.y + this.height/2 - 4;
            if (terrain.getVoxel(checkX, feetY)) {
                // Medir la altura del obstáculo desde abajo hacia arriba
                for (let checkY = feetY; checkY >= this.y - this.height/2; checkY -= terrain.voxelSize) {
                    if (terrain.getVoxel(checkX, checkY)) {
                        obstacleHeight += terrain.voxelSize;
                    } else {
                        break;
                    }
                }
                
                // Ajustar umbral de auto-escalado para voxels de 6px (máximo 1.5 bloques)
                if (obstacleHeight <= terrain.voxelSize * 1.5 && this.onGround) {
                    // Auto-escalar: mover hacia arriba con margen apropiado
                    this.y -= obstacleHeight + 3;
                } else {
                    // Obstáculo demasiado alto, bloquear movimiento
                    canMoveX = false;
                }
            }
        }
        
        if (canMoveX) {
            this.x = nextX;
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
                    
                    // Recolectar recursos en la mochila (si hay espacio)
                    if (this.canAddToInventory() && (minedType === 'coal' || minedType === 'silver' || minedType === 'gold' || minedType === 'diamond')) {
                        this.inventory[minedType]++;
                    }
                    
                    // Crear partículas al romper
                    const colors = {
                        dirt: '#8B4513',
                        softStone: '#A0A0A0',
                        stone: '#696969',
                        hardStone: '#4A4A4A',
                        veryHardStone: '#2F2F2F',
                        ore: '#708090',
                        coal: '#1a1a1a',
                        silver: '#C0C0C0',
                        gold: '#FFD700',
                        diamond: '#B9F2FF',
                        ladder: '#654321'
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
        
        // Dibujar efectos del jetpack
        if (this.jetpackActive) {
            // Llamas del jetpack más grandes y potentes
            ctx.fillStyle = '#FF4500';
            ctx.fillRect(-4, this.height/2 - 3, 8, 12);
            
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(-3, this.height/2, 6, 9);
            
            ctx.fillStyle = '#FF8800';
            ctx.fillRect(-2, this.height/2 + 3, 4, 6);
            
            // Núcleo azul para mostrar combustión completa
            ctx.fillStyle = '#00BFFF';
            ctx.fillRect(-1, this.height/2 + 1, 2, 3);
        }
        
        ctx.restore();
    }
}

class Dynamite {
    constructor(x, y, explosionRadiusLevel = 1) {
        this.x = x;
        this.y = y;
        this.width = 20; // MUY GRANDE
        this.height = 36; // MUY ALTA
        this.fuseTime = 180; // 3 segundos a 60fps
        this.maxFuseTime = 180;
        this.exploded = false;
        this.blinkTimer = 0;
        this.vx = 0; // Velocidad horizontal
        this.vy = 0; // Velocidad vertical
        this.onGround = false;
        this.explosionRadius = 120 + (explosionRadiusLevel - 1) * 30; // Radio de explosión mucho mayor
        this.hasExploded = false; // Flag para asegurar que solo explote una vez
    }
    
    update(terrain, allDynamites = []) {
        if (this.exploded) return;
        
        this.fuseTime--;
        this.blinkTimer++;
        
        // Física de caída y movimiento horizontal
        // Siempre verificar si hay suelo debajo (por si se destruyó)
        const hasGroundBelow = terrain.getVoxel(this.x, this.y + this.height/2 + 2);
        
        if (!hasGroundBelow) {
            this.onGround = false;
        }
        
        if (!this.onGround) {
            this.vy += 0.5; // Gravedad
            this.y += this.vy;
            this.x += this.vx; // Movimiento horizontal
            
            // Fricción del aire
            this.vx *= 0.98;
            
            // Verificar colisión con el suelo
            if (terrain.getVoxel(this.x, this.y + this.height/2)) {
                this.onGround = true;
                this.vy = 0;
                this.vx *= 0.3; // Fricción al tocar el suelo
                // Ajustar posición para que esté encima del bloque
                const gridY = Math.floor((this.y + this.height/2) / terrain.voxelSize);
                this.y = gridY * terrain.voxelSize - this.height/2;
            }
            
            // Verificar colisión con paredes
            if (terrain.getVoxel(this.x + this.width/2 * Math.sign(this.vx), this.y)) {
                this.vx = 0;
            }
        }
        
        // Explotar cuando se acabe el tiempo Y esté en el suelo
        if (this.fuseTime <= 0 && !this.hasExploded && this.onGround) {
            this.explode(terrain, allDynamites);
            this.hasExploded = true;
        }
    }
    
    explode(terrain, allDynamites = []) {
        this.exploded = true;
        
        // Aplicar física de explosión a otras dinamitas cercanas
        allDynamites.forEach(otherDynamite => {
            if (otherDynamite === this || otherDynamite.exploded) return;
            
            const distance = Math.sqrt(
                Math.pow(otherDynamite.x - this.x, 2) + 
                Math.pow(otherDynamite.y - this.y, 2)
            );
            
            // Si está dentro del radio de explosión, aplicar impulso
            if (distance <= this.explosionRadius && distance > 0) {
                const force = Math.max(0, (this.explosionRadius - distance) / this.explosionRadius);
                const angle = Math.atan2(otherDynamite.y - this.y, otherDynamite.x - this.x);
                
                // Aplicar impulso basado en la fuerza de la explosión
                const impulseStrength = 40 * force; // Fuerza del impulso mucho mayor
                otherDynamite.vx += Math.cos(angle) * impulseStrength;
                otherDynamite.vy += Math.sin(angle) * impulseStrength;
                
                // Hacer que se despegue del suelo para que pueda volar
                otherDynamite.onGround = false;
            }
        });
        
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
        
        // Destruir bloques en área circular MÁS GRANDE y recolectar recursos
        this.resourcesCollected = {
            coal: 0,
            silver: 0,
            gold: 0,
            diamond: 0
        };
        
        for (let dx = -this.explosionRadius; dx <= this.explosionRadius; dx += 2) {
            for (let dy = -this.explosionRadius; dy <= this.explosionRadius; dy += 2) {
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance <= this.explosionRadius) {
                    const blockX = this.x + dx;
                    const blockY = this.y + dy;
                    
                    // Verificar si es un recurso antes de destruirlo
                    const voxel = terrain.getVoxel(blockX, blockY);
                    if (voxel) {
                        if (voxel.type === 'coal') this.resourcesCollected.coal++;
                        else if (voxel.type === 'silver') this.resourcesCollected.silver++;
                        else if (voxel.type === 'gold') this.resourcesCollected.gold++;
                        else if (voxel.type === 'diamond') this.resourcesCollected.diamond++;
                    }
                    
                    terrain.damageVoxel(blockX, blockY, 999); // Daño masivo que destruye cualquier bloque
                }
            }
        }
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

class Merchant {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 30;
        this.showShop = false;
        
        // Precios de compra de recursos
        this.prices = {
            coal: 2,
            silver: 8,
            gold: 25,
            diamond: 100
        };
    }
    
    isNearPlayer(player) {
        const distance = Math.sqrt(
            Math.pow(this.x - player.x, 2) + 
            Math.pow(this.y - player.y, 2)
        );
        return distance < 60;
    }
    
    sellAllResources(player) {
        let totalMoney = 0;
        
        // Vender todos los recursos
        Object.keys(player.inventory).forEach(resource => {
            const amount = player.inventory[resource];
            if (amount > 0 && this.prices[resource]) {
                const money = amount * this.prices[resource];
                totalMoney += money;
                player.inventory[resource] = 0;
            }
        });
        
        player.money += totalMoney;
        return totalMoney;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Cuerpo del mercader (humano)
        ctx.fillStyle = '#8B4513'; // Ropa marrón
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        
        // Cabeza
        ctx.fillStyle = '#FFDBAC'; // Piel
        ctx.beginPath();
        ctx.ellipse(0, -this.height/2 - 8, 10, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Ojos
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(-3, -this.height/2 - 8, 1, 0, Math.PI * 2);
        ctx.arc(3, -this.height/2 - 8, 1, 0, Math.PI * 2);
        ctx.fill();
        
        // Sombrero de mercader
        ctx.fillStyle = '#4B0082';
        ctx.beginPath();
        ctx.ellipse(0, -this.height/2 - 15, 12, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-8, -this.height/2 - 20, 16, 8);
        
        // Barba
        ctx.fillStyle = '#696969';
        ctx.beginPath();
        ctx.ellipse(0, -this.height/2 - 2, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Letrero
        ctx.fillStyle = 'rgba(139, 69, 19, 0.9)';
        ctx.fillRect(-25, this.height/2 + 2, 50, 12);
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('MERCADER', 0, this.height/2 + 10);
        
        ctx.restore();
    }
    
    drawShopUI(ctx, player) {
        if (!this.showShop) return;
        
        // Fondo de la tienda
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(50, 50, 700, 500);
        
        // Título
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🏪 MERCADER DE RECURSOS 🏪', 400, 90);
        
        // Dinero del jugador
        ctx.fillStyle = '#00FF00';
        ctx.font = 'bold 18px Arial';
        ctx.fillText(`💰 Dinero: ${player.money}`, 400, 120);
        
        // Tu inventario
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('TU INVENTARIO:', 200, 160);
        
        let yPos = 190;
        const totalValue = Object.keys(player.inventory).reduce((total, resource) => {
            const amount = player.inventory[resource];
            const value = amount * (this.prices[resource] || 0);
            return total + value;
        }, 0);
        
        ctx.font = '16px Arial';
        ctx.fillStyle = '#1C1C1C';
        ctx.textAlign = 'left';
        ctx.fillText(`⚫ Carbón: ${player.inventory.coal} x ${this.prices.coal} = ${player.inventory.coal * this.prices.coal}💰`, 100, yPos);
        yPos += 30;
        ctx.fillStyle = '#C0C0C0';
        ctx.fillText(`⚪ Plata: ${player.inventory.silver} x ${this.prices.silver} = ${player.inventory.silver * this.prices.silver}💰`, 100, yPos);
        yPos += 30;
        ctx.fillStyle = '#FFD700';
        ctx.fillText(`🟡 Oro: ${player.inventory.gold} x ${this.prices.gold} = ${player.inventory.gold * this.prices.gold}💰`, 100, yPos);
        yPos += 30;
        ctx.fillStyle = '#B9F2FF';
        ctx.fillText(`💎 Diamante: ${player.inventory.diamond} x ${this.prices.diamond} = ${player.inventory.diamond * this.prices.diamond}💰`, 100, yPos);
        yPos += 50;
        
        // Total
        ctx.fillStyle = '#00FF00';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`VALOR TOTAL: ${totalValue}💰`, 400, yPos);
        
        // Botón vender todo
        if (totalValue > 0) {
            ctx.fillStyle = '#2a5a2a';
            ctx.fillRect(300, yPos + 20, 200, 50);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 18px Arial';
            ctx.fillText('VENDER TODO [V]', 400, yPos + 50);
        }
        
        // Instrucciones
        ctx.fillStyle = '#CCCCCC';
        ctx.font = '14px Arial';
        ctx.fillText('Presiona V para vender todo | Click en VENDER TODO | ESC para cerrar', 400, 520);
    }
    
    handleMouseClick(mouseX, mouseY, player) {
        if (!this.showShop) return;
        
        const totalValue = Object.keys(player.inventory).reduce((total, resource) => {
            const amount = player.inventory[resource];
            const value = amount * (this.prices[resource] || 0);
            return total + value;
        }, 0);
        
        if (totalValue > 0) {
            const yPos = 190 + Object.keys(player.inventory).length * 30 + 50;
            
            // Verificar si el click está dentro del botón "VENDER TODO"
            if (mouseX >= 300 && mouseX <= 500 && mouseY >= yPos + 20 && mouseY <= yPos + 70) {
                this.sellAllResources(player);
            }
        }
    }
}

class GoblinShop {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 25;
        this.height = 20;
        this.showShop = false;
        this.warningMessage = '';
        this.warningTimer = 0;
        
        this.upgrades = {
            refuel: { name: "Recarga Combustible", cost: 20, level: 0, maxLevel: 999 },
            fuelTank: { name: "Tanque Más Grande", cost: 50, level: 1, maxLevel: 5 },
            jumpBoots: { name: "Botas de Salto", cost: 60, level: 1, maxLevel: 5 },
            miningSpeed: { name: "Motopico Rápido", cost: 80, level: 1, maxLevel: 5 },
            backpack: { name: "Mochila Grande", cost: 40, level: 1, maxLevel: 10 },
            dynamite: { name: "Comprar Dinamita x5", cost: 30, level: 0, maxLevel: 999 },
            explosionRadius: { name: "Radio Explosión", cost: 100, level: 1, maxLevel: 5 }
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
                case 'backpack':
                    // Aumentar capacidad de la mochila
                    player.maxInventoryTotal += 20;
                    player.backpackLevel++;
                    upgrade.cost = Math.floor(upgrade.cost * 1.3);
                    break;
                case 'dynamite':
                    // Comprar 5 dinamitas
                    player.dynamiteCount += 5;
                    break;
                case 'explosionRadius':
                    // Aumentar radio de explosión (necesitamos añadir esta propiedad al jugador)
                    if (!player.explosionRadiusLevel) player.explosionRadiusLevel = 1;
                    player.explosionRadiusLevel++;
                    upgrade.cost = Math.floor(upgrade.cost * 1.5);
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
        ctx.ellipse(0, -this.height/2 - 5, 8, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Ojos
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(-2, -this.height/2 - 5, 1, 0, Math.PI * 2);
        ctx.arc(2, -this.height/2 - 5, 1, 0, Math.PI * 2);
        ctx.fill();
        
        // Orejas puntiagudas
        ctx.fillStyle = '#4a7c1a';
        ctx.beginPath();
        ctx.moveTo(-6, -this.height/2 - 6);
        ctx.lineTo(-8, -this.height/2 - 11);
        ctx.lineTo(-5, -this.height/2 - 8);
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(6, -this.height/2 - 6);
        ctx.lineTo(8, -this.height/2 - 11);
        ctx.lineTo(5, -this.height/2 - 8);
        ctx.closePath();
        ctx.fill();
        
        // Sombrero de comerciante
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.ellipse(0, -this.height/2 - 11, 10, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-5, -this.height/2 - 16, 10, 5);
        
        // Letrero
        ctx.fillStyle = 'rgba(139, 69, 19, 0.9)';
        ctx.fillRect(-20, this.height/2 + 2, 40, 10);
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 7px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('TIENDA', 0, this.height/2 + 9);
        
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
        ctx.fillText('Presiona los números 1-4 para comprar | Click en los botones | ESC para cerrar', 400, 520);
    }
    
    handleMouseClick(mouseX, mouseY, player) {
        if (!this.showShop) return;
        
        const upgrades = Object.entries(this.upgrades);
        
        for (let i = 0; i < upgrades.length; i++) {
            const [key, upgrade] = upgrades[i];
            const x = 70 + (i % 2) * 320;
            const y = 160 + Math.floor(i / 2) * 80;
            
            // Verificar si el click está dentro del botón de mejora
            if (mouseX >= x && mouseX <= x + 280 && mouseY >= y && mouseY <= y + 70) {
                // Solo comprar si no está al máximo y no es tanque lleno
                const maxed = upgrade.level >= upgrade.maxLevel;
                const fuelFull = key === 'refuel' && player.fuel >= player.maxFuel;
                
                if (!maxed && !fuelFull) {
                    this.buyUpgrade(player, key);
                }
                break;
            }
        }
    }
}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let terrain = new VoxelTerrain(canvas.width, canvas.height, 8); // Voxels aún más grandes

// Calcular posición de spawn en la superficie después de que el terreno esté generado
function findSurfacePosition(terrain, x) {
    const gridX = Math.floor(x / terrain.voxelSize);
    const noiseHeight = Math.sin(gridX * 0.02) * 3 + Math.sin(gridX * 0.008) * 6;
    const surfaceY = (terrain.surfaceHeight + noiseHeight) * terrain.voxelSize;
    return surfaceY - 50; // Spawner bien arriba de la superficie
}

const spawnX = canvas.width / 2;
const spawnY = findSurfacePosition(terrain, spawnX);
let player = new Player(spawnX, spawnY);

// Crear goblin en la superficie
const goblinX = spawnX + 40;
const goblinY = findSurfacePosition(terrain, goblinX);
let goblinShop = new GoblinShop(goblinX, goblinY);

// Crear mercader en la superficie (al otro lado)
const merchantX = spawnX - 40;
const merchantY = findSurfacePosition(terrain, merchantX);
let merchant = new Merchant(merchantX, merchantY);


const particleSystem = new ParticleSystem();
const dynamites = []; // Array para almacenar las dinamitas

const keys = {};
let cameraX = 0;
let cameraY = 0;
let gameStarted = true;
let restartButton = null;

document.addEventListener('keydown', (e) => {
    // Prevenir que las flechas muevan la ventana del navegador
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
    }
    
    // Solo procesar teclas si el juego está activo
    if (!gameStarted || player.isDead) return;
    
    keys[e.key] = true;
    
    // Manejar interacciones de las tiendas
    if (goblinShop.showShop) {
        const upgradeKeys = ['refuel', 'fuelTank', 'jumpBoots', 'miningSpeed', 'backpack', 'dynamite', 'explosionRadius'];
        const numKey = parseInt(e.key);
        
        if (numKey >= 1 && numKey <= 7) {
            const upgradeKey = upgradeKeys[numKey - 1];
            goblinShop.buyUpgrade(player, upgradeKey);
        }
        
        if (e.key === 'Escape') {
            goblinShop.showShop = false;
        }
    } else if (merchant.showShop) {
        if (e.key === 'v' || e.key === 'V') {
            const totalEarned = merchant.sellAllResources(player);
            if (totalEarned > 0) {
                console.log(`¡Vendiste recursos por ${totalEarned} de dinero!`);
            }
        }
        
        if (e.key === 'Escape') {
            merchant.showShop = false;
        }
    } else {
        // Abrir tienda si está cerca del goblin
        if (e.key === 'e' || e.key === 'E') {
            if (goblinShop.isNearPlayer(player)) {
                goblinShop.showShop = true;
            }
        }
        
        // Abrir mercader si está cerca
        if (e.key === 'r' || e.key === 'R') {
            if (merchant.isNearPlayer(player)) {
                merchant.showShop = true;
            }
        }
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Variables para mouse
let mouseX = 0;
let mouseY = 0;

// Event listeners del mouse
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    
    // Manejar clicks en las tiendas
    if (goblinShop.showShop) {
        goblinShop.handleMouseClick(mouseX, mouseY, player);
    } else if (merchant.showShop) {
        merchant.handleMouseClick(mouseX, mouseY, player);
    }
});

// Función para respawnear después de morir
function respawnPlayer() {
    // Guardar la mitad del dinero, dinamitas y todas las mejoras
    const halfMoney = Math.floor(player.money / 2);
    const dynamiteCount = player.dynamiteCount;
    const explosionRadiusLevel = player.explosionRadiusLevel;
    const maxFuel = player.maxFuel;
    const jumpPower = player.jumpPower;
    const miningSpeedLevel = player.miningSpeedLevel;
    const maxInventoryTotal = player.maxInventoryTotal;
    const backpackLevel = player.backpackLevel;
    
    // Calcular posición de spawn en la superficie
    const newSpawnY = findSurfacePosition(terrain, spawnX);
    
    // Crear nuevo jugador
    player = new Player(spawnX, newSpawnY);
    
    // Restaurar la mitad del dinero, dinamitas y todas las mejoras
    player.money = halfMoney;
    player.dynamiteCount = dynamiteCount;
    player.explosionRadiusLevel = explosionRadiusLevel;
    player.maxFuel = maxFuel;
    player.fuel = maxFuel; // Respawnear con el tanque lleno
    player.jumpPower = jumpPower;
    player.miningSpeedLevel = miningSpeedLevel;
    player.maxInventoryTotal = maxInventoryTotal;
    player.backpackLevel = backpackLevel;
    
    // Limpiar sistemas pero no regenerar terreno
    particleSystem.particles = [];
    
    // Resetear cámara a la superficie
    cameraX = 0;
    cameraY = 0;
    
    // Limpiar teclas
    for (let key in keys) {
        keys[key] = false;
    }
}

// Función para reiniciar el juego completo
function restartGame() {
    // Reiniciar terreno
    terrain = new VoxelTerrain(canvas.width, canvas.height, 8);
    
    // Recalcular posición de spawn después de regenerar el terreno
    const newSpawnY = findSurfacePosition(terrain, spawnX);
    
    // Reiniciar jugador
    player = new Player(spawnX, newSpawnY);
    
    // Recrear goblin y mercader con las nuevas posiciones del terreno
    const newGoblinY = findSurfacePosition(terrain, goblinX);
    goblinShop = new GoblinShop(goblinX, newGoblinY);
    
    const newMerchantY = findSurfacePosition(terrain, merchantX);
    merchant = new Merchant(merchantX, newMerchantY);
    
    // Reiniciar sistemas
    particleSystem.particles = [];
    dynamites.length = 0;
    
    // Reiniciar cámara
    cameraX = 0;
    cameraY = 0;
    
    // Reiniciar estado del juego
    gameStarted = true;
    
    // Limpiar teclas
    for (let key in keys) {
        keys[key] = false;
    }
}


function gameLoop() {
    // Actualizar cámara para seguir al jugador en ambas direcciones
    const targetCameraX = player.x - canvas.width / 2;
    const targetCameraY = player.y - canvas.height / 2;
    const cameraDiffX = targetCameraX - cameraX;
    const cameraDiffY = targetCameraY - cameraY;
    
    // Suavizar el movimiento de cámara en ambas direcciones
    if (Math.abs(cameraDiffX) > 1) {
        cameraX += cameraDiffX * 0.1;
    }
    if (Math.abs(cameraDiffY) > 1) {
        cameraY += cameraDiffY * 0.1;
    }
    
    // Limitar la cámara para no mostrar más allá del cielo
    cameraY = Math.max(0, cameraY);
    
    // Generar más terreno si es necesario
    terrain.checkAndGenerateDepth(cameraY);
    terrain.checkAndGenerateWidth(cameraX);
    
    // Aplicar físicas de voxels más frecuentemente para bloques flotantes
    if (Math.random() < 0.1) { // 10% de probabilidad por frame (aproximadamente cada 10 frames)
        terrain.applyVoxelPhysics(cameraX, cameraY);
    }
    
    // Limpiar canvas
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Aplicar transformación de cámara
    ctx.save();
    ctx.translate(-cameraX, -cameraY);
    
    terrain.draw(ctx, cameraX, cameraY);
    
    player.update(terrain, keys);
    
    // Crear partículas del jetpack
    if (player.jetpackActive) {
        // Crear partículas de llama
        if (Math.random() < 0.8) {
            const particle = new Particle(player.x, player.y + player.height/2, '#FF4500');
            particle.vx = (Math.random() - 0.5) * 4;
            particle.vy = Math.random() * 5 + 3;
            particle.size = Math.random() * 4 + 2;
            particle.life = 20 + Math.random() * 15;
            particle.maxLife = particle.life;
            particle.gravity = 0.05;
            particleSystem.particles.push(particle);
        }
        
        // Añadir MUCHO más humo
        if (Math.random() < 0.7) {
            const particle = new Particle(player.x, player.y + player.height/2, '#666666');
            particle.vx = (Math.random() - 0.5) * 3;
            particle.vy = Math.random() * 4 + 2;
            particle.size = Math.random() * 6 + 3; // Humo más grande
            particle.life = 40 + Math.random() * 30; // Humo más duradero
            particle.maxLife = particle.life;
            particle.gravity = -0.02; // Humo sube ligeramente
            particleSystem.particles.push(particle);
        }
        
        // Partículas azules ocasionales
        if (Math.random() < 0.2) {
            const particle = new Particle(player.x, player.y + player.height/2, '#00BFFF');
            particle.vx = (Math.random() - 0.5) * 2;
            particle.vy = Math.random() * 4 + 2;
            particle.size = Math.random() * 2 + 1;
            particle.life = 10 + Math.random() * 8;
            particle.maxLife = particle.life;
            particle.gravity = 0.02;
            particleSystem.particles.push(particle);
        }
    }
    
    player.draw(ctx);
    
    goblinShop.draw(ctx);
    merchant.draw(ctx);
    
    // Actualizar y dibujar dinamitas
    for (let i = dynamites.length - 1; i >= 0; i--) {
        const dynamite = dynamites[i];
        const wasExploded = dynamite.exploded;
        
        dynamite.update(terrain, dynamites);
        
        // Si la dinamita acaba de explotar (cambió de no explotada a explotada)
        if (!wasExploded && dynamite.exploded) {
            console.log("¡Dinamita explotó! Verificando distancia...");
            const distance = Math.sqrt(
                Math.pow(dynamite.x - player.x, 2) + 
                Math.pow(dynamite.y - player.y, 2)
            );
            console.log(`Distancia: ${distance}, Radio: ${dynamite.explosionRadius}`);
            console.log(`Posición dinamita: (${dynamite.x}, ${dynamite.y})`);
            console.log(`Posición jugador: (${player.x}, ${player.y})`);
            
            // Dar recursos al jugador SIEMPRE que la dinamita recolecte algo
            if (dynamite.resourcesCollected) {
                Object.keys(dynamite.resourcesCollected).forEach(resource => {
                    const amount = dynamite.resourcesCollected[resource];
                    for (let i = 0; i < amount; i++) {
                        if (player.canAddToInventory()) {
                            player.inventory[resource]++;
                            console.log(`¡Dinamita recolectó 1 ${resource}!`);
                        } else {
                            console.log(`¡Mochila llena! No se puede recoger más ${resource}`);
                            break;
                        }
                    }
                });
            }
            
            // Verificar si mata al jugador
            if (distance <= dynamite.explosionRadius && !player.isDead) {
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
    
    // Barra de progreso de mochila (lado derecho)
    const bagX = canvas.width - 60;
    const bagY = 100;
    const bagWidth = 40;
    const bagHeight = 300;
    const totalItems = player.getTotalInventoryCount();
    
    // Fondo de la barra (blanco para espacios vacíos)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(bagX, bagY, bagWidth, bagHeight);
    
    // Borde
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(bagX, bagY, bagWidth, bagHeight);
    
    // Calcular altura por item individual
    const itemHeight = bagHeight / player.maxInventoryTotal;
    let currentY = bagY + bagHeight;
    
    // Dibujar items individuales (de abajo hacia arriba como una pila)
    // Primero carbón
    for (let i = 0; i < player.inventory.coal; i++) {
        ctx.fillStyle = '#1a1a1a'; // Carbón
        ctx.fillRect(bagX + 2, currentY - itemHeight, bagWidth - 4, itemHeight - 1);
        currentY -= itemHeight;
    }
    
    // Luego plata
    for (let i = 0; i < player.inventory.silver; i++) {
        ctx.fillStyle = '#C0C0C0'; // Plata
        ctx.fillRect(bagX + 2, currentY - itemHeight, bagWidth - 4, itemHeight - 1);
        currentY -= itemHeight;
    }
    
    // Luego oro
    for (let i = 0; i < player.inventory.gold; i++) {
        ctx.fillStyle = '#FFD700'; // Oro
        ctx.fillRect(bagX + 2, currentY - itemHeight, bagWidth - 4, itemHeight - 1);
        currentY -= itemHeight;
    }
    
    // Finalmente diamante
    for (let i = 0; i < player.inventory.diamond; i++) {
        ctx.fillStyle = '#B9F2FF'; // Diamante
        ctx.fillRect(bagX + 2, currentY - itemHeight, bagWidth - 4, itemHeight - 1);
        currentY -= itemHeight;
    }
    
    // Texto de capacidad
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🎒', bagX + bagWidth/2, bagY - 10);
    ctx.font = '10px Arial';
    ctx.fillText(`${totalItems}/${player.maxInventoryTotal}`, bagX + bagWidth/2, bagY + bagHeight + 15);
    
    // Indicadores de cantidad simplificados
    if (totalItems > 0) {
        ctx.textAlign = 'left';
        ctx.font = '10px Arial';
        ctx.fillStyle = '#FFFFFF';
        let labelY = bagY + bagHeight + 30;
        
        if (player.inventory.coal > 0) {
            ctx.fillText(`⚫${player.inventory.coal}`, bagX - 25, labelY);
            labelY += 12;
        }
        
        if (player.inventory.silver > 0) {
            ctx.fillText(`⚪${player.inventory.silver}`, bagX - 25, labelY);
            labelY += 12;
        }
        
        if (player.inventory.gold > 0) {
            ctx.fillText(`🟡${player.inventory.gold}`, bagX - 25, labelY);
            labelY += 12;
        }
        
        if (player.inventory.diamond > 0) {
            ctx.fillText(`💎${player.inventory.diamond}`, bagX - 25, labelY);
        }
    }
    
    // Profundidad - calcular basándonos en la superficie del terreno
    const surfaceY = terrain.surfaceHeight * terrain.voxelSize;
    const depth = Math.floor((player.y - surfaceY) / terrain.voxelSize);
    if (depth > 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(canvas.width - 160, 10, 150, 30);
        ctx.fillStyle = '#FFF';
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Profundidad: ' + depth + 'm', canvas.width - 150, 30);
    }
    
    // Indicadores de tiendas cerca
    if (goblinShop.isNearPlayer(player) && !goblinShop.showShop && !merchant.showShop) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
        ctx.fillRect(canvas.width/2 - 100, 50, 200, 30);
        ctx.fillStyle = '#000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Presiona E para abrir tienda', canvas.width/2, 70);
    }
    
    if (merchant.isNearPlayer(player) && !merchant.showShop && !goblinShop.showShop) {
        ctx.fillStyle = 'rgba(0, 255, 100, 0.8)';
        ctx.fillRect(canvas.width/2 - 120, 90, 240, 30);
        ctx.fillStyle = '#000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Presiona R para vender recursos', canvas.width/2, 110);
    }
    
    // UI de las tiendas
    goblinShop.drawShopUI(ctx, player);
    merchant.drawShopUI(ctx, player);
    
    // Auto-respawn después de 2 segundos
    if (player.isDead && player.deathTimer > 120) {
        respawnPlayer();
    }
    
    // Mostrar mensaje de muerte durante 2 segundos
    if (player.isDead && player.deathTimer <= 120) {
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
        ctx.fillStyle = '#FFD700';
        ctx.fillText('Respawneando en ' + Math.ceil((120 - player.deathTimer) / 60) + '...', canvas.width/2, canvas.height/2 + 80);
    }
    
    requestAnimationFrame(gameLoop);
}

gameLoop();