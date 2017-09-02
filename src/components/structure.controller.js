module.exports = {
    run: function(controller) {
        let  panic = false;
        let  reasons = [];
        
        let hostiles = controller.room.find(FIND_HOSTILE_CREEPS);
        if (hostiles.length > 3) {
            panic = true;
            reasons.push(hostiles.length + ' hostiles');
        }
        
        let damagedTowers = controller.room.find(FIND_MY_STRUCTURES, { filter: (s) => { return s.structureType == STRUCTURE_TOWER && s.hits < s.hitsMax; } });
        if (damagedTowers.length > 0) {
            panic = true;
            reasons.push(damagedTowers.length + ' damaged towers');
        }
        
        let damagedSpawns = controller.room.find(FIND_MY_STRUCTURES, { filter: (s) => { return s.structureType == STRUCTURE_SPAWN && s.hits < s.hitsMax; } });
        if (damagedSpawns.length > 0) {
            panic = true;
            reasons.push(damagedSpawns.length + ' damaged spawns');
        }
        
        let damagedStructures = controller.room.find(FIND_MY_STRUCTURES, { filter: (s) => { return s.structureType == STRUCTURE_STORAGE && s.hits < s.hitsMax; } });
        if (damagedStructures.length > 0) {
            panic = true;
            reasons.push(damagedStructures.length + ' damaged storage');
        }
        
        if (panic) {
            if (controller.activateSafeMode() == 0) {
                let msg = 'Activating safe mode in ' + controller.room.roomName + '(' + reasons.join(' ') + ')';
                console.log(msg)
                Game.notify(msg);
            }
        }
    }
};