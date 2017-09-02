var utils = require('utils');

var roleUpgrader = {

    /** @param {Creep} creep **/
    run: function(creep) {

        if(creep.memory.upgrading && creep.carry.energy == 0) {
            creep.memory.upgrading = false;
            creep.say('🔄 harvest');
	    }
	    if(!creep.memory.upgrading && creep.carry.energy == creep.carryCapacity) {
	        creep.memory.upgrading = true;
	        creep.say('⚡ upgrade');
	    }

	    if(creep.memory.upgrading) {
	        if (creep.pos.getRangeTo(creep.room.controller) > 2) {
	            creep.moveTo(creep.room.controller, {visualizePathStyle: {stroke: '#ffffff'}});
	        }
	        
            creep.upgradeController(creep.room.controller);
        }
        else {
            if (creep.memory.roomTarget && creep.room.name != creep.memory.roomTarget) {
                creep.moveTo(new RoomPosition(25, 25, creep.memory.roomTarget));
    	    } else {
                utils.moveToClosestContainerOrSource(creep, 0, 2000);
    	    }
        }
	}
};

module.exports = roleUpgrader;