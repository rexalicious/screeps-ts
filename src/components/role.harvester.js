var utils = require('utils');
var cache = require('cache');

var roleHarvester = {

    /** @param {Creep} creep **/
    run: function(creep) {
        let cacheTicks = 5;
        
	    if(creep.carry.energy < 50) {
	        utils.moveToClosestContainerOrSource(creep, 0, 0, cacheTicks);
        }
        else {
            let key = 'harvester-' + creep.name + '-target';
            let targetId = cache.getset(key, cacheTicks, () => {
                let target;
            
                // prefer towers if there are hostiles in the area
                let hostiles = creep.room.find(FIND_HOSTILE_CREEPS, { filter: c => c.owner.username != 'Source Keeper' && c.owner.username != 'Invader' })
                if (!target && hostiles.length) target = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, { maxRooms: 1, filter: s => s.structureType == STRUCTURE_TOWER && s.energy < 750 });
    
                if (!target) {
                    target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                        maxRooms: 1,
                        filter: (s) => {
                            return (((s.structureType == STRUCTURE_EXTENSION || s.structureType == STRUCTURE_SPAWN) && s.energy < s.energyCapacity)
                                 || (s.structureType == STRUCTURE_TOWER && s.energy < (s.room.energyAvailable < s.room.energyCapacityAvailable ? 500 : s.energyCapacity - 100)));
                        }
                    });
                }
                
                if (!target) {
                    target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                        maxRooms: 1,
                        filter: (structure) => {
                            return structure.structureType == STRUCTURE_SPAWN;
                        }
                    });
                }
                
                if (target) return target.id;
            });
            
            let target;
            if (targetId && (target = Game.getObjectById(targetId))) {
                if (creep.pos.isNearTo(target)) {
                    creep.transfer(target, RESOURCE_ENERGY);
                    cache.delete(key);
                } else {
                    creep.moveTo(target, { maxRooms: 1 });
                    
                    if (target.energy == target.energyCapacity) {
                        cache.delete(key);
                    }
                }
            }
        }
	}
};

module.exports = roleHarvester;