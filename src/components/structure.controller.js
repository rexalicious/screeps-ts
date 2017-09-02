/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('structure.controller');
 * mod.thing == 'a thing'; // true
 */

module.exports = {
    run: function(controller) {
        var panic = false;
        var reasons = [];
        
        var hostiles = controller.room.find(FIND_HOSTILE_CREEPS);
        if (hostiles.length > 3) {
            panic = true;
            reasons.push(hostiles.length + ' hostiles');
        }
        
        var damagedTowers = controller.room.find(FIND_MY_STRUCTURES, { filter: (s) => { return s.structureType == STRUCTURE_TOWER && s.hits < s.hitsMax; } });
        if (damagedTowers.length > 0) {
            panic = true;
            reasons.push(damagedTowers.length + ' damaged towers');
        }
        
        var damagedSpawns = controller.room.find(FIND_MY_STRUCTURES, { filter: (s) => { return s.structureType == STRUCTURE_SPAWN && s.hits < s.hitsMax; } });
        if (damagedSpawns.length > 0) {
            panic = true;
            reasons.push(damagedSpawns.length + ' damaged spawns');
        }
        
        var damagedSpawns = controller.room.find(FIND_MY_STRUCTURES, { filter: (s) => { return s.structureType == STRUCTURE_STORAGE && s.hits < s.hitsMax; } });
        if (damagedSpawns.length > 0) {
            panic = true;
            reasons.push(damagedSpawns.length + ' damaged storage');
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