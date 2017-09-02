// tslint:disable:no-var-requires
const Empire = require("components/empire");
const EmpireRoom = require("components/empire.room");
const EmpireTerminals = require("components/empire.terminals");

const structureTower = require("components/structure.tower");
const structureController = require("components/structure.controller");
const Link = require("components/structure.link");

const roleHarvester = require("components/role.harvester");
const roleUpgrader = require("components/role.upgrader");
const roleBuilder = require("components/role.builder");
const roleScout = require("components/role.scout");
const roleDefender = require("components/role.defender");
const roleAttacker = require("components/role.attacker");
const roleHealer = require("components/role.healer");

const Hauler = require("components/role.hauler");
const Miner = require("components/role.miner");

import * as Profiler from "screeps-profiler";
import * as Config from "./config/config";
import { log } from "./lib/logger/log";

if (Config.USE_PROFILER) {
  Profiler.registerClass(Empire, "Empire");
  Profiler.registerClass(EmpireRoom, "EmpireRoom");
  Profiler.registerClass(EmpireTerminals, "EmpireTerminals");

  Profiler.registerClass(structureTower, "structureTower");
  Profiler.registerClass(structureController, "structureController");
  Profiler.registerClass(Link, "Link");

  Profiler.registerClass(roleHarvester, "roleHarvester");
  Profiler.registerClass(roleUpgrader, "roleUpgrader");
  Profiler.registerClass(roleBuilder, "roleBuilder");
  Profiler.registerClass(roleScout, "roleScout");
  Profiler.registerClass(roleDefender, "roleDefender");
  Profiler.registerClass(roleAttacker, "roleAttacker");
  Profiler.registerClass(roleHealer, "roleHealer");

  Profiler.registerClass(Hauler, "Hauler");
  Profiler.registerClass(Miner, "Miner");

  Profiler.enable();
}

log.info(`Scripts bootstrapped`);
if (__REVISION__) {
  log.info(`Revision ID: ${__REVISION__}`);
}

function mloop() {
  // Check memory for null or out of bounds custom objects
  if (!Memory.uuid || Memory.uuid > 100) {
    Memory.uuid = 0;
  }

  const CPU_LOGGING = 1000;
  const ROOM_CPU_LOGGING = 200;
  const  STRUCTURE_CPU_LOGGING = 200;
  const CREEP_CPU_LOGGING = 200;

  Memory.creepsLastRun = Memory.creepsLastRun || 0;
  Memory.cpuLastRun = Memory.cpuLastRun || 0;
  if (CPU_LOGGING) {
      console.log("---", "Ran", Memory.creepsLastRun, "creeps last run in", Memory.cpuLastRun, "CPU", "---");
  }
  Memory.creepsLastRun = 0;

  let startCpu;
  let endCpu;

  for (const  name in Memory.creeps) {
      if (!Game.creeps[name]) {
          console.log("Clearing non-existing creep memory: " + name +
            " (" +  Memory.creeps[name].role + ", " + Memory.creeps[name].spawnRoom + ")");
          delete Memory.creeps[name];
      }
  }

  const empire = Empire();

  const rooms = empire.roomMap;

  for (const roomName in rooms) {
      startCpu = Game.cpu.getUsed();

      try {
          EmpireRoom(Game.rooms[roomName], rooms[roomName]).run();
      } catch (e) {
          Game.notify(e + "\n" + e.stack);
          console.log(e, e.stack);
      }

      endCpu = Game.cpu.getUsed();
      if (endCpu - startCpu > ROOM_CPU_LOGGING) {
        console.log(roomName, "(room) used ", endCpu - startCpu, " CPU");
      }
  }

  for (const roomName in Game.rooms) {
      const controller = Game.rooms[roomName].controller;
      if (controller && controller.my) {
          startCpu = Game.cpu.getUsed();

          structureController.run(Game.rooms[roomName].controller);

          endCpu = Game.cpu.getUsed();
          if (endCpu - startCpu > STRUCTURE_CPU_LOGGING) {
            console.log(controller, "(controller) used", endCpu - startCpu, " CPU");
          }
      }
  }

  for (const name in Game.structures) {
      const structure = Game.structures[name];

      startCpu = Game.cpu.getUsed();

      switch (structure.structureType) {
          case STRUCTURE_TOWER: structureTower.run(structure); break;
          case STRUCTURE_LINK: Link(structure).run(); break;
      }

      endCpu = Game.cpu.getUsed();
      if (endCpu - startCpu > STRUCTURE_CPU_LOGGING) {
        console.log(name, "(" + structure.structureType + ") used", endCpu - startCpu, " CPU");
      }
  }

  const myRooms = empire.allRooms();
  for (const  name in Game.creeps) {
      startCpu = Game.cpu.getUsed();
      const creep = Game.creeps[name];

      if (creep.spawning) continue;

      if (!creep.memory.role) { console.log("Creep", creep.name, "has no role");  continue; }

      if (creep.memory.role === "harvester" || creep.memory.role === "mini") {
          roleHarvester.run(creep);
      } else if (creep.memory.role.startsWith("upgrader")) {
          roleUpgrader.run(creep);
      } else if (creep.memory.role.startsWith("builder")) {
          roleBuilder.run(creep);
      } else if (creep.memory.role.startsWith("miner")) {
          Miner(creep, myRooms).run();
      } else if (creep.memory.role.startsWith("scout")) {
          roleScout.run(creep);
      } else if (creep.memory.role.startsWith("hauler")
        || creep.memory.role.startsWith("longhauler")
        || creep.memory.role === "linker") {
          Hauler(creep).run();
      } else if (creep.memory.role === "defender") {
          roleDefender.run(creep, myRooms);
      } else if (creep.memory.role === "attacker") {
          roleAttacker.run(creep);
      } else if (creep.memory.role === "healer") {
          roleHealer.run(creep);
      } else {
          console.log("Unknown role for " + name);
      }
      endCpu = Game.cpu.getUsed();
      if (endCpu - startCpu > CREEP_CPU_LOGGING) {
        console.log("   ", name, "(", creep.memory.role, ") used ", endCpu - startCpu, " CPU");
      }
      Memory.creepsLastRun++;
      Memory.cpuLastRun = endCpu;
  }

  const terminals = _.filter(_.values<Structure>(Game.structures), (s) => s.structureType === STRUCTURE_TERMINAL);
  if (terminals.length) {
      startCpu = Game.cpu.getUsed();

      try {
          EmpireTerminals(terminals).run();
      } catch (e) {
          Game.notify(e + "\n" + e.stack);
          console.log(e, e.stack);
      }

      endCpu = Game.cpu.getUsed();
      if (endCpu - startCpu > CPU_LOGGING) console.log("   ", "Terminals used ", endCpu - startCpu, " CPU");

  }

  Memory.cpuLastRun = endCpu;
}

/**
 * Screeps system expects this "loop" method in main.js to run the
 * application. If we have this line, we can be sure that the globals are
 * bootstrapped properly and the game loop is executed.
 * http://support.screeps.com/hc/en-us/articles/204825672-New-main-loop-architecture
 *
 * @export
 */
export const loop = !Config.USE_PROFILER ? mloop : () => { Profiler.wrap(mloop); };
