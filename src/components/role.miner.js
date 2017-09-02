let  utils = require('components/utils');

/** @param {Creep} creep **/
module.exports = function(creep, rooms) {
    let  source = Game.getObjectById(creep.memory.sourceId);
    let  container = Game.getObjectById(creep.memory.containerId);
    let  link = Game.getObjectById(creep.memory.linkId);
    
    let  creepsPerSource = 1;
    
    function findAllSources() {
        return _.flatten(_.map(rooms, (r) => { return r.find(FIND_SOURCES) }));
    }
    
    function findAllResources() {
        let  extractors = _.flatten(_.map(rooms, (r) => { return r.find(FIND_MY_STRUCTURES, {
            filter: (s) => { return s.structureType == STRUCTURE_EXTRACTOR && s.isActive(); }
        }) }));
        
        let  resources = _.map(extractors, (e) => { return e.pos.findInRange(FIND_MINERALS, 0)[0] } );
        let  availableResources = _.filter(resources, (r) => { return r.mineralAmount > 0; });
        return availableResources;
    }

    function findSource() {
        if (source) return;
        
        let  miners = _.filter(Game.creeps, (c) => { return c.memory.role.startsWith('miner'); });
        let  assignedMiners = _.groupBy(miners, (c) => { return c.memory.sourceId; });
        
        let  allSources = findAllSources();
        let  allResources = findAllResources();
        let  availableSources = _.filter(allSources.concat(allResources), (s) => { return (assignedMiners[s.id] || []).length < creepsPerSource });
        
        if (creep.memory.roomTarget) availableSources = _.filter(availableSources, (s) => { return s.room.name == creep.memory.roomTarget; });

        let  closest = creep.pos.findClosestByRange(availableSources);
        if (!closest) {
            let  search = PathFinder.search(creep.pos, _.map(availableSources, (s) => { return { pos: s.pos, range: 1 } }));
            if (!search.incomplete && search.path.length > 0) {
                let  sources = search.path[search.path.length - 1].findInRange(FIND_SOURCES, 1);
                if (sources) closest = sources[0];
            }
        }
        
        if (closest) {
            source = closest;
            creep.memory.sourceId = source.id;
        }
    }
    
    function findContainer() {
        if (!source|| !source.pos) return;

        let  containers = source.pos.findInRange(FIND_STRUCTURES, 1, {
            filter: (st) => { return st.structureType == STRUCTURE_CONTAINER }
        });
        if (containers.length) {
            container = _.min(containers, (c) => { return _.sum(c.store) });
            creep.memory.containerId = container.id;
            return;
        } 
        
        let  constructionSites = source.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
            filter: (cs) => { return cs.structureType == STRUCTURE_CONTAINER }
        })
        if (constructionSites.length) {
            container = _.max(constructionSites, (cs) => { return cs.progress });
        }
    }
    
    function findLink() {
        if (!source || !source.pos) return;
        
        let  links = source.pos.findStructureInRange(STRUCTURE_LINK, 2);
        if (links.length) {
            creep.memory.linkId = links[0];
            link = links[0];
        }
    }
    
    function buildOrRepair() {
        let  energy = creep.carry[RESOURCE_ENERGY];
        let  workCapacity = (_.filter(creep.body, (b) => { return b.type == WORK }).length);
        
        if (energy >= creep.carryCapacity) {
            if (container instanceof ConstructionSite) {
                if (energy >= creep.carryCapacity || energy >= workCapacity) {
                    return 0 == creep.build(container);
                }
            } else if (container instanceof StructureContainer && container.hits < container.hitsMax * 0.5) {
                if (energy >= creep.carryCapacity || energy >= workCapacity) {
                    return 0 == creep.repair(container);
                }
            }
        }
        
        return false;
    }
    
    function fail(message) {
        console.log("Miner " + creep.name + ":", message);
    }

    return { 
        run: function() {
            if (creep.memory.roomTarget && creep.room.name != creep.memory.roomTarget) {
    	       creep.moveTo(new RoomPosition(25, 25, creep.memory.roomTarget));
    	       return;
    	    }
            
            if (!source) findSource();
            if (!container) findContainer();
            if (!link) findLink();
            
            if (!source) return fail("No source");
            
            let  resource = (source instanceof Mineral ? source.mineralType : RESOURCE_ENERGY);
            let  carry = _.sum(creep.carry);
            
            let  dropped = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1, { filter: (r) => { return r.resourceType == resource; }});
            if (dropped) creep.pickup(dropped[0]);

            if (!creep.pos.isNearTo(source)) {
                creep.moveTo(source, { maxRooms: (creep.room.name == source.room.name ? 1 : 16), maxOps: 10000, reusePath: 10, visualizePathStyle: { fill: 'transparent', stroke: '#fff', lineStyle: 'dashed', strokeWidth: .1, opacity: 0.2 }});
            } else {
                creep.harvest(source);
            }
            
            if (!container && creep.pos.isNearTo(source)) {
                console.log('construction site', creep.pos.createConstructionSite(STRUCTURE_CONTAINER));
            }
            
            let  built = buildOrRepair();
            
            
            if (!built && carry == creep.carryCapacity) {
                if (link && resource == RESOURCE_ENERGY && link.energy < link.energyCapacity) {
                    if (!creep.pos.isNearTo(link)) {
                        creep.moveTo(link);
                    }
                    creep.transfer(link, resource)
                } else if (container instanceof StructureContainer) {
                    if (!creep.pos.isNearTo(container)) {
                        creep.moveTo(container);
                    }
                    
                    for(const resourceType in creep.carry) {
                        creep.transfer(container, resourceType);
                    }
                }
            }
        }
    }
}