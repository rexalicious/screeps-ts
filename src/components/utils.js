var _ = require('lodash');
var cache = require('cache');

module.exports = {
    /** @param {Creep} creep **/
    moveToClosestContainerOrSource: function(creep, amount, minStorage, cacheTicks) {
        if (!cacheTicks) cacheTicks = 3;
        if (!amount) amount = 0;
        
        let key = 'closestSource-' + creep.name + '-' + amount;
        let closestId = cache.getset(key, cacheTicks, () => {
            let drops = creep.room.find(FIND_DROPPED_RESOURCES, { filter: (r) => { return r.resourceType == RESOURCE_ENERGY && r.amount > amount; }});
            let containers = creep.room.find(FIND_STRUCTURES, { 
                maxRooms: 1, 
                filter: (s) => { 
                    return (s.structureType == STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE) && s.store[RESOURCE_ENERGY] > amount }});
            let links = creep.room.find(FIND_STRUCTURES, {
                maxRooms: 1,
                filter: (s) => { return (s.structureType == STRUCTURE_LINK && s.energy > amount) }
            });
            
            let closest = creep.pos.findClosestByPath(drops.concat(containers).concat(links), { maxRooms: 1 });
            if (closest) return closest.id;
            
            var source = creep.pos.findClosestByPath(FIND_SOURCES, { maxRooms: 1 });
            if (source) return source.id;
        });
        
        let closest = Game.getObjectById(closestId);
        
        if (closest) {
            let energyRemaining = ('store' in closest ? closest.store[RESOURCE_ENERGY] : closest.energy);
            if (!energyRemaining || energyRemaining < amount) cache.delete(key);
            
            if (!creep.pos.isNearTo(closest)) {
                creep.moveTo(closest, { maxRooms: 1 });
            }
            else {
                if (closest instanceof Structure) {
                    creep.withdraw(closest, RESOURCE_ENERGY);
                    cache.delete(key);
                } else if (closest instanceof Resource) {
                    creep.pickup(closest);
                    cache.delete(key);
                } else if (closest instanceof Source) {
                    creep.harvest(closest);
                }
            }
        }
    }
};

if (!RoomPosition.prototype.findStructureInRange) {
    RoomPosition.prototype.findStructureInRange = function(structureType, range, opts) {
        if (!opts) opts = {};
        if (!opts.filter) opts.filter = function() { return true; }
        
        var _f = opts.filter;
        opts.filter = function(o) {
            return o.structureType == structureType && _f(o);
        }
        
        return this.findInRange(FIND_STRUCTURES, range, opts);
    }
}