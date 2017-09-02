var Empire = require('empire');
var EmpireRoom = require('empire.room');
var EmpireTerminals = require('empire.terminals');

var structureTower = require('structure.tower');
var structureController = require('structure.controller');
var Link = require('structure.link');

var roleHarvester = require('role.harvester');
var roleUpgrader = require('role.upgrader');
var roleBuilder = require('role.builder');
var roleScout = require('role.scout');
var roleDefender = require('role.defender');
var roleAttacker = require('role.attacker');
var roleHealer = require('role.healer');

var Hauler = require('role.hauler');
var Miner = require('role.miner');

const profiler = require('screeps-profiler');

profiler.registerClass(Empire, 'Empire');
profiler.registerClass(EmpireRoom, 'EmpireRoom');
profiler.registerClass(EmpireTerminals, 'EmpireTerminals');

profiler.registerClass(structureTower, 'structureTower');
profiler.registerClass(structureController, 'structureController');
profiler.registerClass(Link, 'Link');

profiler.registerClass(roleHarvester, 'roleHarvester');
profiler.registerClass(roleUpgrader, 'roleUpgrader');
profiler.registerClass(roleBuilder, 'roleBuilder');
profiler.registerClass(roleScout, 'roleScout');
profiler.registerClass(roleDefender, 'roleDefender');
profiler.registerClass(roleAttacker, 'roleAttacker');
profiler.registerClass(roleHealer, 'roleHealer');

profiler.registerClass(Hauler, 'Hauler');
profiler.registerClass(Miner, 'Miner');

profiler.enable();

class Foo {
    constructor(bar, baz) {
        this.bar = bar;
        this.baz = baz;
    }
}


module.exports.loop = function () {
    profiler.wrap(function() {
    
    var CPU_LOGGING = 1000;
    var ROOM_CPU_LOGGING = 200;
    var STRUCTURE_CPU_LOGGING = 200;
    var CREEP_CPU_LOGGING = 200;
    
    Memory.creepsLastRun = Memory.creepsLastRun || 0;
    Memory.cpuLastRun = Memory.cpuLastRun || 0;
    if (CPU_LOGGING) console.log('---', 'Ran', Memory.creepsLastRun, 'creeps last run in', Memory.cpuLastRun, 'CPU', '---');
    Memory.creepsLastRun = 0;
    
    for(var name in Memory.creeps) {
        if(!Game.creeps[name]) {
            console.log('Clearing non-existing creep memory: ' + name + ' (' +  Memory.creeps[name].role + ', ' + Memory.creeps[name].spawnRoom + ')');
            delete Memory.creeps[name];
        }
    }
    
    let empire = new Empire();
    
    let rooms = empire.roomMap;
    
    for (let roomName in rooms) {
        var startCpu = Game.cpu.getUsed();

        try {
            new EmpireRoom(Game.rooms[roomName], rooms[roomName]).run();
        } catch (e) {
            Game.notify(e + '\n' + e.stack);
            console.log(e, e.stack);
        }

        var endCpu = Game.cpu.getUsed();
        if (endCpu - startCpu > ROOM_CPU_LOGGING) console.log(roomName, '(room) used ', endCpu - startCpu, ' CPU');
    }
    
    for (let roomName in Game.rooms) {
        let controller = Game.rooms[roomName].controller;
        if (controller && controller.my) {
            var startCpu = Game.cpu.getUsed();
            
            structureController.run(Game.rooms[roomName].controller);
            
            var endCpu = Game.cpu.getUsed();
            if (endCpu - startCpu > STRUCTURE_CPU_LOGGING) console.log(controller, '(controller) used', endCpu - startCpu, ' CPU');

        }
    }
    
    for (var name in Game.structures) {
        var structure = Game.structures[name];
        
        var startCpu = Game.cpu.getUsed();
        
        switch (structure.structureType) {
            case STRUCTURE_TOWER: structureTower.run(structure); break;
            case STRUCTURE_LINK: new Link(structure).run(); break;
        }
        
        var endCpu = Game.cpu.getUsed();
        if (endCpu - startCpu > STRUCTURE_CPU_LOGGING) console.log(name, '('+structure.structureType+') used', endCpu - startCpu, ' CPU');
    }

    ///var myRooms = _.filter(_.values(Game.rooms), (r) => { return r.controller && 
     //   ( r.controller.my || (r.controller.reservation && r.controller.reservation.username == "Rexalicious")); })
    //console.log(empire.allRooms());
    let myRooms = empire.allRooms();
    for(var name in Game.creeps) {
        var startCpu = Game.cpu.getUsed();
        var creep = Game.creeps[name];
        
        if (creep.spawning) continue;
        
        if (!creep.memory.role) { console.log('Creep', creep.name, 'has no role');  continue; }
        
        if(creep.memory.role == 'harvester' || creep.memory.role == 'mini') {
            roleHarvester.run(creep);
        }
        else if(creep.memory.role.startsWith('upgrader')) {
            roleUpgrader.run(creep);
        }
        else if(creep.memory.role.startsWith('builder')) {
            roleBuilder.run(creep);
        }
        else if (creep.memory.role.startsWith('miner')) {
            Miner(creep, myRooms).run();
        }
        else if (creep.memory.role.startsWith('scout')) {
            roleScout.run(creep);
        }
        else if (creep.memory.role.startsWith('hauler') || creep.memory.role.startsWith('longhauler') || creep.memory.role == 'linker') {
            new Hauler(creep).run();
        } else if (creep.memory.role == 'defender') {
            roleDefender.run(creep, myRooms);
        } else if (creep.memory.role == 'attacker') {
            roleAttacker.run(creep);
        } else if (creep.memory.role == 'healer') {
            roleHealer.run(creep);
        } else {
            console.log('Unknown role for ' + name);
        }
        var endCpu = Game.cpu.getUsed();
        if (endCpu - startCpu > CREEP_CPU_LOGGING) console.log('   ', name, '(', creep.memory.role, ') used ', endCpu - startCpu, ' CPU');
        Memory.creepsLastRun++;
        Memory.cpuLastRun = endCpu;
    }
    
    let terminals = _.filter(_.values(Game.structures), s => s.structureType == STRUCTURE_TERMINAL);
    if (terminals.length) {
        var startCpu = Game.cpu.getUsed();

        try {
            new EmpireTerminals(terminals).run();
        } catch (e) {
            Game.notify(e + '\n' + e.stack);
            console.log(e, e.stack);
        }
        
        var endCpu = Game.cpu.getUsed();
        if (endCpu - startCpu > CPU_LOGGING) console.log('   ', 'Terminals used ', endCpu - startCpu, ' CPU');

    }
    
    Memory.cpuLastRun = endCpu;
    
    });
}