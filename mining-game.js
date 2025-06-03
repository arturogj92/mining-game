class VoxelTerrain {
    constructor(width, height, voxelSize) {
        this.width = width;
        this.height = height;
        this.voxelSize = voxelSize;
        this.cols = Math.floor(width / voxelSize);
        this.voxels = {};
        this.generatedDepth = 0;
        this.surfaceHeight = 15;
        
        this.generateInitialTerrain();
    }
    
    generateInitialTerrain() {
        const initialRows = Math.floor(this.height / this.voxelSize) + 10;
        this.generateTerrainRows(0, initialRows);
        this.generatedDepth = initialRows;
    }
    
    generateTerrainRows(startRow, endRow) {
        for (let y = startRow; y < endRow; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (!this.voxels[x]) this.voxels[x] = {};
                
                const noiseHeight = Math.sin(x * 0.1) * 5 + Math.sin(x * 0.05) * 10;
                const columnHeight = Math.floor(this.surfaceHeight + noiseHeight);
                
                if (y > columnHeight) {
                    const depth = y - columnHeight;
                    let type = 'dirt';
                    
                    if (depth > 5) type = 'stone';
                    if (depth > 15 && Math.random() < 0.1) type = 'ore';
                    if (depth > 25 && Math.random() < 0.05) type = 'gold';
                    if (depth > 40 && Math.random() < 0.08) type = 'gold';
                    
                    this.voxels[x][y] = {
                        type: type,
                        health: type === 'stone' ? 3 : type === 'ore' ? 4 : type === 'gold' ? 5 : 2
                    };
                } else {
                    this.voxels[x][y] = null;
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
        
        if (gridX < 0 || gridX >= this.cols || gridY < 0) {
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
                        stone: '#696969',
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
                    
                    const maxHealth = voxel.type === 'stone' ? 3 : voxel.type === 'ore' ? 4 : voxel.type === 'gold' ? 5 : 2;
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
    }
    
    update(terrain, keys) {
        this.vx = 0;
        
        if (keys.ArrowLeft) {
            this.vx = -this.speed;
            this.facing = -1;
        }
        if (keys.ArrowRight) {
            this.vx = this.speed;
            this.facing = 1;
        }
        
        if (keys[' '] && this.onGround) {
            this.vy = -this.jumpPower;
        }
        
        this.mining = keys.f || keys.F || keys.ArrowDown;
        
        this.vy += 0.5;
        if (this.vy > 10) this.vy = 10;
        
        const nextX = this.x + this.vx;
        const nextY = this.y + this.vy;
        
        const leftEdge = nextX - this.width / 2;
        const rightEdge = nextX + this.width / 2;
        const topEdge = nextY - this.height / 2;
        const bottomEdge = nextY + this.height / 2;
        
        let canMoveX = true;
        let canMoveY = true;
        this.onGround = false;
        
        // Primero checar colisión vertical
        for (let px = this.x - this.width/2; px <= this.x + this.width/2; px += 2) {
            if (terrain.getVoxel(px, bottomEdge)) {
                canMoveY = false;
                this.onGround = true;
                this.vy = 0;
                this.y = Math.floor(bottomEdge / terrain.voxelSize) * terrain.voxelSize - this.height / 2 - 0.1;
            }
            
            if (terrain.getVoxel(px, topEdge)) {
                canMoveY = false;
                this.vy = 0;
            }
        }
        
        // Luego checar colisión horizontal con la posición actual Y
        for (let py = this.y - this.height/2 + 2; py <= this.y + this.height/2 - 2; py += 2) {
            if (terrain.getVoxel(rightEdge, py)) {
                canMoveX = false;
                this.x = Math.floor(rightEdge / terrain.voxelSize) * terrain.voxelSize - this.width / 2 - 0.1;
            }
            
            if (terrain.getVoxel(leftEdge, py)) {
                canMoveX = false;
                this.x = Math.ceil(leftEdge / terrain.voxelSize) * terrain.voxelSize + this.width / 2 + 0.1;
            }
        }
        
        if (canMoveX) this.x = nextX;
        if (canMoveY) this.y = nextY;
        
        if (this.mining && this.miningCooldown <= 0) {
            const centerX = this.x;
            const centerY = this.y + this.height/2 + 6;
            let mined = false;
            
            // Daño en área - 5x3 voxels (más ancho)
            for (let dx = -8; dx <= 8; dx += 4) {
                for (let dy = -4; dy <= 4; dy += 4) {
                    const mineX = centerX + dx;
                    const mineY = centerY + dy;
                    
                    const minedType = terrain.damageVoxel(mineX, mineY, 1);
                    if (minedType) {
                        mined = true;
                        
                        // Dar dinero por oro
                        if (minedType === 'gold') {
                            this.money += 10;
                        }
                    }
                }
            }
            
            if (mined) {
                this.miningCooldown = 8;
            } else {
                this.miningCooldown = 12;
            }
        }
        
        if (this.miningCooldown > 0) {
            this.miningCooldown--;
        }
    }
    
    draw(ctx) {
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
            // Mango del motopico
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, this.height/2 - 4);
            ctx.lineTo(0, this.height/2 + 8);
            ctx.stroke();
            
            // Cabeza del motopico
            ctx.fillStyle = '#696969';
            ctx.beginPath();
            ctx.moveTo(-4, this.height/2 + 6);
            ctx.lineTo(4, this.height/2 + 6);
            ctx.lineTo(4, this.height/2 + 10);
            ctx.lineTo(-4, this.height/2 + 10);
            ctx.closePath();
            ctx.fill();
        }
        
        ctx.restore();
    }
}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const terrain = new VoxelTerrain(canvas.width, canvas.height, 4);
const player = new Player(canvas.width / 2, 100);

const keys = {};
let cameraY = 0;

document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

function gameLoop() {
    // Actualizar cámara para seguir al jugador
    const targetCameraY = player.y - canvas.height / 2;
    if (targetCameraY > cameraY) {
        cameraY += (targetCameraY - cameraY) * 0.1;
    }
    
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
    
    ctx.restore();
    
    // Dibujar UI (dinero)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 150, 30);
    
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('💰 $' + player.money, 20, 30);
    
    // Mostrar profundidad
    const depth = Math.floor((player.y - 240) / 4);
    if (depth > 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(canvas.width - 160, 10, 150, 30);
        
        ctx.fillStyle = '#FFF';
        ctx.font = '16px Arial';
        ctx.fillText('Profundidad: ' + depth + 'm', canvas.width - 150, 30);
    }
    
    requestAnimationFrame(gameLoop);
}

gameLoop();