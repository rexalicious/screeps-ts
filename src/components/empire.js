let ENERGY_ROOM_GOAL = 300000;
let ENERGY_STORAGE_GOAL = 200000;
let ENERGY_TERMINAL_GOAL = 20000;

module.exports = function () {
    
    let roomMap = {
        'E13N17' : ['E13N16', 'E14N17', 'E12N16'],
        'E12N18' : ['E12N17', 'E11N17', 'E11N16'],
        'E11N15' : ['E12N15', 'E11N14', 'E12N14'],
        'E11N12' : ['E11N13', 'E11N11', 'E12N12', 'E12N11'],
        'E13N12' : ['E13N11', 'E12N13', 'E13N13', 'E14N13'],
        'E11N19' : ['E12N19', 'E11N18', 'E13N19']
    }
    
    function allRoomNames() {
        return _.keys(roomMap).concat(_.flatten(_.values(roomMap)));
    }
    
    function allRooms() {
        return _(allRoomNames()).map(rn => Game.rooms[rn]).compact().value();
    }
    
    let memoize = {};
    
    return {
        ENERGY_ROOM_GOAL: ENERGY_ROOM_GOAL,
        ENERGY_STORAGE_GOAL: ENERGY_STORAGE_GOAL,
        ENERGY_TERMINAL_GOAL: ENERGY_TERMINAL_GOAL,
        
        roomMap: roomMap,
        allRoomNames: allRoomNames,
        allRooms: allRooms,
        
        needsEnergy: function (structure) {
            switch (structure.structureType) {
                case STRUCTURE_TERMINAL: return structure.store[RESOURCE_ENERGY] < ENERGY_TERMINAL_GOAL;
                case STRUCTURE_STORAGE:  return structure.store[RESOURCE_ENERGY] < ENERGY_STORAGE_GOAL;
                default: console.log("empire.needsEnergy", "UNKNOWN STRUCTURE", structure);
            }
        },
        
        roomEnergy: function roomEnergy(room) {
            let key = 'roomEnergy-' + room.name;
            if (key in memoize) return memoize[key];
            
            let containers = [STRUCTURE_STORAGE, STRUCTURE_TERMINAL, STRUCTURE_LINK, STRUCTURE_CONTAINER];
            let energy = _(room.find(FIND_STRUCTURES))
                .filter(s => containers.includes(s.structureType))
                .sum(s => s.structureType == STRUCTURE_LINK ? s.energy : s.store[RESOURCE_ENERGY])
                
            memoize[key] = energy;
            return energy;
        },
        
        storageLimit: function(resourceType) {
            switch (resourceType) {
                case RESOURCE_ENERGY: return 300000;
                case RESOURCE_HYDROGEN: return 100000;
                case RESOURCE_OXYGEN: return 100000;
                default: return 50000;
            }
        },
        
        terminalLimit: function(resourceType) {
            switch (resourceType) {
                case RESOURCE_ENERGY: return 50000;
                case RESOURCE_HYDROGEN: return 20000;
                case RESOURCE_OXYGEN: return 10000;
                default: return 10000;
            }
        }
    }
};