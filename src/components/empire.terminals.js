let Empire = require('components/empire');

module.exports = function(terminals) {
    let empire = Empire();
    let _DIFF = 20000;
    
    function roomEnergy(room) {
        return (room.storage ? room.storage.store[RESOURCE_ENERGY] : 0) +
               (room.terminal ? room.terminal.store[RESOURCE_ENERGY] : 0);
    }
    
    let needEnergy;
    function transferEnergy(t) {
        if (!needEnergy) needEnergy = _.filter(terminals, t => 
            _.sum(t.store) < t.storeCapacity && roomEnergy(t.room) < empire.ENERGY_ROOM_GOAL - _DIFF);
            
        if (roomEnergy(t.room) < empire.ENERGY_ROOM_GOAL + _DIFF) return false;

        let transferred = false;
        _(needEnergy)
            .map(t2 => { return { terminal: t2, cost: Game.market.calcTransactionCost(1000, t.room.name, t2.room.name) } })
            .sortBy('cost')
            .forEach(o => {
                let energyToTransfer = Math.min(
                    t.store[RESOURCE_ENERGY] - empire.ENERGY_TERMINAL_GOAL, // energy available in terminal
                    roomEnergy(t.room) - empire.ENERGY_ROOM_GOAL,       // energy excess
                    empire.ENERGY_ROOM_GOAL - roomEnergy(o.terminal.room), // energy needed
                    o.terminal.storeCapacity - _.sum(o.terminal.store)  // space available in dest
                );
                
                //console.log('transfer', energyToTransfer, 'from', t.room.name, ' -> ', o.terminal.room.name);

                if (energyToTransfer >= 20000) {
                    console.log('transfer', energyToTransfer, 'from', t.room.name, ' -> ', o.terminal.room.name);
                    let result = t.send(RESOURCE_ENERGY, energyToTransfer, o.terminal.room.name);
                    if (result == OK) {
                        transferred = true;
                        _.remove(needEnergy, o.terminal);
                        return false;
                    }
                    else console.log('Transfer failed:', result);
                }
            })
            .value();
        return transferred;
    }
    
    function sellAt(resourceType) {
        switch (resourceType) {
            case RESOURCE_KEANIUM:  return 0.8;
            case RESOURCE_ZYNTHIUM: return 0.55;
            case RESOURCE_HYDROGEN: return 0.90;
        }
    }

    function sellExcessResources(t) {
        let sellable = [RESOURCE_KEANIUM, RESOURCE_ZYNTHIUM, RESOURCE_HYDROGEN];
        let excess = _.filter(_.keys(t.store), r => sellable.includes(r) && t.store[r] > empire.terminalLimit(r));
        if (!excess.length) return;

        let energyPrice = 0.1;
        let allBuyOrders = Game.market.getAllOrders(o => o.type == ORDER_BUY && sellable.includes(o.resourceType) && o.remainingAmount > 10);

        excess.forEach(r => {
            let buyOrders = _(allBuyOrders)
                .filter(o => o.resourceType == r)
                .forEach(o => o.cost = Game.market.calcTransactionCost(1000, t.room.name, o.roomName) / 1000)
                .forEach(o => o.adjPrice = o.price - energyPrice * o.cost)
                .sortBy(o => -o.adjPrice)
                .value();
            
            /*
            console.log(_.map(buyOrders, o => 
               [ o.resourceType, o.remainingAmount, o.price, o.cost, o.adjPrice ].join(',') + '\n'));
            */
              
            let order = (buyOrders.length ? buyOrders[0] : null);
            
            if (order && order.adjPrice >= sellAt(r)) {
                let amount = Math.min(order.remainingAmount, t.store[r] - empire.terminalLimit(r), 50000);
                console.log('Selling', amount, order.resourceType, 'at', order.adjPrice, ':',
                    Game.market.deal(order.id, amount, t.room.name));
            } else {
                
            }
        });
        
        // find existing order
        /*excess.forEach(r => {
            let myorders = _.filter(Game.market.orders, { roomName: t.room.name, resourceType: r });
            if (myorders.length) return;
            
            //console.log('createOrder', ORDER_SELL, r, mySellPrice(r), 1000, t.room.name);
            //console.log(Game.market.createOrder(ORDER_SELL, r, mySellPrice(r), 1000, t.room.name));
        });*/
        
        //console.log('Excess:', excess);
    }
    
    return {
        run: function () {
            let key = "terminals.cooldown";
            if (Memory[key]-- > 0) return;
            
            terminals.forEach(t => {
                if (t.cooldown > 0) return;

                // if we detect a big energy imbalance, transfer some energy
                if (transferEnergy(t)) return;
                
                // try to sell any extra resources
                if (sellExcessResources(t)) return;
                
                Memory[key] = 20;
            })
            
            let outgoing = _.take(_.filter(Game.market.outgoingTransactions, o => !!o.order), 5);
            if (outgoing.length) {
                console.log('outgoing:', _.map(outgoing, o => '[' + [o.resourceType, o.order.type, o.amount, o.order.price].join(',') +']'))
            }
            
            let incoming = _.take(_.filter(Game.market.incomingTransactions, o => !!o.order), 5);
            if (incoming.length) {
                console.log('incoming:', _.map(incoming, o => '[' + [o.resourceType, o.order.type, o.amount, o.order.price].join(',') +']'))
            }
            
            //return;
    
            
            
            // see if we need to sell any excess
            //return;
            //            let orders = Game.market.getAllOrders(o => o.type == ORDER_BUY && o.amount > 100 && o.resourceType == RESOURCE_KEANIUM);
            //console.log(_.map(orders, o => 
            //   [ o.resourceType, o.remainingAmount, o.price, Game.market.calcTransactionCost(1000, 'E13N17', o.roomName), o.id ].join(',') + '\n'));
        }
    }
};