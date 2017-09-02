module.exports = {
    /** @param {Creep} creep **/
    run: function (creep) {
        if (!creep.memory.roomTarget) {
            console.log('Scout', creep.name, 'doesn\'t know what to do');
            return;
        }
        
        if (creep.pos.roomName != creep.memory.roomTarget) {
            creep.moveTo(new RoomPosition(10, 25, creep.memory.roomTarget));
        } else if (!creep.pos.isNearTo(creep.room.controller)) {
            creep.moveTo(creep.room.controller);
        }
        
        if (creep.getActiveBodyparts(CLAIM) > 0) {
            if (creep.memory.claim) {
                creep.claimController(creep.room.controller);
            } else if (creep.getActiveBodyparts(CLAIM)) {
                creep.reserveController(creep.room.controller);    
            }
        }
    }
};