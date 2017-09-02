//// _.map(_.filter(Game.creeps, c => c.memory.role == 'attacker' || c.memory.role == 'healer'), c => c.memory.rally = 'rally-4')


module.exports = {
    /** @param {Creep} creep **/
    run: function(creep) {
        if (!creep.memory.rally && creep.memory.rallyPath) creep.memory.rally = creep.memory.rallyPath[0];
        
        if (!creep.memory.targetRoom && !creep.memory.rally) {
            console.log('Attacker', creep.name, 'doesn\'t know what to do');
            //return;
        }
        
        // next rally in path
        if (creep.memory.rallyPath) {
            let rally = Game.flags[creep.memory.rally];
            
            if (creep.pos.getRangeTo(rally) < 4) {
                let swarmSize = creep.memory.swarmSize || 0;
                if (swarmSize == 0 || swarmSize <= rally.pos.findInRange(FIND_MY_CREEPS, 4).length) {
                    for (let  i = 0; i < creep.memory.rallyPath.length - 1; i++) {
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
        
        if (creep.hits < 0.7 * creep.hitsMax) {
            let rampart = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, { maxRooms: 1, maxCost: 10, filter: s => s.structureType == STRUCTURE_RAMPART });
            if (rampart) {
                creep.moveTo(rampart);
                creep.heal(creep);
                return;
            }
        }
        
        // check for hostiles
        let  hostiles = creep.room.find(FIND_HOSTILE_CREEPS, { filter: c => c.owner.username != 'Source Keeper' && c.owner.username != 'Invader' });
        let  structures = creep.room.find(FIND_HOSTILE_STRUCTURES, { filter: (s) => { return s.structureType != STRUCTURE_WALL && s.structureType != STRUCTURE_RAMPART 
                                                                                         && s.structureType != STRUCTURE_CONTROLLER && s.structureType != STRUCTURE_KEEPER_LAIR
                                                                                         && s.structureType != STRUCTURE_STORAGE && s.structureType != STRUCTURE_POWER_BANK }});
        let flags = creep.room.find(FIND_FLAGS, { filter: f => f.name.startsWith('target-')});
        
        //let  structures = creep.room.find(FIND_STRUCTURES, { filter: (s) => { return s.structureType != STRUCTURE_CONTROLLER && !s.my }});
        let target = null;
        if (hostiles.length || structures.length || flags.length) {

            if (!target && flags.length) {
                let targets = [STRUCTURE_WALL, STRUCTURE_RAMPART, STRUCTURE_TOWER, STRUCTURE_SPAWN];
                target = _(flags)
                    .sortBy(f => Number(f.name.slice('target-'.length)))
                    .map(f => f.pos.lookFor(LOOK_STRUCTURES))
                    .flatten()
                    .find(l => targets.includes(l.structureType));
            }
            if (!target) target = creep.pos.findClosestByPath(hostiles, { maxRooms: 1, filter: (c) => { return c.getActiveBodyparts(HEAL); }});
            if (!target) target = creep.pos.findClosestByPath(hostiles, { maxRooms: 1, filter: (c) => { return c.getActiveBodyparts(ATTACK); }});
            if (!target) target = creep.pos.findClosestByPath(hostiles, { maxRooms: 1 });
            if (!target) target = creep.pos.findClosestByPath(structures, { maxRooms: 1, filter: (s) => { return s.structureType == STRUCTURE_TOWER; }, ignoreDestructibleStructures: true });
            if (!target) target = creep.pos.findClosestByPath(structures, { maxRooms: 1, filter: (s) => { return s.structureType == STRUCTURE_SPAWN; } });
            if (!target) target = creep.pos.findClosestByPath(structures, { maxRooms: 1, ignoreDestructibleStructures: true });
            //if (!target) target = creep.pos.findClosestByPath(FIND_STRUCTURES, { filter: s => s.structureType == STRUCTURE_WALL || s.structureType == STRUCTURE_RAMPART })

            if (target) console.log(creep.name, '(attacker) attacking', target, target.pos);
            
            if (target) {
                creep.rangedAttack(target);
                if (creep.pos.isNearTo(target)) {
                    creep.attack(target);
                } else {
                    let path = creep.pos.findPathTo(target);
                    
                    if (path.length > 0) {
                        let posFinal = new RoomPosition(path[path.length-1].x, path[path.length-1].y, creep.room.name);
                        if (!posFinal.isNearTo(target)) {
                            console.log(creep.name, 'path blocked');
                            // path is blocked, try again ignoring destructibles
                            path = creep.pos.findPathTo(target, { ignoreDestructibleStructures: 1 });
                        }
                        creep.moveByPath(path);
                    }
                    
                    // lash out wildly at anything nearby
                    let adjHostiles = creep.pos.findInRange(hostiles, 1);
                    if (adjHostiles.length) {
                        creep.attack(_.min(adjHostiles, h => h.hits));
                    } else {
                        let adjStructures = creep.pos.findInRange(FIND_STRUCTURES, 1, { filter: s => !s.my && s.structureType != STRUCTURE_ROAD });
                        creep.attack(_.min(adjStructures, h => h.hits));
                    }
                }
            }
        }
        
        if (!target) {
            if (creep.hits < creep.hitsMax) {
                creep.heal(creep);
            }
            
            if (creep.memory.rally) {
                creep.moveTo(Game.flags[creep.memory.rally]);
            } else if (creep.memory.targetRoom) {
                creep.moveTo(new RoomPosition(25, 25, creep.memory.targetRoom));
            } 
        }
    }
};