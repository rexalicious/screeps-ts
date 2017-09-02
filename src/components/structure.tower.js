
function effectiveHitsMax(structure) {
    var wallHits = 1000;
    switch (structure.room.controller.level) {
        case 1: wallHits = 1; break;
        case 2: wallHits = 5000; break;
        case 3: wallHits = 10000; break;
        case 4: wallHits = 20000; break;
        case 5: wallHits = 100000; break;
        case 6: wallHits = 200000; break;
        case 7: wallHits = 500000; break;
        case 8: wallHits = 900000; break;
    }
    //var wallHits = structure.room.controller.level * 80000;

    if (structure.structureType == STRUCTURE_WALL) return wallHits;
    if (structure.structureType == STRUCTURE_RAMPART) return wallHits;
    return structure.hitsMax;
}

module.exports = {
    run: function (tower) {
        /**/
        
        var hostiles = tower.room.find(FIND_HOSTILE_CREEPS);
        if (hostiles.length) {
            tower.attack(_.min(hostiles, h => h.hits));
        } else if (tower.energy > tower.energyCapacity / 2 && (!tower.room.storage || tower.pos.getRangeTo(tower.room.storage) <= 5)) {
            var damaged = tower.room.find(FIND_STRUCTURES, {
                filter: (s) => s.hits < effectiveHitsMax(s)
            });
            var mostDamaged = _.max(damaged, (s) => effectiveHitsMax(s) - s.hits);
            if (mostDamaged) {
                tower.repair(mostDamaged);
            }
        }
    }
};