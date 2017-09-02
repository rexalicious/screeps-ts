var utils = require('utils');

var roleBuilder = {

    /** @param {Creep} creep **/
    run: function(creep) {

	    if(creep.memory.building && creep.carry.energy == 0) {
            creep.memory.building = false;
            creep.say('🔄 harvest');
	    }
	    if(!creep.memory.building && creep.carry.energy == creep.carryCapacity) {
	        creep.memory.building = true;
	        creep.say('🚧 build');
	    }
	    
	    if (creep.memory.roomTarget && creep.room.name != creep.memory.roomTarget) {
	       creep.moveTo(new RoomPosition(25, 25, creep.memory.roomTarget));
	    } else if (creep.memory.building) {
	        var repairTarget = creep.pos.findClosestByPath(FIND_STRUCTURES, {
	                maxRooms: 1,
	                filter: (s) => { return (s.structureType == STRUCTURE_WALL && s.hits < 10000)
	                                || (s.structureType == STRUCTURE_RAMPART && s.hits < 10000)
	                                || (s.structureType != STRUCTURE_WALL && s.structureType != STRUCTURE_RAMPART && s.hits < (s.hitsMax * 0.2)); }
	        });
	        
	        var constructTarget = creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES);
	        
	        if (!repairTarget && !constructTarget) {
	            repairTarget = creep.pos.findClosestByPath(FIND_STRUCTURES, { 
	                maxRooms: 1,
	                filter: (s) => { return (s.structureType == STRUCTURE_WALL && s.hits < 50000)
	                                   || (s.structureType == STRUCTURE_RAMPART && s.hits < 50000)
	                                   || (s.structureType != STRUCTURE_WALL && s.structureType != STRUCTURE_RAMPART && s.hits < s.hitsMax); } 
	            });
	        }
	        
	        if (repairTarget) {
	            if (creep.repair(repairTarget) == ERR_NOT_IN_RANGE) {
	                creep.moveTo(repairTarget, {visualizePathStyle: {stroke: '#ffffff'}});
	            }
	        } else if (constructTarget) {
    	        if(creep.build(constructTarget) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(constructTarget, {visualizePathStyle: {stroke: '#ffffff'}});
                }
            } else {
                if (creep.memory.spawnRoom) {
                    creep.moveTo(new RoomPosition(25, 25, creep.memory.spawnRoom))
                } else {
                    creep.moveTo(Game.spawns.Spawn1);
                }
            }
	    }
	    else {
	        utils.moveToClosestContainerOrSource(creep, 0, 2000);
	    }
	}
};

module.exports = roleBuilder;