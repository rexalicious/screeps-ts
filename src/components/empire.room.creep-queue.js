let Empire = require('empire');

module.exports = function(room, satellites) {
    let empire = new Empire();
    
    function newCreepQueue() {
        let queue = [];
        queue.push({ role: 'harvester' });
        
        let ixSource = 0;
        // add room sources
        room.find(FIND_SOURCES).forEach(s => {
            addSource(queue, s);
            if (ixSource++ == 0) {
                addLinker(queue);
            }
        });
        
        let hostiles = room.find(FIND_HOSTILE_CREEPS, { filter: c => c.owner.username != 'Source Keeper' && c.owner.username != 'Invader' })
        if (hostiles.length > 1) {
            queue.push({ role: 'attacker' });
            queue.push({ role: 'healer' });
            queue.push({ role: 'harvester' });
            queue.push({ role: 'attacker' });
            queue.push({ role: 'healer' });
        }
        
        // add secondary roles
        queue.push({ role: 'harvester' });
        if (hostiles.length == 0) {
            queue.push({ role: 'upgrader' });
            addControllerHauler(queue);
            if (needBuilder()) queue.push({ role: 'builder' });
            queue.push({ role: 'defender' });
        }
        
        if (hostiles.length == 0 && room.controller.level >= 6) {
            // add mineral mining
            room.find(FIND_MINERALS).forEach(m => {
                let ext = _.filter(m.pos.lookFor(LOOK_STRUCTURES), l => l.structureType == STRUCTURE_EXTRACTOR);
                if (ext.length) {
                    addSource(queue, m, true);
                } else {
                    m.pos.createConstructionSite(STRUCTURE_EXTRACTOR);
                }
            });
        }
        
        if (room.controller.level >= 3) {
            // add satellite rooms
            satellites.forEach(rn => {
                queue.push({ role: 'scout', roomTarget: rn });
                
                let satellite = Game.rooms[rn];
                if (satellite) {
                    satellite.find(FIND_SOURCES).forEach(s => {
                        addSource(queue, s);
                    });
                }
            });
        }
        
        if (room.storage && room.terminal && (empire.needsEnergy(room.storage) || empire.needsEnergy(room.terminal))) {
            queue.push({ role: 'hauler', mission: 'terminal' });
        } else {
            if (room.controller.level >= 4 && !room.storage && Game.flags[room.name + '-storage']) Game.flags[room.name + '-storage'].pos.createConstructionSite(STRUCTURE_STORAGE);
            if (room.controller.level >= 6 && !room.terminal && Game.flags[room.name + '-terminal']) Game.flags[room.name + '-terminal'].pos.createConstructionSite(STRUCTURE_TERMINAL);
        }
        
        if (true) {
            let roomToClaim = 'E11N19';
            let energyCapacity = (Game.rooms[roomToClaim] ? Game.rooms[roomToClaim].energyCapacityAvailable : 0);
            if (room.name == 'E12N18' && !(Game.rooms[roomToClaim] && Game.rooms[roomToClaim].controller.my)) queue.push({ role: 'scout', claim: true, roomTarget: roomToClaim});
            if (room.name == 'E12N18' && energyCapacity < 800) queue.push({ role: 'miner', roomTarget: roomToClaim, sourceId: '5982febcb097071b4adc16c2'})
            if (room.name == 'E13N17' && energyCapacity < 800) queue.push({ role: 'miner', roomTarget: roomToClaim, sourceId: '5982febcb097071b4adc16c0'})

            //if (room.name == 'E12N18') queue.push({ role: 'hauler', transferFrom: '59a8e9859103ee63426bf2ce', transferTo: '59a81df17af600235755fe7b'})
            //if (room.name == 'E13N17') queue.push({ role: 'hauler', transferFrom: '59a8e9859103ee63426bf2ce', transferTo: '59a81df17af600235755fe7b'})

            if (room.name == 'E12N18' && energyCapacity < 1600) queue.push({ role: 'builder', roomTarget: roomToClaim});
            if (room.name == 'E13N17' && energyCapacity < 800) queue.push({ role: 'builder', roomTarget: roomToClaim});
            if (room.name == 'E12N18' && energyCapacity < 1600) queue.push({ role: 'upgrader', roomTarget: roomToClaim});
            if (room.name == 'E13N17' && energyCapacity < 800) queue.push({ role: 'defender', roomTarget: roomToClaim})
            //if (room.name == 'E12N18') queue.push({ role: 'upgrader', roomTarget: roomToClaim})
            //if (room.name == 'E11N15' && Game.rooms[roomToClaim] && Game.rooms[roomToClaim].energyCapacityAvailable < 1800) queue.push({ role: 'upgrader', roomTarget: roomToClaim})
        }
        
        // add tertiary roles
        let roomEnergy = empire.roomEnergy(room);

        if (hostiles.length == 0 && room.controller.level < 8) {
            if (room.storage) {
                if (roomEnergy > 100000) queue.push({ role: 'upgrader' });
                if (roomEnergy > 150000) queue.push({ role: 'upgrader' });
                if (roomEnergy > 200000) queue.push({ role: 'upgrader' });
                if (roomEnergy > 300000) queue.push({ role: 'upgrader' });
                if (roomEnergy > 400000) queue.push({ role: 'upgrader' });
                if (roomEnergy > 500000) queue.push({ role: 'upgrader' });
            } else {
                if (roomEnergy > 2000) queue.push({ role: 'upgrader' });
                if (roomEnergy > 3000) queue.push({ role: 'upgrader' });
                if (roomEnergy > 4000) queue.push({ role: 'upgrader' });
            }
        }
        
        /*if (roomEnergy > 50000) {
            queue.push({ role: 'attacker', targetRoom: 'E11N11' });
            queue.push({ role: 'attacker', targetRoom: 'E11N11' });
        }*/
        
        /*if (['E12N18', 'E13N17'].includes(room.name) && room.storage.store[RESOURCE_ENERGY] > 50000) {
            let rallyPath = ['rally-1', 'rally-2', 'rally-3'];//, 'rally-4', 'rally-5'];
            
            if (_.every(rallyPath, r => Game.flags[r])) {
                let swarmSize = 6;
                for (var i = 0; i < 4; i++) {
                    queue.push({ role: 'attacker', rallyPath: rallyPath, swarmSize: swarmSize });
                    queue.push({ role: 'attacker', rallyPath: rallyPath, swarmSize: swarmSize });
                    queue.push({ role: 'healer', rallyPath: rallyPath, swarmSize: swarmSize });
                }
            }
        }*/
        
        return queue;
    }
    
    function addControllerHauler(queue) {
        if (!room.controller) return;
        
        if (room.storage && room.controller.pos.getRangeTo(room.storage) < 10) return;

        let links = room.controller.pos.findStructureInRange(STRUCTURE_LINK, 3);
        if (links.length) return;

        let transferFrom = room.storage;
        if (!transferFrom) { 
            let spawns = room.find(FIND_MY_STRUCTURES, { filter: s => s.structureType == STRUCTURE_SPAWN });
            if (spawns) transferFrom = spawns[0].pos.findStructureInRange(STRUCTURE_CONTAINER, 3);
        }
        
        let transferTo;
        let containers = room.controller.pos.findStructureInRange(STRUCTURE_CONTAINER, 3);
        if (containers.length) transferTo = containers[0];
        
        if (transferTo && transferFrom) {
            queue.push({ role: 'hauler', transferFrom: transferFrom.id, transferTo: transferTo.id });
            if (room.energyCapacityAvailable < 1800) queue.push({ role: 'hauler', transferFrom: transferFrom.id, transferTo: transferTo.id });
        }
    }
    
    function addSource(queue, source, isMineral) {
        // if it's a mineral, and it's empty, we don't need miners or haulers
        if (isMineral && source.mineralAmount == 0) return;
        queue.push({ role: 'miner', sourceId: source.id });
        
        // if there's a link at the source, we don't need haulers
        if (!isMineral && source.pos.findStructureInRange(STRUCTURE_LINK, 2).length > 0) return;
        let ctHaulers = 1;
        for (var i = 0; i < ctHaulers; i++) {
            queue.push({ role: 'hauler', transferFrom: source.id });
        }
    }
    
    function addLinker(queue) {
        if (!room.storage) return;
        
        let links = room.storage.pos.findStructureInRange(STRUCTURE_LINK, 2);
        if (links.length) {
            queue.push({ role: 'linker', transferFrom: links[0].id });
        }
    }
    
    function needBuilder() {
        return (room.find(FIND_MY_CONSTRUCTION_SITES).length > 0);
    }
    
    return {
        get: function() {
            return newCreepQueue();
        }
    }
};