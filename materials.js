// materials.js
function createTextureFromEmoji(emoji) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 64;
    canvas.height = 64;
    context.fillStyle = 'rgba(255, 255, 255, 0)';  // Transparent background
    context.fillRect(0, 0, 64, 64);
    context.font = '50px Arial';
    context.fillStyle = 'black';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(emoji, 32, 32);
    return new THREE.CanvasTexture(canvas);
}

function createMaterials() {
    const wheatTexture = createTextureFromEmoji('🌾');
    const treeTexture = createTextureFromEmoji('🌲');
    const foodTexture = createTextureFromEmoji('🍎');

    const wheatMaterial = new THREE.MeshBasicMaterial({ 
        map: wheatTexture, 
        transparent: true 
    });
    wheatMaterial.name = 'wheat';

    const treeMaterial = new THREE.MeshBasicMaterial({ 
        map: treeTexture, 
        transparent: true 
    });
    treeMaterial.name = 'tree';

    const foodMaterial = new THREE.MeshBasicMaterial({ 
        map: foodTexture, 
        transparent: true 
    });
    foodMaterial.name = 'food';

    return {
        wheat: wheatMaterial,
        tree: treeMaterial,
        food: foodMaterial
    };
}

window.createMaterials = createMaterials;
