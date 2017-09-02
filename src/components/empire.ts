const ENERGY_ROOM_GOAL = 300000;
const ENERGY_STORAGE_GOAL = 200000;
const ENERGY_TERMINAL_GOAL = 20000;

const empire = () => {

    // tslint:disable:object-literal-key-quotes
    const roomMap = {
        "E13N17" : ["E13N16", "E14N17", "E12N16"],
        "E12N18" : ["E12N17", "E11N17", "E11N16"],
        "E11N15" : ["E12N15", "E11N14", "E12N14"],
        "E11N12" : ["E11N13", "E11N11", "E12N12", "E12N11"],
        "E13N12" : ["E13N11", "E12N13", "E13N13", "E14N13"],
        "E11N19" : ["E12N19", "E11N18", "E13N19"]
    };

    function allRoomNames(): string[] {
        return _.keys(roomMap).concat(_.flatten(_.values(roomMap)));
    }

    function allRooms(): Room[] {
        return _(allRoomNames()).map((rn) => Game.rooms[rn]).compact().value();
    }

    const memoize: any = {};

    return {
        ENERGY_ROOM_GOAL,
        ENERGY_STORAGE_GOAL,
        ENERGY_TERMINAL_GOAL,

        roomMap,
        allRoomNames,
        allRooms,

        needsEnergy: (structure: Structure) => {
            switch (structure.structureType) {
                case STRUCTURE_TERMINAL: return ((structure as StructureTerminal).store[RESOURCE_ENERGY] || 0) < ENERGY_TERMINAL_GOAL;
                case STRUCTURE_STORAGE:  return ((structure as StructureStorage).store[RESOURCE_ENERGY] || 0) < ENERGY_STORAGE_GOAL;
                default: console.log("empire.needsEnergy", "UNKNOWN STRUCTURE", structure);
            }
        },

        roomEnergy: function roomEnergy(room: Room): number {
            const key = "roomEnergy-" + room.name;
            if (key in memoize) return (memoize[key] as number);

            const containers: string[] = [STRUCTURE_STORAGE, STRUCTURE_TERMINAL, STRUCTURE_LINK, STRUCTURE_CONTAINER];
            const energy = _(room.find(FIND_STRUCTURES))
                .filter((s: Structure) => containers.includes(s.structureType))
                .sum((s) => s instanceof StructureLink ?
                    s.energy :
                    (s as StructureStorage | StructureTerminal | StructureContainer).store[RESOURCE_ENERGY]);

            memoize[key] = energy;
            return energy;
        },

        storageLimit: (resourceType: string) => {
            switch (resourceType) {
                case RESOURCE_ENERGY: return 300000;
                case RESOURCE_HYDROGEN: return 100000;
                case RESOURCE_OXYGEN: return 100000;
                default: return 50000;
            }
        },

        terminalLimit(resourceType: string) {
            switch (resourceType) {
                case RESOURCE_ENERGY: return 50000;
                case RESOURCE_HYDROGEN: return 20000;
                case RESOURCE_OXYGEN: return 10000;
                default: return 10000;
            }
        }
    };
};

export = empire;
