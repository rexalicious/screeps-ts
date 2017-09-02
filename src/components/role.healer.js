/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.attacker');
 * mod.thing == 'a thing'; // true
 */

module.exports = {
    /** @param {Creep} creep **/
    run: function(creep) {
        if (!creep.memory.rally && creep.memory.rallyPath) creep.memory.rally = creep.memory.rallyPath[0];
        
        if (!creep.memory.targetRoom && !creep.memory.rally) {
            console.log('Attacker', creep.name, 'doesn\'t know what to do');
            return;
        }
        
        // next rally in path
        if (creep.memory.rallyPath) {
            let rally = Game.flags[creep.memory.rally];
            
            if (creep.pos.getRangeTo(rally) < 4) {
                let swarmSize = creep.memory.swarmSize || 0;
                if (swarmSize == 0 || swarmSize <= rally.pos.findInRange(FIND_MY_CREEPS, 4).length) {
                    for (var i = 0; i < creep.memory.rallyPath.length - 1; i++) {
                        if (creep.memory.rally == creep.memory.rallyPath[i]) {
                            creep.memory.rally = creep.memory.rallyPath[i+1];
                            break;
                        }
                    }
                } else {
                    //console.log('waiting for swarm at', rally.name);
                }
            }
        }
        
    
        // heal any adjacent creeps
        let adjacentCreeps = creep.pos.findInRange(FIND_MY_CREEPS, 3, { filter: c => c.hits < c.hitsMax });
        if (adjacentCreeps.length) {
            let maxDamage = _.max(adjacentCreeps, c => c.hitsMax - c.hits);
            if (creep.pos.isNearTo(maxDamage)) {
                creep.heal(maxDamage);
            } else {
                creep.rangedHeal(maxDamage);
            }
            healed = true;
        }
        
        // attack any creeps in range
        let hostilesInRange = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 3);
        if (hostilesInRange.length) {
            let minHostile = _.min(hostilesInRange, c => c.hits)
            creep.rangedAttack(minHostile);
            //console.log('Healer', creep.name, 'rangedAttack', minHostile);
        }
        
        if (creep.hits < 0.7 * creep.hitsMax) {
            let rampart = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, { maxRooms: 1, maxCost: 20, filter: s => s.structureType == STRUCTURE_RAMPART });
            if (rampart) {
                creep.moveTo(rampart);
                return;
            }
        }
        
        // move away from any attackers
        //if (creep.pos.isNearTo())
        
        // move towards anyone who needs healing
        let damagedCreeps = creep.room.find(FIND_MY_CREEPS, { filter: c => c.hits < c.hitsMax && c.id != creep.id })
        let target;
        if (damagedCreeps.length) target = _.min(damagedCreeps, c => c.hitsMax - c.hits);
        
        // nobody's hurt, so let's go hurt someone
        /*var hostiles, structures;
        if (!target) {
            hostiles = creep.room.find(FIND_HOSTILE_CREEPS);
            structures = creep.room.find(FIND_HOSTILE_STRUCTURES, { filter: (s) => { return s.structureType != STRUCTURE_WALL && s.structureType != STRUCTURE_RAMPART && s.structureType != STRUCTURE_CONTROLLER && s.structureType != STRUCTURE_KEEPER_LAIR }});
        }
        if (!target) target = creep.pos.findClosestByPath(hostiles, { filter: (c) => { return c.getActiveBodyparts(HEAL); }});
        if (!target) target = creep.pos.findClosestByPath(hostiles, { filter: (c) => { return c.getActiveBodyparts(ATTACK); }});
        if (!target) target = creep.pos.findClosestByPath(structures, { filter: (s) => { return s.structureType == STRUCTURE_TOWER; }})
        if (!target) target = creep.pos.findClosestByPath(hostiles);
        if (!target) target = creep.pos.findClosestByPath(structures);*/
        if (!target && creep.memory.rally) target = Game.flags[creep.memory.rally];
        if (!target && creep.memory.targetRoom) target = new RoomPosition(25, 25, creep.memory.targetRoom);

        creep.moveTo(target);
    }
};