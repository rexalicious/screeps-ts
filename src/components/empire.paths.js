let cache = require('cache');

module.exports = function() {
    function encodePath(path) {
        return _.map(path, p => { return { x: p.x, y: p.y, roomName: p.roomName } });
    }
    
    function decodePath(path) {
        return _.map(path, p => new RoomPosition(p.x, p.y, p.roomName));
    }
    
    function getMiningRoute(startPos, endPos) {
        let key = ['paths-mining-route', startPos.x, startPos.y, startPos.roomName, endPos.x, endPos.y, endPos.roomName].join('-');

        return cache.getset(key, 1000, function() {
            let pathfinder = PathFinder.search(startPos, [ { pos: endPos, range: 1 } ], 
            { maxCost: 20000, plainCost: 2, swampCost: 3, roomCallback: (roomName) => {
                let room = Game.rooms[roomName];
                if (!room) return;
                let costs = new PathFinder.CostMatrix;
                
                room.find(FIND_CONSTRUCTION_SITES).forEach(function(cs) {
                   if (cs.structureType == STRUCTURE_ROAD) {
                       costs.set(cs.pos.x, cs.pos.y, 1);
                   } 
                });
            
                room.find(FIND_STRUCTURES).forEach(function(struct) {
                  if (struct.structureType === STRUCTURE_ROAD) {
                    costs.set(struct.pos.x, struct.pos.y, 1);
                  } else if (struct.structureType !== STRUCTURE_CONTAINER &&
                             (struct.structureType !== STRUCTURE_RAMPART ||
                              !struct.my)) {
                    costs.set(struct.pos.x, struct.pos.y, 0xff);
                  }
                });
                return costs;
            } });
            
            if (pathfinder.incomplete) console.log('INCOMPLETE PATH', startPos, endPos);
            
            return pathfinder.path;
        }, encodePath, decodePath);
    }
    
    return {
        getMiningRoute: getMiningRoute
    }
};