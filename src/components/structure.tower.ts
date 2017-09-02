
function effectiveHitsMax(structure: Structure) {
    const controllerLevel = (structure.room.controller ? structure.room.controller.level : 1);

    if (structure.structureType === STRUCTURE_WALL) return wallHits(controllerLevel);
    if (structure.structureType === STRUCTURE_RAMPART) return wallHits(controllerLevel);
    return structure.hitsMax;
}

function wallHits(controllerLevel: number) {
    switch (controllerLevel) {
        case 1: return 1;
        case 2: return 5000;
        case 3: return 10000;
        case 4: return 20000;
        case 5: return 100000;
        case 6: return 200000;
        case 7: return 500000;
        case 8: return 900000;
        default: return 1;
    }
}

module.exports = {
    run: (tower: StructureTower) => {
        const hostiles = tower.room.find<Creep>(FIND_HOSTILE_CREEPS);
        if (hostiles.length) {
            tower.attack(_.min(hostiles, (h) => h.hits));
        } else if (tower.energy > tower.energyCapacity / 2
            && (!tower.room.storage || tower.pos.getRangeTo(tower.room.storage) <= 5)) {
            const damaged = tower.room.find<Structure>(FIND_STRUCTURES, {
                filter: (s: Structure) => s.hits < effectiveHitsMax(s)
            });
            const mostDamaged = _.max(damaged, (s) => effectiveHitsMax(s) - s.hits);
            if (mostDamaged) {
                tower.repair(mostDamaged);
            }
        }
    }
};
